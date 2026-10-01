import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Legal — Crow',
  description: 'Legal information for the Crow messenger.',
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 512 512" fill="none" aria-hidden="true">
              <rect width="512" height="512" rx="96" fill="currentColor" opacity="0.1" />
              <path d="M256 120c-68 0-123 44-143 108 0 0 5 96 143 184 138-88 143-184 143-184-20-64-75-108-143-108z" fill="currentColor" />
              <path d="M256 160c-47 0-86 28-98 68 0 0 3 61 98 118 95-57 98-118 98-118-12-40-51-68-98-68z" fill="var(--background, #09090b)" />
            </svg>
            Crow
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 prose prose-sm prose-invert dark:prose-invert light:prose-neutral">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <a href="/" className="underline underline-offset-2 hover:text-foreground">
          Back to Crow
        </a>
      </footer>
    </div>
  )
}
