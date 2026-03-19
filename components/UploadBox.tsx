"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogg", ".ogv"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".m4a", ".ogg"];

function hasExtension(fileName: string, extensions: string[]) {
    const lowerName = fileName.toLowerCase();
    return extensions.some((extension) => lowerName.endsWith(extension));
}

function getMediaKind(file: File): "image" | "video" | "audio" | "unknown" {
    if (file.type.startsWith("image/") || hasExtension(file.name, IMAGE_EXTENSIONS)) {
        return "image";
    }

    if (file.type.startsWith("video/") || hasExtension(file.name, VIDEO_EXTENSIONS)) {
        return "video";
    }

    if (file.type.startsWith("audio/") || hasExtension(file.name, AUDIO_EXTENSIONS)) {
        return "audio";
    }

    return "unknown";
}

function formatBytes(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface UploadBoxProps {
    onFileSelect: (file: File) => void;
    onClearFile: () => void;
    selectedFile: File | null;
    isLoading: boolean;
}

export default function UploadBox({
    onFileSelect,
    onClearFile,
    selectedFile,
    isLoading,
}: UploadBoxProps) {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const mediaKind = selectedFile ? getMediaKind(selectedFile) : "unknown";
    const preview = useMemo(
        () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
        [selectedFile]
    );

    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const handleFile = useCallback(
        (file: File) => {
            setError(null);

            const nextMediaKind = getMediaKind(file);

            if (nextMediaKind === "unknown") {
                setError("Unsupported file type. Upload an image, video, or audio file.");
                return;
            }

            if (nextMediaKind === "image" && file.size > MAX_IMAGE_SIZE_BYTES) {
                setError("Image size must be 10MB or smaller.");
                return;
            }

            onFileSelect(file);
        },
        [onFileSelect]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = "";
    };

    const clearFile = () => {
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        onClearFile();
    };

    return (
        <div className="w-full">
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/mp4,audio/x-m4a,audio/ogg"
                onChange={handleChange}
                disabled={isLoading}
            />
            {!selectedFile ? (
                <label
                    tabIndex={0}
                    role="button"
                    aria-label="Upload an image, video, or audio file"
                    className={`flex flex-col items-center justify-center w-full h-64 border border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${dragActive
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-[var(--color-dark-border)] bg-[var(--color-dark-card)] hover:border-purple-500/50 hover:bg-purple-500/5 focus-within:border-purple-500/60"
                        }`}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!isLoading) {
                                fileInputRef.current?.click();
                            }
                        }
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center gap-3 p-6">
                        <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <svg
                                className="w-7 h-7 text-purple-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-slate-300">
                                Drop your file here, or{" "}
                                <span className="text-purple-400">browse</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Supports images, videos & audio. Images must be 10MB or smaller.
                            </p>
                            {error && (
                                <p className="text-xs font-semibold text-red-400 mt-2 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md">
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>
                </label>
            ) : (
                <div className="relative w-full rounded-2xl overflow-hidden border border-[var(--color-dark-border)] bg-[var(--color-dark-card)]">
                    {mediaKind === "image" ? (
                        <img
                            src={preview!}
                            alt="Preview"
                            className="w-full h-64 object-contain bg-black/30"
                        />
                    ) : mediaKind === "video" ? (
                        <video
                            key={preview}
                            className="w-full h-64 object-contain bg-black/30"
                            controls
                            preload="metadata"
                        >
                            <source src={preview!} type={selectedFile.type || undefined} />
                            Your browser cannot preview this video file.
                        </video>
                    ) : (
                        <div className="w-full h-64 bg-black/30 flex flex-col items-center justify-center gap-4 px-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <svg
                                    className="w-7 h-7 text-purple-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M9 19V6l12-2v13M9 19a2 2 0 11-4 0 2 2 0 014 0zm12-2a2 2 0 11-4 0 2 2 0 014 0zM9 10l12-2"
                                    />
                                </svg>
                            </div>
                            <p className="text-sm text-slate-300">Audio file selected</p>
                            <audio src={preview!} controls className="w-full max-w-sm" preload="metadata" />
                        </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-dark-border)]">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <svg
                                    className="w-4 h-4 text-purple-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-slate-300 truncate">{selectedFile.name}</p>
                                <p className="text-xs text-slate-500">
                                    {mediaKind.toUpperCase()} · {formatBytes(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                                className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/60 rounded-md px-1.5 py-1"
                            >
                                Replace
                            </button>
                            <button
                                type="button"
                                onClick={clearFile}
                                disabled={isLoading}
                                className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/60 rounded-md px-1.5 py-1"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                    {error && (
                        <div className="px-4 pb-4">
                            <p className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-2 rounded-md">
                                {error}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
