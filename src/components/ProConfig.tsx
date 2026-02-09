"use client";

import { motion } from "framer-motion";
import { Settings2, SlidersHorizontal } from "lucide-react";
import { TransformOptions, TransformPreset, PRESETS, OUTPUT_FORMATS, RESIZE_FITS } from "@/lib/image-tools";

interface ProConfigProps {
    options: TransformOptions;
    setOptions: React.Dispatch<React.SetStateAction<TransformOptions>>;
    selectedPresetId: string;
    applyPreset: (id: string) => void;
    reset: () => void;
    parseOptions: (raw: unknown) => TransformOptions;
}

const ROTATION_OPTIONS = [0, 90, 180, 270];

export function ProConfig({
    options,
    setOptions,
    selectedPresetId,
    applyPreset,
    reset,
    parseOptions,
}: ProConfigProps) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
            },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Settings2 size={18} className="text-[var(--accent)]" />
                    2. Configuracion avanzada
                </h2>
                <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                    Restablecer
                </button>
            </div>

            <motion.div variants={item} className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => {
                    const selected = selectedPresetId === preset.id;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset.id)}
                            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${selected
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                                : "border-[var(--line)] bg-white hover:border-[var(--accent-2)]"
                                }`}
                            title={preset.description}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </motion.div>

            <div className="grid gap-5">
                <motion.div variants={item} className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Formato</span>
                        <select
                            value={options.format}
                            onChange={(event) =>
                                setOptions((prev) => parseOptions({ ...prev, format: event.target.value }))
                            }
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        >
                            {OUTPUT_FORMATS.map((format) => (
                                <option key={format} value={format}>
                                    {format.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Calidad</span>
                            <span className="text-xs font-mono font-bold text-[var(--accent)]">{options.quality}%</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={100}
                            value={options.quality}
                            onChange={(event) =>
                                setOptions((prev) =>
                                    parseOptions({ ...prev, quality: Number(event.target.value) })
                                )
                            }
                            className="mt-3 w-full h-1.5 rounded-full bg-[var(--line)] accent-[var(--accent)] appearance-none cursor-pointer"
                        />
                    </label>
                </motion.div>

                <motion.div variants={item} className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Ancho</span>
                        <input
                            type="number"
                            min={1}
                            placeholder="Auto"
                            value={options.width ?? ""}
                            onChange={(event) =>
                                setOptions((prev) =>
                                    parseOptions({ ...prev, width: event.target.value.trim() })
                                )
                            }
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        />
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Alto</span>
                        <input
                            type="number"
                            min={1}
                            placeholder="Auto"
                            value={options.height ?? ""}
                            onChange={(event) =>
                                setOptions((prev) =>
                                    parseOptions({ ...prev, height: event.target.value.trim() })
                                )
                            }
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        />
                    </label>
                </motion.div>

                <motion.div variants={item} className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Modo de ajuste</span>
                        <select
                            value={options.fit}
                            onChange={(event) =>
                                setOptions((prev) => parseOptions({ ...prev, fit: event.target.value }))
                            }
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        >
                            {RESIZE_FITS.map((fit) => (
                                <option key={fit} value={fit}>
                                    {fit.charAt(0).toUpperCase() + fit.slice(1)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Rotacion</span>
                        <select
                            value={options.rotate}
                            onChange={(event) =>
                                setOptions((prev) => parseOptions({ ...prev, rotate: Number(event.target.value) }))
                            }
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        >
                            {ROTATION_OPTIONS.map((rotation) => (
                                <option key={rotation} value={rotation}>
                                    {rotation}° grados
                                </option>
                            ))}
                        </select>
                    </label>
                </motion.div>

                <motion.div variants={item} className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Desenfoque</span>
                            <span className="text-xs font-mono font-bold text-[var(--accent)]">{options.blur}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={20}
                            step="0.1"
                            value={options.blur}
                            onChange={(event) =>
                                setOptions((prev) =>
                                    parseOptions({ ...prev, blur: Number(event.target.value) })
                                )
                            }
                            className="mt-3 w-full h-1.5 rounded-full bg-[var(--line)] accent-[var(--accent)] appearance-none cursor-pointer"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Fondo (hex)</span>
                        <div className="relative mt-1.5">
                            <input
                                type="text"
                                placeholder="#ffffff"
                                value={options.background ?? ""}
                                onChange={(event) =>
                                    setOptions((prev) => parseOptions({ ...prev, background: event.target.value }))
                                }
                                className="w-full rounded-xl border border-[var(--line)] bg-white pl-10 pr-4 py-2.5 text-sm font-mono shadow-sm outline-none focus:border-[var(--accent)]"
                            />
                            <div
                                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-[var(--line)]"
                                style={{ backgroundColor: options.background || '#ffffff' }}
                            />
                        </div>
                    </label>
                </motion.div>

                <motion.div variants={item} className="space-y-4 rounded-2xl border border-[var(--line)] bg-white/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">Ajustes Pro</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            { key: 'brightness', label: 'Brillo', min: 0.5, max: 1.5, step: 0.05 },
                            { key: 'contrast', label: 'Contraste', min: 0.5, max: 1.5, step: 0.05 },
                            { key: 'saturation', label: 'Saturación', min: 0, max: 2, step: 0.1 },
                            { key: 'gamma', label: 'Gamma', min: 1, max: 3, step: 0.1 },
                        ].map(adj => (
                            <div key={adj.key} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-[var(--ink-soft)] uppercase">{adj.label}</span>
                                    <span className="text-[10px] font-mono text-[var(--accent)]">{options[adj.key as keyof TransformOptions] ?? 1}</span>
                                </div>
                                <input
                                    type="range"
                                    min={adj.min}
                                    max={adj.max}
                                    step={adj.step}
                                    value={(options[adj.key as keyof TransformOptions] as number) ?? (adj.key === 'gamma' ? 2.2 : 1)}
                                    onChange={(e) => setOptions(prev => parseOptions({ ...prev, [adj.key]: Number(e.target.value) }))}
                                    className="w-full h-1 rounded-full bg-[var(--line)] accent-[var(--accent)] appearance-none cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={item} className="grid grid-cols-2 gap-3">
                    {[
                        { key: "grayscale", label: "Grises" },
                        { key: "sepia", label: "Sepia" },
                        { key: "sharpen", label: "Enfocar" },
                        { key: "smartCrop", label: "Smart Crop" },
                        { key: "flip", label: "Flip V" },
                        { key: "flop", label: "Flip H" },
                        { key: "stripMetadata", label: "No meta" },
                        { key: "lossless", label: "Lossless" },
                    ].map((opt) => (
                        <label
                            key={opt.key}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all ${options[opt.key as keyof TransformOptions] ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)] bg-white'}`}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(options[opt.key as keyof TransformOptions])}
                                onChange={(event) => setOptions((prev) => parseOptions({ ...prev, [opt.key]: event.target.checked }))}
                                className="h-3 w-3 accent-[var(--accent)]"
                            />
                            <span className="text-[9px] font-bold text-[var(--ink-soft)] uppercase tracking-tight">
                                {opt.label}
                            </span>
                        </label>
                    ))}
                </motion.div>

                <motion.div variants={item} className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Marca de Agua</span>
                        <input
                            type="text"
                            placeholder="Texto..."
                            value={options.watermarkText || ""}
                            onChange={(event) => setOptions((prev) => parseOptions({ ...prev, watermarkText: event.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        />
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Renombrado</span>
                        <input
                            type="text"
                            placeholder="[name]_[width]x[height]"
                            value={options.renamePattern || ""}
                            onChange={(event) => setOptions((prev) => parseOptions({ ...prev, renamePattern: event.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-xs font-mono shadow-sm outline-none focus:border-[var(--accent)]"
                        />
                    </label>
                </motion.div>
            </div>
        </motion.div>
    );
}
