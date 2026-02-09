"use client";

import { motion } from "framer-motion";
import { Zap, HardDrive, Percent } from "lucide-react";

interface StatsGridProps {
    queueLength: number;
    totalSize: string;
    compressionRatio: number | null;
}

export function StatsGrid({ queueLength, totalSize, compressionRatio }: StatsGridProps) {
    return (
        <div className="grid grid-cols-3 gap-4">
            {[
                {
                    icon: <Zap size={16} />,
                    label: "Archivos",
                    value: queueLength,
                    color: "text-[var(--accent)]",
                    bg: "bg-[var(--accent-soft)]"
                },
                {
                    icon: <HardDrive size={16} />,
                    label: "Peso Total",
                    value: totalSize,
                    color: "text-[var(--accent-2)]",
                    bg: "bg-[var(--accent-2-soft)]"
                },
                {
                    icon: <Percent size={16} />,
                    label: "Ahorro",
                    value: compressionRatio !== null ? `${compressionRatio.toFixed(0)}%` : "0%",
                    color: "text-[var(--danger)]",
                    bg: "bg-red-50"
                }
            ].map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i, type: "spring", stiffness: 200 }}
                    className="group relative overflow-hidden rounded-3xl border border-[var(--line)] bg-white/70 p-5 backdrop-blur-md transition-all hover:border-[var(--accent)] hover:shadow-xl hover:shadow-black/5"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                            {stat.icon}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">{stat.label}</p>
                    </div>
                    <p className="text-2xl font-bold text-[var(--ink-0)] tabular-nums">{stat.value}</p>
                    <div className="absolute -right-2 -bottom-2 opacity-[0.03] grayscale transition-all group-hover:scale-125 group-hover:opacity-[0.08]">
                        {stat.icon}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
