"use client";

import { useCallback, useState } from "react";

interface UploadBoxProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
}

export default function UploadBox({ onFileSelect, isLoading }: UploadBoxProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = useCallback(
        (file: File) => {
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
                    className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${dragActive
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-zinc-300 bg-zinc-50 hover:border-indigo-400 hover:bg-indigo-50/50"
                        }`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center gap-3 p-6">
                        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
                            <svg
                                className="w-7 h-7 text-indigo-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-zinc-700">
                                Drop your image here, or{" "}
                                <span className="text-indigo-600">browse</span>
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                                Supports JPG, PNG, WebP · Max 10MB
                            </p>
                        </div>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleChange}
                        disabled={isLoading}
                    />
                </label>
            ) : (
                <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50">
                    <img
                        src={preview!}
                        alt="Preview"
                        className="w-full h-64 object-contain bg-white"
                    />
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-t border-zinc-200">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <svg
                                    className="w-4 h-4 text-indigo-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <p className="text-sm text-zinc-600 truncate">
                                {selectedFile.name}
                            </p>
                        </div>
                        <button
                            onClick={clearFile}
                            disabled={isLoading}
                            className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
