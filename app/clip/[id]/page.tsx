import Navbar from "@/components/Navbar"
import Link from "next/link"

/*
  /clip/[id] — Clip detail page
  Currently a fallback placeholder. Will be wired up to GET /api/clip/[id]
  once the full file list UI is built.
*/

export default async function ClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const code = id.toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        showBack
        rightLinks={[{ label: "↑ Upload Files", href: "/upload" }]}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-5xl mb-6">📋</p>
        <h1 className="text-2xl font-semibold mb-2 tracking-tight">
          Clip <span className="font-mono">{code}</span>
        </h1>
        <p className="text-sm text-black/50 dark:text-white/50 mb-8 max-w-xs">
          This page is coming soon. The full file list and download UI will appear here.
        </p>
        <Link
          href="/clip"
          className="text-sm underline text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
        >
          ← Try a different code
        </Link>
      </main>

      <footer className="border-t border-black/10 dark:border-white/10 px-6 py-5 text-center text-xs text-black/35 dark:text-white/35">
        FileClip · Files expire automatically · No account required
      </footer>
    </div>
  )
}
