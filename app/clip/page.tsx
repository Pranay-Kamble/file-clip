"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function RetrievePage() {
  const [code, setCode] = useState("");
  const router          = useRouter();

  const trimmed    = code.trim();
  const isComplete = trimmed.length === 6;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
    setCode(raw);
  }

  function handleRetrieve() {
    if (!isComplete) return;
    router.push(`/clip/${trimmed}`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      <Navbar
        showBack
        rightLinks={[{ label: "↑ Upload Files", href: "/upload" }]}
      />

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          <h1 className="text-2xl font-semibold mb-2 tracking-tight">
            Retrieve your files
          </h1>
          <p className="text-sm text-black/55 dark:text-white/55 mb-8">
            Enter the 6-character code shared with you.
          </p>

          {/* ── CODE INPUT ── */}
          <div className="mb-4">
            <input
              type="text"
              value={code}
              onChange={handleChange}
              onKeyDown={(e) => e.key === "Enter" && handleRetrieve()}
              placeholder="e.g. AB3K9Z"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={6}
              className={[
                "w-full px-4 py-3.5 rounded-xl border-2 bg-transparent text-lg font-mono tracking-widest",
                "outline-none transition-colors duration-100 placeholder:text-black/25 dark:placeholder:text-white/25",
                "placeholder:font-sans placeholder:tracking-normal placeholder:text-base",
                code.length > 0
                  ? "border-black dark:border-white"
                  : "border-black/20 dark:border-white/20 focus:border-black/50 dark:focus:border-white/50",
              ].join(" ")}
            />
            <p className="text-xs text-black/35 dark:text-white/35 mt-2 ml-1">
              {code.length}/6 characters{" "}
              {code.length > 0 && code.length < 6 && "· keep typing"}
            </p>
          </div>

          {/* ── RETRIEVE BUTTON ── */}
          <button
            onClick={handleRetrieve}
            disabled={!isComplete}
            className={[
              "w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-150",
              isComplete
                ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-80"
                : "bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30 cursor-not-allowed",
            ].join(" ")}
          >
            {isComplete ? `Retrieve · ${trimmed.toUpperCase()}` : "Enter your 6-character code"}
          </button>

          <p className="text-xs text-black/35 dark:text-white/35 mt-5 text-center">
            Codes are not case-sensitive — type in any case.
          </p>

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-black/10 dark:border-white/10 px-6 py-5 text-center text-xs text-black/35 dark:text-white/35">
        FileClip · Files expire automatically · No account required
      </footer>

    </div>
  );
}
