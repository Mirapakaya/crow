'use client'

import { StrictMode } from 'react'
import { App } from '@/crow/App'
import { ErrorBoundary } from '@/crow/ErrorBoundary'
import { applyDisplayPrefs, loadDisplayPrefs } from '@/crow/displayPrefs'
import { detectLocale } from '@/i18n'
import { browserWarmupEnvironment, warmLazyChunks } from '@/crow/warmup'
import { LAZY_CHUNKS } from '@/ui/lazyViews'

/**
 * Frame guard.
 *
 * A messenger inside a hostile iframe is a clickjacking target: an attacker
 * could overlay their own UI and trick someone into revealing a recovery phrase
 * or sending a message. The usual defence is CSP `frame-ancestors`, but
 * browsers ignore that directive when it arrives in a <meta> element — and a
 * static host cannot set response headers. So the check is done here instead.
 */
if (typeof window !== 'undefined' && window.top !== window.self) {
  document.documentElement.textContent = 'Crow refuses to run inside a frame. Open it in its own tab.'
  throw new Error('refusing to run framed')
}

// Apply display preferences as early as possible before the first React render.
if (typeof window !== 'undefined') {
  const stored = loadDisplayPrefs()
  applyDisplayPrefs({ locale: stored.locale ?? detectLocale(), theme: stored.theme ?? 'system' })
}

void warmLazyChunks(
  Object.values(LAZY_CHUNKS),
  browserWarmupEnvironment({ serviceWorker: process.env.NODE_ENV === 'production' }),
)

export default function CrowRoot() {
  return (
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
}
