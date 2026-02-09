"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, FileImage, Trash2, Palette, Sparkles } from "lucide-react";

interface QueueItem {
    id: string;
    file: File;
    previewUrl: string;
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
}: FileListProps) {
    if (queue.length === 0) {
        return (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-white/60 p-8 text-center sm:p-12">
                <FileImage size={40} className="mx-auto text-[var(--line)] mb-3" />
                <p className="text-sm text-[var(--ink-soft)] font-medium">
                    Todavia no hay archivos en cola.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--ink-soft)]">
                    Previsualización ({previewItems.length} de {queue.length})
                </p>
                <button
                    type="button"
                    onClick={clearAll}
                    className="flex items-center gap-1.5 rounded-full border border-transparent bg-[var(--danger)]/10 px-3 py-1 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-white"
                >
                    <Trash2 size={12} />
                    Vaciar cola
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
                                <img
                                    src={item.previewUrl}
                                    alt={item.file.name}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute right-2 top-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        type="button"
                                        onClick={() => onMagic(item)}
                                        className="rounded-full bg-white/90 p-1.5 text-amber-500 shadow-sm backdrop-blur-sm transition-all hover:bg-amber-500 hover:text-white"
                                        title="Mejora automática"
                                    >
                                        <Sparkles size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onEdit(item)}
                                        className="rounded-full bg-white/90 p-1.5 text-[var(--accent)] shadow-sm backdrop-blur-sm transition-all hover:bg-[var(--accent)] hover:text-white"
                                        title="Editar detalles"
                                    >
                                        <Palette size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(item.id)}
                                        className="rounded-full bg-white/90 p-1.5 text-[var(--danger)] shadow-sm backdrop-blur-sm transition-all hover:bg-[var(--danger)] hover:text-white"
                                        title="Quitar"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 p-3">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-[var(--ink-0)]">
                                        {item.file.name}
                                    </p>
                                    <p className="font-mono text-[10px] text-[var(--ink-soft)] mt-0.5">
                                        {formatBytes(item.file.size)}
                                    </p>
                                </div>
                            </div>
                        </motion.li>
                    ))}
                </AnimatePresence>
            </div>

            {hiddenPreviewCount > 0 && (
                <p className="text-center text-xs font-medium text-[var(--ink-soft)] bg-white/40 py-2 rounded-full border border-[var(--line)]">
                    +{hiddenPreviewCount} {hiddenPreviewCount === 1 ? "archivo más" : "archivos más"} en cola.
                </p>
            )}
        </div>
    );
}
