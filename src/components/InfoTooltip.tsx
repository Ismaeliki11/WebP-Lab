"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";

export interface InfoTooltipProps {
    title: string;
    content: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    lang: "es" | "en";
}

export function InfoNote({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mt-4 rounded-2xl bg-[var(--accent)]/5 border border-[var(--accent)]/10 p-4 text-[11px] font-medium text-[var(--ink-soft)] leading-relaxed italic ${className}`}>
            {children}
        </div>
    );
}

export function InfoTooltip({ title, content, children, className, lang }: InfoTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    // Lock scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const defaultClasses = "text-[var(--ink-light)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-full p-1 transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)]/50 inline-flex align-middle";

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(true);
                }}
                className={className || defaultClasses}
                aria-label={lang === 'es' ? `Ayuda sobre ${title}` : `Help about ${title}`}
            >
                {children || <Info size={14} />}
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-black/5 backdrop-blur-sm pointer-events-auto"
                                aria-hidden="true"
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-[var(--line)]"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="modal-title"
                            >
                                <div className="flex items-center justify-between px-8 py-6 bg-white">
                                    <h3 id="modal-title" className="text-xl font-bold text-[var(--ink-0)] flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                                            <Info size={18} />
                                        </div>
                                        {title}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-full p-2 text-[var(--ink-soft)] hover:bg-[var(--line)] transition-colors outline-none"
                                        aria-label={lang === 'es' ? "Cerrar modal" : "Close modal"}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="px-8 pb-8 text-sm text-[var(--ink-0)] leading-relaxed">
                                    {content}
                                </div>

                                <div className="bg-[var(--line)]/30 px-8 py-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-full bg-[var(--ink-0)] px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-[var(--ink-soft)] transition-colors outline-none"
                                    >
                                        {lang === 'es' ? "Cerrar" : "Close"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
