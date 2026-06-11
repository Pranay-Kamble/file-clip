"use client";

// ─── TUTORIAL NOTE ──────────────────────────────────────────────────────────
// This landing page is a Client Component only because of the dark mode toggle.
// Everything else here (hero, cards, table) is static content.
//
// A better pattern (for later): extract just the toggle button into its own
// "use client" component, and keep the rest of this page as a Server Component.
// ────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import Navbar from "@/components/Navbar";

const FEATURE_CARDS = [
  { icon: "🔗", title: "Share by code",  desc: "One 6-character code. No long links." },
  { icon: "⏳", title: "Auto-expires",   desc: "Files delete themselves on schedule." },
  { icon: "🔒", title: "No account",     desc: "Upload and share without signing up." },
  { icon: "⚡", title: "Direct upload",  desc: "Files go straight to storage." },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Pick your files",     desc: "Select one or more files from your device. Up to 15 files, 100 MB each." },
  { step: "2", title: "Choose expiry",       desc: "Set how long the files should be available — 1 hour to 7 days." },
  { step: "3", title: "Get your code",       desc: "You receive a 6-character code. Share it with anyone." },
  { step: "4", title: "Recipient retrieves", desc: "They enter the code, see all files, and download what they need." },
];

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-background text-foreground">

      <Navbar
        showBack={false}
      />

      {/* ── HERO ── */}
      <section className="px-6 py-24 flex flex-col items-center text-center">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-black/40 dark:text-white/40 uppercase mb-4">
            Online File Clipboard
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-5 leading-tight">
            Share files with<br />a 6-character code
          </h1>
          <p className="text-black/60 dark:text-white/55 text-lg mb-10 max-w-md mx-auto">
            No accounts. No installs. No storage subscriptions.
            Upload, share a code, done.
          </p>

          {/* ── PRIMARY CTAs ── */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Primary action */}
            <Link
              href="/upload"
              className="px-8 py-3.5 rounded-xl font-semibold text-sm bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
            >
              ↑ Upload Files
            </Link>

            {/* Secondary action */}
            <Link
              href="/clip"
              className="px-8 py-3.5 rounded-xl font-semibold text-sm border border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 transition-colors"
            >
              Enter a code →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-16 border-t border-black/10 dark:border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-10 tracking-tight text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-black/20 dark:border-white/20 flex items-center justify-center text-sm font-semibold text-black/50 dark:text-white/50">
                  {item.step}
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-black/55 dark:text-white/55 leading-5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="px-6 py-16 border-t border-black/10 dark:border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-8 tracking-tight text-center">
            Built for quick, hassle-free sharing
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURE_CARDS.map((card) => (
              <div
                key={card.title}
                className="border border-black/10 dark:border-white/10 rounded-xl p-5 flex flex-col gap-3 bg-white dark:bg-white/3"
              >
                <span className="text-2xl">{card.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{card.title}</p>
                  <p className="text-xs text-black/55 dark:text-white/55 mt-1 leading-5">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="px-6 py-20 border-t border-black/10 dark:border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-2 tracking-tight">Why FileClip?</h2>
          <p className="text-black/60 dark:text-white/60 text-sm mb-10">
            Sharing a file shouldn&apos;t require an account, an app, or a storage subscription.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">
                  <th className="text-left py-3 pr-6 font-medium text-black/50 dark:text-white/50 w-40">Feature</th>
                  <th className="py-3 px-4 font-semibold text-center">FileClip</th>
                  <th className="py-3 px-4 font-medium text-center text-black/50 dark:text-white/50">Email</th>
                  <th className="py-3 px-4 font-medium text-center text-black/50 dark:text-white/50">Cloud Drive</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "No account needed",      fc: "✓", em: "✗", cl: "✗" },
                  { feature: "Share via short code",   fc: "✓", em: "✗", cl: "✗" },
                  { feature: "Auto-expires",           fc: "✓", em: "✗", cl: "✗" },
                  { feature: "Multiple files at once", fc: "✓", em: "✓", cl: "✓" },
                  { feature: "Large file support*",    fc: "✓", em: "✗", cl: "✓" },
                  { feature: "Works instantly",        fc: "✓", em: "✓", cl: "✗" },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-black/5 dark:border-white/5 last:border-0">
                    <td className="py-3 pr-6 text-black/70 dark:text-white/70">{row.feature}</td>
                    <td className={`py-3 px-4 text-center font-medium ${row.fc === "✓" ? "text-green-600 dark:text-green-400" : "text-black/25"}`}>{row.fc}</td>
                    <td className={`py-3 px-4 text-center ${row.em === "✓" ? "text-black/60 dark:text-white/60" : "text-black/20 dark:text-white/20"}`}>{row.em}</td>
                    <td className={`py-3 px-4 text-center ${row.cl === "✓" ? "text-black/60 dark:text-white/60" : "text-black/20 dark:text-white/20"}`}>{row.cl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-black/40 dark:text-white/40 mt-4">* Up to 100 MB per file.</p>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="px-6 py-20 border-t border-black/10 dark:border-white/10 text-center">
        <h2 className="text-2xl font-semibold mb-3 tracking-tight">Ready to share?</h2>
        <p className="text-black/55 dark:text-white/55 text-sm mb-8">No sign-up. Takes under 30 seconds.</p>
        <Link
          href="/upload"
          className="inline-block px-10 py-4 rounded-xl font-semibold text-sm bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
        >
          ↑ Upload Files
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-black/10 dark:border-white/10 px-6 py-6 text-center text-xs text-black/40 dark:text-white/40">
        FileClip · Files expire automatically · No account required
      </footer>

    </div>
  );
}
