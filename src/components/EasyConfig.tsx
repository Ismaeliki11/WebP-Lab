"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { TransformOptions } from "@/lib/image-tools";

import { InfoTooltip } from "./InfoTooltip";

type EasyGoal = "web-fast" | "balanced" | "max-quality" | "social";
type EasySize = "original" | "1920" | "1200" | "800";

interface EasySettings {
    goal: EasyGoal;
    format: TransformOptions["format"];
    compressionLevel: 1 | 2 | 3;
    size: EasySize;
    stripMetadata: boolean;
    withoutEnlargement: boolean;
    removeBackground: boolean;
    backgroundMode: TransformOptions["backgroundMode"];
    backgroundColor: string | null;
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
    backgroundImagePreviewUrl: string | null;
    backgroundImageName: string | null;
    onBackgroundImageChange: (file: File | null) => void;
    lang: "es" | "en";
}

export function EasyConfig({
    settings,
    setSettings,
    outputFormats,
    sizeLabel,
    compressionText,
    reset,
    previewOptions,
    backgroundImagePreviewUrl,
    backgroundImageName,
    onBackgroundImageChange,
    lang,
}: EasyConfigProps) {
    const t = {
        es: {
            title: "2. Configuracion rapida",
            reset: "Restablecer",
            goal: "Objetivo",
            goals: [
                { id: "web-fast", label: "Web rapido", desc: "Archivos mas pequenos" },
                { id: "balanced", label: "Equilibrado", desc: "Calidad y peso" },
                { id: "max-quality", label: "Maxima calidad", desc: "Mas detalle" },
                { id: "social", label: "Redes sociales", desc: "1200x630 listo" },
            ],
            format: "Formato",
            maxSize: "Tamano maximo",
            compressionLevel: "Nivel de compresion",
            stripMetadata: "Quitar metadata",
            withoutEnlargement: "No ampliar",
            removeBackground: "Eliminar fondo",
            replacementTitle: "Fondo despues del recorte",
            replacementDesc: "Sustituye el fondo eliminado por el mismo color o imagen en toda la cola.",
            transparentBg: "Transparente",
            solidBg: "Color solido",
            imageBg: "Imagen",
            colorLabel: "Color de fondo",
            imageLabel: "Imagen compartida",
            chooseImage: "Elegir imagen",
            removeImage: "Quitar imagen",
            noImage: "Aun no has cargado una imagen de fondo.",
            liveConfig: "Configuracion en vivo",
            liveFormat: "Formato",
            liveQuality: "Calidad",
            liveSize: "Tamano",
        },
        en: {
            title: "2. Quick Settings",
            reset: "Reset",
            goal: "Goal",
            goals: [
                { id: "web-fast", label: "Fast Web", desc: "Smallest files" },
                { id: "balanced", label: "Balanced", desc: "Quality & size" },
                { id: "max-quality", label: "Max Quality", desc: "More detail" },
                { id: "social", label: "Social Media", desc: "1200x630 ready" },
            ],
            format: "Format",
            maxSize: "Max Size",
            compressionLevel: "Compression Level",
            stripMetadata: "Strip metadata",
            withoutEnlargement: "No enlargement",
            removeBackground: "Remove background",
            replacementTitle: "Background after removal",
            replacementDesc: "Replace the removed background with the same color or image across the whole queue.",
            transparentBg: "Transparent",
            solidBg: "Solid color",
            imageBg: "Image",
            colorLabel: "Background color",
            imageLabel: "Shared image",
            chooseImage: "Choose image",
            removeImage: "Remove image",
            noImage: "No background image uploaded yet.",
            liveConfig: "Live Settings",
            liveFormat: "Format",
            liveQuality: "Quality",
            liveSize: "Size",
        },
    }[lang];

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
                    {t.title}
                </h2>
                <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                    {t.reset}
                </button>
            </div>

            <motion.div variants={item}>
                <p className="mb-3 text-sm font-bold text-[var(--ink-0)]">{t.goal}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                    {t.goals.map((goal) => {
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
                    <span className="text-sm font-bold text-[var(--ink-0)]">{t.format}</span>
                    <select
                        value={settings.format}
                        onChange={(event) =>
                            setSettings((prev) => ({ ...prev, format: event.target.value as TransformOptions["format"] }))
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
                    <span className="text-sm font-bold text-[var(--ink-0)]">{t.maxSize}</span>
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
                    <p className="text-sm font-bold text-[var(--ink-0)] flex items-center gap-2">
                        {t.compressionLevel}
                        <InfoTooltip
                            lang={lang}
                            title={lang === "es" ? "Nivel de compresion" : "Compression Level"}
                            content={
                                <div className="space-y-2">
                                    <p>{lang === "es" ? "Controla como se balancea la calidad visual y el peso del archivo resultante." : "Controls the balance between visual quality and resulting file size."}</p>
                                    <ul className="list-disc pl-5 space-y-1 text-[var(--ink-soft)]">
                                        <li><strong>{lang === "es" ? "Ligera:" : "Light:"}</strong> {lang === "es" ? "Mantiene la maxima calidad posible. Ideal para fotografia y archivos importantes." : "Maintains maximum possible quality. Ideal for photography and important files."}</li>
                                        <li><strong>{lang === "es" ? "Equilibrada:" : "Balanced:"}</strong> {lang === "es" ? "El mejor balance. Reduce considerablemente el peso sin perdida visible a simple vista." : "The best balance. Considerably reduces file size without visible loss to the naked eye."}</li>
                                        <li><strong>{lang === "es" ? "Intensa:" : "Intense:"}</strong> {lang === "es" ? "Archivos diminutos. Puede presentar ligera borrosidad o artefactos utiles para miniaturas o web ultra rapida." : "Tiny files. May present slight blurriness or artifacts. Useful for thumbnails or ultra-fast web."}</li>
                                    </ul>
                                </div>
                            }
                        />
                    </p>
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

            <motion.div variants={item} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                    { key: "stripMetadata", label: t.stripMetadata },
                    { key: "withoutEnlargement", label: t.withoutEnlargement },
                    { key: "removeBackground", label: t.removeBackground },
                ].map((opt) => (
                    <label
                        key={opt.key}
                        className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 cursor-pointer transition-all hover:bg-white hover:shadow-sm"
                    >
                        <div className="relative flex h-5 w-5 items-center justify-center">
                            <input
                                type="checkbox"
                                checked={Boolean(settings[opt.key as keyof EasySettings])}
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
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <span className="flex items-center gap-2 text-xs font-bold text-[var(--ink-soft)] select-none">
                            {opt.label}
                            {opt.key === "stripMetadata" && (
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                    <InfoTooltip
                                        lang={lang}
                                        title={lang === "es" ? "Quitar metadata (EXIF)" : "Strip metadata (EXIF)"}
                                        content={
                                            <div className="space-y-2">
                                                <p>{lang === "es" ? "Esta opcion elimina los datos ocultos dentro de la imagen." : "This option removes the hidden data inside the image."}</p>
                                                <p><strong>{lang === "es" ? "Que incluye?" : "What does it include?"}</strong> {lang === "es" ? "Ubicaciones GPS, modelo de camara, fecha exacta y perfiles de color (ICC)." : "GPS locations, camera model, exact date, and color profiles (ICC)."}</p>
                                                <p><strong>{lang === "es" ? "Por que usarlo?" : "Why use it?"}</strong> {lang === "es" ? "Reduce aun mas el peso final y protege tu privacidad al publicarlas en la web." : "Further reduces final file size and protects your privacy when publishing on the web."}</p>
                                                <p className="text-[var(--danger)]/80 text-xs">{lang === "es" ? "Desactivalo solo si necesitas mantener el perfil de color original para imprimir." : "Disable it only if you need to keep the original color profile for printing."}</p>
                                            </div>
                                        }
                                    />
                                </div>
                            )}
                            {opt.key === "withoutEnlargement" && (
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                    <InfoTooltip
                                        lang={lang}
                                        title={lang === "es" ? "No ampliar" : "Do not enlarge"}
                                        content={
                                            <div className="space-y-2">
                                                <p>{lang === "es" ? "Impide que la imagen se haga artificialmente mas grande de lo que realmente es." : "Prevents the image from becoming artificially larger than it actually is."}</p>
                                                <p>{lang === "es" ? "Si solicitas 1920px pero subes una imagen de 800px:" : "If you request 1920px but upload an 800px image:"}</p>
                                                <ul className="list-disc pl-5 space-y-1 text-[var(--ink-soft)]">
                                                    <li><strong>{lang === "es" ? "Activado:" : "Enabled:"}</strong> {lang === "es" ? "Se exporta a 800px sin perder nitidez." : "It is exported at 800px without losing sharpness."}</li>
                                                    <li><strong>{lang === "es" ? "Desactivado:" : "Disabled:"}</strong> {lang === "es" ? "Se estirara y puede verse borrosa." : "It will be stretched and may look blurry."}</li>
                                                </ul>
                                            </div>
                                        }
                                    />
                                </div>
                            )}
                            {opt.key === "removeBackground" && (
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                    <InfoTooltip
                                        lang={lang}
                                        title={lang === "es" ? "Eliminar fondo" : "Remove background"}
                                        content={
                                            <div className="space-y-2">
                                                <p>{lang === "es" ? "Recorta automaticamente el sujeto principal para toda la cola." : "Automatically cuts out the main subject for the whole queue."}</p>
                                                <p><strong>remove.bg</strong> {lang === "es" ? "se usa si hay API key; si no, la app usa el motor local." : "is used when an API key is available; otherwise the app uses the local engine."}</p>
                                                <p className="text-[var(--danger)]/80 text-xs">{lang === "es" ? "Despues puedes dejar transparencia o colocar un fondo comun a todas las imagenes." : "After that you can keep transparency or place one shared background across all images."}</p>
                                            </div>
                                        }
                                    />
                                </div>
                            )}
                        </span>
                    </label>
                ))}
            </motion.div>

            <AnimatePresence initial={false}>
                {settings.removeBackground && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -8 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -8 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="space-y-4 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--bg-soft)]/85 p-5"
                    >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">
                                {t.replacementTitle}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">
                                {t.replacementDesc}
                            </p>
                        </div>
                        <InfoTooltip
                            lang={lang}
                            title={t.replacementTitle}
                            content={
                                <div className="space-y-2">
                                    <p>{lang === "es" ? "Transparente mantiene el recorte limpio. Color solido rellena el fondo con un unico tono. Imagen reutiliza el mismo archivo para toda la cola." : "Transparent keeps the clean cutout. Solid color fills the background with one tone. Image reuses the same file for the entire queue."}</p>
                                    <p>{lang === "es" ? "La opcion imagen aplica automaticamente el mismo fondo a todas las fotos procesadas." : "Image mode automatically applies the same background to every processed photo."}</p>
                                </div>
                            }
                        />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                        {[
                            { value: "transparent", label: t.transparentBg },
                            { value: "solid", label: t.solidBg },
                            { value: "image", label: t.imageBg },
                        ].map((mode) => {
                            const selected = settings.backgroundMode === mode.value;
                            return (
                                <button
                                    key={mode.value}
                                    type="button"
                                    onClick={() =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            backgroundMode: mode.value as TransformOptions["backgroundMode"],
                                        }))
                                    }
                                    className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${selected
                                        ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/15"
                                        : "border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                        }`}
                                >
                                    {mode.label}
                                </button>
                            );
                        })}
                    </div>

                    {settings.backgroundMode === "solid" && (
                        <div className="grid gap-3 sm:grid-cols-[auto,1fr]">
                            <label className="block">
                                <span className="text-xs font-bold text-[var(--ink-0)]">{t.colorLabel}</span>
                                <input
                                    type="color"
                                    value={settings.backgroundColor ?? "#ffffff"}
                                    onChange={(event) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            backgroundColor: event.target.value,
                                        }))
                                    }
                                    className="mt-1.5 h-12 w-16 rounded-xl border border-[var(--line)] bg-white p-1"
                                />
                            </label>

                            <label className="block">
                                <span className="text-xs font-bold text-[var(--ink-0)]">{t.colorLabel} (HEX)</span>
                                <input
                                    type="text"
                                    value={settings.backgroundColor ?? "#ffffff"}
                                    onChange={(event) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            backgroundColor: event.target.value,
                                        }))
                                    }
                                    placeholder="#ffffff"
                                    className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-mono shadow-sm outline-none focus:border-[var(--accent)]"
                                />
                            </label>
                        </div>
                    )}

                    {settings.backgroundMode === "image" && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-[var(--ink-0)]">{t.imageLabel}</p>
                                    <p className="text-xs text-[var(--ink-soft)]">{backgroundImageName ?? t.noImage}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="cursor-pointer rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[var(--accent-2)]">
                                        {t.chooseImage}
                                        <input
                                            type="file"
                                            accept="image/*,.heic,.heif"
                                            className="hidden"
                                            onChange={(event) => {
                                                onBackgroundImageChange(event.target.files?.[0] ?? null);
                                                event.target.value = "";
                                            }}
                                        />
                                    </label>
                                    {backgroundImageName && (
                                        <button
                                            type="button"
                                            onClick={() => onBackgroundImageChange(null)}
                                            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-bold text-[var(--ink-soft)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                                        >
                                            {t.removeImage}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {backgroundImagePreviewUrl && (
                                <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                                    <img
                                        src={backgroundImagePreviewUrl}
                                        alt={backgroundImageName ?? t.imageLabel}
                                        className="h-40 w-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                variants={item}
                className="rounded-3xl border border-[var(--line)] bg-white/40 p-5 backdrop-blur-sm"
            >
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-3">
                    {t.liveConfig}
                </p>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-[var(--ink-soft)]">{t.liveFormat}</p>
                        <p className="text-sm font-bold text-[var(--accent)] uppercase">{previewOptions.format}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-[var(--ink-soft)]">{t.liveQuality}</p>
                        <p className="text-sm font-bold text-[var(--ink-0)]">{previewOptions.quality}%</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-[var(--ink-soft)]">{t.liveSize}</p>
                        <p className="text-sm font-bold text-[var(--ink-0)] truncate">{previewOptions.size}</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
