"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBackendBaseUrl } from "@/lib/apiBase";

type DetectResponse = {
  success: true;
  data: {
    success: boolean;
    ai_probability: number;
    real_probability: number;
    is_ai_generated: boolean;
    confidence: number;
    models_used: string[];
    filename?: string;
  };
};

type HealthResponse = {
  status: string;
  service?: string;
  models?: string[];
  ensemble?: {
    combiner?: string;
    weights?: Record<string, number>;
    return_per_model?: boolean;
  };
};

type BatchResultRow = {
  filename: string;
  ai_probability?: number;
  real_probability?: number;
  is_ai_generated?: boolean;
  confidence?: number;
  models_used?: string[];
  error?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function asPercent(prob: number) {
  return Math.round(clamp01(prob) * 100);
}

function Badge({
  tone,
  children,
}: {
  tone: "red" | "emerald" | "slate";
  children: React.ReactNode;
}) {
  const cls =
    tone === "red"
      ? "bg-red-500/10 border-red-500/20 text-red-300"
      : tone === "emerald"
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
        : "bg-slate-500/10 border-slate-500/20 text-slate-300";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}
    >
      {children}
    </span>
  );
}

function ProgressBar({
  value,
  tone,
}: {
  value: number;
  tone: "red" | "emerald";
}) {
  const percent = asPercent(value);
  const gradient =
    tone === "red"
      ? "from-red-500 to-orange-500"
      : "from-emerald-500 to-teal-400";
  return (
    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${gradient}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function friendlyFetchError(err: unknown) {
  if (err instanceof DOMException && err.name === "AbortError")
    return "Request cancelled.";
  if (err instanceof Error) return err.message || "Network error.";
  return "Network error.";
}

export default function ImageDetectionClient() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [useProxy, setUseProxy] = useState(false);
  const [autoProxyTried, setAutoProxyTried] = useState(false);

  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singlePreview, setSinglePreview] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<
    DetectResponse["data"] | null
  >(null);

  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResultRow[] | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [healthLoading, setHealthLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const apiBase = useMemo(() => getBackendBaseUrl().replace(/\/+$/, ""), []);
  const endpointBase = useProxy ? "" : apiBase;
  const prefix = useProxy ? "/api/proxy/image" : "/api/v1/image";

  const canAnalyzeSingle = !!singleFile && !loading;
  const canAnalyzeBatch =
    batchFiles.length > 0 && batchFiles.length <= 10 && !loading;

  useEffect(() => {
    return () => {
      if (singlePreview) URL.revokeObjectURL(singlePreview);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetAll = () => {
    abortRef.current?.abort();
    abortRef.current = null;

    setError(null);
    setLoading(false);

    setSingleResult(null);
    setSingleFile(null);
    if (singlePreview) URL.revokeObjectURL(singlePreview);
    setSinglePreview(null);

    setBatchFiles([]);
    setBatchResults(null);
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  const onPickSingle = (file: File) => {
    setError(null);
    setSingleResult(null);
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setSingleFile(file);
    if (singlePreview) URL.revokeObjectURL(singlePreview);
    setSinglePreview(URL.createObjectURL(file));
  };

  const onPickBatch = (files: FileList | File[]) => {
    setError(null);
    setBatchResults(null);

    const list = Array.from(files);
    const imgs = list.filter((f) => f.type.startsWith("image/"));
    if (imgs.length !== list.length) {
      setError("Batch mode only supports image files.");
      return;
    }
    if (imgs.length > 10) {
      setError("Batch mode supports up to 10 images.");
      return;
    }
    setBatchFiles(imgs);
  };

  const parseErrorBody = async (res: Response) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j: unknown = await res.json().catch(() => null);
      const msg =
        (isRecord(j) && typeof j.message === "string" && j.message) ||
        (isRecord(j) && typeof j.detail === "string" && j.detail) ||
        null;
      if (msg) return msg;
    }
    const t = await res.text().catch(() => "");
    return t?.slice(0, 300) || null;
  };

  const analyzeSingle = async () => {
    if (!singleFile) return;

    setLoading(true);
    setError(null);
    setSingleResult(null);
    setBatchResults(null);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const form = new FormData();
      form.append("file", singleFile);

      const res = await fetch(`${endpointBase}${prefix}/detect`, {
        method: "POST",
        body: form,
        signal: ac.signal,
      });

      if (!res.ok) {
        const msg = await parseErrorBody(res);
        throw new Error(msg || `Request failed (${res.status})`);
      }

      const jsonUnknown: unknown = await res.json();
      if (
        !isRecord(jsonUnknown) ||
        jsonUnknown.success !== true ||
        !("data" in jsonUnknown) ||
        !isRecord(jsonUnknown.data)
      ) {
        throw new Error("Unexpected response from server.");
      }
      const data = jsonUnknown.data as DetectResponse["data"];
      setSingleResult(data);
    } catch (e) {
      setError(friendlyFetchError(e));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const analyzeBatch = async () => {
    if (batchFiles.length === 0) return;

    setLoading(true);
    setError(null);
    setBatchResults(null);
    setSingleResult(null);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const form = new FormData();
      for (const f of batchFiles) form.append("files", f);

      const res = await fetch(`${endpointBase}${prefix}/detect-batch`, {
        method: "POST",
        body: form,
        signal: ac.signal,
      });

      if (!res.ok) {
        const msg = await parseErrorBody(res);
        throw new Error(msg || `Request failed (${res.status})`);
      }

      const json: unknown = await res.json();
      const rows: BatchResultRow[] = [];

      const raw =
        isRecord(json) && "data" in json && json.data
          ? json.data
          : isRecord(json) && "results" in json && json.results
            ? json.results
            : json;

      const arr = Array.isArray(raw)
        ? raw
        : isRecord(raw) && Array.isArray(raw.items)
          ? raw.items
          : null;

      if (!arr) throw new Error("Unexpected batch response from server.");

      for (const item of arr) {
        const itemRec = isRecord(item) ? item : {};
        const itemData = isRecord(itemRec.data) ? itemRec.data : itemRec;
        const filename = String(
          itemRec.filename ??
            (isRecord(itemRec.data) ? itemRec.data.filename : undefined) ??
            "unknown",
        );

        rows.push({
          filename,
          ai_probability:
            typeof itemData.ai_probability === "number"
              ? itemData.ai_probability
              : undefined,
          real_probability:
            typeof itemData.real_probability === "number"
              ? itemData.real_probability
              : undefined,
          is_ai_generated:
            typeof itemData.is_ai_generated === "boolean"
              ? itemData.is_ai_generated
              : undefined,
          confidence:
            typeof itemData.confidence === "number"
              ? itemData.confidence
              : undefined,
          models_used: Array.isArray(itemData.models_used)
            ? itemData.models_used.map(String)
            : undefined,
          error: typeof itemRec.error === "string" ? itemRec.error : undefined,
        });
      }

      setBatchResults(rows);
    } catch (e) {
      setError(friendlyFetchError(e));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const refreshHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    const ac = new AbortController();

    try {
      const res = await fetch(`${endpointBase}${prefix}/health`, {
        method: "GET",
        signal: ac.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        const msg = await parseErrorBody(res);
        throw new Error(msg || `Health check failed (${res.status})`);
      }
      const json = (await res.json()) as HealthResponse;
      setHealth(json);
    } catch (e) {
      const msg = friendlyFetchError(e);
      // If direct cross-origin calls are blocked (common CORS case), auto-fallback to proxy once.
      if (!useProxy && !autoProxyTried) {
        setAutoProxyTried(true);
        setUseProxy(true);
        return;
      }
      setHealthError(msg);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    refreshHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useProxy]);

  return (
    <div className="min-h-screen bg-[var(--color-dark-bg)] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Image Detection
          </h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Upload an image and analyze it via your FastAPI backend. API base:{" "}
            <span className="font-semibold text-slate-300">{apiBase}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex bg-[var(--color-dark-card)] p-1 rounded-xl border border-[var(--color-dark-border)]">
                <button
                  onClick={() => {
                    setMode("single");
                    setError(null);
                    setBatchResults(null);
                  }}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === "single"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => {
                    setMode("batch");
                    setError(null);
                    setSingleResult(null);
                  }}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === "batch"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Batch (max 10)
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => setUseProxy(e.target.checked)}
                  className="accent-purple-500"
                />
                Use Next.js proxy (for CORS)
              </label>
            </div>

            {mode === "single" ? (
              <div className="space-y-4">
                <div
                  className="w-full rounded-2xl border border-dashed border-[var(--color-dark-border)] bg-[var(--color-dark-card)] p-6"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) onPickSingle(f);
                  }}
                >
                  {!singleFile ? (
                    <div className="flex flex-col items-center gap-3 text-center">
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
                      <div>
                        <p className="text-sm font-medium text-slate-300">
                          Drag & drop an image here, or{" "}
                          <label className="text-purple-400 cursor-pointer">
                            browse
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={loading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onPickSingle(f);
                              }}
                            />
                          </label>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          PNG, JPG, WebP, etc.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative w-full rounded-2xl overflow-hidden border border-[var(--color-dark-border)] bg-black/30">
                        {singlePreview && (
                          <img
                            src={singlePreview}
                            alt="Preview"
                            className="w-full h-72 object-contain"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-300 font-semibold truncate">
                            {singleFile.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(singleFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSingleFile(null);
                            setSingleResult(null);
                            setError(null);
                            if (singlePreview)
                              URL.revokeObjectURL(singlePreview);
                            setSinglePreview(null);
                          }}
                          disabled={loading}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={analyzeSingle}
                    disabled={!canAnalyzeSingle}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] shadow-lg shadow-purple-600/25"
                  >
                    {loading ? "Analyzing..." : "Analyze"}
                  </button>
                  <button
                    onClick={cancel}
                    disabled={!loading}
                    className="px-4 py-3 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] text-slate-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={resetAll}
                    className="px-4 py-3 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] text-slate-300 text-sm font-semibold cursor-pointer hover:bg-white/5"
                  >
                    Reset
                  </button>
                </div>

                {singleResult && (
                  <div className="w-full rounded-2xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] p-6 space-y-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Badge
                          tone={
                            singleResult.is_ai_generated ? "red" : "emerald"
                          }
                        >
                          {singleResult.is_ai_generated
                            ? "AI Generated"
                            : "Likely Real"}
                        </Badge>
                        <span className="text-sm text-slate-400 truncate">
                          {singleResult.filename || singleFile?.name}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        Confidence:{" "}
                        <span className="font-bold text-slate-200">
                          {asPercent(singleResult.confidence)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-400">
                            AI probability
                          </span>
                          <span className="text-sm font-bold text-red-400">
                            {asPercent(singleResult.ai_probability)}%
                          </span>
                        </div>
                        <ProgressBar
                          value={singleResult.ai_probability}
                          tone="red"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-400">
                        <span>Real probability</span>
                        <span className="font-bold text-emerald-400">
                          {asPercent(singleResult.real_probability)}%
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        Models used:{" "}
                        <span className="text-slate-200 font-semibold">
                          {(singleResult.models_used || []).join(", ") || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full rounded-2xl border border-dashed border-[var(--color-dark-border)] bg-[var(--color-dark-card)] p-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium text-slate-300">
                        Select up to 10 images
                      </p>
                      <label className="text-sm font-semibold text-purple-400 cursor-pointer">
                        Choose files
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={loading}
                          onChange={(e) => {
                            const f = e.target.files;
                            if (f) onPickBatch(f);
                          }}
                        />
                      </label>
                    </div>

                    {batchFiles.length > 0 ? (
                      <div className="rounded-xl border border-[var(--color-dark-border)] bg-black/10 overflow-hidden">
                        <div className="max-h-56 overflow-auto">
                          {batchFiles.map((f) => (
                            <div
                              key={f.name}
                              className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-dark-border)] last:border-b-0"
                            >
                              <span className="text-sm text-slate-300 truncate">
                                {f.name}
                              </span>
                              <span className="text-xs text-slate-500">
                                {(f.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-end px-4 py-2 border-t border-[var(--color-dark-border)]">
                          <button
                            onClick={() => {
                              setBatchFiles([]);
                              setBatchResults(null);
                              setError(null);
                            }}
                            disabled={loading}
                            className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Clear list
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        No files selected yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={analyzeBatch}
                    disabled={!canAnalyzeBatch}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] shadow-lg shadow-purple-600/25"
                  >
                    {loading ? "Analyzing..." : "Analyze batch"}
                  </button>
                  <button
                    onClick={cancel}
                    disabled={!loading}
                    className="px-4 py-3 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] text-slate-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={resetAll}
                    className="px-4 py-3 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] text-slate-300 text-sm font-semibold cursor-pointer hover:bg-white/5"
                  >
                    Reset
                  </button>
                </div>

                {batchResults && (
                  <div className="w-full rounded-2xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--color-dark-border)]">
                      <p className="text-sm font-semibold text-slate-200">
                        Results
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        One row per file returned by the API.
                      </p>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-xs text-slate-500 uppercase tracking-wider">
                          <tr className="border-b border-[var(--color-dark-border)]">
                            <th className="text-left px-5 py-3 font-semibold">
                              File
                            </th>
                            <th className="text-left px-5 py-3 font-semibold">
                              Verdict
                            </th>
                            <th className="text-left px-5 py-3 font-semibold">
                              AI %
                            </th>
                            <th className="text-left px-5 py-3 font-semibold">
                              Real %
                            </th>
                            <th className="text-left px-5 py-3 font-semibold">
                              Confidence
                            </th>
                            <th className="text-left px-5 py-3 font-semibold">
                              Models
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResults.map((r) => (
                            <tr
                              key={r.filename}
                              className="border-b border-[var(--color-dark-border)] last:border-b-0"
                            >
                              <td className="px-5 py-3 text-slate-200 max-w-[240px] truncate">
                                {r.filename}
                              </td>
                              <td className="px-5 py-3">
                                {r.error ? (
                                  <Badge tone="slate">Error</Badge>
                                ) : r.is_ai_generated === true ? (
                                  <Badge tone="red">AI</Badge>
                                ) : r.is_ai_generated === false ? (
                                  <Badge tone="emerald">Real</Badge>
                                ) : (
                                  <Badge tone="slate">—</Badge>
                                )}
                              </td>
                              <td className="px-5 py-3 text-red-300 font-semibold">
                                {typeof r.ai_probability === "number"
                                  ? `${asPercent(r.ai_probability)}%`
                                  : "—"}
                              </td>
                              <td className="px-5 py-3 text-emerald-300 font-semibold">
                                {typeof r.real_probability === "number"
                                  ? `${asPercent(r.real_probability)}%`
                                  : "—"}
                              </td>
                              <td className="px-5 py-3 text-slate-200 font-semibold">
                                {typeof r.confidence === "number"
                                  ? `${asPercent(r.confidence)}%`
                                  : "—"}
                              </td>
                              <td className="px-5 py-3 text-slate-400 max-w-[260px] truncate">
                                {r.error
                                  ? r.error
                                  : r.models_used?.join(", ") || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                <p className="text-sm text-red-300 font-semibold">Error</p>
                <p className="text-sm text-red-400 mt-1">{error}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="w-full rounded-2xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-200">Health</p>
                <button
                  onClick={refreshHealth}
                  disabled={healthLoading}
                  className="text-xs font-semibold text-purple-300 hover:text-purple-200 disabled:opacity-50 cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {healthLoading ? (
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-purple-900 border-t-purple-400 animate-spin" />
                  <p className="text-sm text-slate-400">Checking...</p>
                </div>
              ) : healthError ? (
                <div className="mt-4">
                  <Badge tone="slate">Unavailable</Badge>
                  <p className="text-sm text-slate-400 mt-2">{healthError}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    If this is a CORS error, enable “Use Next.js proxy”.
                  </p>
                </div>
              ) : health ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Status</span>
                    <Badge
                      tone={
                        String(health.status).toLowerCase() === "ok"
                          ? "emerald"
                          : "slate"
                      }
                    >
                      {health.status}
                    </Badge>
                  </div>

                  <div className="text-sm text-slate-400">
                    Service:{" "}
                    <span className="text-slate-200 font-semibold">
                      {health.service || "—"}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Models
                    </p>
                    <p className="text-sm text-slate-300 mt-1">
                      {(health.models || []).join(", ") || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Ensemble
                    </p>
                    <div className="mt-1 space-y-1 text-sm text-slate-400">
                      <div>
                        Combiner:{" "}
                        <span className="text-slate-200 font-semibold">
                          {health.ensemble?.combiner || "—"}
                        </span>
                      </div>
                      <div>
                        Return per model:{" "}
                        <span className="text-slate-200 font-semibold">
                          {typeof health.ensemble?.return_per_model ===
                          "boolean"
                            ? String(health.ensemble.return_per_model)
                            : "—"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Weights:{" "}
                        <span className="text-slate-400">
                          {health.ensemble?.weights
                            ? Object.entries(health.ensemble.weights)
                                .map(([k, v]) => `${k}:${v}`)
                                .join(", ")
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No data.</p>
              )}
            </div>

            <div className="w-full rounded-2xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] p-5">
              <p className="text-sm font-semibold text-slate-200">Notes</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-400">
                <li>
                  - Uses{" "}
                  <span className="text-slate-200 font-semibold">
                    multipart/form-data
                  </span>{" "}
                  with field{" "}
                  <span className="text-slate-200 font-semibold">file</span>{" "}
                  (single) or{" "}
                  <span className="text-slate-200 font-semibold">files</span>{" "}
                  (batch).
                </li>
                <li>
                  - If direct calls fail due to CORS, enable{" "}
                  <span className="text-slate-200 font-semibold">
                    Use Next.js proxy
                  </span>
                  .
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
