import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CloseIcon, ContactsIcon } from './Icons'
import { useT } from '../../i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Deterministic avatar colour from a public key — stable across devices. */
export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  // Fixed saturation and lightness keep contrast with white text predictable.
  return `hsl(${Math.abs(hash) % 360} 46% 42%)`
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = [...(words[0] as string)][0] ?? '?'
  if (words.length === 1) return first.toUpperCase()
  const second = [...(words[words.length - 1] as string)][0] ?? ''
  return (first + second).toUpperCase()
}

const avatarSizeClasses = {
  sm: 'w-[1.875rem] h-[1.875rem] text-[0.68rem]',
  md: 'w-10 h-10 text-[0.9rem]',
  lg: 'w-16 h-16 text-lg',
}

/**
 * A group's avatar: a group has no picture of its own, and initials of a name
 * several people chose would read as a person. The people glyph says "group"
 * at a glance in the list; the colour still comes from the group's id so each
 * one is recognisable.
 */
export function GroupAvatar({ seed, size = 'md' }: { seed: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        avatarSizeClasses[size],
      )}
      style={{ background: avatarColor(seed) }}
      aria-hidden="true"
    >
      <ContactsIcon size={size === 'lg' ? 30 : size === 'sm' ? 15 : 19} />
    </div>
  )
}

export function Avatar({
  name,
  seed,
  src,
  size = 'md',
}: {
  name: string
  seed: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  if (src) {
    return (
      <div className={cn('shrink-0 overflow-hidden rounded-full', avatarSizeClasses[size])}>
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        avatarSizeClasses[size],
      )}
      style={{ background: avatarColor(seed) }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </span>
  )
}

const bannerToneClasses: Record<string, string> = {
  info: 'bg-card border-border text-foreground',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
  danger: 'bg-destructive/10 border-destructive/40 text-destructive',
  accent: 'bg-primary/10 border-primary/30 text-primary',
}

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'accent'
  children: ReactNode
}) {
  return (
    <div
      className={cn('flex items-start gap-3 rounded-md border p-3 text-sm', bannerToneClasses[tone])}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      {children}
    </div>
  )
}

export function Field({
  label: labelText,
  hint,
  error,
  children,
}: {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      {labelText ? <span className="text-sm font-medium text-muted-foreground">{labelText}</span> : null}
      {children}
      {error ? (
        <span className="text-sm text-destructive" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-sm text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}

/**
 * Accessible modal: focus moves in on open and returns on close, Escape
 * dismisses, and a click on the backdrop dismisses. Focus is trapped so
 * keyboard users cannot tab into the inert page behind it. Focus lands on the
 * element marked `data-autofocus` when there is one — a question whose answers
 * destroy something starts on the one that does not.
 */
export function Modal({
  title,
  onClose,
  children,
  labelledBy = 'modal-title',
  closable = true,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  /** False for a question, whose own answers include not going ahead. */
  closable?: boolean
}) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null
    const node = ref.current
    const focusable = node?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    ;(node?.querySelector<HTMLElement>('[data-autofocus]') ?? focusable?.[0])?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !node) return
      const items = [
        ...node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ]
      if (items.length === 0) return
      const first = items[0] as HTMLElement
      const last = items[items.length - 1] as HTMLElement
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      restoreTo.current?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={ref}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={labelledBy} className="text-base font-semibold">
            {title}
          </h2>
          {closable ? (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('common.close')}>
              <CloseIcon />
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <label
      className="flex items-center justify-between gap-3 px-4 py-3"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <input
        className="h-4 w-4 shrink-0 accent-primary"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      {body ? (
        <p className="max-w-[28rem] text-sm text-muted-foreground">{body}</p>
      ) : null}
      {action}
    </div>
  )
}

/** Copy-to-clipboard button with a transient confirmation label. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const t = useT()
  const [copied, setCopied] = useCopyState()
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied()
        } catch {
          // Clipboard access can be denied; the value is always visible and
          // selectable next to the button, so there is nothing to recover from.
        }
      }}
    >
      {copied ? t('common.copied') : (label ?? t('common.copy'))}
    </Button>
  )
}

/** Shows "Copied" for a moment, then reverts. Cleans up on unmount. */
function useCopyState(): [boolean, () => void] {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const flash = useCallback(() => {
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1800)
  }, [])

  return [copied, flash]
}
