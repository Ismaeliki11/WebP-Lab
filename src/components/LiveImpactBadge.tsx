import { motion } from "framer-motion";
import { formatBytes } from "@/lib/image-tools";
import { TrendingDown, TrendingUp } from "lucide-react";

interface LiveImpactBadgeProps {
    inputBytes: number;
    estimatedOutputBytes: number;
}

export function LiveImpactBadge({ inputBytes, estimatedOutputBytes }: LiveImpactBadgeProps) {
    if (inputBytes === 0) return null;

    const savedBytes = inputBytes - estimatedOutputBytes;
    const savePercent = Math.round((savedBytes / inputBytes) * 100);

    const isSaving = savedBytes > 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-colors ${isSaving
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-amber-500/30 bg-amber-500/10'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full shadow-sm ${isSaving ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                    {isSaving ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                </div>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isSaving ? 'text-emerald-700/80' : 'text-amber-700/80'}`}>
                        Impacto Estimado
                    </p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                        <span className={`text-xl font-bold ${isSaving ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {formatBytes(estimatedOutputBytes)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="text-right">
                <p className={`text-sm font-bold ${isSaving ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isSaving ? 'Ahorras' : 'Aumentas'}
                </p>
                <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 mt-1 text-xs font-bold ${isSaving ? 'bg-emerald-500/20 text-emerald-700' : 'bg-amber-500/20 text-amber-700'}`}>
                    {isSaving ? '-' : '+'}{Math.abs(savePercent)}%
                </div>
            </div>
        </motion.div>
    );
}
