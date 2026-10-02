'use client'

import { StrictMode } from 'react'
import { App } from '@/crow/App'
import { ErrorBoundary } from '@/crow/ErrorBoundary'
import { applyDisplayPrefs, isLocale, isTheme } from '@/crow/displayPrefs'
import { detectLocale } from '@/i18n'
import type { LocaleCode, ThemePreference } from '@/core/models/types'

if (typeof window !== 'undefined' && window.top !== window.self) {
  document.documentElement.textContent = 'Crow refuses to run inside a frame. Open it in its own tab.'
  throw new Error('refusing to run framed')
}

if (typeof window !== 'undefined') {
  let stored: { locale?: string; theme?: string } = {}
  try {
    stored = JSON.parse(localStorage.getItem('crow:display') || '{}')
  } catch {
    /* storage can be blocked or corrupted; fall back to defaults */
  }
  applyDisplayPrefs({
    locale: (isLocale(stored.locale) ? stored.locale : detectLocale()) as LocaleCode,
    theme: (isTheme(stored.theme) ? stored.theme : 'system') as ThemePreference,
  })
}

export default function CrowRoot() {
  return (
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
}
