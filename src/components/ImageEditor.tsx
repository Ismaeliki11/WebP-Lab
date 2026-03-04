"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    RotateCw,
    FlipHorizontal,
    FlipVertical,
    Sun,
    Contrast,
    Droplets,
    Wind,
    Maximize,
    Download,
    Save,
    Palette,
    Eye,
    Eraser,
    Undo2,
    SlidersHorizontal,
    Sparkles,
    ZoomIn,
    ZoomOut,
    Type,
    Scissors,
    FileText,
    Info
} from "lucide-react";
import { TransformOptions, OutputFormat, RESIZE_FITS } from "@/lib/image-tools";
import { InfoTooltip, InfoNote } from "./InfoTooltip";

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    image: {
        id: string;
        file: File;
        url: string;
    };
    options: TransformOptions;
    itemOverrides?: Partial<TransformOptions>;
    onSaveOverrides: (overrides: Partial<TransformOptions> | undefined) => void;
    lang: "es" | "en";
}

export function ImageEditor({ isOpen, onClose, image, options, itemOverrides, onSaveOverrides, lang }: ImageEditorProps) {
    const [localOptions, setLocalOptions] = useState<TransformOptions>(() => ({ ...options, ...itemOverrides }));

    useEffect(() => {
        if (isOpen) {
            setLocalOptions({ ...options, ...itemOverrides });
            setActiveTab("general");
            setIsViewingOriginal(false);
            setZoom(1);
        }
    }, [isOpen, options, itemOverrides]);

    const [activeTab, setActiveTab] = useState<"general" | "color" | "efectos" | "avanzado">("general");
    const [sliderPos, setSliderPos] = useState(50);
    const [estimations, setEstimations] = useState<Record<string, number>>({});
    const [isEstimating, setIsEstimating] = useState(false);
    const [isViewingOriginal, setIsViewingOriginal] = useState(false);
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    const estimatedSize = estimations[localOptions.format] || null;

    const previewStyle = useMemo(() => {
        return {
            filter: `
                brightness(${localOptions.brightness}) 
                saturate(${localOptions.saturation}) 
                hue-rotate(${localOptions.hue}deg)
                contrast(${localOptions.contrast})
                blur(${localOptions.blur}px)
                ${localOptions.grayscale ? 'grayscale(1)' : ''}
                ${localOptions.sepia ? 'sepia(1)' : ''}
            `.replace(/\s+/g, ' '),
            transform: `
                rotate(${localOptions.rotate}deg) 
                scaleX(${localOptions.flop ? -1 : 1}) 
                scaleY(${localOptions.flip ? -1 : 1})
            `
        };
    }, [localOptions]);

    // Estimate size when options change (debounced)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!isOpen) return;
            setIsEstimating(true);
            try {
                const formats: ("webp" | "avif" | "jpeg")[] = ["webp", "avif", "jpeg"];
                const results: Record<string, number> = {};

                await Promise.all(formats.map(async (fmt) => {
                    const fd = new FormData();
                    fd.append("files", image.file);
                    fd.append("options", JSON.stringify({ ...localOptions, format: fmt }));
                    const res = await fetch("/api/transform", { method: "POST", body: fd });
                    if (res.ok) {
                        const size = Number(res.headers.get("x-total-output-bytes"));
                        if (size) results[fmt] = size;
                    }
                }));
                setEstimations(results);
            } catch (e) { /* ignore */ }
            finally { setIsEstimating(false); }
        }, 1000);
        return () => clearTimeout(timer);
    }, [localOptions, isOpen, image.file]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--ink-0)]/90 backdrop-blur-xl p-4 md:p-8"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative flex h-full max-h-[900px] w-full max-w-[1400px] flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl md:flex-row"
                >
                    {/* Main Preview Area */}
                    <div className="relative flex flex-1 flex-col bg-[var(--bg-0)] p-4 md:p-6 lg:p-8 overflow-hidden isolate">
                        <div className="backdrop-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />

                        {/* Top Bar Support */}
                        <div className="flex items-center gap-4 mb-4 z-20 shrink-0">
                            <div className="rounded-full bg-white/80 px-4 py-2 backdrop-blur-md border border-[var(--line)] shadow-sm">
                                <p className="text-[10px] font-bold text-[var(--ink-0)] uppercase tracking-widest">{image.file.name}</p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[10px] font-bold text-[var(--ink-0)] uppercase tracking-widest backdrop-blur-md border border-[var(--line)] shadow-sm">
                                {isEstimating ? (
                                    <span className="flex items-center gap-2 italic opacity-60">
                                        <Wind size={12} className="animate-spin text-[var(--accent)]" /> Calculando...
                                    </span>
                                ) : (
                                    <span>Salida est.: <span className="text-[var(--accent-2)]">{(estimatedSize ? (estimatedSize / 1024).toFixed(1) : "??")} KB</span></span>
                                )}
                            </div>
                        </div>

                        <div className="relative flex flex-1 w-full items-center justify-center min-h-0">
                            <div ref={containerRef} className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl shadow-sm bg-white/40 backdrop-blur-sm border border-[var(--line)] p-4 select-none">
                                <motion.div
                                    drag={zoom > 1}
                                    dragConstraints={containerRef}
                                    style={{ scale: zoom, cursor: zoom > 1 ? 'grab' : 'default' }}
                                    whileDrag={{ cursor: 'grabbing' }}
                                    className="flex items-center justify-center h-full w-full"
                                >
                                    <img
                                        src={image.url}
                                        alt="Preview"
                                        style={{ ...(isViewingOriginal ? {} : previewStyle) as any, willChange: 'filter, transform' }}
                                        className="max-h-full max-w-full object-contain pointer-events-none"
                                    />
                                    {!isViewingOriginal && localOptions.watermarkText && (
                                        <div
                                            className={`absolute inset-0 pointer-events-none select-none flex ${localOptions.watermarkMode === 'pattern'
                                                ? 'flex-wrap items-center justify-center overflow-hidden h-full'
                                                : {
                                                    'center': 'items-center justify-center',
                                                    'top-left': 'items-start justify-start p-8',
                                                    'top-right': 'items-start justify-end p-8',
                                                    'bottom-left': 'items-end justify-start p-8',
                                                    'bottom-right': 'items-end justify-end p-8',
                                                    'top': 'items-start justify-center p-8',
                                                    'bottom': 'items-end justify-center p-8',
                                                    'left': 'items-center justify-start p-8',
                                                    'right': 'items-center justify-end p-8'
                                                }[localOptions.watermarkPosition]
                                                }`}
                                        >
                                            {localOptions.watermarkMode === 'pattern' ? (
                                                Array.from({ length: Math.min(64, Math.max(16, Math.floor(1000000 / (localOptions.watermarkSpacing * localOptions.watermarkSpacing)))) }).map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className="font-bold rotate-[-30deg] whitespace-nowrap"
                                                        style={{
                                                            fontSize: `${localOptions.watermarkSize * 0.6}px`,
                                                            margin: `${localOptions.watermarkSpacing / 2}px`,
                                                            color: localOptions.watermarkColor,
                                                            opacity: localOptions.watermarkOpacity * 0.4
                                                        }}
                                                    >
                                                        {localOptions.watermarkText}
                                                    </span>
                                                ))
                                            ) : (
                                                <span
                                                    className="font-bold shadow-sm"
                                                    style={{
                                                        fontSize: `${localOptions.watermarkSize}px`,
                                                        color: localOptions.watermarkColor,
                                                        opacity: localOptions.watermarkOpacity
                                                    }}
                                                >
                                                    {localOptions.watermarkText}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </motion.div>

                                {/* Zoom Controls Overlay */}
                                <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl bg-white/80 p-1 backdrop-blur-md shadow-sm border border-[var(--line)] z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="p-2 hover:bg-black/5 rounded-lg transition-colors text-[var(--ink-soft)] hover:text-[var(--ink-0)]"><ZoomOut size={16} /></button>
                                    <span className="text-[10px] font-mono font-bold w-12 text-center text-[var(--ink-0)]">{Math.round(zoom * 100)}%</span>
                                    <button onClick={() => setZoom(Math.min(5, zoom + 0.5))} className="p-2 hover:bg-black/5 rounded-lg transition-colors text-[var(--ink-soft)] hover:text-[var(--ink-0)]"><ZoomIn size={16} /></button>
                                    {zoom > 1 && (
                                        <div className="w-px h-4 bg-[var(--line)] mx-1" />
                                    )}
                                    {zoom > 1 && (
                                        <button onClick={() => setZoom(1)} className="p-2 hover:bg-black/5 rounded-lg transition-colors text-[var(--ink-soft)] hover:text-[var(--ink-0)]" title="Restablecer zoom"><Maximize size={14} /></button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col items-center gap-6 w-full shrink-0">
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar max-w-full px-8">
                                {[
                                    { label: 'Original', props: { brightness: 1, contrast: 1, saturation: 1, hue: 0, sepia: false, blur: 0 } },
                                    { label: 'Cine', props: { brightness: 0.9, contrast: 1.2, saturation: 0.8, hue: 190, sepia: false, blur: 0 } },
                                    { label: 'Vívido', props: { brightness: 1.1, contrast: 1.1, saturation: 1.6, hue: 0, sepia: false, blur: 0 } },
                                    { label: 'Vintage', props: { brightness: 1, contrast: 0.9, saturation: 0.7, hue: 30, sepia: true, blur: 0.5 } },
                                    { label: 'Drama', props: { brightness: 0.8, contrast: 1.4, saturation: 0.4, hue: 0, sepia: false, blur: 0 } },
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => setLocalOptions(prev => ({ ...prev, ...preset.props }))}
                                        className="flex flex-col items-center gap-2 shrink-0 group"
                                    >
                                        <div className="h-12 w-20 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm transition group-hover:border-[var(--accent)]">
                                            <img
                                                src={image.url}
                                                className="h-full w-full object-cover"
                                                alt={preset.label}
                                                style={{
                                                    filter: `brightness(${preset.props.brightness}) contrast(${preset.props.contrast}) saturate(${preset.props.saturation}) ${preset.props.sepia ? 'sepia(1)' : ''}`
                                                }}
                                            />
                                        </div>
                                        <span className="text-[8px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-1 text-[var(--ink-soft)] group-hover:text-[var(--ink-0)]">
                                            {preset.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setLocalOptions(prev => ({ ...prev, rotate: (prev.rotate + 90) % 360 }))}
                                    className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[10px] font-bold text-[var(--ink-0)] shadow-sm border border-[var(--line)] transition hover:bg-gray-50 hover:scale-105 active:scale-95"
                                >
                                    <RotateCw size={14} /> 90°
                                </button>
                                <button
                                    onClick={() => setLocalOptions(prev => ({ ...prev, flop: !prev.flop }))}
                                    className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[10px] font-bold text-[var(--ink-0)] shadow-sm border border-[var(--line)] transition hover:bg-gray-50 hover:scale-105 active:scale-95"
                                >
                                    <FlipHorizontal size={14} /> H
                                </button>
                                <button
                                    onClick={() => setLocalOptions(prev => ({ ...prev, flip: !prev.flip }))}
                                    className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[10px] font-bold text-[var(--ink-0)] shadow-sm border border-[var(--line)] transition hover:bg-gray-50 hover:scale-105 active:scale-95"
                                >
                                    <FlipVertical size={14} /> V
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Controls */}
                    <div className="w-full h-full flex flex-col border-l border-[var(--line)] bg-[#f8fafc] md:w-[400px]">
                        <header className="shrink-0 flex items-center justify-between border-b border-[var(--line)] p-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-[var(--ink-0)] flex items-center gap-2">
                                    <SlidersHorizontal size={20} className="text-[var(--accent)]" />
                                    {lang === 'es' ? 'Ajustes de Imagen' : 'Image Settings'}
                                </h2>
                                <InfoTooltip lang={lang}
                                    title={lang === 'es' ? "Ajustes Individuales" : "Individual Settings"}
                                    content={
                                        <div className="space-y-3">
                                            <p>{lang === 'es' ? "Estás editando esta imagen de forma aislada. Cualquier cambio que hagas aquí solo se aplicará a este archivo concreto." : "You are editing this image in isolation. Any changes made here will only apply to this specific file."}</p>
                                            <div className="bg-[var(--accent)]/10 text-[var(--ink-0)] p-3 rounded-xl border border-[var(--accent)]/20 text-xs shadow-sm">
                                                <p className="font-bold flex items-center gap-1.5 mb-1"><Sparkles size={14} className="text-[var(--accent)]" /> {lang === 'es' ? "Sobreescritura inteligente" : "Smart Overwrite"}</p>
                                                <p>{lang === 'es' ? "Solo los valores que modifiques aquí reemplazarán a la configuración global (identificada con la etiqueta de 'Editada'). Lo que no toques con respecto a los valores iniciales, seguirá heredando de los ajustes generales del lote." : "Only the values you modify here will replace the global configuration (marked with an 'Edited' label). What you leave as the default will continue to inherit from the general batch settings."}</p>
                                            </div>
                                        </div>
                                    }
                                />
                            </div>
                            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </header>

                        <nav className="shrink-0 flex border-b border-[var(--line)] px-2">
                            {[
                                { id: 'general', label: lang === 'es' ? 'General' : 'General', icon: <SlidersHorizontal size={14} /> },
                                { id: 'color', label: lang === 'es' ? 'Luz & Color' : 'Light & Color', icon: <Sun size={14} /> },
                                { id: 'efectos', label: lang === 'es' ? 'Filtros' : 'Filters', icon: <Palette size={14} /> },
                                { id: 'avanzado', label: 'Pro', icon: <Maximize size={14} /> },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex flex-1 items-center justify-center gap-2 py-4 text-[10px] font-bold transition-all relative ${activeTab === tab.id ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)] hover:text-[var(--ink-0)]'}`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {activeTab === tab.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 h-0.5 w-full bg-[var(--accent)]" />}
                                </button>
                            ))}
                        </nav>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">{lang === 'es' ? "Calidad" : "Quality"}</span>
                                            <span className={`text-[10px] font-mono font-bold ${localOptions.lossless ? 'text-[var(--ink-light)]' : 'text-[var(--accent)]'}`}>
                                                {localOptions.lossless ? (lang === 'es' ? 'IGNORADA' : 'IGNORED') : `${localOptions.quality}%`}
                                            </span>
                                        </div>
                                        {localOptions.lossless && (
                                            <div className="bg-[var(--accent)]/10 text-[var(--ink-0)] p-2.5 rounded-xl border border-[var(--accent)]/20 text-[10px] shadow-sm mt-2 mb-1">
                                                <p className="font-bold flex items-center gap-1.5 mb-1">
                                                    <Info size={12} className="text-[var(--accent)]" />
                                                    {lang === 'es' ? "Ajuste ignorado" : "Setting ignored"}
                                                </p>
                                                <p className="opacity-90 leading-relaxed text-[9px]">
                                                    {lang === 'es' ? "Compresión Lossless forzada al 100% de detalle." : "Lossless compression forced 100% detail."}
                                                </p>
                                            </div>
                                        )}
                                        <input
                                            type="range"
                                            min={1}
                                            max={100}
                                            disabled={localOptions.lossless}
                                            value={localOptions.quality}
                                            onChange={(e) => setLocalOptions(prev => ({ ...prev, quality: Number(e.target.value) }))}
                                            className="w-full h-1.5 rounded-full bg-[var(--line)] accent-[var(--accent)] appearance-none cursor-pointer disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="block">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-1.5">
                                                    {lang === 'es' ? "Ancho" : "Width"}
                                                    <div className="relative group/tt flex items-center">
                                                        <Info size={12} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                                            {lang === 'es' ? "Si lo dejas vacío, se mantendrá el ancho original de la imagen." : "If left empty, the original image width will be kept."}
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                                        </div>
                                                    </div>
                                                </span>
                                                <span className="text-[8px] font-bold text-[var(--ink-light)]">px</span>
                                            </div>
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder={lang === 'es' ? "Original" : "Original"}
                                                value={localOptions.width || ""}
                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, width: e.target.value ? Number(e.target.value) : null }))}
                                                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                                            />
                                        </label>
                                        <label className="block">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-1.5">
                                                    {lang === 'es' ? "Alto" : "Height"}
                                                    <div className="relative group/tt flex items-center">
                                                        <Info size={12} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                                            {lang === 'es' ? "Si lo dejas vacío, se mantendrá el alto original de la imagen." : "If left empty, the original image height will be kept."}
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                                        </div>
                                                    </div>
                                                </span>
                                                <span className="text-[8px] font-bold text-[var(--ink-light)]">px</span>
                                            </div>
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder={lang === 'es' ? "Original" : "Original"}
                                                value={localOptions.height || ""}
                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, height: e.target.value ? Number(e.target.value) : null }))}
                                                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                                            />
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="block">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2 flex items-center gap-1.5">
                                                {lang === 'es' ? "Modo de Ajuste" : "Fit Mode"}
                                                <InfoTooltip lang={lang}
                                                    title={lang === 'es' ? "Modos de Ajuste (Crop)" : "Fit Modes (Crop)"}
                                                    content={
                                                        <div className="space-y-2">
                                                            <p>{lang === 'es' ? "Determina qué hace el programa si la foto original tiene distinta proporción que el Alto y Ancho pedidos." : "Determines what the program does if the original photo has a different aspect ratio than the requested Height and Width."}</p>
                                                            <ul className="list-disc pl-5 space-y-1 text-[var(--ink-soft)] flex flex-col gap-1">
                                                                <li><strong>Cover:</strong> {lang === 'es' ? "Llena todo el espacio y recorta lo sobrante." : "Fills entire space and crops extra."}</li>
                                                                <li><strong>Contain:</strong> {lang === 'es' ? "Bandas vacías pero sin recortar." : "Empty bands but no cropping."}</li>
                                                                <li><strong>Fill:</strong> {lang === 'es' ? "Estira y deforma la imagen." : "Stretches and distorts image."}</li>
                                                                <li><strong>Inside:</strong> {lang === 'es' ? "Encaja sin recortar ni estirar." : "Fits without cropping or stretching."}</li>
                                                            </ul>
                                                        </div>
                                                    }
                                                />
                                            </span>
                                            <div className="relative">
                                                <select
                                                    value={localOptions.fit}
                                                    disabled={!localOptions.width && !localOptions.height}
                                                    onChange={(e) => setLocalOptions(prev => ({ ...prev, fit: e.target.value as any }))}
                                                    className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium shadow-sm outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:bg-[var(--bg-soft)] disabled:cursor-not-allowed"
                                                >
                                                    {RESIZE_FITS.map((fit) => (
                                                        <option key={fit} value={fit}>{fit.charAt(0).toUpperCase() + fit.slice(1)}</option>
                                                    ))}
                                                </select>
                                                {!localOptions.width && !localOptions.height && (
                                                    <div className="absolute inset-0 z-10" title={lang === 'es' ? "Bloqueado al mantener tamaño original" : "Locked when preserving original size"} />
                                                )}
                                            </div>
                                        </label>
                                        <label className="block">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2 flex items-center gap-1.5">
                                                {lang === 'es' ? "Rotación" : "Rotation"}
                                            </span>
                                            <select
                                                value={localOptions.rotate}
                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, rotate: Number(e.target.value) }))}
                                                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                                            >
                                                {[0, 90, 180, 270].map(deg => (
                                                    <option key={deg} value={deg}>{deg}° {lang === 'es' ? "grados" : "degrees"}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="block">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-1.5 block">
                                                {lang === 'es' ? "Desenfoque" : "Blur"}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range" min="0" max="20" step="0.5"
                                                    value={localOptions.blur}
                                                    onChange={(e) => setLocalOptions(prev => ({ ...prev, blur: Number(e.target.value) }))}
                                                    className="flex-1 h-1.5 rounded-full bg-[var(--line)] accent-[var(--accent)] appearance-none cursor-pointer"
                                                />
                                                <span className="text-[10px] font-mono font-bold text-[var(--accent)] w-8 text-right">{localOptions.blur}</span>
                                            </div>
                                        </label>
                                        <label className="block">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-1.5 block">
                                                {lang === 'es' ? "Fondo (hex)" : "Background (hex)"}
                                            </span>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="#ffffff"
                                                    value={localOptions.background ?? ""}
                                                    onChange={(e) => setLocalOptions(prev => ({ ...prev, background: e.target.value || null }))}
                                                    className="w-full rounded-xl border border-[var(--line)] bg-white pl-8 pr-3 py-2 text-xs font-mono shadow-sm outline-none focus:border-[var(--accent)]"
                                                />
                                                <div
                                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-[var(--line)]"
                                                    style={{ backgroundColor: localOptions.background || '#ffffff' }}
                                                />
                                            </div>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            {
                                                key: "stripMetadata", label: lang === 'es' ? "No meta" : "No Meta", tooltipNative: true, tooltip: lang === 'es' ? (
                                                    <div className="space-y-2">
                                                        <p>Elimina todos los "datos extra ocultos" (metadatos) que vienen incrustados dentro de la fotografía original, como por ejemplo:</p>
                                                        <ul className="list-disc pl-5 space-y-1">
                                                            <li>Coordenadas GPS de dónde tomaste la foto.</li>
                                                            <li>Datos técnicos de la cámara (Modelo, Exposición, ISO).</li>
                                                            <li>Perfiles de color profundos (Útiles solo en imprentas).</li>
                                                        </ul>
                                                        <InfoNote className="!mt-3 text-[var(--ink-0)] border-[var(--accent)]/30 bg-[var(--accent)]/10"><strong>Recomendación:</strong> Mantenlo marcado para subir imágenes a internet. Ahorrarás mucho peso de archivo inútil y protegerás la privacidad de tu ubicación donde tomaste la foto.</InfoNote>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p>Removes all "hidden extra data" (metadata) embedded within the original photograph, such as:</p>
                                                        <ul className="list-disc pl-5 space-y-1">
                                                            <li>GPS coordinates of where you took the photo.</li>
                                                            <li>Technical camera data (Model, Exposure, ISO).</li>
                                                            <li>Deep color profiles (Only useful in print shops).</li>
                                                        </ul>
                                                        <InfoNote className="!mt-3 text-[var(--ink-0)] border-[var(--accent)]/30 bg-[var(--accent)]/10"><strong>Recommendation:</strong> Keep this checked for uploading images to the internet. You'll save a lot of useless file size and protect the privacy of your location.</InfoNote>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: "lossless", label: "Lossless", tooltipNative: true, tooltip: lang === 'es' ? (
                                                    <div className="space-y-2">
                                                        <p>Consiste en una compresión puramente matemática en la que <strong>no se elimina ni un solo píxel, ni un solo color, ni un solo detalle</strong> de la imagen de origen. Es idéntica al 100%.</p>
                                                        <p>Funciona de manera parecida a meter archivos en un ".zip".</p>
                                                        <InfoNote className="!mt-3 text-[var(--ink-0)] border-[var(--accent)]/30 bg-[var(--accent)]/10">Se garantiza la calidad absoluta y perfecta a costa de que <strong>el tamaño en megas del archivo final sea muchísimo más pesado</strong>. Si activas esto, perderás todas las ventajas de reducir tamaño para páginas web.</InfoNote>
                                                        <p className="text-xs opacity-70 mt-2">P.D. Solo soporta formatos de salida modernos como WebP, AVIF o PNG.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p>Consists of a purely mathematical compression where <strong>not a single pixel, color, or detail is removed</strong> from the source image. It is 100% identical.</p>
                                                        <p>It works similarly to putting files in a ".zip".</p>
                                                        <InfoNote className="!mt-3 text-[var(--ink-0)] border-[var(--accent)]/30 bg-[var(--accent)]/10">Absolute and perfect quality is guaranteed at the cost of <strong>the final file size in megabytes being remarkably heavier</strong>. Activating this negates all advantages of reducing file size for websites.</InfoNote>
                                                        <p className="text-xs opacity-70 mt-2">P.S. Only supports modern output formats like WebP, AVIF or PNG.</p>
                                                    </div>
                                                )
                                            },
                                        ].map((opt) => (
                                            <label
                                                key={opt.key}
                                                className={`flex justify-between items-center gap-2 rounded-xl border px-3 py-2 shadow-sm cursor-pointer transition-all ${localOptions[opt.key as keyof TransformOptions] ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)] bg-white hover:border-[var(--accent)]'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(localOptions[opt.key as keyof TransformOptions])}
                                                        onChange={(e) => setLocalOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                                                        className="h-3 w-3 accent-[var(--accent)] cursor-pointer"
                                                    />
                                                    <span className="text-[9px] font-bold text-[var(--ink-soft)] uppercase tracking-tight">
                                                        {opt.label}
                                                    </span>
                                                </div>
                                                {opt.tooltip && (
                                                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                                        <InfoTooltip lang={lang} title={opt.label} content={opt.tooltip as React.ReactNode} />
                                                    </div>
                                                )}
                                            </label>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { key: 'flop', label: 'Flip H', icon: <FlipHorizontal size={14} />, tooltip: lang === 'es' ? 'Efecto espejo.' : 'Horizontal mirror.' },
                                            { key: 'flip', label: 'Flip V', icon: <FlipVertical size={14} />, tooltip: lang === 'es' ? 'Voltea boca abajo.' : 'Flips upside down.' },
                                        ].map(eff => (
                                            <label
                                                key={eff.key}
                                                className={`flex justify-between items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all ${localOptions[eff.key as keyof TransformOptions] ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)] bg-white'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(localOptions[eff.key as keyof TransformOptions])}
                                                        onChange={() => setLocalOptions(prev => ({ ...prev, [eff.key]: !prev[eff.key as keyof TransformOptions] }))}
                                                        className="h-3 w-3 accent-[var(--accent)]"
                                                    />
                                                    <span className="text-[9px] font-bold text-[var(--ink-soft)] uppercase tracking-tight">
                                                        {eff.label}
                                                    </span>
                                                </div>
                                                <div className="relative group/tt flex items-center">
                                                    <Info size={12} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                                    <div className="absolute bottom-full right-0 mb-2 w-max max-w-[140px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                                        {eff.tooltip}
                                                        <div className="absolute top-full right-1.5 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'color' && (
                                <div className="space-y-6">
                                    {[
                                        { key: 'brightness', label: lang === 'es' ? 'Brillo' : 'Brightness', tooltip: lang === 'es' ? 'Ajusta la luminosidad general.' : 'Adjusts the overall lightness.', icon: <Sun size={14} />, min: 0.1, max: 2, step: 0.01, default: 1 },
                                        { key: 'contrast', label: lang === 'es' ? 'Contraste' : 'Contrast', tooltip: lang === 'es' ? 'Aumenta o disminuye la diferencia de tonos.' : 'Increases or decreases tonal difference.', icon: <Contrast size={14} />, min: 0.1, max: 2, step: 0.01, default: 1 },
                                        { key: 'saturation', label: lang === 'es' ? 'Saturación' : 'Saturation', tooltip: lang === 'es' ? 'Controla la viveza de los colores.' : 'Controls the vividness of colors.', icon: <Droplets size={14} />, min: 0, max: 3, step: 0.1, default: 1 },
                                        { key: 'gamma', label: 'Gamma', tooltip: lang === 'es' ? 'Altera tonos medios sin quemar blancos.' : 'Alters midtones without blowing out whites.', icon: <Sparkles size={14} />, min: 1, max: 3, step: 0.1, default: 2.2 },
                                        { key: 'hue', label: lang === 'es' ? 'Tono (Hue)' : 'Hue', tooltip: lang === 'es' ? 'Rota el espectro de color completo.' : 'Rotates the full color spectrum.', icon: <Palette size={14} />, min: 0, max: 360, step: 1, default: 0 },
                                    ].map(item => (
                                        <div key={item.key} className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-2">
                                                    {item.icon} {item.label}
                                                    <div className="relative group/tt flex items-center">
                                                        <Info size={12} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[160px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                                            {item.tooltip}
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                                        </div>
                                                    </div>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setLocalOptions(prev => ({ ...prev, [item.key]: item.default }))}
                                                        className="p-1 text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
                                                        title={lang === 'es' ? "Restablecer" : "Reset"}
                                                    >
                                                        <RotateCw size={10} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={localOptions[item.key as keyof TransformOptions] as number}
                                                        onChange={(e) => setLocalOptions(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                                                        className="w-12 bg-white border border-[var(--line)] rounded px-1 py-0.5 text-[10px] font-mono font-bold text-center"
                                                        step={item.step}
                                                    />
                                                </div>
                                            </div>
                                            <input
                                                type="range" min={item.min} max={item.max} step={item.step}
                                                value={localOptions[item.key as keyof TransformOptions] as number}
                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                                                className="w-full h-1.5 rounded-full bg-[var(--line)] accent-[var(--accent)] appearance-none cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'efectos' && (
                                <div className="space-y-6">

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { key: 'grayscale', label: lang === 'es' ? 'B/N' : 'B/W', icon: <Eraser size={16} />, tooltip: lang === 'es' ? 'Convierte a blanco y negro.' : 'Converts to black and white.' },
                                            { key: 'sepia', label: 'Sepia', icon: <Palette size={16} />, tooltip: lang === 'es' ? 'Tono vintage amarillento.' : 'Vintage yellowish tone.' },
                                            { key: 'sharpen', label: lang === 'es' ? 'Enfoque' : 'Sharpen', icon: <Wind size={16} />, tooltip: lang === 'es' ? 'Mejora bordes y nitidez.' : 'Enhances edges and sharpness.' },
                                        ].map(eff => (
                                            <label
                                                key={eff.key}
                                                className={`flex justify-between items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all ${localOptions[eff.key as keyof TransformOptions] ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)] bg-white'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(localOptions[eff.key as keyof TransformOptions])}
                                                        onChange={() => setLocalOptions(prev => ({ ...prev, [eff.key]: !prev[eff.key as keyof TransformOptions] }))}
                                                        className="h-3 w-3 accent-[var(--accent)]"
                                                    />
                                                    <span className="text-[9px] font-bold text-[var(--ink-soft)] uppercase tracking-tight">
                                                        {eff.label}
                                                    </span>
                                                </div>
                                                <div className="relative group/tt flex items-center">
                                                    <Info size={12} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                                    <div className="absolute bottom-full right-0 mb-2 w-max max-w-[140px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                                        {eff.tooltip}
                                                        <div className="absolute top-full right-1.5 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'avanzado' && (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">{lang === 'es' ? 'Formato & Comparativa' : 'Format & Comparison'}</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['webp', 'avif', 'jpeg', 'png'].map((fmt) => (
                                                <button
                                                    key={fmt}
                                                    onClick={() => setLocalOptions(prev => ({ ...prev, format: fmt as OutputFormat }))}
                                                    className={`rounded-xl border p-3 text-xs font-bold transition-all flex flex-col items-center gap-1 ${localOptions.format === fmt ? 'bg-[var(--accent)] text-white border-transparent' : 'bg-white text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--accent)]'}`}
                                                >
                                                    {fmt.toUpperCase()}
                                                    {estimations[fmt] && (
                                                        <span className="text-[8px] opacity-70 font-mono">
                                                            {Math.round(estimations[fmt] / 1024)} KB
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-1.5">
                                                Smart Crop (Entropy)
                                                <InfoTooltip lang={lang}
                                                    title="Smart Crop"
                                                    content={lang === 'es' ? (
                                                        <div className="space-y-2">
                                                            <p>Si fuerzas un Alto/Ancho que recorta la foto, el sistema identificará de forma inteligente el punto de mayor interés visual para centrar el recorte ahí.</p>
                                                            <InfoNote>Este ajuste se aplica únicamente al procesar y descargar la imagen final.</InfoNote>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <p>If you force a Height/Width that crops the photo, the system will intelligently identify the point of maximum visual interest to center the crop there.</p>
                                                            <InfoNote>This setting is applied only upon processing and downloading the final image.</InfoNote>
                                                        </div>
                                                    )}
                                                />
                                            </label>
                                            <button
                                                onClick={() => setLocalOptions(prev => ({ ...prev, smartCrop: !prev.smartCrop }))}
                                                className={`h-6 w-11 rounded-full transition-colors ${localOptions.smartCrop ? 'bg-[var(--accent-2)]' : 'bg-[var(--line)]'}`}
                                            >
                                                <div className={`h-4 w-4 rounded-full bg-white transition-transform ${localOptions.smartCrop ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-[var(--ink-soft)] italic leading-relaxed">
                                            {lang === 'es' ? 'Recorte inteligente basado en inteligencia artificial de Sharp.' : 'AI-powered smart cropping via Sharp.'}
                                        </p>
                                    </div>

                                    <div className="rounded-3xl bg-[var(--bg-soft)] p-6 border border-[var(--line)] space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-0)] flex items-center gap-2">
                                                <div className="p-1 rounded-lg bg-[var(--accent)] text-white">
                                                    <Type size={12} />
                                                </div>
                                                {lang === 'es' ? "Marca de Agua" : "Watermark"}
                                            </h4>
                                            <InfoTooltip lang={lang}
                                                title={lang === 'es' ? "Marca de Agua" : "Watermark"}
                                                content={
                                                    <div className="space-y-3">
                                                        <p>{lang === 'es' ? "Personaliza tu firma y visualiza los cambios al instante." : "Customize your signature and see changes instantly."}</p>
                                                        <div className="space-y-1 text-[10px]">
                                                            <p>• <strong>{lang === 'es' ? "Modos:" : "Modes:"}</strong> {lang === 'es' ? "Elige entre una firma única o un patrón de seguridad." : "Choose between a single signature or a security pattern."}</p>
                                                            <p>• <strong>{lang === 'es' ? "Ajustes:" : "Settings:"}</strong> {lang === 'es' ? "Controla el color, tamaño, opacidad y espaciado." : "Control color, size, opacity, and spacing."}</p>
                                                        </div>
                                                        <InfoNote>{lang === 'es' ? "La previsualización es orientativa; se aplicará permanentemente al descargar." : "Preview is for guidance; it will be permanently applied upon download."}</InfoNote>
                                                    </div>
                                                }
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1">
                                                    {lang === 'es' ? "Contenido" : "Content"}
                                                </span>
                                                <input
                                                    type="text"
                                                    placeholder={lang === 'es' ? "ej: @tu_usuario" : "e.g. @username"}
                                                    value={localOptions.watermarkText || ""}
                                                    onChange={(e) => setLocalOptions(prev => ({ ...prev, watermarkText: e.target.value || null }))}
                                                    className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-xs font-medium outline-none focus:border-[var(--accent)]"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setLocalOptions(prev => ({ ...prev, watermarkMode: 'single' }))}
                                                    className={`rounded-xl border p-2 text-[9px] font-bold uppercase transition-all ${localOptions.watermarkMode === 'single' ? 'bg-[var(--ink-0)] text-white border-transparent shadow-sm' : 'bg-white text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--accent)]'}`}
                                                >
                                                    {lang === 'es' ? "Único" : "Single"}
                                                </button>
                                                <button
                                                    onClick={() => setLocalOptions(prev => ({ ...prev, watermarkMode: 'pattern' }))}
                                                    className={`rounded-xl border p-2 text-[9px] font-bold uppercase transition-all ${localOptions.watermarkMode === 'pattern' ? 'bg-[var(--ink-0)] text-white border-transparent shadow-sm' : 'bg-white text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--accent)]'}`}
                                                >
                                                    {lang === 'es' ? "Patrón" : "Pattern"}
                                                </button>
                                                <button
                                                    onClick={() => setLocalOptions(prev => ({ ...prev, watermarkColor: 'white' }))}
                                                    className={`rounded-xl border p-2 text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${localOptions.watermarkColor === 'white' ? 'bg-white text-[var(--ink-0)] border-[var(--ink-0)]' : 'bg-white text-[var(--ink-soft)] border-[var(--line)]'}`}
                                                >
                                                    <div className="w-2.5 h-2.5 rounded-full bg-white border border-[var(--line)]" />
                                                    {lang === 'es' ? "Blanco" : "White"}
                                                </button>
                                                <button
                                                    onClick={() => setLocalOptions(prev => ({ ...prev, watermarkColor: 'black' }))}
                                                    className={`rounded-xl border p-2 text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${localOptions.watermarkColor === 'black' ? 'bg-[var(--ink-0)] text-white border-transparent' : 'bg-white text-[var(--ink-soft)] border-[var(--line)]'}`}
                                                >
                                                    <div className="w-2.5 h-2.5 rounded-full bg-black" />
                                                    {lang === 'es' ? "Negro" : "Black"}
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1">
                                                    {localOptions.watermarkMode === 'single' ? (lang === 'es' ? "Posición & Ajustes" : "Position & Settings") : (lang === 'es' ? "Ajustes del Patrón" : "Pattern Settings")}
                                                </span>
                                                <div className={`${localOptions.watermarkMode === 'single' ? 'flex gap-4 items-center' : 'space-y-4'}`}>
                                                    {localOptions.watermarkMode === 'single' && (
                                                        <div className="grid grid-cols-3 gap-1 w-24 h-24 shrink-0">
                                                            {(['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] as const).map((pos) => {
                                                                return (
                                                                    <button
                                                                        key={pos}
                                                                        onClick={() => setLocalOptions(prev => ({ ...prev, watermarkPosition: pos as any }))}
                                                                        className={`rounded-lg border transition-all flex items-center justify-center hover:border-[var(--accent)] bg-white ${localOptions.watermarkPosition === pos ? 'bg-[var(--accent)] border-transparent text-white shadow-sm' : 'text-[var(--line)]'}`}
                                                                    >
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${localOptions.watermarkPosition === pos ? 'bg-white' : 'bg-current'}`} />
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    )}

                                                    <div className={`flex-1 space-y-4 ${localOptions.watermarkMode === 'pattern' ? 'px-1' : ''}`}>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[8px] font-bold text-[var(--ink-soft)] uppercase">
                                                                <span>{lang === 'es' ? 'Opacidad' : 'Opacity'}</span>
                                                                <span>{Math.round(localOptions.watermarkOpacity * 100)}%</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0" max="1" step="0.05"
                                                                value={localOptions.watermarkOpacity}
                                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, watermarkOpacity: Number(e.target.value) }))}
                                                                className="w-full h-1"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[8px] font-bold text-[var(--ink-soft)] uppercase">
                                                                <span>{lang === 'es' ? 'Tamaño' : 'Size'}</span>
                                                                <span>{localOptions.watermarkSize}px</span>
                                                            </div>
                                                            <input
                                                                type="range" min="8" max="120" step="1"
                                                                value={localOptions.watermarkSize}
                                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, watermarkSize: Number(e.target.value) }))}
                                                                className="w-full h-1"
                                                            />
                                                        </div>
                                                        {localOptions.watermarkMode === 'pattern' && (
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-[8px] font-bold text-[var(--ink-soft)] uppercase">
                                                                    <span>{lang === 'es' ? 'Espaciado' : 'Spacing'}</span>
                                                                    <span>{localOptions.watermarkSpacing}px</span>
                                                                </div>
                                                                <input
                                                                    type="range" min="20" max="200" step="5"
                                                                    value={localOptions.watermarkSpacing}
                                                                    onChange={(e) => setLocalOptions(prev => ({ ...prev, watermarkSpacing: Number(e.target.value) }))}
                                                                    className="w-full h-1"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Metadata Option (Individual) */}
                                            <div className="pt-4 border-t border-[var(--line)]">
                                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[var(--line)] transition-all hover:border-[var(--accent)]">
                                                    <div className="space-y-0.5">
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--ink-0)] leading-none flex items-center gap-1">
                                                            {lang === 'es' ? "Inyectar Metadatos" : "Embed Metadata"}
                                                            <div className="scale-75 -translate-y-0.5">
                                                                <InfoTooltip lang={lang}
                                                                    title={lang === 'es' ? "Protección Legal" : "Legal Protection"}
                                                                    content={lang === 'es' ?
                                                                        "Escribe tu firma en el Copyright interno del archivo. Esto ayuda a demostrar la autoría incluso si la imagen es manipulada." :
                                                                        "Embeds your signature in the internal Copyright field. Helps prove ownership even if the image is manipulated."
                                                                    }
                                                                />
                                                            </div>
                                                        </span>
                                                        <p className="text-[8px] text-[var(--ink-soft)] italic leading-tight">
                                                            {lang === 'es' ? "Añadir a campo Copyright" : "Add to Copyright field"}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setLocalOptions(prev => ({ ...prev, watermarkMetadata: !prev.watermarkMetadata }))}
                                                        className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${localOptions.watermarkMetadata ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}
                                                    >
                                                        <div className={`h-3 w-3 rounded-full bg-white transition-transform ${localOptions.watermarkMetadata ? 'translate-x-5' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2 border-t border-[var(--line)]">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] leading-none">
                                                    {lang === 'es' ? 'Nombre del Archivo' : 'Filename Pattern'}
                                                </label>
                                                <InfoTooltip lang={lang}
                                                    title={lang === 'es' ? "Optimización SEO" : "SEO Optimization"}
                                                    content={
                                                        <div className="space-y-4">
                                                            <p>{lang === 'es' ? "Crea nombres automáticos. Puedes escribir tu propio texto o añadir etiquetas rápidas pinchando en ellas." : "Create automatic names. You can type your own text or add quick tags by clicking on them."}</p>

                                                            <div className="space-y-2 text-[9px]">
                                                                <p className="font-bold uppercase text-[var(--accent)] tracking-tighter">{lang === 'es' ? "Etiquetas Disponibles:" : "Available Tags:"}</p>
                                                                <ul className="space-y-1 list-disc pl-4 italic opacity-80">
                                                                    <li><strong>[name]</strong>: {lang === 'es' ? "Nombre original" : "Original name"}</li>
                                                                    <li><strong>[width] / [height]</strong>: {lang === 'es' ? "Dimensiones" : "Dimensions"}</li>
                                                                    <li><strong>[date]</strong>: {lang === 'es' ? "Fecha" : "Date (YYYY-MM-DD)"}</li>
                                                                    <li><strong>[n]</strong>: {lang === 'es' ? "Contador secuencial" : "Sequential counter"}</li>
                                                                </ul>
                                                            </div>

                                                            <div className="space-y-2 text-[9px]">
                                                                <p className="font-bold uppercase text-[var(--accent)] tracking-tighter">{lang === 'es' ? "Presets (Plantillas):" : "Presets (Templates):"}</p>
                                                                <p>{lang === 'es' ? "Combinaciones rápidas para marketing, tiendas o archivos personales." : "Quick combinations for marketing, stores, or personal archives."}</p>
                                                            </div>

                                                            <InfoNote>{lang === 'es' ? "Usa la Limpieza SEO (en el switch de abajo) para nombres compatibles con web." : "Use SEO Cleaning (in the switch below) for web-compatible names."}</InfoNote>
                                                        </div>
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                placeholder="[name]-[width]x[height]"
                                                value={localOptions.renamePattern || ''}
                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, renamePattern: e.target.value || null }))}
                                                className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-xs font-bold focus:border-[var(--accent)] outline-none bg-white shadow-sm"
                                            />

                                            {/* Terminal Preview */}
                                            <div className="bg-[var(--ink-0)] text-white rounded-xl py-2 px-3 border border-white/10 shadow-lg flex items-center gap-2 overflow-hidden">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] shrink-0 animate-pulse" />
                                                <span className="text-[10px] font-mono truncate opacity-90 tracking-tight">
                                                    {(() => {
                                                        let preview = (localOptions.renamePattern || "[name]")
                                                            .replace(/\[name\]/g, "foto")
                                                            .replace(/\[width\]/g, (localOptions.width || 1200).toString())
                                                            .replace(/\[height\]/g, (localOptions.height || 800).toString())
                                                            .replace(/\[format\]/g, localOptions.format || "webp")
                                                            .replace(/\[date\]/g, new Date().toISOString().split('T')[0])
                                                            .replace(/\[n\]/g, "01");

                                                        if (localOptions.seoFriendly) {
                                                            preview = preview.toLowerCase()
                                                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                                                .replace(/[^a-z0-9-_]/g, "-")
                                                                .replace(/-+/g, "-")
                                                                .replace(/^-|-$/g, "");
                                                        }
                                                        return preview + "." + (localOptions.format || "webp");
                                                    })()}
                                                </span>
                                            </div>

                                            {/* Visual Tags */}
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {[
                                                    { tag: '[name]', label: 'NAME' },
                                                    { tag: '[width]', label: 'W' },
                                                    { tag: '[height]', label: 'H' },
                                                    { tag: '[date]', label: 'DATE' },
                                                    { tag: '[n]', label: '01' }
                                                ].map(t => (
                                                    <button
                                                        key={t.tag}
                                                        onClick={() => setLocalOptions(prev => ({ ...prev, renamePattern: (prev.renamePattern || "") + t.tag }))}
                                                        className="px-2 py-1 rounded-md bg-white border border-[var(--line)] text-[8px] font-bold text-[var(--ink-0)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                                <div className="w-px h-3 bg-[var(--line)] mx-0.5" />
                                                {['-', '_', 'x', '/'].map(sep => (
                                                    <button
                                                        key={sep}
                                                        onClick={() => setLocalOptions(prev => ({ ...prev, renamePattern: (prev.renamePattern || "") + sep }))}
                                                        className="w-5 h-5 rounded-md bg-[var(--bg-soft)] text-[10px] font-bold text-[var(--ink-0)] flex items-center justify-center hover:bg-[var(--accent)] hover:text-white transition-all shadow-sm font-mono"
                                                    >
                                                        {sep}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Presets in Sidebar */}
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                {[
                                                    { pattern: '[name]', label: lang === 'es' ? 'Original' : 'Original' },
                                                    { pattern: '[name]-[width]x[height]', label: lang === 'es' ? 'Tienda (Web)' : 'Shop (Web)' },
                                                    { pattern: 'post-[name]-[n]', label: lang === 'es' ? 'Social Media' : 'Social Media' },
                                                    { pattern: '[date]-[name]', label: lang === 'es' ? 'Cronológico' : 'Chronological' },
                                                ].map(p => (
                                                    <button
                                                        key={p.pattern}
                                                        onClick={() => setLocalOptions(prev => ({ ...prev, renamePattern: p.pattern }))}
                                                        className={`text-center px-2 py-2 rounded-xl border text-[8px] font-bold transition-all ${localOptions.renamePattern === p.pattern ? 'bg-[var(--accent)] border-transparent text-white shadow-sm' : 'bg-white border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--accent)]'}`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* SEO Toggle redesigned like Metadata - PERFECT MATCH */}
                                            <div className="pt-2 border-t border-[var(--line)] mt-2">
                                                <div
                                                    onClick={() => setLocalOptions(prev => ({ ...prev, seoFriendly: !prev.seoFriendly }))}
                                                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-[var(--line)] transition-all hover:border-[var(--accent)] cursor-pointer"
                                                >
                                                    <div className="space-y-0.5">
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--ink-0)] leading-none flex items-center gap-1.5">
                                                            {lang === 'es' ? "Limpieza SEO" : "SEO Cleaning"}
                                                            <div className="scale-75 -translate-y-0.5">
                                                                <InfoTooltip lang={lang}
                                                                    title={lang === 'es' ? "Nombres Web" : "Web Naming"}
                                                                    content={lang === 'es' ?
                                                                        "Elimina espacios y acentos del nombre para evitar errores al subir la imagen a tu web o redes sociales." :
                                                                        "Removes spaces and accents from the name to prevent errors when uploading to your web or social media."
                                                                    }
                                                                />
                                                            </div>
                                                        </span>
                                                        <p className="text-[8px] text-[var(--ink-soft)] italic leading-tight">
                                                            {lang === 'es' ? "Optimizar para web" : "Optimize for web"}
                                                        </p>
                                                    </div>
                                                    <button
                                                        className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${localOptions.seoFriendly ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}
                                                    >
                                                        <div className={`h-3 w-3 rounded-full bg-white transition-transform ${localOptions.seoFriendly ? 'translate-x-5' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 w-full border-t border-[var(--line)] bg-white p-6 dark:bg-gray-100 flex flex-col gap-3">
                            <button
                                onPointerDown={() => setIsViewingOriginal(true)}
                                onPointerUp={() => setIsViewingOriginal(false)}
                                onPointerLeave={() => setIsViewingOriginal(false)}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white py-3 text-sm font-bold text-[var(--ink-0)] transition hover:bg-gray-50 active:scale-[0.98]"
                            >
                                <Eye size={18} className={isViewingOriginal ? "text-[var(--accent)]" : "text-[var(--ink-soft)]"} />
                                {lang === 'es' ? 'Ver original' : 'View original'}
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const overrides: Partial<TransformOptions> = {};
                                        for (const key in localOptions) {
                                            const k = key as keyof TransformOptions;
                                            if (localOptions[k] !== options[k]) {
                                                (overrides as any)[k] = localOptions[k];
                                            }
                                        }
                                        onSaveOverrides(Object.keys(overrides).length > 0 ? overrides : undefined);
                                        onClose();
                                    }}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-110 active:scale-[0.98]"
                                >
                                    <Save size={18} />
                                    {lang === 'es' ? 'Aplicar cambios' : 'Apply changes'}
                                </button>
                                <button
                                    onClick={() => setLocalOptions(options)}
                                    className="flex items-center justify-center rounded-2xl border border-[var(--line)] px-6 py-4 transition hover:bg-gray-50 active:scale-[0.98]"
                                    title={lang === 'es' ? 'Restablecer' : 'Reset'}
                                >
                                    <Undo2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div >
        </AnimatePresence >
    );
}

