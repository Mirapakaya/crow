import { useEffect } from 'react'
import { useApp } from './store'
import { useNavigate } from './router'

/**
 * Global keyboard shortcuts for the app shell.
 *
 * These only fire when no input, textarea, or select is focused — typing in a
 * field must never trigger a shortcut. The modifier is Ctrl on Windows/Linux
 * and ⌘ (meta) on macOS; the `isMod` helper handles both.
 */

const isMod = (e: KeyboardEvent): boolean =>
  e.metaKey || e.ctrlKey

const isEditable = (e: KeyboardEvent): boolean => {
  const tag = (e.target as HTMLElement)?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    || (e.target as HTMLElement)?.isContentEditable === true
}

export function useKeyboardShortcuts(): void {
  const navigate = useNavigate()
  const lock = useApp((s) => s.lock)
  const phase = useApp((s) => s.phase)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e)) return

      // ⌘/Ctrl + 1–3 — switch tabs
      if (isMod(e) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') { e.preventDefault(); navigate({ name: 'chats' }) }
        if (e.key === '2') { e.preventDefault(); navigate({ name: 'contacts' }) }
        if (e.key === '3') { e.preventDefault(); navigate({ name: 'settings' }) }
      }

      // Escape — go back or lock
      if (e.key === 'Escape') {
        // If the app is ready and the event reaches the shell (nothing else
        // caught it — no open modal, menu, or dialog), lock the vault.
        if (phase === 'ready' && isMod(e)) {
          e.preventDefault()
          lock()
        }
      }
    }

    addEventListener('keydown', onKeyDown, true)
    return () => removeEventListener('keydown', onKeyDown, true)
  }, [navigate, lock, phase])
}
