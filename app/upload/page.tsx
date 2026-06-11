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
  const [files,      setFiles]      = useState<File[]>([]);
  const [expiry,     setExpiry]     = useState("24h");
  const [isDragging, setIsDragging] = useState(false);
  const [toasts,     setToasts]     = useState<ToastItem[]>([]);
  const { isDark, toggleTheme }     = useTheme();

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
  // For now just logs — real API call wired in the next step.
  function handleUpload() {
    console.log("Uploading:", files, "Expiry:", expiry);
    alert("Upload wiring coming soon!");
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

          {/* ── UPLOAD BUTTON ── */}
          <button
            onClick={handleUpload}
            disabled={files.length === 0}
            className={[
              "mt-6 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-150",
              files.length === 0
                ? "bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30 cursor-not-allowed"
                : "bg-black text-white dark:bg-white dark:text-black hover:opacity-80",
            ].join(" ")}
          >
            {files.length === 0
              ? "Select files to upload"
              : `Upload ${files.length} file${files.length > 1 ? "s" : ""} · ${selectedLabel}`}
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-black/10 dark:border-white/10 px-6 py-6 text-center text-xs text-black/40 dark:text-white/40">
        FileClip · Files expire automatically · No account required
      </footer>

    </div>
  );
}
