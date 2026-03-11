"use client";

interface DetectionResult {
    success: boolean;
    ai_generated?: boolean;
    confidence?: number;
    detectors?: {
        hive: number;
        sdxl?: number;
    };
    message?: string;
}

interface ResultBoxProps {
    result: DetectionResult | null;
    isLoading: boolean;
}

function ScoreBar({
    label,
    score,
    color,
}: {
    label: string;
    score: number;
    color: "red" | "emerald";
}) {
    const percent = Math.round(score * 100);
    const gradients = {
        red: "from-red-500 to-orange-500",
        emerald: "from-emerald-500 to-teal-400",
    };
    const textColors = {
        red: "text-red-400",
        emerald: "text-emerald-400",
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-slate-400">{label}</span>
                <span className={`text-sm font-bold ${textColors[color]}`}>
                    {percent}%
                </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${gradients[color]}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

export default function ResultBox({ result, isLoading }: ResultBoxProps) {
    if (isLoading) {
        return (
            <div className="w-full rounded-2xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] p-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-purple-900 border-t-purple-400 animate-spin" />
                    <p className="text-sm text-slate-400 font-medium">
                        Analyzing image...
                    </p>
                </div>
            </div>
        );
    }

    if (!result) return null;

    if (!result.success) {
        return (
            <div className="w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                        <svg
                            className="w-5 h-5 text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>
                    <p className="text-sm text-red-400 font-medium">{result.message}</p>
                </div>
            </div>
        );
    }

    const isAI = result.ai_generated;
    const confidencePercent = Math.round((result.confidence ?? 0) * 100);
    const hiveScore = result.detectors?.hive ?? 0;
    const sdxlScore = result.detectors?.sdxl;

    return (
        <div className="w-full rounded-2xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] p-6 space-y-5">
            {/* Verdict */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border ${isAI
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-emerald-500/10 border-emerald-500/20"
                            }`}
                    >
                        {isAI ? (
                            <svg
                                className="w-5 h-5 text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01M12 3l9.196 16.98A1 1 0 0120.196 22H3.804a1 1 0 01-.999-2.02L12 3z"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-5 h-5 text-emerald-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        )}
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                            AI Generated
                        </p>
                        <p
                            className={`text-lg font-bold ${isAI ? "text-red-400" : "text-emerald-400"}`}
                        >
                            {isAI ? "TRUE" : "FALSE"}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                        Confidence
                    </p>
                    <p
                        className={`text-lg font-bold ${isAI ? "text-red-400" : "text-emerald-400"}`}
                    >
                        {confidencePercent}%
                    </p>
                </div>
            </div>

            {/* Divider */}
            <hr className="border-[var(--color-dark-border)]" />

            <div className="space-y-4">
                <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                        Advanced Breakdown
                    </p>
                    <p className="text-xs text-slate-500/80 mt-1.5 leading-relaxed">
                        The bars below represent the probability that the content was generated by AI.
                        A score near <span className="text-red-400 font-medium">100%</span> indicates high confidence it is AI,
                        while a score near <span className="text-emerald-400 font-medium">0%</span> indicates high confidence it is human-made.
                    </p>
                </div>
                <div className="space-y-4 pt-1">
                    <ScoreBar label="Hive API Score" score={hiveScore} color={hiveScore > 0.7 ? "red" : "emerald"} />
                    {sdxlScore !== undefined && (
                        <ScoreBar label="SDXL Model Score" score={sdxlScore} color={sdxlScore > 0.7 ? "red" : "emerald"} />
                    )}
                </div>
            </div>
        </div>
    );
}
