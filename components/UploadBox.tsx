"use client";

import { useCallback, useState } from "react";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

interface UploadBoxProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
}

export default function UploadBox({ onFileSelect, isLoading }: UploadBoxProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback(
        (file: File) => {
            setError(null);

            if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE_BYTES) {
                setSelectedFile(null);
                setPreview(null);
                setError("Image size must be 10MB or smaller.");
                return;
            }

            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const clearFile = () => {
        setSelectedFile(null);
        setPreview(null);
    };

    return (
        <div className="w-full">
            {!selectedFile ? (
                <label
                    className={`flex flex-col items-center justify-center w-full h-64 border border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${dragActive
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-[var(--color-dark-border)] bg-[var(--color-dark-card)] hover:border-purple-500/50 hover:bg-purple-500/5"
                        }`}
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
                    <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/mp4,audio/x-m4a,audio/ogg"
                        onChange={handleChange}
                        disabled={isLoading}
                    />
                </label>
            ) : (
                <div className="relative w-full rounded-2xl overflow-hidden border border-[var(--color-dark-border)] bg-[var(--color-dark-card)]">
                    {selectedFile?.type.startsWith("image/") ? (
                        <img
                            src={preview!}
                            alt="Preview"
                            className="w-full h-64 object-contain bg-black/30"
                        />
                    ) : selectedFile?.type.startsWith("video/") ? (
                        <video
                            src={preview!}
                            className="w-full h-64 object-contain bg-black/30"
                            controls
                            preload="metadata"
                        />
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
                            <p className="text-sm text-slate-400 truncate">
                                {selectedFile.name}
                            </p>
                        </div>
                        <button
                            onClick={clearFile}
                            disabled={isLoading}
                            className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
