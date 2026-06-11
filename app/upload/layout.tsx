// ─── TUTORIAL NOTE ──────────────────────────────────────────────────────────
// Sub-folder layouts in Next.js are NESTED inside the root app/layout.tsx.
// They must NOT render <html> or <body> tags — those already exist from the
// root layout. A sub-layout only adds structure specific to this route segment.
//
// If you copy the root layout into a subfolder unchanged, you get:
//   <html>             ← from app/layout.tsx       (correct)
//     <body>
//       <html>         ← from app/upload/layout.tsx (WRONG — invalid HTML)
//         <body> ...
//
// This layout is intentionally minimal. It just passes children through.
// Add upload-specific wrappers here later if needed (e.g. a progress bar).
// ────────────────────────────────────────────────────────────────────────────

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
