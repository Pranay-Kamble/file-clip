import { notFound } from "next/navigation"
import Navbar from "@/components/Navbar"
import ClipFileList from "./ClipFileList"

// ─── TYPES ───────────────────────────────────────────────────────────────────
export interface ClipFile {
  filename: string
  size:     number
  mimeType: string
}

interface ClipData {
  code:      string
  expiresAt: string
  files:     ClipFile[]
}

// ─── SERVER COMPONENT ─────────────────────────────────────────────────────────
// Fetches clip metadata at request time. Renders the appropriate state
// (not found, expired, or the full file list).

export default async function ClipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const code = id.toUpperCase()

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/clip/${code}`,
    { cache: "no-store" }
  )

  // ── 404 — code never existed ──
  if (res.status === 404) {
    return (
      <ErrorPage
        code={code}
        emoji="🔍"
        title="Clip not found"
        message="The code you entered doesn't match any clip. Double-check the characters — codes are case-sensitive and 6 characters long."
      />
    )
  }

  // ── 410 — existed but expired ──
  if (res.status === 410) {
    return (
      <ErrorPage
        code={code}
        emoji="⏳"
        title="Clip has expired"
        message="This clip's files have been automatically deleted. Files are removed once the expiry window passes."
      />
    )
  }

  if (!res.ok) notFound()

  const clip: ClipData = await res.json()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        showBack
        rightLinks={[{ label: "↑ Upload Files", href: "/upload" }]}
      />

      <main className="flex-1 flex flex-col items-center px-6 pt-16 pb-12">
        <div className="w-full max-w-xl">

          {/* ── HEADER ── */}
          <div className="mb-8">
            <p className="text-xs text-black/40 dark:text-white/40 uppercase tracking-widest mb-1">
              Clip code
            </p>
            <h1 className="font-mono text-4xl font-bold tracking-[0.2em] text-black dark:text-white select-all">
              {clip.code}
            </h1>
            <ExpiryBadge expiresAt={clip.expiresAt} />
          </div>

          {/* ── FILE LIST (Client Component) ── */}
          <ClipFileList code={clip.code} files={clip.files} />

        </div>
      </main>

      <footer className="border-t border-black/10 dark:border-white/10 px-6 py-5 text-center text-xs text-black/35 dark:text-white/35">
        FileClip · Files expire automatically · No account required
      </footer>
    </div>
  )
}

// ─── EXPIRY BADGE ─────────────────────────────────────────────────────────────
// Server-rendered relative time label ("Expires in 6 hours", "Expires in 2 days")

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const ms   = new Date(expiresAt).getTime() - Date.now()
  const mins = Math.round(ms / 60_000)

  let label: string
  if (ms <= 0) {
    label = "Expired"
  } else if (mins < 60) {
    label = `Expires in ${mins} minute${mins !== 1 ? "s" : ""}`
  } else if (mins < 60 * 24) {
    const h = Math.round(mins / 60)
    label = `Expires in ${h} hour${h !== 1 ? "s" : ""}`
  } else {
    const d = Math.round(mins / 60 / 24)
    label = `Expires in ${d} day${d !== 1 ? "s" : ""}`
  }

  const isUrgent = ms > 0 && ms < 60 * 60 * 1000 // < 1 hour

  return (
    <p
      className={[
        "text-xs mt-2 font-medium",
        isUrgent
          ? "text-amber-600 dark:text-amber-400"
          : "text-black/40 dark:text-white/40",
      ].join(" ")}
    >
      {label}
    </p>
  )
}

// ─── ERROR PAGE ───────────────────────────────────────────────────────────────
function ErrorPage({
  code,
  emoji,
  title,
  message,
}: {
  code:    string
  emoji:   string
  title:   string
  message: string
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        showBack
        rightLinks={[{ label: "↑ Upload Files", href: "/upload" }]}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-5xl mb-5 select-none">{emoji}</p>
        <h1 className="text-2xl font-semibold mb-2 tracking-tight">{title}</h1>
        <p className="text-sm text-black/50 dark:text-white/50 mb-2 max-w-xs">{message}</p>
        <p className="font-mono text-xs text-black/30 dark:text-white/30 mb-8">
          Code: {code}
        </p>
        <a
          href="/clip"
          className="text-sm underline text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
        >
          ← Try a different code
        </a>
      </main>

      <footer className="border-t border-black/10 dark:border-white/10 px-6 py-5 text-center text-xs text-black/35 dark:text-white/35">
        FileClip · Files expire automatically · No account required
      </footer>
    </div>
  )
}
