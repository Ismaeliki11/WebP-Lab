"use client";

import { useState, useMemo, useEffect } from "react";
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
    Undo2
} from "lucide-react";
import { TransformOptions } from "@/lib/image-tools";

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    image: {
        id: string;
        file: File;
        url: string;
    };
    options: TransformOptions;
    setOptions: (options: TransformOptions) => void;
}

export function ImageEditor({ isOpen, onClose, image, options, setOptions }: ImageEditorProps) {
    const [localOptions, setLocalOptions] = useState<TransformOptions>(options);
    const [activeTab, setActiveTab] = useState<"ajustes" | "color" | "efectos" | "avanzado">("ajustes");
    const [sliderPos, setSliderPos] = useState(50);
    const [estimations, setEstimations] = useState<Record<string, number>>({});
    const [isEstimating, setIsEstimating] = useState(false);

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
                    <div className="relative flex flex-1 flex-col items-center justify-center bg-[#050810] p-6 lg:p-12 overflow-hidden">
                        <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
                            <div className="rounded-full bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                                <p className="text-[10px] font-bold text-white uppercase tracking-widest">{image.file.name}</p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md border border-white/5">
                                {isEstimating ? (
                                    <span className="flex items-center gap-2 italic opacity-60">
                                        <Wind size={12} className="animate-spin text-[var(--accent)]" /> Calculando...
                                    </span>
                                ) : (
                                    <span>Salida est.: <span className="text-[var(--accent-2)]">{(estimatedSize ? (estimatedSize / 1024).toFixed(1) : "??")} KB</span></span>
                                )}
                            </div>
                        </div>

                        <div className="relative flex h-full w-full items-center justify-center p-4">
                            <div
                                className="group relative max-h-full max-w-full overflow-hidden rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] cursor-col-resize select-none"
                                onMouseMove={(e) => {
                                    if (e.buttons === 1) { // Only if clicked? No, let's keep it simple
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                        setSliderPos(Math.max(0, Math.min(100, x)));
                                    }
                                }}
                            >
                                {/* Bottom Layer (Original) */}
                                <img
                                    src={image.url}
                                    alt="Original"
                                    className="max-h-full max-w-full object-contain opacity-40 grayscale-[0.5]"
                                />

                                {/* Top Layer (Preview) clipped */}
                                <div
                                    className="absolute inset-0 z-10 overflow-hidden"
                                    style={{
                                        clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                                        willChange: 'clip-path'
                                    }}
                                >
                                    <motion.img
                                        src={image.url}
                                        alt="Preview"
                                        style={{ ...previewStyle as any, willChange: 'filter, transform' }}
                                        className="h-full w-full object-contain"
                                    />
                                </div>

                                {/* Labels */}
                                <div className="absolute top-4 left-4 z-20 rounded bg-white/10 px-2 py-1 text-[8px] font-bold text-white uppercase tracking-widest backdrop-blur-md">Original</div>
                                <div className="absolute top-4 right-4 z-20 rounded bg-[var(--accent)]/80 px-2 py-1 text-[8px] font-bold text-white uppercase tracking-widest backdrop-blur-md">Resultado</div>

                                {/* Slider Handle */}
                                <div
                                    className="absolute top-0 bottom-0 z-30 w-1 bg-white cursor-col-resize pointer-events-none"
                                    style={{
                                        left: `${sliderPos}%`,
                                        willChange: 'left'
                                    }}
                                >
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-xl">
                                        <div className="flex gap-0.5">
                                            <div className="h-3 w-0.5 bg-gray-300 rounded-full" />
                                            <div className="h-3 w-0.5 bg-gray-300 rounded-full" />
                                        </div>
                                    </div>
                                </div>

                                <input
                                    type="range" min="0" max="100" value={sliderPos}
                                    onChange={(e) => setSliderPos(Number(e.target.value))}
                                    className="absolute inset-0 z-40 opacity-0 cursor-col-resize"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col items-center gap-6 w-full">
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
                                        <div className="h-12 w-20 overflow-hidden rounded-lg border border-white/10 bg-white/5 transition group-hover:border-white/30">
                                            <img
                                                src={image.url}
                                                className="h-full w-full object-cover opacity-60"
                                                style={{
                                                    filter: `brightness(${preset.props.brightness}) contrast(${preset.props.contrast}) saturate(${preset.props.saturation}) ${preset.props.sepia ? 'sepia(1)' : ''}`
                                                }}
                                            />
                                        </div>
                                        <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest group-hover:text-white transition">
                                            {preset.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setLocalOptions(prev => ({ ...prev, rotate: (prev.rotate + 90) % 360 }))}
                                    className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-[10px] font-bold text-white transition hover:bg-white/20 hover:scale-105 active:scale-95"
                                >
                                    <RotateCw size={14} /> 90°
                                </button>
                                <button
                                    onClick={() => setLocalOptions(prev => ({ ...prev, flop: !prev.flop }))}
                                    className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-[10px] font-bold text-white transition hover:bg-white/20 hover:scale-105 active:scale-95"
                                >
                                    <FlipHorizontal size={14} /> H
                                </button>
                                <button
                                    onClick={() => setLocalOptions(prev => ({ ...prev, flip: !prev.flip }))}
                                    className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-[10px] font-bold text-white transition hover:bg-white/20 hover:scale-105 active:scale-95"
                                >
                                    <FlipVertical size={14} /> V
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Controls */}
                    <div className="w-full border-l border-[var(--line)] bg-[#f8fafc] md:w-[400px] overflow-y-auto">
                        <header className="flex items-center justify-between border-b border-[var(--line)] p-6">
                            <h2 className="text-xl font-bold text-[var(--ink-0)] flex items-center gap-2">
                                <Palette size={20} className="text-[var(--accent)]" />
                                Editor Pro
                            </h2>
                            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </header>

                        <nav className="flex border-b border-[var(--line)] px-2">
                            {[
                                { id: 'ajustes', label: 'Luz', icon: <Sun size={14} /> },
                                { id: 'color', label: 'Color', icon: <Droplets size={14} /> },
                                { id: 'efectos', label: 'Filtros', icon: <Palette size={14} /> },
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

                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">Formato & Comparativa</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['webp', 'avif', 'jpeg', 'png'].map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={() => setLocalOptions(prev => ({ ...prev, format: fmt as any }))}
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

                            {activeTab === 'ajustes' && (
                                <div className="space-y-6">
                                    {[
                                        { key: 'brightness', label: 'Brillo', icon: <Sun size={14} />, min: 0.1, max: 2, step: 0.01, default: 1 },
                                        { key: 'contrast', label: 'Contraste', icon: <Contrast size={14} />, min: 0.1, max: 2, step: 0.01, default: 1 },
                                    ].map(item => (
                                        <div key={item.key} className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-2">
                                                    {item.icon} {item.label}
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setLocalOptions(prev => ({ ...prev, [item.key]: item.default }))}
                                                        className="p-1 text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
                                                        title="Restablecer"
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
                                                className="w-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'color' && (
                                <div className="space-y-6">
                                    {[
                                        { key: 'saturation', label: 'Saturación', icon: <Droplets size={14} />, min: 0, max: 3, step: 0.1, default: 1 },
                                        { key: 'hue', label: 'Tono (Hue)', icon: <Palette size={14} />, min: 0, max: 360, step: 1, default: 0 },
                                    ].map(item => (
                                        <div key={item.key} className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-2">
                                                    {item.icon} {item.label}
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setLocalOptions(prev => ({ ...prev, [item.key]: item.default }))}
                                                        className="p-1 text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
                                                        title="Restablecer"
                                                    >
                                                        <RotateCw size={10} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={localOptions[item.key as keyof TransformOptions] as number}
                                                        onChange={(e) => setLocalOptions(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                                                        className="w-12 bg-white border border-[var(--line)] rounded px-1 py-0.5 text-[10px] font-mono font-bold text-center"
                                                    />
                                                </div>
                                            </div>
                                            <input
                                                type="range" min={item.min} max={item.max} step={item.step}
                                                value={localOptions[item.key as keyof TransformOptions] as number}
                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                                                className="w-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'efectos' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] flex items-center gap-2">
                                                <Maximize size={14} /> Desenfoque
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setLocalOptions(prev => ({ ...prev, blur: 0 }))}
                                                    className="p-1 text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
                                                >
                                                    <RotateCw size={10} />
                                                </button>
                                                <span className="text-[10px] font-mono font-bold text-[var(--accent)]">{localOptions.blur}px</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range" min="0" max="20" step="0.5"
                                            value={localOptions.blur}
                                            onChange={(e) => setLocalOptions(prev => ({ ...prev, blur: Number(e.target.value) }))}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { key: 'grayscale', label: 'B/N', icon: <Eraser size={16} /> },
                                            { key: 'sepia', label: 'Sepia', icon: <Palette size={16} /> },
                                            { key: 'sharpen', label: 'Enfoque', icon: <Wind size={16} /> },
                                        ].map(eff => (
                                            <button
                                                key={eff.key}
                                                onClick={() => setLocalOptions(prev => ({ ...prev, [eff.key]: !prev[eff.key as keyof TransformOptions] }))}
                                                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${localOptions[eff.key as keyof TransformOptions] ? 'bg-[var(--accent)] text-white border-transparent shadow-[0_4px_12px_rgba(20,111,214,0.3)]' : 'bg-white text-[var(--ink-0)] border-[var(--line)] hover:border-[var(--accent)]'}`}
                                            >
                                                {eff.icon}
                                                <span className="text-[8px] font-bold uppercase tracking-widest">{eff.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'avanzado' && (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">Smart Crop (Entropy)</label>
                                            <button
                                                onClick={() => setLocalOptions(prev => ({ ...prev, smartCrop: !prev.smartCrop }))}
                                                className={`h-6 w-11 rounded-full transition-colors ${localOptions.smartCrop ? 'bg-[var(--accent-2)]' : 'bg-[var(--line)]'}`}
                                            >
                                                <div className={`h-4 w-4 rounded-full bg-white transition-transform ${localOptions.smartCrop ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-[var(--ink-soft)] italic leading-relaxed">Automatic cropping based on visual interest.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">Text Watermark</label>
                                        <input
                                            type="text"
                                            placeholder="Watermark text..."
                                            value={localOptions.watermarkText || ''}
                                            onChange={(e) => setLocalOptions(prev => ({ ...prev, watermarkText: e.target.value || null }))}
                                            className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-xs font-medium focus:border-[var(--accent)] outline-none bg-white"
                                        />
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[8px] font-bold text-[var(--ink-soft)] uppercase">
                                                <span>Opacity</span>
                                                <span>{Math.round(localOptions.watermarkOpacity * 100)}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="1" step="0.05"
                                                value={localOptions.watermarkOpacity}
                                                onChange={(e) => setLocalOptions(prev => ({ ...prev, watermarkOpacity: Number(e.target.value) }))}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">Rename Pattern</label>
                                        <input
                                            type="text"
                                            placeholder="[name]_[width]x[height]"
                                            value={localOptions.renamePattern || ''}
                                            onChange={(e) => setLocalOptions(prev => ({ ...prev, renamePattern: e.target.value || null }))}
                                            className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-xs font-mono focus:border-[var(--accent)] outline-none bg-white"
                                        />
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[8px] text-[var(--ink-soft)] font-mono">
                                            <span>[name] original</span>
                                            <span>[width] w</span>
                                            <span>[height] h</span>
                                            <span>[date] yyyy-mm-dd</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="absolute bottom-0 w-full border-t border-[var(--line)] bg-white p-6 dark:bg-gray-100">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setOptions(localOptions);
                                        onClose();
                                    }}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-110"
                                >
                                    <Save size={18} />
                                    Aplicar cambios
                                </button>
                                <button
                                    onClick={() => setLocalOptions(options)}
                                    className="flex items-center justify-center rounded-2xl border border-[var(--line)] px-6 py-4 transition hover:bg-gray-50"
                                    title="Restablecer"
                                >
                                    <Undo2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
}

