'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'info' | 'danger' | 'warning' | 'success'

export interface ToastItem {
  id: string | number
  message: string
  tone?: ToastTone
}

export interface ToasterProps {
  toasts: ToastItem[]
  onDismiss: (id: string | number) => void
}

export function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex min-w-[18rem] max-w-md items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
            toast.tone === 'danger'
              ? 'border-destructive/30 bg-destructive text-destructive-foreground'
              : toast.tone === 'warning'
                ? 'border-warning/30 bg-warning/10 text-warning'
                : toast.tone === 'success'
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-border bg-popover text-popover-foreground',
          )}
        >
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded p-1 text-current opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
