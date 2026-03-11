"use client";

interface DetectionResult {
    success: boolean;
    ai_generated?: boolean;
    confidence?: number;
    detected_model?: string | null;
    message?: string;
}

interface ResultBoxProps {
    result: DetectionResult | null;
    isLoading: boolean;
}

export default function ResultBox({ result, isLoading }: ResultBoxProps) {
    if (isLoading) {
        return (
            <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    <p className="text-sm text-zinc-500 font-medium">
                        Analyzing image...
                    </p>
                </div>
            </div>
        );
    }

    if (!result) return null;

    if (!result.success) {
        return (
            <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <svg
                            className="w-5 h-5 text-red-600"
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
                    <p className="text-sm text-red-700 font-medium">{result.message}</p>
                </div>
            </div>
        );
    }

    const confidencePercent = Math.round((result.confidence ?? 0) * 100);
    const isAI = result.ai_generated;

    return (
        <div
            className={`w-full rounded-2xl border p-6 transition-all duration-300 ${isAI
                    ? "border-red-200 bg-gradient-to-br from-red-50 to-orange-50"
                    : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50"
                }`}
        >
            <div className="flex flex-col gap-5">
                {/* Verdict */}
                <div className="flex items-center gap-3">
                    <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${isAI ? "bg-red-100" : "bg-emerald-100"
                            }`}
                    >
                        {isAI ? (
                            <svg
                                className="w-6 h-6 text-red-600"
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
                                className="w-6 h-6 text-emerald-600"
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
                        <h3
                            className={`text-lg font-bold ${isAI ? "text-red-700" : "text-emerald-700"}`}
                        >
                            {isAI ? "AI Generated" : "Likely Real"}
                        </h3>
                        <p className={`text-sm ${isAI ? "text-red-500" : "text-emerald-500"}`}>
                            {isAI
                                ? "This image appears to be AI-generated"
                                : "This image appears to be authentic"}
                        </p>
                    </div>
                </div>

                {/* Confidence bar */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                            Confidence
                        </span>
                        <span
                            className={`text-sm font-bold ${isAI ? "text-red-600" : "text-emerald-600"}`}
                        >
                            {confidencePercent}%
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${isAI
                                    ? "bg-gradient-to-r from-red-400 to-orange-500"
                                    : "bg-gradient-to-r from-emerald-400 to-teal-500"
                                }`}
                            style={{ width: `${confidencePercent}%` }}
                        />
                    </div>
                </div>

                {/* Model info */}
                {result.detected_model && (
                    <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-zinc-400">Detected by:</span>
                        <span className="text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                            {result.detected_model}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
