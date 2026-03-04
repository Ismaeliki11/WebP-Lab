
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, FileImage, Trash2, SlidersHorizontal, CheckCircle2, AlertCircle, Loader2, AlertTriangle, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { TransformOptions, estimateImpact, formatBytes } from "@/lib/image-tools";
import { InfoTooltip } from "./InfoTooltip";

interface QueueItem {
    id: string;
    file: File;
    previewUrl: string;
    status?: "idle" | "processing" | "done" | "error" | "skipped";
    isolatedFormat?: "webp" | "avif" | "jpeg" | "png";
    customOverrides?: Partial<TransformOptions>;
}

interface FileListProps {
    queue: QueueItem[];
    previewItems: QueueItem[];
    hiddenPreviewCount: number;
    formatBytes: (bytes: number) => string;
    removeFile: (id: string) => void;
    clearAll: () => void;
    onEdit: (item: QueueItem) => void;
    onMagic: (item: QueueItem) => void;
    onRemoveIsolation: (id: string) => void;
    options: TransformOptions;
    lang: "es" | "en";
}

export function FileList({
    queue,
    previewItems,
    hiddenPreviewCount,
    formatBytes,
    removeFile,
    clearAll,
    onEdit,
    onMagic,
    onRemoveIsolation,
    options,
    lang,
}: FileListProps) {
    const LABEL_MAP: Record<string, { es: string; en: string }> = {
        format: { es: 'Formato', en: 'Format' },
        quality: { es: 'Calidad', en: 'Quality' },
        width: { es: 'Ancho', en: 'Width' },
        height: { es: 'Alto', en: 'Height' },
        fit: { es: 'Ajuste', en: 'Fit' },
        rotate: { es: 'Rotación', en: 'Rotation' },
        grayscale: { es: 'B/N', en: 'Grayscale' },
        blur: { es: 'Desenfoque', en: 'Blur' },
        sharpen: { es: 'Enfoque', en: 'Sharpen' },
        flip: { es: 'Voltear V', en: 'Flip V' },
        flop: { es: 'Voltear H', en: 'Flip H' },
        stripMetadata: { es: 'Quitar Metadatos', en: 'Strip Metadata' },
        withoutEnlargement: { es: 'Sin ampliar', en: 'Without Enlargement' },
        background: { es: 'Fondo', en: 'Background' },
        lossless: { es: 'Sin pérdida', en: 'Lossless' },
        brightness: { es: 'Brillo', en: 'Brightness' },
        saturation: { es: 'Saturación', en: 'Saturation' },
        hue: { es: 'Tono', en: 'Hue' },
        contrast: { es: 'Contraste', en: 'Contrast' },
        gamma: { es: 'Gamma', en: 'Gamma' },
        sepia: { es: 'Sepia', en: 'Sepia' },
        smartCrop: { es: 'Auto Recorte', en: 'Smart Crop' },
        watermarkText: { es: 'Texto Marca', en: 'Watermark Text' },
        watermarkOpacity: { es: 'Opacidad Marca', en: 'Watermark Opacity' },
        watermarkPosition: { es: 'Posición Marca', en: 'Watermark Position' },
        watermarkColor: { es: 'Color Marca', en: 'Watermark Color' },
        watermarkMode: { es: 'Modo Marca', en: 'Watermark Mode' },
        watermarkSize: { es: 'Tamaño Marca', en: 'Watermark Size' },
        watermarkSpacing: { es: 'Espaciado Marca', en: 'Watermark Spacing' },
        watermarkMetadata: { es: 'Metadatos Marca', en: 'Watermark Metadata' },
        seoFriendly: { es: 'Limpieza SEO', en: 'SEO Friendly' },
        renamePattern: { es: 'Patrón Nombre', en: 'Rename Pattern' },
    };

    const isHighRisk = (item: QueueItem) => {
        const itemOpts = { ...options, ...item.customOverrides };
        if (item.isolatedFormat && !item.customOverrides?.format) {
            itemOpts.format = item.isolatedFormat;
        }
        if (itemOpts.format === 'jpeg' && (item.file.type === 'image/png' || item.file.type === 'image/svg+xml')) return true;
        if (itemOpts.quality !== undefined && itemOpts.quality < 65 && item.file.size > 1024 * 1024) return true;
        if (itemOpts.blur !== undefined && itemOpts.blur > 5) return true;
        return false;
    };

    if (queue.length === 0) {
        return (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-white/60 p-8 text-center sm:p-12">
                <FileImage size={40} className="mx-auto text-[var(--line)] mb-3" />
                <p className="text-sm text-[var(--ink-soft)] font-medium">
                    {lang === 'es' ? "Todavia no hay archivos en cola." : "There are currently no files in the queue."}
                </p>
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--ink-soft)]">
                    {lang === 'es' ? "Previsualización" : "Preview"} ({previewItems.length} {lang === 'es' ? "de" : "of"} {queue.length})
                </p>
                <button
                    type="button"
                    onClick={clearAll}
                    className="flex items-center gap-1.5 rounded-full border border-transparent bg-[var(--danger)]/10 px-3 py-1 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-white"
                >
                    <Trash2 size={12} />
                    {lang === 'es' ? "Vaciar cola" : "Clear queue"}
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                    {previewItems.map((item) => (
                        <motion.li
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="list-none overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm hover:shadow-md transition-shadow group"
                        >
                            <div className="relative h-28 w-full bg-[#f8fafc]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <div className="absolute left-2 top-2 z-20 flex flex-col gap-1.5 transition-all">
                                    {item.isolatedFormat && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveIsolation(item.id); }}
                                            className="group/iso relative inline-flex items-center rounded-full bg-[var(--accent)]/90 py-0.5 pl-2 pr-0.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--accent)]"
                                            title={lang === 'es' ? "Quitar aislamiento y seguir opciones del lote" : "Remove isolation and follow batch options"}
                                        >
                                            <span className="text-[9px] font-bold text-white uppercase tracking-wider mr-1">
                                                {item.isolatedFormat}
                                            </span>
                                            <div className="rounded-full bg-black/10 p-0.5 text-white/90 group-hover/iso:bg-black/20 group-hover/iso:text-white transition-colors">
                                                <X size={10} />
                                            </div>
                                        </button>
                                    )}

                                    {isHighRisk(item) && (
                                        <InfoTooltip
                                            lang={lang}
                                            title={lang === 'es' ? "Alto Riesgo Visual ⚠️" : "High Visual Risk ⚠️"}
                                            content={
                                                <div className="space-y-2">
                                                    <p>{lang === 'es' ? "Esta foto va a sufrir una degradación muy grande si la procesas con los ajustes actuales." : "This photo will suffer severe degradation if processed with current settings."}</p>
                                                    <p>{lang === 'es' ? "Puede deberse a dos motivos:" : "This may be due to two reasons:"}</p>
                                                    <ul className="list-disc pl-5">
                                                        <li>{lang === 'es' ? <>Has marcado una <strong>Calidad muy baja</strong> y la foto original es muy pesada.</> : <>You set a <strong>Very low quality</strong> and the original photo is very large.</>}</li>
                                                        <li>{lang === 'es' ? <>Es una foto PNG con <strong>fondo transparente</strong> y la vas a convertir en JPEG (el fondo se volverá blanco o negro).</> : <>It's a PNG photo with <strong>transparent background</strong> and you are converting it to JPEG (background will become white or black).</>}</li>
                                                    </ul>
                                                    <p>{lang === 'es' ? "Te sugerimos darle al botón de Ajustes de imagen (icono de ajustes en esquina inferior) para modificarla de forma aislada." : "We suggest clicking the Image Settings button (settings icon at bottom corner) to adjust it in isolation."}</p>
                                                </div>
                                            }
                                            className="rounded-full bg-orange-500/90 p-1.5 text-white shadow-sm backdrop-blur-sm cursor-help transition-transform hover:scale-105"
                                        >
                                            <AlertTriangle size={12} />
                                        </InfoTooltip>
                                    )}
                                </div>
                                <img
                                    src={item.previewUrl}
                                    alt={item.file.name}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                                {item.status && item.status !== "idle" && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px] transition-all">
                                        {item.status === "processing" && (
                                            <div className="rounded-full bg-white p-2 shadow-sm text-[var(--accent)]">
                                                <Loader2 className="animate-spin" size={24} />
                                            </div>
                                        )}
                                        {item.status === "done" && (
                                            <div className="rounded-full bg-white p-2 shadow-sm text-green-500">
                                                <CheckCircle2 size={24} />
                                            </div>
                                        )}
                                        {item.status === "error" && (
                                            <div className="rounded-full bg-white p-2 shadow-sm text-[var(--danger)]">
                                                <AlertCircle size={24} />
                                            </div>
                                        )}
                                        {item.status === "skipped" && (
                                            <div className="rounded-full bg-white p-2 shadow-sm text-gray-500">
                                                <X size={24} />
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                            <div className="flex items-center justify-between gap-2 p-3">
                                <div className="min-w-0">
                                    {(() => {
                                        const itemOpts = { ...options, ...item.customOverrides };
                                        if (item.isolatedFormat && !item.customOverrides?.format) {
                                            itemOpts.format = item.isolatedFormat;
                                        }
                                        const estimated = estimateImpact(item.file.size, itemOpts.format, itemOpts.quality, itemOpts.width ?? null, itemOpts.height ?? null);
                                        const saved = item.file.size - estimated;
                                        const percent = Math.round((saved / item.file.size) * 100);
                                        const isSaving = saved > 0;

                                        return (
                                            <div className="flex flex-col">
                                                <span className="truncate text-sm font-bold text-[var(--ink-0)]" title={item.file.name}>
                                                    {item.file.name}
                                                </span>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-[var(--ink-soft)] bg-[var(--bg-soft)] px-2 py-0.5 rounded-md">
                                                        {formatBytes(item.file.size)}
                                                    </span>
                                                    <span className="text-[var(--ink-light)] text-xs">→</span>
                                                    <span className={`text - xs font - bold ${isSaving ? 'text-emerald-600' : 'text-amber-600'} `}>
                                                        ~{formatBytes(estimated)}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSaving ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                                                        {isSaving ? '-' : '+'}{Math.abs(percent)}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className={`flex items-center gap-2 shrink-0 ${item.status && item.status !== 'idle' ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {item.customOverrides && Object.keys(item.customOverrides).length > 0 && (() => {
                                        const changedKeys = Object.keys(item.customOverrides) as (keyof TransformOptions)[];
                                        return (
                                            <InfoTooltip
                                                lang={lang}
                                                title={lang === 'es' ? "Ajustes Personalizados" : "Custom Settings"}
                                                content={
                                                    <div className="space-y-3">
                                                        <p className="text-sm font-medium">{lang === 'es' ? "Esta imagen tiene ajustes únicos que sobreescriben la configuración global:" : "This image has unique settings that override the global configuration:"}</p>
                                                        <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                                            <ul className="list-none space-y-2">
                                                                {changedKeys.map(k => {
                                                                    const val = item.customOverrides![k];
                                                                    const glob = options[k];
                                                                    const sVal = val === null ? "null" : typeof val === 'object' ? JSON.stringify(val) : String(val);
                                                                    const sGlob = glob === null ? "null" : typeof glob === 'object' ? JSON.stringify(glob) : String(glob);
                                                                    const label = LABEL_MAP[k]?.[lang] || k;
                                                                    return (
                                                                        <li key={k} className="text-xs bg-white/50 p-2 rounded-lg border border-purple-500/20">
                                                                            <div className="font-bold text-gray-700 mb-0.5">{label}</div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-mono font-medium truncate max-w-[120px]" title={sVal}>{sVal}</span>
                                                                                <span className="opacity-60 text-[10px] truncate max-w-[100px]" title={`Global: ${sGlob}`}>(Global: {sGlob})</span>
                                                                            </div>
                                                                        </li>
                                                                    )
                                                                })}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                }
                                                className="group/ovr relative inline-flex items-center justify-center rounded-xl bg-purple-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 transition-all hover:bg-purple-200 cursor-help shadow-sm mr-1 h-[36px]"
                                            >
                                                {lang === 'es' ? "Editada" : "Edited"}
                                            </InfoTooltip>
                                        );
                                    })()}
                                    <button
                                        type="button"
                                        onClick={() => onEdit(item)}
                                        className="flex items-center justify-center rounded-xl bg-gray-100/80 p-2.5 text-[var(--ink-soft)] transition-all hover:bg-[var(--accent)] hover:text-white hover:scale-105 active:scale-95 shadow-sm"
                                        title={lang === 'es' ? "Ajustes de imagen" : "Image settings"}
                                    >
                                        <SlidersHorizontal size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(item.id)}
                                        className="flex items-center justify-center rounded-xl bg-gray-100/80 p-2.5 text-[var(--ink-soft)] transition-all hover:bg-[var(--danger)] hover:text-white hover:scale-105 active:scale-95 shadow-sm"
                                        title={lang === 'es' ? "Quitar foto" : "Remove photo"}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.li>
                    ))}
                </AnimatePresence>
            </div>

            {hiddenPreviewCount > 0 && (
                <p className="text-center text-xs font-medium text-[var(--ink-soft)] bg-white/40 py-2 rounded-full border border-[var(--line)]">
                    +{hiddenPreviewCount} {lang === 'es' ? (hiddenPreviewCount === 1 ? "archivo más" : "archivos más") : (hiddenPreviewCount === 1 ? "more file" : "more files")} {lang === 'es' ? "en cola." : "in queue."}
                </p>
            )}
        </div>
    );
}
