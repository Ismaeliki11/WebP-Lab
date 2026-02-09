"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type EasyGoal = "web-fast" | "balanced" | "max-quality" | "social";
type EasySize = "original" | "1920" | "1200" | "800";

interface EasySettings {
    goal: EasyGoal;
    format: "webp" | "avif" | "jpeg" | "png";
    compressionLevel: 1 | 2 | 3;
    size: EasySize;
    stripMetadata: boolean;
    withoutEnlargement: boolean;
}

interface EasyConfigProps {
    settings: EasySettings;
    setSettings: React.Dispatch<React.SetStateAction<EasySettings>>;
    outputFormats: readonly string[];
    sizeLabel: (size: EasySize) => string;
    compressionText: (level: 1 | 2 | 3) => string;
    reset: () => void;
    previewOptions: {
        format: string;
        quality: number;
        size: string;
    };
}

export function EasyConfig({
    settings,
    setSettings,
    outputFormats,
    sizeLabel,
    compressionText,
    reset,
    previewOptions,
}: EasyConfigProps) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const item = {
        hidden: { opacity: 0, x: -10 },
        show: { opacity: 1, x: 0 },
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
                    <Sparkles size={18} className="text-[var(--accent-2)]" />
                    2. Configuracion rapida
                </h2>
                <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                    Restablecer
                </button>
            </div>

            <motion.div variants={item}>
                <p className="mb-3 text-sm font-bold text-[var(--ink-0)]">Objetivo</p>
                <div className="grid gap-2 sm:grid-cols-2">
                    {[
                        { id: "web-fast", label: "Web rapido", desc: "Archivos mas pequenos" },
                        { id: "balanced", label: "Equilibrado", desc: "Calidad y peso" },
                        { id: "max-quality", label: "Maxima calidad", desc: "Mas detalle" },
                        { id: "social", label: "Redes sociales", desc: "1200x630 listo" },
                    ].map((goal) => {
                        const selected = settings.goal === goal.id;
                        return (
                            <button
                                key={goal.id}
                                type="button"
                                onClick={() => setSettings((prev) => ({ ...prev, goal: goal.id as EasyGoal }))}
                                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${selected
                                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,white)] ring-2 ring-[var(--accent)]/10"
                                    : "border-[var(--line)] bg-white hover:border-[var(--accent-2)]"
                                    }`}
                            >
                                <div className="relative z-10">
                                    <p className={`text-sm font-bold ${selected ? "text-[var(--accent)]" : "text-[var(--ink-0)]"}`}>
                                        {goal.label}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[var(--ink-soft)] font-medium">{goal.desc}</p>
                                </div>
                                {selected && (
                                    <motion.div
                                        layoutId="active-goal"
                                        className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            <motion.div variants={item} className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="text-sm font-bold text-[var(--ink-0)]">Formato</span>
                    <select
                        value={settings.format}
                        onChange={(event) =>
                            setSettings((prev) => ({ ...prev, format: event.target.value as "webp" | "avif" | "jpeg" | "png" }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                    >
                        {outputFormats.map((format) => (
                            <option key={format} value={format}>
                                {format.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block">
                    <span className="text-sm font-bold text-[var(--ink-0)]">Tamano maximo</span>
                    <select
                        value={settings.size}
                        onChange={(event) =>
                            setSettings((prev) => ({ ...prev, size: event.target.value as EasySize }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                    >
                        {(["original", "1920", "1200", "800"] as EasySize[]).map((size) => (
                            <option key={size} value={size}>
                                {sizeLabel(size)}
                            </option>
                        ))}
                    </select>
                </label>
            </motion.div>

            <motion.div variants={item}>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-[var(--ink-0)]">Nivel de Compresion</p>
                    <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)] uppercase">
                        {compressionText(settings.compressionLevel)}
                    </span>
                </div>
                <div className="relative flex items-center h-10">
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={1}
                        value={settings.compressionLevel}
                        onChange={(event) =>
                            setSettings((prev) => ({
                                ...prev,
                                compressionLevel: Number(event.target.value) as 1 | 2 | 3,
                            }))
                        }
                        className="w-full h-1.5 rounded-full bg-[var(--line)] accent-[var(--accent)] appearance-none cursor-pointer"
                    />
                </div>
            </motion.div>

            <motion.div variants={item} className="grid grid-cols-2 gap-3">
                {[
                    { key: "stripMetadata", label: "Quitar metadata" },
                    { key: "withoutEnlargement", label: "No ampliar" },
                ].map((opt) => (
                    <label
                        key={opt.key}
                        className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 cursor-pointer transition-all hover:bg-white hover:shadow-sm"
                    >
                        <div className="relative flex h-5 w-5 items-center justify-center">
                            <input
                                type="checkbox"
                                checked={!!settings[opt.key as keyof EasySettings]}
                                onChange={(event) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        [opt.key]: event.target.checked,
                                    }))
                                }
                                className="peer h-full w-full opacity-0 cursor-pointer"
                            />
                            <div className="absolute inset-0 rounded-md border-2 border-[var(--line)] transition-colors peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)]" />
                            <svg
                                className="absolute inset-0 h-full w-full text-white opacity-0 peer-checked:opacity-100 transition-opacity p-1"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold text-[var(--ink-soft)] select-none">
                            {opt.label}
                        </span>
                    </label>
                ))}
            </motion.div>

            <motion.div
                variants={item}
                className="rounded-3xl border border-[var(--line)] bg-white/40 p-5 backdrop-blur-sm"
            >
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-3">
                    Configuracion en vivo
                </p>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-[var(--ink-soft)]">Formato</p>
                        <p className="text-sm font-bold text-[var(--accent)] uppercase">{previewOptions.format}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-[var(--ink-soft)]">Calidad</p>
                        <p className="text-sm font-bold text-[var(--ink-0)]">{previewOptions.quality}%</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-[var(--ink-soft)]">Tamano</p>
                        <p className="text-sm font-bold text-[var(--ink-0)] truncate">{previewOptions.size}</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
