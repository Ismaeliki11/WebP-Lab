"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Settings2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  XCircle,
  Undo2,
  Save,
  SlidersHorizontal
} from "lucide-react";

import {
  DEFAULT_OPTIONS,
  OUTPUT_FORMATS,
  PRESETS,
  RESIZE_FITS,
  TransformOptions,
  TransformPreset,
  applyPreset,
  formatBytes,
  estimateImpact,
  parseTransformOptions,
} from "@/lib/image-tools";

import { StatsGrid } from "@/components/StatsGrid";
import { UploadZone } from "@/components/UploadZone";
import { FileList } from "@/components/FileList";
import { EasyConfig } from "@/components/EasyConfig";
import { ProConfig } from "@/components/ProConfig";
import { ImageEditor } from "@/components/ImageEditor";
import { InfoTooltip } from "@/components/InfoTooltip";
import { LiveImpactBadge } from "@/components/LiveImpactBadge";
import { Logo } from "@/components/Logo";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status?: "idle" | "processing" | "done" | "error" | "skipped";
  isolatedFormat?: "webp" | "avif" | "jpeg" | "png";
  customOverrides?: Partial<TransformOptions>;
}

interface ProcessStats {
  inputBytes: number;
  outputBytes: number;
  processedFiles: number;
  failedFiles: number;
}

type ProcessStage = "idle" | "preparing" | "processing" | "downloading" | "done";
type UIMode = "easy" | "pro";
type EasyGoal = "web-fast" | "balanced" | "max-quality" | "social";
type EasySize = "original" | "1920" | "1200" | "800";

interface EasySettings {
  goal: EasyGoal;
  format: TransformOptions["format"];
  compressionLevel: 1 | 2 | 3;
  size: EasySize;
  stripMetadata: boolean;
  withoutEnlargement: boolean;
}

const ROTATION_OPTIONS: Array<TransformOptions["rotate"]> = [0, 90, 180, 270];
const OPTIONS_STORAGE_KEY = "webp-lab.options.v2";
const EASY_STORAGE_KEY = "webp-lab.easy.v1";
const MODE_STORAGE_KEY = "webp-lab.mode.v1";
const MAX_PREVIEW_ITEMS = 8;

const DEFAULT_EASY_SETTINGS: EasySettings = {
  goal: "balanced",
  format: "webp",
  compressionLevel: 2,
  size: "original",
  stripMetadata: true,
  withoutEnlargement: true,
};

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function parseContentDispositionFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1] ?? null;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseHeaderNumber(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseEasySettings(raw: unknown): EasySettings {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const format = OUTPUT_FORMATS.includes(source.format as TransformOptions["format"])
    ? (source.format as TransformOptions["format"])
    : DEFAULT_EASY_SETTINGS.format;
  const compression = Number(source.compressionLevel);
  const size = source.size;
  const goal = source.goal;

  return {
    goal: goal === "web-fast" || goal === "balanced" || goal === "max-quality" || goal === "social"
      ? goal
      : DEFAULT_EASY_SETTINGS.goal,
    format,
    compressionLevel: compression === 1 || compression === 2 || compression === 3 ? compression : 2,
    size: size === "original" || size === "1920" || size === "1200" || size === "800" ? size : "original",
    stripMetadata: typeof source.stripMetadata === "boolean" ? source.stripMetadata : true,
    withoutEnlargement: typeof source.withoutEnlargement === "boolean" ? source.withoutEnlargement : true,
  };
}

function buildOptionsFromEasy(settings: EasySettings): TransformOptions {
  const qualityByCompression: Record<1 | 2 | 3, number> = { 1: 68, 2: 82, 3: 92 };
  const sizeMap: Record<EasySize, { width: number | null; height: number | null; fit: TransformOptions["fit"] }> = {
    original: { width: null, height: null, fit: "inside" },
    "1920": { width: 1920, height: null, fit: "inside" },
    "1200": { width: 1200, height: null, fit: "inside" },
    "800": { width: 800, height: null, fit: "inside" },
  };

  let merged: Partial<TransformOptions> = {
    ...DEFAULT_OPTIONS,
    format: settings.format,
    quality: qualityByCompression[settings.compressionLevel],
    width: sizeMap[settings.size].width,
    height: sizeMap[settings.size].height,
    fit: sizeMap[settings.size].fit,
    stripMetadata: settings.stripMetadata,
    withoutEnlargement: settings.withoutEnlargement,
    lossless: false,
  };

  if (settings.goal === "web-fast") {
    merged = { ...merged, quality: Math.max(55, qualityByCompression[settings.compressionLevel] - 8), sharpen: true };
  }
  if (settings.goal === "max-quality") {
    merged = {
      ...merged,
      quality: Math.max(90, qualityByCompression[settings.compressionLevel]),
      lossless: settings.format === "png" || settings.format === "webp",
      stripMetadata: false,
    };
  }
  if (settings.goal === "social") {
    merged = { ...merged, width: 1200, height: 630, fit: "cover", quality: 80 };
  }

  return parseTransformOptions(merged);
}

function easySizeLabel(size: EasySize, lang: "es" | "en"): string {
  if (size === "original") return lang === "es" ? "Original" : "Original";
  return lang === 'es' ? `${size}px ancho máximo` : `${size}px max width`;
}

const TRANSLATIONS = {
  es: {
    heroBadge: "WebP Lab Pro Edition",
    heroTitle: "Optimización de imágenes sin límites.",
    heroDesc: "Pipeline de conversión profesional con soporte para WebP, AVIF y JPEG. Rápido, seguro y diseñado para diseñadores.",
    modeEasy: "Modo Fácil",
    modePro: "Modo Experto",
    step1: "Cargar",
    step1Desc: "Añade tus imágenes a la cola.",
    step2: "Configurar",
    step2Desc: "Ajustes inteligentes.",
    step2DescPro: "Control total manual.",
    step3: "Descargar",
    step3Desc: "Resultados listos en segundos.",
    history: "Historial de sesión",
    noHistory: "No hay actividad reciente.",
    magicApplied: "¡Magia aplicada a {name}!",
    errorImages: "Solo se permiten archivos de imagen.",
    abort: "Proceso cancelado.",
    ready: "Listo.",
    processedSingle: "1 archivo procesado",
    processedPlural: "{count} archivos procesados",
    saved: "Se han ahorrado {size} en total.",
    start: "Iniciar conversión",
    processing: "Procesando archivos...",
    smartCrop: "Recorte Inteligente",
    watermark: "Marca de Agua",
    rename: "Patrón de nombre",
    working: "Trabajando...",
    viewBatchDetail: "Ver detalle del lote",
    clearHistory: "Limpiar historial",
    downloadImage: "Descargar imagen",
    downloadZip: "Descargar en ZIP",
    singleFile: "1 solo archivo",
    saveToFolder: "Guardar en carpeta",
    downloadIndividually: "Descarga foto a foto",
    downloadOptions: "Opciones de Descarga",
    transparencyWarningTitle: "Atención: Pérdida de transparencia",
    transparencyWarningDesc: "Has elegido JPEG, pero {count} {plural} transparencia (PNG/SVG). Tendrán un fondo sólido.",
    isolateAllWebp: "Aislar todas en WebP",
    hideDetails: "Ocultar detalles",
    viewImages: "Ver imágenes...",
    isolate: "Aislar",
    done: "Listo",
    skipped: "Saltado",
    failed: "Error",
    pipelineProgress: "Progreso de pipeline",
    originalSize: "Original",
    files: "archivos",
    file: "archivo",
    ratio: "Ratio"
  },
  en: {
    heroBadge: "WebP Lab Pro Edition",
    heroTitle: "Limitless image optimization.",
    heroDesc: "Professional conversion pipeline with WebP, AVIF, and JPEG support. Fast, secure, and built for designers.",
    modeEasy: "Easy Mode",
    modePro: "Pro Mode",
    step1: "Upload",
    step1Desc: "Add images to the queue.",
    step2: "Configure",
    step2Desc: "Smart adjustments.",
    step2DescPro: "Full manual control.",
    step3: "Download",
    step3Desc: "Results ready in seconds.",
    history: "Session history",
    noHistory: "No recent activity.",
    magicApplied: "Magic applied to {name}!",
    errorImages: "Only image files allowed.",
    abort: "Process cancelled.",
    ready: "Done.",
    processedSingle: "1 file processed",
    processedPlural: "{count} files processed",
    saved: "Saved {size} in total.",
    start: "Start conversion",
    processing: "Processing files...",
    smartCrop: "Smart Crop",
    watermark: "Watermark",
    rename: "Rename Pattern",
    working: "Working...",
    viewBatchDetail: "View batch details",
    clearHistory: "Clear history",
    downloadImage: "Download image",
    downloadZip: "Download ZIP",
    singleFile: "Single file",
    saveToFolder: "Save to folder",
    downloadIndividually: "Downloads individually",
    downloadOptions: "Download Options",
    transparencyWarningTitle: "Warning: Transparency loss",
    transparencyWarningDesc: "You selected JPEG, but {count} image(s) contain transparency. They will have a solid background.",
    isolateAllWebp: "Isolate all as WebP",
    hideDetails: "Hide details",
    viewImages: "View images...",
    isolate: "Isolate",
    done: "Done",
    skipped: "Skipped",
    failed: "Failed",
    pipelineProgress: "Pipeline Progress",
    originalSize: "Original",
    files: "files",
    file: "file",
    ratio: "Ratio"
  }
};

interface HistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  filesCount: number;
  totalInputSize: number;
  totalOutputSize: number;
  format: string;
}

export default function HomeClient() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [mode, setMode] = useState<UIMode>("easy");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [customPresets, setCustomPresets] = useState<TransformPreset[]>([]);
  const [easySettings, setEasySettings] = useState<EasySettings>(DEFAULT_EASY_SETTINGS);
  const [options, setOptions] = useState<TransformOptions>(DEFAULT_OPTIONS);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<ProcessStage>("idle");
  const [isTransparentAlertExpanded, setIsTransparentAlertExpanded] = useState(false);

  const t = TRANSLATIONS[lang];
  const progress = stage === "idle" ? 0 : stage === "preparing" ? 18 : stage === "processing" ? 66 : stage === "downloading" ? 90 : 100;
  const [selectedPresetId, setSelectedPresetId] = useState<string>("webp-web");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<ProcessStats | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === "easy" || savedMode === "pro") setMode(savedMode);
    const rawOptions = localStorage.getItem(OPTIONS_STORAGE_KEY);
    if (rawOptions) {
      try { setOptions(parseTransformOptions(JSON.parse(rawOptions))); }
      catch { localStorage.removeItem(OPTIONS_STORAGE_KEY); }
    }
    const rawEasy = localStorage.getItem(EASY_STORAGE_KEY);
    if (rawEasy) {
      try { setEasySettings(parseEasySettings(JSON.parse(rawEasy))); }
      catch { localStorage.removeItem(EASY_STORAGE_KEY); }
    }
    const savedLang = localStorage.getItem("webp-lab.lang.v1");
    if (savedLang === "es" || savedLang === "en") setLang(savedLang);
    const savedHistory = localStorage.getItem("webp-lab.history.v1");
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); }
      catch { localStorage.removeItem("webp-lab.history.v1"); }
    }
    const savedCustomPresets = localStorage.getItem("webp-lab.custom-presets.v1");
    if (savedCustomPresets) {
      try { setCustomPresets(JSON.parse(savedCustomPresets)); }
      catch { localStorage.removeItem("webp-lab.custom-presets.v1"); }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter" && queue.length > 0 && !processing) {
        e.preventDefault();
        processImages();
      }
      if (e.key === "Escape") {
        if (isEditorOpen) setIsEditorOpen(false);
        else if (queue.length > 0 && !processing) {
          // Confirm before clearing? Maybe just leave it for now.
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [queue.length, processing, isEditorOpen]);

  // Debounced persistence to avoid main-thread blocking during fast edits
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
      localStorage.setItem(EASY_STORAGE_KEY, JSON.stringify(easySettings));
      localStorage.setItem(MODE_STORAGE_KEY, mode);
      localStorage.setItem("webp-lab.lang.v1", lang);
      localStorage.setItem("webp-lab.history.v1", JSON.stringify(history));
      localStorage.setItem("webp-lab.custom-presets.v1", JSON.stringify(customPresets));
    }, 1000);
    return () => clearTimeout(timer);
  }, [options, easySettings, mode, lang, history, customPresets]);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      abortRef.current?.abort();
    };
  }, []);

  const totalUploadSize = useMemo(() => queue.reduce((sum, item) => sum + item.file.size, 0), [queue]);
  const compressionRatio = useMemo(() => {
    if (!stats || stats.inputBytes <= 0) return null;
    return Math.max(0, 100 - (stats.outputBytes / stats.inputBytes) * 100);
  }, [stats]);
  const effectiveOptions = useMemo(
    () => (mode === "easy" ? buildOptionsFromEasy(easySettings) : options),
    [mode, easySettings, options],
  );

  const estimatedOutputSize = useMemo(() => {
    return estimateImpact(totalUploadSize, effectiveOptions.format, effectiveOptions.quality, effectiveOptions.width, effectiveOptions.height);
  }, [totalUploadSize, effectiveOptions]);

  const transparentFiles = useMemo(() => {
    if (effectiveOptions.format !== "jpeg") return [];
    return queue.filter(q => !q.isolatedFormat && (q.file.type === "image/png" || q.file.type === "image/svg+xml"));
  }, [queue, effectiveOptions.format]);

  const transparentFilesCount = transparentFiles.length;

  useEffect(() => {
    if (transparentFilesCount === 0) {
      setIsTransparentAlertExpanded(false);
    }
  }, [transparentFilesCount]);

  const previewItems = queue.slice(0, MAX_PREVIEW_ITEMS);
  const hiddenPreviewCount = Math.max(0, queue.length - previewItems.length);

  const addFiles = (incomingFiles: File[]): void => {
    const filtered = incomingFiles.filter(isImageFile);
    if (filtered.length === 0) {
      setError("Solo se permiten archivos de imagen.");
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setQueue((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const additions: QueueItem[] = [];
      filtered.forEach((file) => {
        const id = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existingIds.has(id)) {
          additions.push({ id, file, previewUrl: URL.createObjectURL(file) });
        }
      });
      return [...prev, ...additions];
    });
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);
    addFiles(files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const removeFile = (id: string): void => {
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearAll = (): void => {
    setQueue((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const saveCustomPreset = (name: string, optionsToSave: TransformOptions) => {
    const newId = `custom-${Date.now()}`;
    const newPreset: TransformPreset = {
      id: newId,
      label: name,
      description: `Receta personalizada: ${name}`,
      options: { ...optionsToSave }
    };
    setCustomPresets(prev => [...prev, newPreset]);
    setSelectedPresetId(newId);
  };

  const deleteCustomPreset = (id: string) => {
    setCustomPresets(prev => prev.filter(p => p.id !== id));
    if (selectedPresetId === id) {
      setSelectedPresetId("webp-web");
      setOptions(DEFAULT_OPTIONS);
    }
  };

  const applySelectedPreset = (presetId: string): void => {
    const preset = PRESETS.find((item) => item.id === presetId) || customPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setOptions((prev) => applyPreset(prev, preset));
  };

  const resetOptions = (): void => {
    setSelectedPresetId("webp-web");
    setOptions(DEFAULT_OPTIONS);
    setEasySettings(DEFAULT_EASY_SETTINGS);
    localStorage.removeItem(OPTIONS_STORAGE_KEY);
    localStorage.removeItem(EASY_STORAGE_KEY);
  };

  const abortProcessing = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProcessing(false);
    setStage("idle");
    setError("Proceso cancelado.");
  };

  const processImages = async (downloadMode: 'zip' | 'folder' = 'zip'): Promise<void> => {
    if (queue.length === 0 || processing) return;
    setProcessing(true);
    setStage("preparing");
    setError(null);
    setSuccessMessage(null);
    const controller = new AbortController();
    abortRef.current = controller;

    setQueue(prev => prev.map(q => ({ ...q, status: "idle" })));

    let dirHandle: any = null;
    if (downloadMode === 'folder') {
      try {
        if ('showDirectoryPicker' in window) {
          dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        } else {
          console.warn("Direct file access not available/allowed, falling back to ZIP");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          abortRef.current = null;
          setProcessing(false);
          setStage("idle");
          return;
        }
        console.warn("Direct file access error, falling back to ZIP", err);
      }
    }

    try {
      if (dirHandle) {
        setStage("processing");
        let processedFiles = 0;
        let failedFiles = 0;
        let totalInputBytes = 0;
        let totalOutputBytes = 0;

        for (const item of queue) {
          if (abortRef.current?.signal.aborted) break;

          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "processing" } : q));

          try {
            const payload = new FormData();
            payload.append("files", item.file, item.file.name);
            const currentOptions = { ...effectiveOptions, ...item.customOverrides };
            if (item.isolatedFormat && !item.customOverrides?.format) {
              currentOptions.format = item.isolatedFormat;
            }
            payload.append("options", JSON.stringify(currentOptions));

            const response = await fetch("/api/transform", {
              method: "POST",
              body: payload,
              signal: controller.signal,
            });

            if (!response.ok) {
              throw new Error("Error processing file"); // Triggers catch below
            }

            const blob = await response.blob();
            const proposedName = parseContentDispositionFileName(response.headers.get("content-disposition"));

            // Intelligent transparency validation logic
            const hasTransparency = response.headers.get("x-has-transparency") === "true";
            if (currentOptions.format === "jpeg" && hasTransparency) {
              const confirm = window.confirm(
                "Algunas de las imágenes que intentas convertir a JPEG tienen transparencia. " +
                "JPEG no soporta transparencia y se reemplazará con un fondo blanco. " +
                "¿Deseas continuar?"
              );
              if (!confirm) {
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "skipped" as const } : q));
                failedFiles++; // Count as failed or skipped
                continue; // Skip this file
              }
            }

            const originalNameWithoutExt = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
            const fallbackName = `resultado-${originalNameWithoutExt}.${currentOptions.format}`;
            const finalName = proposedName ?? fallbackName;

            const fileHandle = await dirHandle.getFileHandle(finalName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            totalInputBytes += parseHeaderNumber(response.headers.get("x-total-input-bytes")) || item.file.size;
            totalOutputBytes += parseHeaderNumber(response.headers.get("x-total-output-bytes")) || blob.size;
            processedFiles++;

            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "done" } : q));
          } catch (itemErr) {
            console.error("Failed to process item", itemErr);
            failedFiles++;
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "error" } : q));
          }
        }

        setStage("done");

        const nextStats: ProcessStats = {
          inputBytes: totalInputBytes,
          outputBytes: totalOutputBytes,
          processedFiles,
          failedFiles,
        };

        setStats(nextStats);

        const historyItem: HistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          fileName: queue.length > 1 ? `Directorio seleccionado (${processedFiles} archivos)` : queue[0].file.name,
          filesCount: processedFiles,
          totalInputSize: nextStats.inputBytes,
          totalOutputSize: nextStats.outputBytes,
          format: effectiveOptions.format
        };
        setHistory(prev => [historyItem, ...prev].slice(0, 10));

        const partialText = nextStats.failedFiles > 0 ? ` (${nextStats.failedFiles} con error)` : "";
        setSuccessMessage(`${t.ready} ${processedFiles === 1 ? t.processedSingle : t.processedPlural.replace("{count}", processedFiles.toString())}${partialText}.`);

      } else {
        const payload = new FormData();
        queue.forEach((item) => {
          payload.append("files", item.file, item.file.name);
          const currentOptions = { ...effectiveOptions, ...item.customOverrides };
          if (item.isolatedFormat && !item.customOverrides?.format) {
            currentOptions.format = item.isolatedFormat;
          }
          payload.append("fileOptions", JSON.stringify(currentOptions));
        });
        payload.append("options", JSON.stringify(effectiveOptions));

        setStage("processing");
        const response = await fetch("/api/transform", {
          method: "POST",
          body: payload,
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Error inesperado al procesar archivos.");
        }

        setStage("downloading");
        const blob = await response.blob();
        const proposedName = parseContentDispositionFileName(response.headers.get("content-disposition"));
        const fallbackName = queue.length > 1 ? "webp-lab-resultado.zip" : `resultado.${effectiveOptions.format}`;
        const finalName = proposedName ?? fallbackName;

        downloadBlob(blob, finalName);
        setLastFileName(finalName);

        const nextStats: ProcessStats = {
          inputBytes: parseHeaderNumber(response.headers.get("x-total-input-bytes")),
          outputBytes: parseHeaderNumber(response.headers.get("x-total-output-bytes")),
          processedFiles: parseHeaderNumber(response.headers.get("x-processed-files")),
          failedFiles: parseHeaderNumber(response.headers.get("x-failed-files")),
        };

        setStats(nextStats);
        setStage("done");

        setQueue(prev => prev.map(q => ({ ...q, status: "done" })));

        const historyItem: HistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          fileName: queue.length > 1 ? finalName : queue[0].file.name,
          filesCount: nextStats.processedFiles || queue.length,
          totalInputSize: nextStats.inputBytes,
          totalOutputSize: nextStats.outputBytes,
          format: effectiveOptions.format
        };
        setHistory(prev => [historyItem, ...prev].slice(0, 10));

        const partialText = nextStats.failedFiles > 0 ? ` (${nextStats.failedFiles} con error)` : "";
        const finalCount = nextStats.processedFiles || queue.length;
        setSuccessMessage(`${t.ready} ${finalCount === 1 ? t.processedSingle : t.processedPlural.replace("{count}", finalCount.toString())}${partialText}.`);
      }
    } catch (processingError) {
      const message = processingError instanceof Error
        ? processingError.name === "AbortError" ? "Proceso cancelado." : processingError.message
        : "La operacion fallo.";
      setError(message);
      setStage("idle");
    } finally {
      abortRef.current = null;
      setProcessing(false);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-x-clip px-4 py-6 md:px-8 md:py-10">
      <div className="backdrop-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <section className="mx-auto max-w-7xl space-y-8">
        <header className="panel overflow-hidden rounded-[2.5rem] p-8 md:p-12 relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles size={120} />
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <Logo className="w-5 h-5 flex-shrink-0" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)] font-bold">
                    {t.heroBadge}
                  </p>
                </motion.div>
                <div className="h-px w-8 bg-[var(--line)]" />
                <div className="flex bg-[var(--ink-0)]/5 rounded-full p-1 border border-[var(--line)]">
                  <button onClick={() => setLang("es")} className={`px-2 py-0.5 text-[8px] font-bold rounded-full transition-all ${lang === "es" ? "bg-white text-black shadow-sm" : "text-[var(--ink-soft)]"}`}>ES</button>
                  <button onClick={() => setLang("en")} className={`px-2 py-0.5 text-[8px] font-bold rounded-full transition-all ${lang === "en" ? "bg-white text-black shadow-sm" : "text-[var(--ink-soft)]"}`}>EN</button>
                </div>
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-3xl text-4xl font-bold leading-[1.1] md:text-6xl text-[var(--ink-0)]"
              >
                {t.heroTitle}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 max-w-xl text-lg text-[var(--ink-soft)] font-medium leading-relaxed"
              >
                {t.heroDesc}
              </motion.p>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 self-end">
                <div className="inline-flex w-fit rounded-2xl bg-[var(--ink-0)]/5 p-1.5 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => setMode("easy")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${mode === "easy" ? "bg-white text-[var(--accent)] shadow-sm" : "text-[var(--ink-soft)] hover:text-[var(--ink-0)]"}`}
                  >
                    <Sparkles size={14} />
                    {t.modeEasy}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("pro")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${mode === "pro" ? "bg-white text-[var(--accent)] shadow-sm" : "text-[var(--ink-soft)] hover:text-[var(--ink-0)]"}`}
                  >
                    <Settings2 size={14} />
                    {t.modePro}
                  </button>
                </div>
                <InfoTooltip
                  title={lang === 'es' ? "Modos de Trabajo" : "Work Modes"}
                  lang={lang}
                  content={
                    <div className="space-y-3">
                      <p><strong>{lang === 'es' ? 'Fácil:' : 'Easy:'}</strong> {lang === 'es' ? "Te ofrece preajustes orientados a resultados reales (ej. 'Web Rápido', 'Redes Sociales') para que no tengas que preocuparte de tecnicismos." : "Provides result-oriented presets (e.g., 'Fast Web', 'Social Media') so you don't have to worry about technical details."}</p>
                      <p><strong>{lang === 'es' ? 'Avanzado:' : 'Expert:'}</strong> {lang === 'es' ? "Desbloquea control total sobre los algoritmos, barras de compresión, recortes exactos, corrección de color y marca de agua." : "Unlocks full control over algorithms, compression sliders, exact cropping, color correction, and watermark."}</p>
                      <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-2">
                        <p className="font-bold text-[var(--accent)] flex items-center gap-1.5"><SlidersHorizontal size={14} /> {lang === 'es' ? 'Configuración Global vs Individual' : 'Global vs Individual Settings'}</p>
                        <p className="text-sm text-[var(--ink-soft)]">{lang === 'es' ? 'Los ajustes de este panel se aplicarán a TODAS las imágenes por defecto. Sin embargo, si editas una imagen de forma individual (tocando el icono de ajustes directamente en la foto), esos cambios concretos sobreescribirán las opciones globales solo para esa imagen.' : 'The settings in this panel apply to ALL images by default. However, if you edit an image individually (by clicking the settings icon directly on the photo), those specific changes will override the global options only for that image.'}</p>
                      </div>
                    </div>
                  }
                />
              </div>

              <StatsGrid
                queueLength={queue.length}
                totalSize={formatBytes(totalUploadSize)}
                compressionRatio={compressionRatio}
                lang={lang}
              />
            </div>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-3">
            {[
              { step: "1", title: t.step1, desc: t.step1Desc, icon: <Loader2 size={16} /> },
              { step: "2", title: t.step2, desc: mode === "easy" ? t.step2Desc : t.step2DescPro, icon: <Settings2 size={16} /> },
              { step: "3", title: t.step3, desc: t.step3Desc, icon: <Download size={16} /> },
            ].map((item, idx) => (
              <motion.article
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (idx * 0.1) }}
                className="group relative rounded-3xl border border-[var(--line)] bg-white/50 p-5 hover:bg-white hover:border-[var(--accent)] transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink-0)] text-[10px] font-bold text-white uppercase tracking-tighter">
                    {item.step}
                  </span>
                  <div className="h-px flex-1 bg-[var(--line)] group-hover:bg-[var(--accent)]/30 transition-colors" />
                </div>
                <p className="text-base font-bold text-[var(--ink-0)] group-hover:text-[var(--accent)] transition-colors">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--ink-soft)] font-medium">{item.desc}</p>
              </motion.article>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <section className="glass rounded-[2rem] p-6 md:p-8 flex flex-col h-full">
            <UploadZone
              dragActive={dragActive}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onFileInput={handleFileInput}
              queueLength={queue.length}
              lang={lang}
            />

            <FileList
              queue={queue}
              previewItems={previewItems}
              hiddenPreviewCount={hiddenPreviewCount}
              formatBytes={formatBytes}
              removeFile={removeFile}
              clearAll={() => {
                setQueue([]);
                setStage("idle");
                setHistory([]);
                localStorage.removeItem("webp-lab.history.v1");
              }}
              onEdit={(item) => {
                setEditingItem(item);
                setIsEditorOpen(true);
              }}
              onMagic={(item) => {
                setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, magicApplied: true } : q)));
                setSuccessMessage(t.magicApplied.replace("{name}", item.file.name));
                setTimeout(() => setSuccessMessage(null), 3000);
              }}
              onRemoveIsolation={(id) => setQueue(prev => prev.map(q => q.id === id ? { ...q, isolatedFormat: undefined } : q))}
              options={effectiveOptions}
              lang={lang}
            />
          </section>

          <section className="glass rounded-[2rem] p-6 md:p-8 border-l border-[var(--line)] flex flex-col h-full">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {mode === "easy" ? (
                  <EasyConfig
                    key="easy"
                    settings={easySettings}
                    setSettings={setEasySettings}
                    outputFormats={OUTPUT_FORMATS}
                    sizeLabel={(size) => easySizeLabel(size, lang)}
                    compressionText={(level: 1 | 2 | 3) => {
                      if (level === 1) return lang === 'es' ? "Máximo ahorro" : "Max Savings";
                      if (level === 2) return lang === 'es' ? "Equilibrado" : "Balanced";
                      return lang === 'es' ? "Mejor calidad" : "Best Quality";
                    }}
                    reset={resetOptions}
                    previewOptions={{
                      format: effectiveOptions.format,
                      quality: effectiveOptions.quality,
                      size: effectiveOptions.width || effectiveOptions.height ? `${effectiveOptions.width ?? "auto"} x ${effectiveOptions.height ?? "auto"}` : t.originalSize
                    }}
                    lang={lang}
                  />
                ) : (
                  <ProConfig
                    key="pro"
                    options={options}
                    setOptions={setOptions}
                    selectedPresetId={selectedPresetId}
                    applyPreset={applySelectedPreset}
                    reset={resetOptions}
                    parseOptions={parseTransformOptions}
                    customPresets={customPresets}
                    saveCustomPreset={saveCustomPreset}
                    deleteCustomPreset={deleteCustomPreset}
                    lang={lang}
                  />
                )}
              </AnimatePresence>
            </div>

            {totalUploadSize > 0 && (
              <div className="mt-6">
                <LiveImpactBadge inputBytes={totalUploadSize} estimatedOutputBytes={estimatedOutputSize} lang={lang} />
              </div>
            )}

            <div className="mt-8 space-y-6 pt-6 border-t border-[var(--line)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  <span>{t.pipelineProgress}</span>
                  <span className={processing ? "text-[var(--accent)] animate-pulse" : ""}>
                    {stage === 'done' ? t.ready : stage === 'idle' ? t.ready : t.working}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--line)]/30 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${stage === 'done' ? 'bg-[var(--accent-2)]' : 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]'}`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {transparentFilesCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 mb-2 overflow-hidden"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-bold">{t.transparencyWarningTitle}</p>
                          <p className="text-xs font-medium opacity-90 mt-1">
                            {lang === 'es'
                              ? t.transparencyWarningDesc.replace("{count}", transparentFilesCount.toString()).replace("{plural}", transparentFilesCount === 1 ? 'imagen contiene' : 'imágenes contienen')
                              : t.transparencyWarningDesc.replace("{count}", transparentFilesCount.toString())
                            }
                          </p>

                          <div className="mt-4 space-y-3">
                            <div className="flex gap-2 items-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setQueue(prev => prev.map(q =>
                                    (!q.isolatedFormat && (q.file.type === "image/png" || q.file.type === "image/svg+xml"))
                                      ? { ...q, isolatedFormat: "webp" }
                                      : q
                                  ));
                                }}
                                className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition-colors whitespace-nowrap"
                              >
                                {t.isolateAllWebp}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsTransparentAlertExpanded(!isTransparentAlertExpanded)}
                                className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 transition-colors whitespace-nowrap flex items-center gap-1"
                              >
                                {isTransparentAlertExpanded ? t.hideDetails : t.viewImages}
                              </button>
                            </div>

                            <AnimatePresence>
                              {isTransparentAlertExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-amber-500/20 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {transparentFiles.map(file => (
                                      <div key={file.id} className="flex items-center justify-between gap-3 bg-white/50 rounded-lg p-1.5 border border-amber-500/20">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <img src={file.previewUrl} alt="" className="w-8 h-8 rounded shrink-0 object-cover bg-black/5" />
                                          <span className="text-xs font-medium truncate text-[var(--ink-0)]" title={file.file.name}>
                                            {file.file.name}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQueue(prev => prev.map(q => q.id === file.id ? { ...q, isolatedFormat: "webp" } : q));
                                          }}
                                          className="shrink-0 rounded bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-500 hover:text-white transition-colors"
                                        >
                                          {t.isolate}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!processing ? (
                  queue.length === 1 ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => processImages('zip')}
                      className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[var(--ink-0)] text-sm font-bold text-white shadow-xl shadow-black/10 transition-all hover:bg-[var(--ink-soft)]"
                    >
                      <div className="flex items-center gap-3">
                        <Download size={18} />
                        {t.downloadImage}
                      </div>
                    </motion.button>
                  ) : (
                    <div className="flex sm:flex-row flex-col items-center gap-3">
                      <div className="flex w-full gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => processImages('zip')}
                          className="relative flex h-14 w-full flex-col leading-tight items-center justify-center overflow-hidden rounded-2xl bg-[var(--ink-0)] text-sm font-bold text-white shadow-xl shadow-black/10 transition-all hover:bg-[var(--ink-soft)]"
                        >
                          <span className="flex items-center gap-2 text-sm"><Download size={14} /> {t.downloadZip}</span>
                          <span className="text-[10px] opacity-70 font-normal mt-0.5">{t.singleFile}</span>
                        </motion.button>

                        {(typeof window !== 'undefined' && 'showDirectoryPicker' in window) && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => processImages('folder')}
                            className="relative flex h-14 w-full flex-col leading-tight items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent)] text-sm font-bold text-white shadow-xl shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-2)]"
                          >
                            <span className="flex items-center gap-2 text-sm"><Save size={14} /> {t.saveToFolder}</span>
                            <span className="text-[10px] opacity-90 font-normal mt-0.5">{t.downloadIndividually}</span>
                          </motion.button>
                        )}
                      </div>
                      <InfoTooltip
                        title={t.downloadOptions}
                        lang={lang}
                        content={
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-bold flex items-center gap-2 mb-1"><Download size={14} /> {t.downloadZip}</h4>
                              <p className="text-[var(--ink-soft)]">{lang === 'es' ? "Procesa todas las fotos en memoria temporal y descarga un único archivo" : "Processes all photos in temporary memory and downloads a single"} <code>.zip</code> {lang === 'es' ? "archivo. " : "file. "}<strong className="text-amber-600">{lang === 'es' ? "Recomendado solo para grupos pequeños" : "Recommended ONLY for small batches"}</strong>{lang === 'es' ? ", ya que lotes inmensos pueden colapsar el navegador por falta de RAM al tener que retenerlas juntas para empaquetarlas." : ", as massive batches can crash the browser due to lack of RAM when holding them together to pack."}</p>
                            </div>
                            <div>
                              <h4 className="font-bold flex items-center gap-2 mb-1 text-[var(--accent)]"><Save size={14} /> {t.saveToFolder}</h4>
                              <p className="text-[var(--ink-soft)]">{lang === 'es' ? "Te pedirá permisos para acceder a una carpeta de tu ordenador. Irá codificando la imagen y" : "Will ask for permission to access a folder on your computer. It encodes the image and"} <strong>{lang === 'es' ? "escribiéndola directamente en tu disco duro" : "writes it directly to your hard drive"}</strong>{lang === 'es' ? ", liberando la memoria y pasando a la siguiente. ¡La opción más segura, fiable e infinita para cientos de fotos gigantes!" : ", freeing memory and moving to the next one. The safest, most reliable, and infinite option for hundreds of giant photos!"}</p>
                            </div>
                          </div>
                        }
                      />
                    </div>
                  )
                ) : (
                  <button disabled className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[var(--ink-0)] text-sm font-bold text-white shadow-xl shadow-black/10 transition-all opacity-40">
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin" size={18} />
                      {t.processing}
                    </div>
                  </button>
                )}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-3 rounded-2xl bg-[var(--danger)]/10 p-4 text-[var(--danger)]"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3 rounded-2xl bg-[var(--accent-2)]/10 p-4 border border-[var(--accent-2)]/20 text-[var(--ink-0)]"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="shrink-0 text-[var(--accent-2)] mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">{successMessage}</p>
                        {stats && (
                          <p className="mt-1 text-xs font-medium text-[var(--ink-soft)]">
                            {t.saved.replace("{size}", formatBytes(stats.inputBytes - stats.outputBytes))}
                          </p>
                        )}
                      </div>
                    </div>
                    {queue.length > 0 && (
                      <details className="mt-2 text-xs group">
                        <summary className="cursor-pointer font-bold text-[var(--ink-light)] hover:text-[var(--ink-soft)] transition border-t border-[var(--accent-2)]/20 pt-3 flex items-center gap-1 list-none outline-none">
                          <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                          {t.viewBatchDetail}
                        </summary>
                        <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2 pb-1">
                          {queue.map(q => (
                            <div key={q.id} className="flex items-center justify-between bg-white/60 p-2 rounded-lg border border-black/5 shadow-sm">
                              <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <img src={q.previewUrl} className="w-6 h-6 rounded-md object-cover bg-black/5 shrink-0" alt="" />
                                <span className="truncate font-semibold text-[var(--ink-soft)]" title={q.file.name}>{q.file.name}</span>
                              </div>
                              {q.status === 'done' && <span className="text-emerald-700 font-bold px-2 py-0.5 bg-emerald-500/15 rounded uppercase text-[9px] whitespace-nowrap">{t.done}</span>}
                              {q.status === 'skipped' && <span className="text-amber-700 font-bold px-2 py-0.5 bg-amber-500/15 rounded uppercase text-[9px] whitespace-nowrap">{t.skipped}</span>}
                              {q.status === 'error' && <span className="text-red-700 font-bold px-2 py-0.5 bg-red-500/15 rounded uppercase text-[9px] whitespace-nowrap">{t.failed}</span>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
        {/* Section de Historial */}
        <section className="glass rounded-[2rem] p-8 md:p-12 mt-12 overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Undo2 size={24} className="text-[var(--accent)]" />
              {t.history}
            </h2>
            <button
              onClick={() => setHistory([])}
              className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] hover:text-[var(--danger)] transition-colors"
            >
              {t.clearHistory}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {history.length > 0 ? history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="panel p-5 rounded-3xl group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-full bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-1 text-[10px] font-bold uppercase">
                    {item.format}
                  </span>
                  <span className="text-[10px] text-[var(--ink-soft)] font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="font-bold text-sm truncate mb-1">{item.fileName}</p>
                <p className="text-[10px] text-[var(--ink-soft)] mb-4">{item.filesCount} {item.filesCount === 1 ? t.file : t.files}</p>
                <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mb-0.5">{t.ratio}</p>
                    <p className="text-xs font-bold text-[var(--accent-2)]">
                      -{Math.round(100 - (item.totalOutputSize / item.totalInputSize) * 100)}%
                    </p>
                  </div>
                  <Download size={14} className="text-[var(--ink-soft)] opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-[var(--line)] rounded-[2.5rem]">
                <p className="text-[var(--ink-soft)] text-sm font-medium">{t.noHistory}</p>
              </div>
            )}
          </div>
        </section>
      </section>

      <footer className="mx-auto max-w-7xl mt-12 pb-12 text-center">
        <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-[0.2em] opacity-50">
          Powered by Sharp & Next.js • WebP Lab 2026
        </p>
      </footer>

      {editingItem && (
        <ImageEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          image={{
            id: editingItem.id,
            file: editingItem.file,
            url: editingItem.previewUrl
          }}
          options={effectiveOptions}
          itemOverrides={editingItem.customOverrides}
          onSaveOverrides={(overrides) => {
            setQueue(prev => prev.map(q => q.id === editingItem.id ? { ...q, customOverrides: overrides } : q));
          }}
          lang={lang}
        />
      )}
    </main>
  );
}
