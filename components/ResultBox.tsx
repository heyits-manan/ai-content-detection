"use client";

export interface PerModelResult {
  success: boolean;
  detector?: string;
  model_used?: string;
  ai_probability?: number;
  real_probability?: number;
  confidence?: number;
  inference_time_ms?: number;
  error?: string;
  raw_results?: any;
}

export interface DetectionData {
  success: boolean;
  ai_probability?: number;         // Weighted probability
  real_probability?: number;       // Weighted probability
  average_ai_probability?: number; // Exact average of active models (use this for default UI display)
  average_real_probability?: number; // Exact average of active models
  is_ai_generated?: boolean;
  confidence?: number;
  models_used?: string[];
  filename: string;
  error?: string;
  per_model?: PerModelResult[]; 
}

export interface DetectionResponse {
  success: boolean;
  data?: DetectionData;
  error?: string;
  message?: string; // keeping message for fallback error handling
}

interface ResultBoxProps {
    result: DetectionResponse | null;
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

import { useState } from 'react';

export default function ResultBox({ result, isLoading }: ResultBoxProps) {
    const [showDetailedModels, setShowDetailedModels] = useState(false);

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
                    <p className="text-sm text-red-400 font-medium">{result.message || result.error}</p>
                </div>
            </div>
        );
    }

    const detectionData = result.data;
    const isAI = detectionData?.is_ai_generated ?? false;
    const confidencePercent = Math.round((detectionData?.confidence ?? 0) * 100);
    
    // Choose which probability to show by default
    const displayAiProb = detectionData?.average_ai_probability ?? detectionData?.ai_probability;
    const displayRealProb = detectionData?.average_real_probability ?? detectionData?.real_probability;

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
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                            Aggregated Score
                        </p>
                        <p className="text-xs text-slate-500/80 mt-1.5 leading-relaxed pr-4">
                            The bars below represent the average probability that the content was generated by AI across all active distinct models.
                        </p>
                    </div>
                    {detectionData?.per_model && detectionData.per_model.length > 0 && (
                        <button
                            onClick={() => setShowDetailedModels(!showDetailedModels)}
                            className="px-3 py-1.5 bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                        >
                            {showDetailedModels ? "Hide Models" : "View Models"}
                        </button>
                    )}
                </div>
                
                <div className="space-y-4 pt-1">
                    {displayAiProb !== undefined && (
                        <ScoreBar label="Overall AI Probability" score={displayAiProb} color={displayAiProb > 0.5 ? "red" : "emerald"} />
                    )}
                    {displayRealProb !== undefined && (
                        <ScoreBar label="Overall Real Probability" score={displayRealProb} color={displayRealProb > 0.5 ? "emerald" : "red"} />
                    )}
                </div>
                
                {/* Individual Model Breakdown */}
                {showDetailedModels && detectionData?.per_model && (
                    <div className="mt-6 pt-4 border-t border-[var(--color-dark-border)]/50 space-y-5">
                       <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                            Individual Model Results
                        </p>
                        {detectionData.per_model.map((model) => {
                            const score = model.ai_probability;
                            if (score === undefined) return null;
                            const label = `${model.model_used || model.detector || "Detection Model"} AI Probability`;
                            return (
                                <ScoreBar key={model.detector || model.model_used} label={label} score={score} color={score > 0.5 ? "red" : "emerald"} />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
