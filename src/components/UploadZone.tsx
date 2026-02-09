"use client";

import { ChangeEvent, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface UploadZoneProps {
    dragActive: boolean;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDragLeave: () => void;
    onFileInput: (e: ChangeEvent<HTMLInputElement>) => void;
    queueLength: number;
}

export function UploadZone({
    dragActive,
    onDrop,
    onDragOver,
    onDragLeave,
    onFileInput,
    queueLength,
}: UploadZoneProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Upload size={18} className="text-[var(--accent)]" />
                    1. Carga de archivos
                </h2>
                <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium">
                    {queueLength} {queueLength === 1 ? "archivo" : "archivos"}
                </span>
            </div>

            <p className="text-sm text-[var(--ink-soft)]">
                Arrastra imagenes o usa el selector. Solo archivos de tipo imagen.
            </p>

            <motion.div
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className={`relative mt-4 overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-all ${dragActive
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,white)]"
                        : "border-[var(--line)] bg-white/60 hover:bg-white/80"
                    }`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className={`p-4 rounded-full transition-colors ${dragActive ? 'bg-[var(--accent)] text-white' : 'bg-white text-[var(--ink-soft)] shadow-sm'}`}>
                        <ImageIcon size={32} />
                    </div>
                    <div>
                        <p className="text-base font-medium">Suelta tus imagenes aqui</p>
                        <p className="mt-1 text-xs text-[var(--ink-soft)]">JPG, PNG, WebP, AVIF y mas</p>
                    </div>
                    <label className="relative mt-2 inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--ink-0)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--ink-soft)] shadow-lg shadow-black/5">
                        Elegir archivos
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={onFileInput}
                        />
                    </label>
                </div>

                <AnimatePresence>
                    {dragActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--accent)] text-white"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Upload size={48} className="animate-bounce" />
                                <span className="text-xl font-bold">¡Suelta para añadir!</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
