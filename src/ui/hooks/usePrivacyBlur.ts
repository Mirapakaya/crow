import { useEffect, useState } from 'react'

/**
 * Blur the app content when the tab loses visibility or the vault locks.
 * Users can disable this in settings via `privacy.blurOnLock`.
 */
export function usePrivacyBlur(enabled: boolean): boolean {
  const [blurred, setBlurred] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const onVisibility = () => setBlurred(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [enabled])

  return blurred
}
