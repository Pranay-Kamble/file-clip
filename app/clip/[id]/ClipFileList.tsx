"use client";

import { useState, useEffect, useRef } from "react";
import type { ClipFile } from "./page";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Returns a simple emoji icon based on MIME type or extension.
function fileIcon(filename: string, mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("text/")) return "📝";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["zip", "gz", "tar", "7z", "rar"].includes(ext)) return "🗜";
  if (["doc", "docx", "odt"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["ppt", "pptx"].includes(ext)) return "📑";
  return "📎";
}

// Decides whether a file can be previewed inline in the browser.
function canPreview(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/")
  );
}

// Decides whether a file can be summarized by the AI.
function canSummarize(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/plain") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/")
  );
}

type FileAction = "idle" | "downloading" | "viewing" | "summarizing" | "error";

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ClipFileList({
  code,
  files,
}: {
  code: string;
  files: ClipFile[];
}) {
  type SummaryState = { status: "loading" | "done" | "error"; text: string | null };
  const [summaryModal, setSummaryModal] = useState<{ filename: string; state: SummaryState } | null>(null);
  const [copied, setCopied] = useState(false);
  const [fileActions, setFileActions] = useState<Record<string, FileAction>>({});

  const summaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (summaryRef.current && !summaryRef.current.contains(event.target as Node)) {
        const clickedButton = (event.target as HTMLElement).closest("[id^='summarize-']");
        if (!clickedButton) {
          setSummaryModal(null);
        }
      }
    }

    if (summaryModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [summaryModal]);

  function setAction(filename: string, action: FileAction) {
    setFileActions(prev => ({ ...prev, [filename]: action }));
  }

  // ── DOWNLOAD ──
  async function handleDownload(filename: string) {
    if (fileActions[filename] === "downloading") return;
    setAction(filename, "downloading");
    try {
      const res = await fetch(
        `/api/clip/${code}/${encodeURIComponent(filename)}/download`
      );
      if (!res.ok) throw new Error("Failed to get download URL");
      const { url } = await res.json();

      const fileRes = await fetch(url);
      const blob = await fileRes.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      setAction(filename, "error");
      setTimeout(() => setAction(filename, "idle"), 3000);
      return;
    }
    setAction(filename, "idle");
  }

  // ── VIEW ──
  async function handleView(filename: string) {
    if (fileActions[filename] === "viewing") return;
    setAction(filename, "viewing");
    try {
      const res = await fetch(
        `/api/clip/${code}/${encodeURIComponent(filename)}/view`
      );
      if (!res.ok) throw new Error("Failed to get view URL");
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setAction(filename, "error");
      setTimeout(() => setAction(filename, "idle"), 3000);
      return;
    }
    setAction(filename, "idle");
  }

  // ── SUMMARIZE ──
  async function handleSummarize(filename: string) {
    if (fileActions[filename] === "summarizing") return;
    setAction(filename, "summarizing");
    setSummaryModal({ filename, state: { status: "loading", text: null } });
    try {
      const res = await fetch(
        `/api/clip/${code}/${encodeURIComponent(filename)}/summary`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get summary");
      }
      const { summary } = await res.json();
      setSummaryModal({ filename, state: { status: "done", text: summary } });
    } catch (err: any) {
      setSummaryModal({ filename, state: { status: "error", text: err.message || "An error occurred" } });
    } finally {
      setAction(filename, "idle");
    }
  }

  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/clip/${code}`
    : `/clip/${code}`;

  return (
    <div>
      {/* ── SUMMARY ROW ── */}
      <div className="flex items-center justify-between text-xs text-black/45 dark:text-white/45 mb-3 px-1">
        <span>{files.length} file{files.length !== 1 ? "s" : ""} · {formatBytes(totalBytes)}</span>

        {/* Copy share URL */}
        <button
          id="copy-clip-url-btn"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
        >
          {copied ? "✓ Copied" : "🔗 Copy link"}
        </button>
      </div>

      {/* ── DOWNLOAD ALL ── */}
      {files.length > 1 && (
        <div className="mb-3 flex justify-end">
          <a
            id="download-all-zip-btn"
            href={`/api/clip/${code}/download`}
            download={`fileclip-${code}.zip`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 text-xs font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
          >
            <span aria-hidden>⬇</span>
            Download all as ZIP
          </a>
        </div>
      )}

      {/* ── FILE ROWS ── */}
      <ul className="divide-y divide-black/10 dark:divide-white/10 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
        {files.map((file) => {
          const action = fileActions[file.filename] ?? "idle";
          const preview = canPreview(file.mimeType);

          return (
            <li
              key={file.filename}
              className="bg-white dark:bg-neutral-900 px-4 py-4 flex items-center gap-3"
            >
              {/* Icon */}
              <span className="text-2xl flex-shrink-0 select-none" aria-hidden>
                {fileIcon(file.filename, file.mimeType)}
              </span>

              {/* Name + size */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" title={file.filename}>
                  {file.filename}
                </p>
                <p className="text-xs text-black/45 dark:text-white/45 mt-0.5">
                  {formatBytes(file.size)}
                  <span className="ml-2 text-black/25 dark:text-white/25">
                    {file.mimeType}
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">

                {/* View (only for previewable types) */}
                {preview && (
                  <button
                    id={`view-${file.filename}`}
                    onClick={() => handleView(file.filename)}
                    disabled={action !== "idle"}
                    title="Preview in browser"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 text-xs font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors disabled:opacity-40"
                  >
                    {action === "viewing" ? (
                      <span className="animate-pulse">Opening…</span>
                    ) : (
                      <>
                        <span aria-hidden>👁</span>
                        <span>View</span>
                      </>
                    )}
                  </button>
                )}

                {/* Summarize */}
                {canSummarize(file.mimeType) && (
                  <button
                    id={`summarize-${file.filename}`}
                    onClick={() => handleSummarize(file.filename)}
                    disabled={action !== "idle"}
                    title="Summarize file"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 text-xs font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors disabled:opacity-40"
                  >
                    {action === "summarizing" ? (
                      <span className="animate-pulse">AI…</span>
                    ) : (
                      <>
                        <span aria-hidden>✨</span>
                        <span>Summarise</span>
                      </>
                    )}
                  </button>
                )}

                {/* Download */}
                <button
                  id={`download-${file.filename}`}
                  onClick={() => handleDownload(file.filename)}
                  disabled={action !== "idle"}
                  title="Download file"
                  className={[
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40",
                    action === "error"
                      ? "border border-red-400 text-red-500"
                      : "bg-black text-white dark:bg-white dark:text-black hover:opacity-75",
                  ].join(" ")}
                >
                  {action === "downloading" ? (
                    <span className="animate-pulse">Saving…</span>
                  ) : action === "error" ? (
                    "Failed"
                  ) : (
                    <>
                      <span aria-hidden>⬇</span>
                      <span>Download</span>
                    </>
                  )}
                </button>

              </div>
            </li>
          );
        })}
      </ul>

      {/* ── SUMMARY BOX ── */}
      {summaryModal && (() => {
        const status = summaryModal.state.status;
        const bgClass = status === "done"
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-100"
          : status === "error"
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-100"
          : "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100";

        const titleColor = status === "done"
          ? "text-emerald-800/85 dark:text-emerald-400/85"
          : status === "error"
          ? "text-red-800/85 dark:text-red-400/85"
          : "text-neutral-500 dark:text-neutral-400";

        const closeColor = status === "done"
          ? "text-emerald-500 hover:text-emerald-850 dark:text-emerald-400 dark:hover:text-emerald-200"
          : status === "error"
          ? "text-red-500 hover:text-red-850 dark:text-red-400 dark:hover:text-red-200"
          : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200";

        return (
          <div
            ref={summaryRef}
            className={`relative mt-4 p-5 rounded-2xl shadow-lg border text-left transition-colors duration-300 ${bgClass}`}
          >
            {/* Close button with correct top right placement & spacing */}
            <button
              onClick={() => setSummaryModal(null)}
              className={`absolute top-4 right-4 transition-colors text-xl font-bold leading-none select-none cursor-pointer ${closeColor}`}
              title="Close"
            >
              &times;
            </button>

            {/* Centered title */}
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 text-center pr-8 truncate select-none ${titleColor}`}>
              ✨ Summary: {summaryModal.filename}
            </h3>

            <div className="max-h-80 overflow-y-auto pr-1">
              {status === "loading" && (
                <div className="flex flex-col items-center justify-center py-6 select-none">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-neutral-600 dark:border-neutral-400 border-t-transparent mb-3"></div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 animate-pulse font-medium">Analyzing file with Gemini...</p>
                </div>
              )}

              {status === "error" && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs">
                  <p className="font-semibold mb-1">Could not generate summary</p>
                  <p className="opacity-90">{summaryModal.state.text}</p>
                </div>
              )}

              {status === "done" && summaryModal.state.text && (
                <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans font-normal">
                  {summaryModal.state.text}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── DOWNLOAD ALL hint ── */}
      <p className="text-xs text-black/30 dark:text-white/30 text-center mt-4">
        Files are delivered directly from secure storage via time-limited links.
      </p>
    </div>
  );
}
