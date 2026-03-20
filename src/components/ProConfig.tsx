"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings2, SlidersHorizontal, Save, X, Type, FileText, Hash, Calendar, Sparkles, RefreshCw, Scissors, Info } from "lucide-react";
import { TransformOptions, TransformPreset, PRESETS, OUTPUT_FORMATS, RESIZE_FITS } from "@/lib/image-tools";
import { InfoTooltip, InfoNote } from "./InfoTooltip";

interface ProConfigProps {
    options: TransformOptions;
    setOptions: React.Dispatch<React.SetStateAction<TransformOptions>>;
    selectedPresetId: string;
    applyPreset: (id: string) => void;
    reset: () => void;
    parseOptions: (raw: unknown) => TransformOptions;
    customPresets: TransformPreset[];
    saveCustomPreset: (name: string, options: TransformOptions) => void;
    deleteCustomPreset: (id: string) => void;
    lang: "es" | "en";
}

const ROTATION_OPTIONS = [0, 90, 180, 270];

export function ProConfig({
    options,
    setOptions,
    selectedPresetId,
    applyPreset,
    reset,
    parseOptions,
    customPresets,
    saveCustomPreset,
    deleteCustomPreset,
    lang,
}: ProConfigProps) {
    const [newPresetName, setNewPresetName] = useState("");
    const [isSavingPreset, setIsSavingPreset] = useState(false);

    const allPresets = [...PRESETS, ...customPresets];

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
                    {lang === 'es' ? "2. Configuracion avanzada" : "2. Advanced configuration"}
                </h2>
                <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                    {lang === 'es' ? "Restablecer" : "Reset"}
                </button>
            </div>

            <motion.div variants={item} className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                    {allPresets.map((preset) => {
                        const selected = selectedPresetId === preset.id;
                        const isCustom = customPresets.some(p => p.id === preset.id);
                        return (
                            <div key={preset.id} className="relative group inline-flex">
                                <button
                                    type="button"
                                    onClick={() => applyPreset(preset.id)}
                                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${selected
                                        ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                                        : "border-[var(--line)] bg-white hover:border-[var(--accent-2)]"
                                        } ${isCustom ? "pr-8" : ""}`}
                                    title={preset.description}
                                >
                                    {preset.label}
                                </button>
                                {isCustom && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); deleteCustomPreset(preset.id); }}
                                        className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${selected ? 'text-white hover:bg-white/20' : 'text-[var(--danger)] hover:bg-[var(--danger)]/10'}`}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {isSavingPreset ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newPresetName}
                            onChange={e => setNewPresetName(e.target.value)}
                            placeholder={lang === 'es' ? "Nombre de receta..." : "Recipe name..."}
                            className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-[var(--accent)]"
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Enter' && newPresetName.trim()) {
                                    saveCustomPreset(newPresetName.trim(), options);
                                    setIsSavingPreset(false);
                                    setNewPresetName("");
                                }
                                if (e.key === 'Escape') {
                                    setIsSavingPreset(false);
                                    setNewPresetName("");
                                }
                            }}
                        />
                        <button
                            type="button"
                            disabled={!newPresetName.trim()}
                            onClick={() => {
                                saveCustomPreset(newPresetName.trim(), options);
                                setIsSavingPreset(false);
                                setNewPresetName("");
                            }}
                            className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                            {lang === 'es' ? "Guardar" : "Save"}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsSavingPreset(false); setNewPresetName(""); }}
                            className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ink-soft)]"
                        >
                            {lang === 'es' ? "Cancelar" : "Cancel"}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSavingPreset(true)}
                            className="text-xs font-bold text-[var(--accent)] flex items-center gap-1 hover:text-[var(--accent-2)] w-fit"
                        >
                            <Save size={12} />
                            {lang === 'es' ? "Guardar como nueva receta" : "Save as new recipe"}
                        </button>
                        <InfoTooltip lang={lang}
                            title={lang === 'es' ? "Guardar como receta custom" : "Save as custom recipe"}
                            content={
                                <div className="space-y-2">
                                    <p>{lang === 'es' ? "Toma exactamente todos los ajustes que tengas en pantalla ahora mismo (formatos, barras y opciones) y los guarda en tu navegador bajo un nombre personalizado." : "Takes exactly all the settings you currently have on screen (formats, sliders, and options) and saves them in your browser under a custom name."}</p>
                                    <p><strong>{lang === 'es' ? "¿Cuándo usarlo?" : "When to use it?"}</strong> {lang === 'es' ? "Útil si siempre conviertes a JPEG 60% + Logo para clientes y no quieres volver a configurar los deslizadores uno por uno cada vez que entras a la aplicación." : "Useful if you always convert to JPEG 60% + Logo for clients and don't want to reconfigure the sliders one by one every time you open the app."}</p>
                                </div>
                            }
                        />
                    </div>
                )}
            </motion.div>

            <div className="grid gap-5">
                <motion.div variants={item} className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] flex items-center gap-1.5">
                            {lang === 'es' ? "Formato" : "Format"}
                            <InfoTooltip lang={lang}
                                title={lang === 'es' ? "Formatos de Salida" : "Output Formats"}
                                content={
                                    <ul className="list-disc pl-5 space-y-2 text-[var(--ink-soft)]">
                                        <li><strong>WEBP:</strong> {lang === 'es' ? "El formato moderno ideal para la web. Super ligero y retiene transparencias." : "The ideal modern format for the web. Super light and retains transparencies."}</li>
                                        <li><strong>AVIF:</strong> {lang === 'es' ? "Tecnología de vanguardia. Comprime mejor que WebP pero tiene menor compatibilidad en navegadores antiguos." : "Cutting-edge technology. Compresses better than WebP but has lower compatibility in older browsers."}</li>
                                        <li><strong>JPEG:</strong> {lang === 'es' ? "El clásico. 100% compatible. NO soporta fondos transparentes." : "The classic. 100% compatible. DOES NOT support transparent backgrounds."}</li>
                                        <li><strong>PNG:</strong> {lang === 'es' ? <>Utilízalo si necesitas <em>Lossless</em> (sin pérdida) en logotipos transparentes, no apto para fotografías web por su alto peso.</> : <>Use it if you need <em>Lossless</em> on transparent logos, not suitable for web photos due to its high file size.</>}</li>
                                    </ul>
                                }
                            />
                        </span>
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
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">{lang === 'es' ? "Calidad" : "Quality"}</span>
                            <span className={`text-xs font-mono font-bold ${options.lossless ? 'text-[var(--ink-light)]' : 'text-[var(--accent)]'}`}>
                                {options.lossless ? (lang === 'es' ? 'IGNORADA' : 'IGNORED') : `${options.quality}%`}
                            </span>
                        </div>
                        {options.lossless && (
                            <div className="bg-[var(--accent)]/10 text-[var(--ink-0)] p-3 rounded-xl border border-[var(--accent)]/20 text-xs shadow-sm mt-3 mb-1">
                                <p className="font-bold flex items-center gap-1.5 mb-1">
                                    <Info size={14} className="text-[var(--accent)]" />
                                    {lang === 'es' ? "Ajuste secundario ignorado" : "Secondary setting ignored"}
                                </p>
                                <p className="opacity-90 leading-relaxed text-[11px]">
                                    {lang === 'es' ? "Al activar la compresión matemática 'Lossless', se retiene el máximo nivel de detalle original forzosamente. Ajustar porcentajes aquí ya no tiene efecto." : "By activating the mathematical 'Lossless' compression, the maximum level of original detail is forcibly retained. Adjusting percentages here no longer has any effect."}
                                </p>
                            </div>
                        )}
                        <input
                            type="range"
                            min={1}
                            max={100}
                            disabled={options.lossless}
                            value={options.quality}
                            onChange={(event) =>
                                setOptions((prev) =>
                                    parseOptions({ ...prev, quality: Number(event.target.value) })
                                )
                            }
                            className="mt-3 w-full h-1.5 rounded-full bg-[var(--line)] accent-[var(--accent)] appearance-none cursor-pointer disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all"
                        />
                    </label>
                </motion.div>

                <motion.div variants={item} className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] flex items-center gap-1.5">
                                {lang === 'es' ? "Ancho" : "Width"}
                                <div className="relative group/tt flex items-center">
                                    <Info size={14} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                        {lang === 'es' ? "Si lo dejas vacío, se mantendrá el ancho original de la imagen." : "If left empty, the original image width will be kept."}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                    </div>
                                </div>
                            </span>
                            <span className="text-[10px] font-bold text-[var(--ink-light)]">px</span>
                        </div>
                        <input
                            type="number"
                            min={1}
                            placeholder={lang === 'es' ? "Tamaño original" : "Original size"}
                            value={options.width ?? ""}
                            onChange={(event) =>
                                setOptions((prev) =>
                                    parseOptions({ ...prev, width: event.target.value.trim() })
                                )
                            }
                            className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        />
                    </label>
                    <label className="block">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] flex items-center gap-1.5">
                                {lang === 'es' ? "Alto" : "Height"}
                                <div className="relative group/tt flex items-center">
                                    <Info size={14} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                        {lang === 'es' ? "Si lo dejas vacío, se mantendrá el alto original de la imagen." : "If left empty, the original image height will be kept."}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                    </div>
                                </div>
                            </span>
                            <span className="text-[10px] font-bold text-[var(--ink-light)]">px</span>
                        </div>
                        <input
                            type="number"
                            min={1}
                            placeholder={lang === 'es' ? "Tamaño original" : "Original size"}
                            value={options.height ?? ""}
                            onChange={(event) =>
                                setOptions((prev) =>
                                    parseOptions({ ...prev, height: event.target.value.trim() })
                                )
                            }
                            className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        />
                    </label>
                </motion.div>

                <motion.div variants={item} className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] flex items-center gap-1.5">
                            {lang === 'es' ? "Modo de ajuste" : "Fit Mode"}
                            <InfoTooltip lang={lang}
                                title={lang === 'es' ? "Modos de Ajuste (Crop)" : "Fit Modes (Crop)"}
                                content={
                                    <div className="space-y-2">
                                        <p>{lang === 'es' ? "Determina qué hace el programa si la foto original tiene distinta proporción que el Alto y Ancho pedidos." : "Determines what the program does if the original photo has a different aspect ratio than the requested Height and Width."}</p>
                                        {(!options.width && !options.height) && (
                                            <div className="bg-[var(--accent)]/10 text-[var(--ink-0)] p-3 rounded-xl border border-[var(--accent)]/20 text-xs shadow-sm my-3">
                                                <p className="font-bold flex items-center gap-1.5 mb-1">
                                                    <Info size={14} className="text-[var(--accent)]" />
                                                    {lang === 'es' ? "Ajuste no necesario" : "Fit unnecessary"}
                                                </p>
                                                <p className="opacity-90 leading-relaxed text-[11px]">
                                                    {lang === 'es' ? "Al mantener el tamaño original de la imagen, modificar cómo encaja no hace falta. Esta opción permanecerá bloqueada." : "By keeping the original image size, modifying how it fits is unnecessary. This option will remain locked."}
                                                </p>
                                            </div>
                                        )}
                                        <ul className="list-disc pl-5 space-y-1 text-[var(--ink-soft)] flex flex-col gap-1">
                                            <li><strong>Cover {lang === 'es' ? "(Recorte)" : "(Crop)"}:</strong> {lang === 'es' ? "La foto llenará todo el espacio y se cortará lo que sobre. Sin bandas vacías." : "The photo will fill the entire space and anything extra will be cropped out. No empty bands."}</li>
                                            <li><strong>Contain {lang === 'es' ? "(Contener)" : "(Contain)"}:</strong> {lang === 'es' ? "Se verán bandas vacías a los lados, pero la foto nunca se recortará ni achatarrará." : "Empty bands will be visible on the sides, but the photo will never be cropped or squashed."}</li>
                                            <li><strong>Fill {lang === 'es' ? "(Estirar)" : "(Stretch)"}:</strong> {lang === 'es' ? "La foto se estira (distorsiona) deformándose perdiendo su proporción original." : "The photo is stretched (distorted) deforming and losing its original proportions."}</li>
                                            <li><strong>Inside:</strong> {lang === 'es' ? "La imagen mantiene el tamaño para encajar sin recortar ni añadir bandas extras." : "The image maintains size to fit without cropping or adding extra bands."}</li>
                                        </ul>
                                    </div>
                                }
                            />
                        </span>
                        <select
                            disabled={!options.width && !options.height}
                            value={options.fit}
                            onChange={(event) =>
                                setOptions((prev) => parseOptions({ ...prev, fit: event.target.value }))
                            }
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:bg-[var(--line)]/30 disabled:cursor-not-allowed transition-all"
                        >
                            {RESIZE_FITS.map((fit) => (
                                <option key={fit} value={fit}>
                                    {fit.charAt(0).toUpperCase() + fit.slice(1)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">{lang === 'es' ? "Rotacion" : "Rotation"}</span>
                        <select
                            value={options.rotate}
                            onChange={(event) =>
                                setOptions((prev) => parseOptions({ ...prev, rotate: Number(event.target.value) }))
                            }
                            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-[var(--accent)]"
                        >
                            {ROTATION_OPTIONS.map((rotation) => (
                                <option key={rotation} value={rotation}>
                                    {rotation}° {lang === 'es' ? "grados" : "degrees"}
                                </option>
                            ))}
                        </select>
                    </label>
                </motion.div>

                <motion.div variants={item} className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">{lang === 'es' ? "Desenfoque" : "Blur"}</span>
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
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">{lang === 'es' ? "Fondo (hex)" : "Background (hex)"}</span>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">{lang === 'es' ? "Ajustes Pro" : "Pro Settings"}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            { key: 'brightness', label: lang === 'es' ? 'Brillo' : 'Brightness', tooltip: lang === 'es' ? 'Ajusta la luminosidad general.' : 'Adjusts the overall lightness.', min: 0.5, max: 1.5, step: 0.05 },
                            { key: 'contrast', label: lang === 'es' ? 'Contraste' : 'Contrast', tooltip: lang === 'es' ? 'Aumenta o disminuye la diferencia de tonos.' : 'Increases or decreases tonal difference.', min: 0.5, max: 1.5, step: 0.05 },
                            { key: 'saturation', label: lang === 'es' ? 'Saturación' : 'Saturation', tooltip: lang === 'es' ? 'Controla la viveza de los colores.' : 'Controls the vividness of colors.', min: 0, max: 2, step: 0.1 },
                            { key: 'gamma', label: 'Gamma', tooltip: lang === 'es' ? 'Altera tonos medios sin quemar blancos.' : 'Alters midtones without blowing out whites.', min: 1, max: 3, step: 0.1 },
                        ].map(adj => (
                            <div key={adj.key} className="space-y-2">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-[var(--ink-soft)] uppercase flex items-center gap-1.5">
                                        {adj.label}
                                        {adj.tooltip && (
                                            <div className="relative group/tt flex items-center">
                                                <Info size={12} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[160px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                                    {adj.tooltip}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                                </div>
                                            </div>
                                        )}
                                    </span>
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
                        { key: "grayscale", label: lang === 'es' ? "Grises" : "Grayscale", tooltip: lang === 'es' ? "Convierte a blanco y negro." : "Converts to black and white." },
                        { key: "sepia", label: "Sepia", tooltip: lang === 'es' ? "Tono vintage amarillento." : "Vintage yellowish tone." },
                        { key: "sharpen", label: lang === 'es' ? "Enfocar" : "Sharpen", tooltip: lang === 'es' ? "Mejora bordes y nitidez." : "Enhances edges and sharpness." },
                        { key: "smartCrop", label: "Smart Crop", tooltip: lang === 'es' ? "Centra el recorte en lo importante." : "Centers crop on subject." },
                        { key: "removeBackground", label: lang === 'es' ? "Sin Fondo" : "No BG", tooltip: lang === 'es' ? "Usa IA local para eliminar el fondo de forma extremadamente rápida." : "Uses local AI to remove the background extremely fast." },
                        { key: "flip", label: "Flip V", tooltip: lang === 'es' ? "Voltea boca abajo." : "Flips upside down." },
                        { key: "flop", label: "Flip H", tooltip: lang === 'es' ? "Efecto espejo." : "Horizontal mirror." },
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
                            className={`flex justify-between items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all ${options[opt.key as keyof TransformOptions] ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)] bg-white'}`}
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={Boolean(options[opt.key as keyof TransformOptions])}
                                    onChange={(event) => setOptions((prev) => parseOptions({ ...prev, [opt.key]: event.target.checked }))}
                                    className="h-3 w-3 accent-[var(--accent)]"
                                />
                                <span className="text-[9px] font-bold text-[var(--ink-soft)] uppercase tracking-tight">
                                    {opt.label}
                                </span>
                            </div>
                            {opt.tooltip && (
                                opt.tooltipNative ? (
                                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                        <InfoTooltip lang={lang} title={opt.label} content={opt.tooltip as React.ReactNode} />
                                    </div>
                                ) : (
                                    <div className="relative group/tt flex items-center">
                                        <Info size={12} className="text-[var(--ink-light)] group-hover/tt:text-[var(--accent)] cursor-help transition-colors" />
                                        <div className="absolute bottom-full right-0 mb-2 w-max max-w-[140px] pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-all translate-y-1 group-hover/tt:translate-y-0 z-50 bg-[var(--ink-0)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-xl text-center leading-tight normal-case tracking-normal">
                                            {opt.tooltip as string}
                                            <div className="absolute top-full right-1.5 border-[4px] border-transparent border-t-[var(--ink-0)]" />
                                        </div>
                                    </div>
                                )
                            )}
                        </label>
                    ))}
                </motion.div>

                <motion.div variants={item} className="space-y-6">
                    <div className="rounded-[2rem] bg-[var(--bg-soft)] p-8 border border-[var(--line)] space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--ink-0)] flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-[var(--accent)] text-white">
                                    <Type size={16} />
                                </div>
                                {lang === 'es' ? "Configuración de Marca de Agua" : "Watermark Settings"}
                            </h4>
                            <InfoTooltip lang={lang}
                                title={lang === 'es' ? "Marca de Agua Textual" : "Text Watermark"}
                                content={
                                    <div className="space-y-3">
                                        <p>{lang === 'es' ? "Añade una firma o crédito a tus imágenes de forma masiva para proteger tu autoría." : "Add a signature or credit to your images in bulk to protect your authorship."}</p>

                                        <div className="space-y-1.5">
                                            <p className="font-bold text-[10px] uppercase text-[var(--accent)]">{lang === 'es' ? "Opciones principales:" : "Main options:"}</p>
                                            <ul className="text-[10px] space-y-1 list-disc pl-4">
                                                <li><strong>{lang === 'es' ? "Modo Único:" : "Single Mode:"}</strong> {lang === 'es' ? "Una sola marca colocada en uno de los 9 puntos de anclaje." : "A single mark placed on one of the 9 anchor points."}</li>
                                                <li><strong>{lang === 'es' ? "Modo Patrón:" : "Pattern Mode:"}</strong> {lang === 'es' ? "Mosaico repetitivo que cubre toda la imagen (ideal para seguridad)." : "Repetitive mosaic covering the entire image (ideal for security)."}</li>
                                                <li><strong>{lang === 'es' ? "Color & Estilo:" : "Color & Style:"}</strong> {lang === 'es' ? "Ajusta color (blanco/negro), opacidad y tamaño para que combine con tus fotos." : "Adjust color (white/black), opacity, and size to match your photos."}</li>
                                                <li><strong>{lang === 'es' ? "Espaciado:" : "Spacing:"}</strong> {lang === 'es' ? "Define la densidad del patrón para un acabado más tupido o disperso." : "Defines pattern density for a tighter or more dispersed finish."}</li>
                                            </ul>
                                        </div>

                                        <InfoNote>
                                            {lang === 'es' ? "Se aplicará permanentemente al procesar y descargar las imágenes finales." : "Will be permanently applied when processing and downloading the final images."}
                                        </InfoNote>
                                    </div>
                                }
                            />
                        </div>

                        <div className={`grid gap-6 ${options.watermarkMode === 'single' ? 'sm:grid-cols-2' : 'sm:grid-cols-1 max-w-md mx-auto'}`}>
                            <div className="space-y-4">
                                <label className="block space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1">
                                        {lang === 'es' ? "Contenido" : "Content"}
                                    </span>
                                    <input
                                        type="text"
                                        placeholder={lang === 'es' ? "ej: @tu_usuario" : "e.g. @username"}
                                        value={options.watermarkText || ""}
                                        onChange={(event) => setOptions((prev) => parseOptions({ ...prev, watermarkText: event.target.value }))}
                                        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[var(--accent)]"
                                    />
                                </label>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1">
                                        {lang === 'es' ? "Modo & Color" : "Mode & Color"}
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setOptions(prev => parseOptions({ ...prev, watermarkMode: 'single' }))}
                                            className={`rounded-xl border p-2 text-[10px] font-bold uppercase transition-all ${options.watermarkMode === 'single' ? 'bg-[var(--ink-0)] text-white border-transparent' : 'bg-white text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--accent)]'}`}
                                        >
                                            {lang === 'es' ? "Único" : "Single"}
                                        </button>
                                        <button
                                            onClick={() => setOptions(prev => parseOptions({ ...prev, watermarkMode: 'pattern' }))}
                                            className={`rounded-xl border p-2 text-[10px] font-bold uppercase transition-all ${options.watermarkMode === 'pattern' ? 'bg-[var(--ink-0)] text-white border-transparent' : 'bg-white text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--accent)]'}`}
                                        >
                                            {lang === 'es' ? "Patrón" : "Pattern"}
                                        </button>
                                        <button
                                            onClick={() => setOptions(prev => parseOptions({ ...prev, watermarkColor: 'white' }))}
                                            className={`rounded-xl border p-2 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${options.watermarkColor === 'white' ? 'bg-white text-[var(--ink-0)] border-[var(--ink-0)]' : 'bg-white text-[var(--ink-soft)] border-[var(--line)]'}`}
                                        >
                                            <div className="w-3 h-3 rounded-full bg-white border border-[var(--line)]" />
                                            {lang === 'es' ? "Blanco" : "White"}
                                        </button>
                                        <button
                                            onClick={() => setOptions(prev => parseOptions({ ...prev, watermarkColor: 'black' }))}
                                            className={`rounded-xl border p-2 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${options.watermarkColor === 'black' ? 'bg-[var(--ink-0)] text-white border-transparent' : 'bg-white text-[var(--ink-soft)] border-[var(--line)]'}`}
                                        >
                                            <div className="w-3 h-3 rounded-full bg-black" />
                                            {lang === 'es' ? "Negro" : "Black"}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold text-[var(--ink-soft)] uppercase tracking-widest">
                                            <span>{lang === 'es' ? 'Opacidad' : 'Opacity'}</span>
                                            <span>{Math.round(options.watermarkOpacity * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.05"
                                            value={options.watermarkOpacity}
                                            onChange={(e) => setOptions((prev) => parseOptions({ ...prev, watermarkOpacity: Number(e.target.value) }))}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold text-[var(--ink-soft)] uppercase tracking-widest">
                                            <span>{lang === 'es' ? 'Tamaño' : 'Size'}</span>
                                            <span>{options.watermarkSize}px</span>
                                        </div>
                                        <input
                                            type="range" min="8" max="120" step="1"
                                            value={options.watermarkSize}
                                            onChange={(e) => setOptions((prev) => parseOptions({ ...prev, watermarkSize: Number(e.target.value) }))}
                                            className="w-full"
                                        />
                                    </div>
                                    {options.watermarkMode === 'pattern' && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-[var(--ink-soft)] uppercase tracking-widest">
                                                <span>{lang === 'es' ? 'Espaciado' : 'Spacing'}</span>
                                                <span>{options.watermarkSpacing}px</span>
                                            </div>
                                            <input
                                                type="range" min="20" max="200" step="5"
                                                value={options.watermarkSpacing}
                                                onChange={(e) => setOptions((prev) => parseOptions({ ...prev, watermarkSpacing: Number(e.target.value) }))}
                                                className="w-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {options.watermarkMode === 'single' && (
                                <div className="space-y-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">
                                        {lang === 'es' ? "Ubicación" : "Position"}
                                    </span>
                                    <div className="grid grid-cols-3 gap-2 aspect-square max-w-[160px] mx-auto sm:mx-0">
                                        {(['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] as const).map((pos) => {
                                            return (
                                                <button
                                                    key={pos}
                                                    onClick={() => setOptions(prev => parseOptions({ ...prev, watermarkPosition: pos as any }))}
                                                    className={`rounded-xl border transition-all flex items-center justify-center hover:border-[var(--accent)] bg-white ${options.watermarkPosition === pos ? 'bg-[var(--accent)] border-transparent text-white shadow-lg' : 'text-[var(--line)]'}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${options.watermarkPosition === pos ? 'bg-white' : 'bg-current'}`} />
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[10px] text-[var(--ink-soft)] text-center sm:text-left italic">
                                        {lang === 'es' ? "Selecciona el punto de anclaje para la marca de agua." : "Select the anchor point for the watermark."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Metadata Option */}
                        <div className="pt-4 border-t border-[var(--line)]">
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[var(--line)] transition-all hover:border-[var(--accent)]">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-0)] flex items-center gap-1.5">
                                        {lang === 'es' ? "Inyectar en Metadatos" : "Embed in Metadata"}
                                        <InfoTooltip lang={lang}
                                            title={lang === 'es' ? "Metadatos Legales" : "Legal Metadata"}
                                            content={lang === 'es' ?
                                                "Asocia tu autoría al archivo de forma interna. Esto permite que programas como Photoshop o Windows reconozcan el Copyright incluso si la imagen se edita o se borra la firma visual." :
                                                "Internal authorship association. This allows software like Photoshop or Windows to recognize the Copyright even if the image is edited or the visual signature is removed."
                                            }
                                        />
                                    </span>
                                    <p className="text-[9px] text-[var(--ink-soft)] italic">
                                        {lang === 'es' ? "Escribe el texto de la marca en el campo Copyright del archivo." : "Writes the watermark text into the file's Copyright field."}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setOptions(prev => parseOptions({ ...prev, watermarkMetadata: !prev.watermarkMetadata }))}
                                    className={`h-6 w-11 rounded-full transition-colors flex-shrink-0 ${options.watermarkMetadata ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}
                                >
                                    <div className={`h-4 w-4 rounded-full bg-white transition-transform ${options.watermarkMetadata ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <motion.div variants={item} className="space-y-6">
                        <div className="rounded-[2rem] bg-[var(--bg-soft)] p-8 border border-[var(--line)] space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--ink-0)] flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-[var(--accent)] text-white shadow-sm">
                                        <FileText size={16} />
                                    </div>
                                    {lang === 'es' ? "Patrón de Nombres (SEO)" : "Filename Pattern (SEO)"}
                                </h4>
                                <InfoTooltip lang={lang}
                                    title={lang === 'es' ? "Optimización SEO" : "SEO Optimization"}
                                    content={
                                        <div className="space-y-4">
                                            <p>{lang === 'es' ? "Crea una nomenclatura inteligente. Puedes usar las etiquetas o escribir tu propio texto personalizado directamente en el campo." : "Create smart nomenclature. You can use tags or type your own custom text directly in the field."}</p>

                                            <div className="space-y-2 text-[10px]">
                                                <p className="font-bold uppercase text-[var(--accent)] tracking-tighter">{lang === 'es' ? "Etiquetas Disponibles:" : "Available Tags:"}</p>
                                                <ul className="space-y-1 list-disc pl-4 italic opacity-80">
                                                    <li><strong>[name]</strong>: {lang === 'es' ? "Nombre original" : "Original filename"}</li>
                                                    <li><strong>[width] / [height]</strong>: {lang === 'es' ? "Dimensiones" : "Dimensions"}</li>
                                                    <li><strong>[date]</strong>: {lang === 'es' ? "Fecha actual" : "Current date"}</li>
                                                    <li><strong>[n]</strong>: {lang === 'es' ? "Contador secuencial" : "Sequential counter"}</li>
                                                </ul>
                                            </div>

                                            <div className="space-y-2 text-[10px]">
                                                <p className="font-bold uppercase text-[var(--accent)] tracking-tighter">{lang === 'es' ? "Presets (Plantillas):" : "Presets (Templates):"}</p>
                                                <p>{lang === 'es' ? "Combinaciones listas para usar diseñadas para redes sociales, tiendas online o archivos ordenados." : "Ready-to-use combinations designed for social media, online stores, or organized files."}</p>
                                            </div>

                                            <InfoNote>{lang === 'es' ? "La Limpieza SEO (en el switch de abajo) asegura la compatibilidad web total." : "SEO Cleaning (in the switch below) ensures full web compatibility."}</InfoNote>
                                        </div>
                                    }
                                />
                            </div>

                            <div className="space-y-6">
                                {/* Visual Input & Preview */}
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            placeholder="[name]-[width]x[height]"
                                            value={options.renamePattern || ""}
                                            onChange={(event) => setOptions((prev) => parseOptions({ ...prev, renamePattern: event.target.value }))}
                                            className="w-full rounded-2xl border border-[var(--line)] bg-white pl-4 pr-12 py-4 text-sm font-bold tracking-wide outline-none focus:border-[var(--accent)] transition-all shadow-sm"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--line)] group-focus-within:text-[var(--accent)] transition-colors">
                                            <RefreshCw size={18} className={options.renamePattern ? "animate-spin-slow" : ""} />
                                        </div>
                                    </div>

                                    <div className="bg-[var(--ink-0)] text-white rounded-xl p-3 flex items-center gap-3 overflow-hidden border border-white/10 shadow-lg">
                                        <div className="px-2 py-0.5 rounded-md bg-white/10 text-[8px] font-bold uppercase tracking-tighter text-[var(--accent-2)] border border-white/5">PREVIEW</div>
                                        <span className="text-[11px] font-mono truncate opacity-90 tracking-tight">
                                            {(() => {
                                                let preview = (options.renamePattern || "[name]")
                                                    .replace(/\[name\]/g, "ejemplo-foto")
                                                    .replace(/\[width\]/g, (options.width || 1200).toString())
                                                    .replace(/\[height\]/g, (options.height || 800).toString())
                                                    .replace(/\[format\]/g, options.format || "webp")
                                                    .replace(/\[date\]/g, new Date().toISOString().split('T')[0])
                                                    .replace(/\[n\]/g, "01");

                                                if (options.seoFriendly) {
                                                    preview = preview.toLowerCase()
                                                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                                        .replace(/[^a-z0-9-_]/g, "-")
                                                        .replace(/-+/g, "-")
                                                        .replace(/^-|-$/g, "");
                                                }
                                                return preview + "." + (options.format || "webp");
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                {/* Tags & Helpers */}
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1 flex items-center gap-1.5 underline decoration-[var(--accent)]/30 underline-offset-4">
                                            <Hash size={10} />
                                            {lang === 'es' ? "Etiquetas Inteligentes" : "Smart Tags"}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { tag: '[name]', label: lang === 'es' ? 'Nombre' : 'Name', icon: <FileText size={10} /> },
                                                { tag: '[width]', label: lang === 'es' ? 'Ancho' : 'Width' },
                                                { tag: '[height]', label: lang === 'es' ? 'Alto' : 'Height' },
                                                { tag: '[date]', label: lang === 'es' ? 'Fecha' : 'Date', icon: <Calendar size={10} /> },
                                                { tag: '[n]', label: lang === 'es' ? 'Num' : 'Seq' },
                                            ].map(t => (
                                                <button
                                                    key={t.tag}
                                                    onClick={() => setOptions(prev => parseOptions({ ...prev, renamePattern: (prev.renamePattern || "") + t.tag }))}
                                                    className="px-3 py-2 rounded-xl bg-white border border-[var(--line)] text-[10px] font-bold text-[var(--ink-0)] hover:border-[var(--accent)] hover:shadow-md transition-all flex items-center gap-1.5"
                                                >
                                                    {t.icon}
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>

                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1 mt-4 block">
                                            {lang === 'es' ? "Separadores rápidos" : "Quick Separators"}
                                        </span>
                                        <div className="flex gap-2">
                                            {['-', '_', '.', 'x', '/'].map(sep => (
                                                <button
                                                    key={sep}
                                                    onClick={() => setOptions(prev => parseOptions({ ...prev, renamePattern: (prev.renamePattern || "") + sep }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-[var(--line)] text-xs font-bold text-[var(--ink-0)] hover:border-[var(--accent)] hover:shadow-md transition-all flex items-center justify-center font-mono"
                                                >
                                                    {sep}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1 flex items-center gap-1.5 underline decoration-[var(--accent)]/30 underline-offset-4">
                                            <Sparkles size={10} />
                                            {lang === 'es' ? "Presets Comunes" : "Common Presets"}
                                        </span>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { pattern: '[name]', label: lang === 'es' ? 'Original' : 'Original' },
                                                { pattern: '[name]-[width]x[height]', label: lang === 'es' ? 'E-commerce (Medidas)' : 'E-commerce (Specs)' },
                                                { pattern: '[date]-[n]-[name]', label: lang === 'es' ? 'Orden Cronológico' : 'Chronological Order' },
                                                { pattern: 'post-[name]-social', label: lang === 'es' ? 'Social Media / Marketing' : 'Social Media / Marketing' },
                                            ].map(p => (
                                                <button
                                                    key={p.pattern}
                                                    onClick={() => setOptions(prev => parseOptions({ ...prev, renamePattern: p.pattern }))}
                                                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${options.renamePattern === p.pattern ? 'bg-[var(--accent)] border-transparent text-white shadow-lg' : 'bg-white border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--accent)] shadow-sm'}`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* SEO Toggle */}
                                        <div className="pt-4 mt-2">
                                            <div
                                                onClick={() => setOptions(prev => parseOptions({ ...prev, seoFriendly: !prev.seoFriendly }))}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${options.seoFriendly ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30' : 'bg-white border-[var(--line)] hover:border-[var(--accent)]'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl transition-all ${options.seoFriendly ? 'bg-[var(--accent)] text-white scale-110' : 'bg-[var(--bg-soft)] text-[var(--ink-soft)]'}`}>
                                                        <Scissors size={14} />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest leading-none flex items-center gap-1.5 ${options.seoFriendly ? 'text-[var(--accent)]' : 'text-[var(--ink-0)]'}`}>
                                                            {lang === 'es' ? "Limpieza SEO" : "SEO Cleaning"}
                                                            <div className="scale-75 -translate-y-0.5">
                                                                <InfoTooltip lang={lang}
                                                                    title={lang === 'es' ? "Optimización Web" : "Web Optimization"}
                                                                    content={lang === 'es' ?
                                                                        "Esta opción asegura que tus archivos funcionen en cualquier servidor. Convierte 'Mi Foto 2024!.jpg' en 'mi-foto-2024.webp' eliminando espacios, acentos y caracteres especiales." :
                                                                        "This option ensures your files work on any server. It converts 'My Photo 2024!.jpg' to 'my-photo-2024.webp' by removing spaces, accents and special characters."
                                                                    }
                                                                />
                                                            </div>
                                                        </span>
                                                        <p className="text-[9px] text-[var(--ink-soft)] italic leading-tight">
                                                            {lang === 'es' ? "Optimización automática de nombres." : "Automatic name optimization."}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`h-6 w-11 rounded-full transition-all relative ${options.seoFriendly ? 'bg-[var(--accent)] shadow-[0_0_10px_var(--accent-alpha)]' : 'bg-[var(--line)]'}`}>
                                                    <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${options.seoFriendly ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div >
    );
}
