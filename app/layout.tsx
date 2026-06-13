import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FileClip — Share files instantly",
  description: "Upload files, get a short code, share with anyone. No accounts needed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        TUTORIAL NOTE — Theme Script:
        This script runs synchronously before React renders anything.
        It reads the saved theme from localStorage and applies the `dark`
        class to <html> immediately, so there is no flash of the wrong
        theme when the page loads or when navigating between routes.

        strategy="beforeInteractive" tells Next.js to inject this into
        <head> and execute it before any JavaScript hydrates.
      */}
      <head>
        <Script
          id="theme-restore"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `
            (function() {
              try {
                var stored = localStorage.getItem('fileclip-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (stored === 'dark' || (!stored && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            })();
          `}}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
