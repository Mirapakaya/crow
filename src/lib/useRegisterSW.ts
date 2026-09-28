'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseRegisterSWReturn {
  needRefresh: boolean
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  setNeedRefresh: (value: boolean) => void
}

export function useRegisterSW(): UseRegisterSWReturn {
  const [needRefresh, setNeedRefresh] = useState(false)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let current: ServiceWorker | null = null

    const handleUpdate = (worker: ServiceWorker) => {
      const onStateChange = () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = worker
          setNeedRefresh(true)
        }
      }
      worker.addEventListener('statechange', onStateChange)
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        current = registration.installing
        if (current) handleUpdate(current)
      })
    })
  }, [])

  const updateServiceWorker = useCallback(async (reloadPage = true) => {
    const worker = waitingWorkerRef.current
    if (worker?.state === 'installed') {
      try {
        worker.postMessage({ type: 'SKIP_WAITING' })
      } catch {
        // ignore
      }
    }
    setNeedRefresh(false)
    if (reloadPage) window.location.reload()
  }, [])

  return { needRefresh, updateServiceWorker, setNeedRefresh }
}
