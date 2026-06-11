"use client";

// ─── TUTORIAL NOTE — Custom Hook ──────────────────────────────────────────
// A "custom hook" is just a function that starts with `use` and calls other
// hooks (useState, useEffect, etc.) inside it.
//
// Why make this a hook instead of copying the code into every page?
// → Single source of truth. If we want to change how theme works (e.g. add
//   a "system" option), we change it here once, and all pages update.
//
// Usage in any page:
//   const { isDark, toggleTheme } = useTheme();
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;

    const applyTheme = () => {
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("fileclip-theme", next ? "dark" : "light");
      setIsDark(next);
    };

    // Use View Transitions API for the smooth crossfade (with fallback)
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    doc.startViewTransition ? doc.startViewTransition(applyTheme) : applyTheme();
  }

  return { isDark, toggleTheme };
}
