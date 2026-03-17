"use client";

import { ChangeEvent, useRef, useState } from "react";
import UploadBox from "@/components/UploadBox";
import ResultBox from "@/components/ResultBox";
import Link from "next/link";

import { DetectionResponse } from "@/components/ResultBox";
import { getBackendBaseUrl } from "@/lib/apiBase";

const MAX_TEXT_LENGTH = 5000;
const ACCEPTED_TEXT_FILE_TYPES = ".txt,.md,.text,text/plain,text/markdown";

function normalizeMediaResponse(file: File, payload: unknown): DetectionResponse {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload
  ) {
    return payload as DetectionResponse;
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "ai_probability" in payload &&
    typeof (payload as { ai_probability?: unknown }).ai_probability === "number"
  ) {
    const aiProbability = (payload as { ai_probability: number }).ai_probability;
    const realProbability = Math.max(0, Math.min(1, 1 - aiProbability));

    return {
      success: true,
      data: {
        success: true,
        ai_probability: aiProbability,
        average_ai_probability: aiProbability,
        real_probability: realProbability,
        average_real_probability: realProbability,
        is_ai_generated: aiProbability > 0.5,
        confidence: Math.max(aiProbability, realProbability),
        filename: file.name,
      },
    };
  }

  throw new Error("Unexpected response from server");
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [textFileName, setTextFileName] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const textFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTabChange = (tab: "file" | "text") => {
    setActiveTab(tab);
    setResult(null);
  };

  const handleFileSelect = (selectedFile: File) => {
    console.log("[frontend] file selected", {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
    });
    setFile(selectedFile);
    setResult(null);
  };

  const handleTextFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      const content = await selectedFile.text();
      if (!content.trim()) {
        setResult({ success: false, error: "Selected text file is empty." });
        return;
      }
      if (content.length > MAX_TEXT_LENGTH) {
        setResult({
          success: false,
          error: `Text file is too long. Maximum ${MAX_TEXT_LENGTH} characters.`,
        });
        return;
      }

      setText(content);
      setTextFileName(selectedFile.name);
      setResult(null);
    } catch {
      setResult({ success: false, error: "Failed to read the selected text file." });
    } finally {
      event.target.value = "";
    }
  };

  const handleDetect = async () => {
    if (activeTab === "file" && !file) return;
    if (activeTab === "text" && !text.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      let response: Response;
      let rawBody = "";

      if (activeTab === "file") {
        const selectedFile = file!;
        const formData = new FormData();
        formData.append("file", selectedFile);

        const isImage = selectedFile.type.startsWith("image/");
        const isVideo = selectedFile.type.startsWith("video/");

        if (!isImage && !isVideo) {
          throw new Error(`Unsupported file type: ${selectedFile.type || selectedFile.name}`);
        }

        const endpoint = isVideo
          ? `${getBackendBaseUrl()}/video/detect`
          : `${getBackendBaseUrl()}/api/v1/image/detect`;
        console.log("[frontend] sending media detect request", {
          endpoint,
          mode: "direct-backend",
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        });

        response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });
        rawBody = await response.text();

        console.log("[frontend] media detect response", {
          endpoint,
          status: response.status,
          ok: response.ok,
          bodyPreview: rawBody.slice(0, 500),
        });

        let payload: unknown = null;
        if (rawBody) {
          try {
            payload = JSON.parse(rawBody);
          } catch {
            payload = null;
          }
        }

        if (!response.ok) {
          const errorMessage =
            (payload && typeof payload === "object" && payload !== null && "detail" in payload && typeof (payload as { detail?: unknown }).detail === "string"
              ? (payload as { detail: string }).detail
              : null) ||
            (payload && typeof payload === "object" && payload !== null && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
              ? (payload as { error: string }).error
              : null) ||
            (payload && typeof payload === "object" && payload !== null && "message" in payload && typeof (payload as { message?: unknown }).message === "string"
              ? (payload as { message: string }).message
              : null) ||
            rawBody ||
            `Failed to fetch: ${response.status}`;

          throw new Error(errorMessage);
        }

        setResult(normalizeMediaResponse(selectedFile, payload));
      } else {
        console.log("[frontend] sending text detect request", {
          length: text.trim().length,
        });

        response = await fetch(`${getBackendBaseUrl()}/api/v1/text/detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        });
        rawBody = await response.text();

        console.log("[frontend] text detect response", {
          status: response.status,
          ok: response.ok,
          bodyPreview: rawBody.slice(0, 500),
        });

        let payload: unknown = null;
        if (rawBody) {
          try {
            payload = JSON.parse(rawBody);
          } catch {
            payload = null;
          }
        }

        if (!response.ok) {
          const errorMessage =
            (payload && typeof payload === "object" && payload !== null && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
              ? (payload as { error: string }).error
              : null) ||
            (payload && typeof payload === "object" && payload !== null && "message" in payload && typeof (payload as { message?: unknown }).message === "string"
              ? (payload as { message: string }).message
              : null) ||
            rawBody ||
            `Failed to fetch: ${response.status}`;

          throw new Error(errorMessage);
        }

        setResult((payload as DetectionResponse) ?? null);
      }
    } catch (error: unknown) {
      console.error("[frontend] detection failed", error);
      const message = error instanceof Error ? error.message : "Failed to connect to server";
      setResult({ success: false, message, error: message });
    } finally {
      setIsLoading(false);
    }
  };

  const canDetect =
    (activeTab === "file" && !!file) ||
    (activeTab === "text" && text.trim().length > 0);

  return (
    <div className="min-h-screen bg-[var(--color-dark-bg)] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

      <main className="relative z-10 max-w-xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <Link href={"https://www.futurestoreai.com/"}>
            <img
              src="/logo.png"
              alt="FutureStore AI"
              className="h-10 mx-auto mb-6"
            />
          </Link>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            AI Content Detector
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-md mx-auto">
            Upload a file to check if it was generated by AI.
            <br />
            Supports images, videos, audio, and text.
          </p>
        </div>

        <div className="flex bg-[var(--color-dark-card)] p-1 rounded-xl mb-6 border border-[var(--color-dark-border)]">
          <button
            onClick={() => handleTabChange("file")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === "file"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
              : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            Media File
          </button>
          <button
            onClick={() => handleTabChange("text")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === "text"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
              : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            Text Content
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === "file" ? (
            <UploadBox onFileSelect={handleFileSelect} isLoading={isLoading} />
          ) : (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--color-dark-card)] border border-[var(--color-dark-border)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Import a text file</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload a plain text file or type directly below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => textFileInputRef.current?.click()}
                  disabled={isLoading}
                  className="px-3 py-2 bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Choose File
                </button>
                <input
                  ref={textFileInputRef}
                  type="file"
                  accept={ACCEPTED_TEXT_FILE_TYPES}
                  className="hidden"
                  onChange={handleTextFileChange}
                  disabled={isLoading}
                />
              </div>

              {textFileName && (
                <div className="text-xs text-slate-400 px-1">
                  Loaded file: <span className="text-slate-200 font-medium">{textFileName}</span>
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setTextFileName(null);
                  setResult(null);
                }}
                disabled={isLoading}
                placeholder="Paste or type text to check if it was generated by AI..."
                className="w-full h-64 p-5 rounded-2xl bg-[var(--color-dark-card)] border border-[var(--color-dark-border)] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none transition-all duration-200"
                maxLength={MAX_TEXT_LENGTH}
              />
              <div className="flex justify-end mt-2">
                <span className={`text-xs ${text.length >= MAX_TEXT_LENGTH ? "text-red-400" : "text-slate-500"}`}>
                  {text.length}/{MAX_TEXT_LENGTH}
                </span>
              </div>
            </div>
          )}

          {canDetect && (
            <button
              onClick={handleDetect}
              disabled={isLoading}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] shadow-lg shadow-purple-600/25"
            >
              {isLoading ? "Analyzing..." : "Detect Content"}
            </button>
          )}
        </div>

        <div className="mt-6">
          <ResultBox result={result} isLoading={isLoading} />
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-600 text-xs">
            Part of the{" "}
            <a className="text-purple-400 font-medium" target="_blank" href="https://futurestoreai.com">futurestoreai.com</a>{" "}
            ecosystem
          </p>
        </div>
      </main>
    </div>
  );
}
