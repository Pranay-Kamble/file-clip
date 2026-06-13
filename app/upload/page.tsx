"use client";

// ─── TUTORIAL NOTE ──────────────────────────────────────────────────────────
// "use client" is required because this page uses:
//   - useState (component memory)
//   - useEffect (runs code after render — needed to read system dark mode pref)
//   - useRef (direct DOM element handle)
//   - Event handlers (onClick, onDrop, onChange)
// ────────────────────────────────────────────────────────────────────────────

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useTheme } from "@/lib/useTheme";
import Navbar from "@/components/Navbar";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES  = 100 * 1024 * 1024;   // 100 MB per file
const MAX_FILE_COUNT       = 15;                   // max files per upload
const WARN_TOTAL_SIZE_BYTES = 500 * 1024 * 1024;  // warn if total > 500 MB

// ─── TYPES ───────────────────────────────────────────────────────────────────
type ExpiryOption = { label: string; value: string };
type ToastItem    = { id: number; message: string; type: "error" | "warn" };
type UploadStatus = "idle" | "uploading" | "done" | "error";
type FileProgress = { name: string; status: "pending" | "uploading" | "done" | "error" };

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: "1 hour",   value: "1h"  },
  { label: "24 hours", value: "24h" },
  { label: "3 days",   value: "3d"  },
  { label: "7 days",   value: "7d"  },
];

const FEATURE_CARDS = [
  { icon: "🔗", title: "Share by code",  desc: "One 6-character code. No long links to manage." },
  { icon: "⏳", title: "Auto-expires",   desc: "Files delete themselves when the timer runs out." },
  { icon: "🔒", title: "No account",     desc: "Upload and share without ever signing up." },
  { icon: "⚡", title: "Direct upload",  desc: "Files go straight to storage — fast and reliable." },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function HomePage() {

  // ── STATE ──
  const [files,          setFiles]          = useState<File[]>([]);
  const [expiry,         setExpiry]         = useState("24h");
  const [isDragging,     setIsDragging]     = useState(false);
  const [toasts,         setToasts]         = useState<ToastItem[]>([]);
  const [uploadStatus,   setUploadStatus]   = useState<UploadStatus>("idle");
  const [fileProgress,   setFileProgress]   = useState<FileProgress[]>([]);
  const [clipCode,       setClipCode]       = useState<string | null>(null);
  const [copiedCode,     setCopiedCode]     = useState(false);
  const [copiedUrl,      setCopiedUrl]      = useState(false);
  const [qrSharing,      setQrSharing]      = useState(false);
  const { isDark, toggleTheme }             = useTheme();

  // ── REFS ──
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const toastIdRef    = useRef(0);   // counter for unique toast IDs


  // Creates a toast that auto-removes itself after 4 seconds.
  function showToast(message: string, type: ToastItem["type"] = "warn") {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }

  // ── ADD FILES (with validation) ──
  function addFiles(incoming: File[]) {
    // 1. Filter out files that exceed the per-file size limit
    const oversized = incoming.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    const valid     = incoming.filter(f => f.size <= MAX_FILE_SIZE_BYTES);

    if (oversized.length > 0) {
      showToast(
        `${oversized.length} file${oversized.length > 1 ? "s" : ""} exceed the 100 MB limit and were skipped.`,
        "error"
      );
    }

    setFiles(prev => {
      // 2. Remove duplicates (same name + same size = same file)
      const existingKeys = new Set(prev.map(f => f.name + f.size));
      const unique = valid.filter(f => !existingKeys.has(f.name + f.size));

      // 3. Enforce the 15-file cap
      const slots = Math.max(0, MAX_FILE_COUNT - prev.length);
      if (unique.length > slots) {
        showToast(`Max ${MAX_FILE_COUNT} files per upload. Only ${slots} slot${slots !== 1 ? "s" : ""} remaining.`, "error");
      }
      const toAdd = unique.slice(0, slots);
      const next  = [...prev, ...toAdd];

      // 4. Warn if total size > 500 MB (but still allow the upload)
      const totalBytes = next.reduce((sum, f) => sum + f.size, 0);
      if (totalBytes > WARN_TOTAL_SIZE_BYTES) {
        showToast("Total upload size exceeds 500 MB. Please ensure your internet connection is stable.", "warn");
      }

      return next;
    });
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  // ── FILE INPUT HANDLER ──
  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = ""; // reset so same file can be re-selected
  }

  // ── DRAG HANDLERS ──
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() { setIsDragging(false); }

  // ── UPLOAD HANDLER ──
  async function handleUpload() {
    if (files.length === 0 || uploadStatus === "uploading") return;

    setUploadStatus("uploading");
    setFileProgress(files.map(f => ({ name: f.name, status: "pending" })));

    let presignData: {
      code: string;
      files: { filename: string; stagingKey: string; presignedPutURL: string; confirmToken: string }[];
    };

    try {
      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map(f => ({ name: f.name, mimeType: f.type || "application/octet-stream" })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to get presigned URLs");
      }

      presignData = await res.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get presigned URLs";
      showToast(msg, "error");
      setUploadStatus("error");
      return;
    }

    const confirmEntries: { stagingKey: string; confirmToken: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file        = files[i];
      const presignFile = presignData.files[i];

      setFileProgress(prev =>
        prev.map((p, idx) => idx === i ? { ...p, status: "uploading" } : p)
      );

      try {
        const putRes = await fetch(presignFile.presignedPutURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!putRes.ok) throw new Error(`S3 upload failed for ${file.name}`);

        setFileProgress(prev =>
          prev.map((p, idx) => idx === i ? { ...p, status: "done" } : p)
        );

        confirmEntries.push({
          stagingKey:   presignFile.stagingKey,
          confirmToken: presignFile.confirmToken,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : `Upload failed for ${file.name}`;
        showToast(msg, "error");
        setFileProgress(prev =>
          prev.map((p, idx) => idx === i ? { ...p, status: "error" } : p)
        );
        setUploadStatus("error");
        return;
      }
    }

    try {
      const confirmRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: confirmEntries, expiry }),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to confirm upload");
      }

      const { code } = await confirmRes.json();
      setClipCode(code);
      setUploadStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm upload";
      showToast(msg, "error");
      setUploadStatus("error");
    }
  }

  // ── QR HELPERS ──
  function qrImageUrl(code: string) {
    const shareUrl = `${window.location.origin}/clip/${code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(shareUrl)}`;
  }

  async function handleQrDownload() {
    if (!clipCode) return;
    try {
      const res  = await fetch(qrImageUrl(clipCode));
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `fileclip-${clipCode}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to download QR code.", "error");
    }
  }

  async function handleQrShare() {
    if (!clipCode) return;
    setQrSharing(true);
    const shareUrl = `${window.location.origin}/clip/${clipCode}`;
    try {
      if (navigator.canShare) {
        const res  = await fetch(qrImageUrl(clipCode));
        const blob = await res.blob();
        const file = new File([blob], `fileclip-${clipCode}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: `FileClip · ${clipCode}`, url: shareUrl, files: [file] });
        } else {
          await navigator.share({ title: `FileClip · ${clipCode}`, url: shareUrl });
        }
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Share URL copied to clipboard.", "warn");
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        showToast("Could not share QR code.", "error");
      }
    } finally {
      setQrSharing(false);
    }
  }

  // ── COMPUTED VALUES ──
  const totalBytes    = files.reduce((sum, f) => sum + f.size, 0);
  const selectedLabel = EXPIRY_OPTIONS.find(o => o.value === expiry)?.label ?? "";

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER ──
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── TOAST CONTAINER ── */}
      {/* Fixed to the bottom-right. Each toast stacks vertically. */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={[
              "px-4 py-3 rounded-lg text-sm shadow-lg pointer-events-auto transition-all duration-300",
              toast.type === "error"
                ? "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                : "bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800",
            ].join(" ")}
          >
            <span className="mr-2">{toast.type === "error" ? "✕" : "⚠"}</span>
            {toast.message}
          </div>
        ))}
      </div>

      <Navbar
        showBack
        rightLinks={[{ label: "Retrieve files →", href: "/clip" }]}
      />

      {/* ── UPLOAD SECTION ── */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">

          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Upload files</h1>
          <p className="text-black/60 dark:text-white/60 mb-8 text-sm">
            Select your files, choose how long to keep them, and get a shareable code.
          </p>

          {/* ── DROP ZONE ── */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-150",
              isDragging
                ? "border-black dark:border-white bg-black/5 dark:bg-white/5"
                : "border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <div className="text-4xl mb-3 select-none">📁</div>
            <p className="font-medium">
              {isDragging ? "Drop files here" : "Drag files here"}
            </p>
            <p className="text-sm text-black/50 dark:text-white/50 mt-1">
              or <span className="underline">click to browse</span>
            </p>
            <p className="text-xs text-black/35 dark:text-white/35 mt-3">
              Up to {MAX_FILE_COUNT} files · 100 MB per file
            </p>
          </div>

          {/* ── FILE LIST ── */}
          {files.length > 0 && (
            <div className="mt-4">
              {/* File count + total size summary */}
              <div className="flex justify-between text-xs text-black/50 dark:text-white/50 mb-1 px-1">
                <span>{files.length} / {MAX_FILE_COUNT} files</span>
                <span>Total: {formatBytes(totalBytes)}</span>
              </div>

              <ul className="divide-y divide-black/10 dark:divide-white/10 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                      className="ml-4 text-sm text-black/40 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── EXPIRY SELECTOR ── */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">Keep files for</label>
            <div className="flex gap-2 flex-wrap">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExpiry(opt.value)}
                  className={[
                    "px-4 py-2 rounded-lg text-sm border transition-colors duration-100",
                    expiry === opt.value
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                      : "border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── UPLOAD PROGRESS ── */}
          {uploadStatus === "uploading" && fileProgress.length > 0 && (
            <div className="mt-4 space-y-1">
              {fileProgress.map((fp) => (
                <div key={fp.name} className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
                  <span className="flex-1 truncate">{fp.name}</span>
                  <span className={
                    fp.status === "done"     ? "text-green-600 dark:text-green-400" :
                    fp.status === "error"    ? "text-red-500" :
                    fp.status === "uploading" ? "animate-pulse" : ""
                  }>
                    {fp.status === "done" ? "✓" : fp.status === "error" ? "✕" : fp.status === "uploading" ? "↑ uploading…" : "waiting"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── SUCCESS PANEL ── */}
          {uploadStatus === "done" && clipCode ? (
            <div className="mt-6 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">

              {/* Header */}
              <div className="bg-black dark:bg-white px-5 py-4 flex items-center gap-3">
                <span className="text-white dark:text-black text-xl">✓</span>
                <div>
                  <p className="text-sm font-semibold text-white dark:text-black leading-tight">Upload complete</p>
                  <p className="text-xs text-white/60 dark:text-black/50">
                    {files.length} file{files.length > 1 ? "s" : ""} · expires in {selectedLabel}
                  </p>
                </div>
              </div>

              {/* Code block */}
              <div className="px-5 py-5 flex flex-col items-center gap-1 border-b border-black/10 dark:border-white/10">
                <p className="text-xs text-black/40 dark:text-white/40 mb-1 uppercase tracking-widest">Your clip code</p>
                <p className="font-mono text-5xl font-bold tracking-[0.25em] text-black dark:text-white select-all">
                  {clipCode}
                </p>
                <p className="text-xs text-black/35 dark:text-white/35 mt-1">Share this code to let others retrieve your files</p>
              </div>

              {/* Action buttons */}
              <div className="px-5 py-4 flex flex-col gap-2">
                {/* Copy code */}
                <button
                  id="copy-code-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(clipCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-black/15 dark:border-white/15 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span>{copiedCode ? "✓" : "⎘"}</span>
                  {copiedCode ? "Code copied!" : "Copy code"}
                </button>

                {/* Copy share URL */}
                <button
                  id="copy-url-btn"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/clip/${clipCode}`;
                    navigator.clipboard.writeText(shareUrl);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-black/15 dark:border-white/15 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span>{copiedUrl ? "✓" : "🔗"}</span>
                  {copiedUrl ? "URL copied!" : "Copy share URL"}
                </button>

                {/* View files link */}
                <a
                  id="view-files-link"
                  href={`/clip/${clipCode}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold hover:opacity-80 transition-opacity"
                >
                  View files →
                </a>
              </div>

              {/* QR code */}
              <div className="px-5 py-5 border-t border-black/10 dark:border-white/10 flex flex-col items-center gap-3">
                <p className="text-xs text-black/40 dark:text-white/40 uppercase tracking-widest">Scan to retrieve</p>
                <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 p-2 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl(clipCode)}
                    alt={`QR code for clip ${clipCode}`}
                    width={180}
                    height={180}
                    className="block"
                  />
                </div>
                <p className="text-xs text-black/30 dark:text-white/30">Point your camera to open on another device</p>

                {/* Download & Share buttons */}
                <div className="flex gap-2 w-full">
                  <button
                    id="qr-download-btn"
                    onClick={handleQrDownload}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-black/15 dark:border-white/15 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    ⬇ Download QR
                  </button>
                  <button
                    id="qr-share-btn"
                    onClick={handleQrShare}
                    disabled={qrSharing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-black/15 dark:border-white/15 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
                  >
                    {qrSharing ? "Sharing…" : "↗ Share QR"}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* ── UPLOAD BUTTON (only when not done) ── */
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploadStatus === "uploading"}
              className={[
                "mt-6 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-150",
                files.length === 0 || uploadStatus === "uploading"
                  ? "bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30 cursor-not-allowed"
                  : "bg-black text-white dark:bg-white dark:text-black hover:opacity-80",
              ].join(" ")}
            >
              {uploadStatus === "uploading"
                ? "Uploading…"
                : files.length === 0
                ? "Select files to upload"
                : `Upload ${files.length} file${files.length > 1 ? "s" : ""} · ${selectedLabel}`}
            </button>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-black/10 dark:border-white/10 px-6 py-6 text-center text-xs text-black/40 dark:text-white/40">
        FileClip · Files expire automatically · No account required
      </footer>

    </div>
  );
}
