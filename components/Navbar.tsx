"use client";

// ─── TUTORIAL NOTE — Shared Component ───────────────────────────────────────
// Instead of copy-pasting the navbar into every page (and having them drift
// apart over time), we extract it into one component and import it everywhere.
//
// The key insight for consistent logo positioning:
//   On sub-pages: [← button][gap][FileClip]
//   On home page: [invisible placeholder][gap][FileClip]
//
// The placeholder is the same width (w-9 = 36px) as the back button, so the
// logo is always at exactly the same horizontal pixel position on every page.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { useTheme } from "@/lib/useTheme";

type NavLink = { label: string; href: string };

type NavbarProps = {
  showBack?: boolean;
  rightLinks?: NavLink[];
};

export default function Navbar({ showBack = false, rightLinks = [] }: NavbarProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="border-b border-black/10 dark:border-white/10 px-6 py-4 sticky top-0 bg-background z-10">
      <div className="max-w-5xl mx-auto flex items-center gap-3">

        {/* ── BACK ARROW SLOT ── */}
        {showBack ? (
          <Link
            href="/"
            className="w-9 h-9 shrink-0 rounded-lg border border-black/15 dark:border-white/15 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Back to home"
          >
            ←
          </Link>
        ) : (
          <div className="w-9 h-9 shrink-0" aria-hidden="true" />
        )}

        {/* ── LOGO ── */}
        <Link
          href="/"
          className="font-semibold text-lg tracking-tight hover:opacity-70 transition-opacity"
        >
          FileClip
        </Link>

        {/* -- SPACER -- */}
        <div className="flex-1" />

        {/* ── RIGHT LINKS ── */}
        {rightLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm border border-black/20 dark:border-white/20 px-4 py-2 rounded-lg hover:border-black/50 dark:hover:border-white/50 transition-colors whitespace-nowrap"
          >
            {link.label}
          </Link>
        ))}

        {/* ── THEME TOGGLE ── */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="w-9 h-9 shrink-0 rounded-lg border border-black/15 dark:border-white/15 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {isDark ? "☀️" : "🌙"}
        </button>

      </div>
    </header>
  );
}
