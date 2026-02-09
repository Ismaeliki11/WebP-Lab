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
  Undo2
} from "lucide-react";

import {
  DEFAULT_OPTIONS,
  OUTPUT_FORMATS,
  PRESETS,
  RESIZE_FITS,
  TransformOptions,
  applyPreset,
  formatBytes,
  parseTransformOptions,
} from "@/lib/image-tools";

import { StatsGrid } from "@/components/StatsGrid";
import { UploadZone } from "@/components/UploadZone";
import { FileList } from "@/components/FileList";
import { EasyConfig } from "@/components/EasyConfig";
import { ProConfig } from "@/components/ProConfig";
import { ImageEditor } from "@/components/ImageEditor";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
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

function easySizeLabel(size: EasySize): string {
  if (size === "original") return "Original";
  return `${size}px ancho maximo`;
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
    processed: "{count} archivo(s) procesado(s)",
    saved: "Se han ahorrado {size} en total.",
    start: "Iniciar conversión",
    processing: "Procesando archivos...",
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
    processed: "{count} file(s) processed",
    saved: "Saved {size} in total.",
    start: "Start conversion",
    processing: "Processing files...",
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
  const [easySettings, setEasySettings] = useState<EasySettings>(DEFAULT_EASY_SETTINGS);
  const [options, setOptions] = useState<TransformOptions>(DEFAULT_OPTIONS);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<ProcessStage>("idle");

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
    }, 1000);
    return () => clearTimeout(timer);
  }, [options, easySettings, mode, lang, history]);

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

  const applySelectedPreset = (presetId: string): void => {
    const preset = PRESETS.find((item) => item.id === presetId);
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

  const processImages = async (): Promise<void> => {
    if (queue.length === 0 || processing) return;
    setProcessing(true);
    setStage("preparing");
    setError(null);
    setSuccessMessage(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload = new FormData();
      queue.forEach((item) => payload.append("files", item.file, item.file.name));
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

      const historyItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        fileName: queue.length > 1 ? finalName : queue[0].file.name,
        filesCount: nextStats.processedFiles || queue.length,
        totalInputSize: nextStats.inputBytes,
        totalOutputSize: nextStats.outputBytes,
        format: effectiveOptions.format
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 10));

      const partialText = nextStats.failedFiles > 0 ? ` (${nextStats.failedFiles} con error)` : "";
      setSuccessMessage(`${t.ready} ${t.processed.replace("{count}", (nextStats.processedFiles || queue.length).toString())}${partialText}.`);
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
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)] font-bold"
                >
                  {t.heroBadge}
                </motion.p>
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
              <div className="inline-flex w-fit rounded-2xl bg-[var(--ink-0)]/5 p-1.5 backdrop-blur-sm self-end">
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

              <StatsGrid
                queueLength={queue.length}
                totalSize={formatBytes(totalUploadSize)}
                compressionRatio={compressionRatio}
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
            />

            <FileList
              queue={queue}
              previewItems={previewItems}
              hiddenPreviewCount={hiddenPreviewCount}
              formatBytes={formatBytes}
              removeFile={removeFile}
              clearAll={clearAll}
              onEdit={(item) => {
                setEditingItem(item);
                setIsEditorOpen(true);
              }}
              onMagic={(item) => {
                setOptions(prev => ({
                  ...prev,
                  brightness: 1.05,
                  contrast: 1.1,
                  saturation: 1.2,
                  sharpen: true
                }));
                setSuccessMessage(t.magicApplied.replace("{name}", item.file.name));
                setTimeout(() => setSuccessMessage(null), 3000);
              }}
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
                    sizeLabel={easySizeLabel}
                    compressionText={(level: 1 | 2 | 3) => {
                      if (level === 1) return lang === 'es' ? "Máximo ahorro" : "Max Savings";
                      if (level === 2) return lang === 'es' ? "Equilibrado" : "Balanced";
                      return lang === 'es' ? "Mejor calidad" : "Best Quality";
                    }}
                    reset={resetOptions}
                    previewOptions={{
                      format: effectiveOptions.format,
                      quality: effectiveOptions.quality,
                      size: effectiveOptions.width || effectiveOptions.height ? `${effectiveOptions.width ?? "auto"} x ${effectiveOptions.height ?? "auto"}` : "Original"
                    }}
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
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 space-y-6 pt-6 border-t border-[var(--line)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  <span>{lang === 'es' ? 'Progreso de pipeline' : 'Pipeline Progress'}</span>
                  <span className={processing ? "text-[var(--accent)] animate-pulse" : ""}>
                    {stage === 'done' ? t.ready : stage === 'idle' ? t.ready : lang === 'es' ? 'Trabajando...' : 'Working...'}
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
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={processImages}
                  disabled={processing || queue.length === 0}
                  className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[var(--ink-0)] text-sm font-bold text-white shadow-xl shadow-black/10 transition-all hover:bg-[var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {processing ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin" size={18} />
                      {t.processing}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <ChevronRight size={18} />
                      3. {t.start}
                    </div>
                  )}
                </motion.button>
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
                    className="flex items-start gap-3 rounded-2xl bg-[var(--accent-2)]/10 p-4 text-[var(--accent-2)]"
                  >
                    <CheckCircle2 size={18} className="shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{successMessage}</p>
                      {stats && (
                        <p className="mt-1 text-xs font-medium opacity-80">
                          {t.saved.replace("{size}", formatBytes(stats.inputBytes - stats.outputBytes))}
                        </p>
                      )}
                    </div>
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
              {lang === 'es' ? 'Limpiar historial' : 'Clear history'}
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
                <p className="text-[10px] text-[var(--ink-soft)] mb-4">{item.filesCount} {lang === 'es' ? 'archivos' : 'files'}</p>
                <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mb-0.5">Ratio</p>
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
          options={options}
          setOptions={setOptions}
        />
      )}
    </main>
  );
}
