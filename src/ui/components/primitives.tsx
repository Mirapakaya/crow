import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Users, X } from 'lucide-react'
import { useT } from '../../i18n'
import { cn } from '../../lib/utils'

/** Deterministic avatar colour from a public key — stable across devices. */
export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
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

/**
 * A group's avatar: a group has no picture of its own, and initials of a name
 * several people chose would read as a person. The people glyph says "group"
 * at a glance in the list; the colour still comes from the group's id so each
 * one is recognisable.
 */
export function GroupAvatar({ seed, size = 'md' }: { seed: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-12 text-lg' : 'size-10 text-sm'
  return (
    <div
      className={cn('flex items-center justify-center rounded-full font-semibold text-white shrink-0', sizeClass)}
      style={{ background: avatarColor(seed) }}
      aria-hidden="true"
    >
      <Users size={size === 'lg' ? 30 : size === 'sm' ? 15 : 19} />
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
  const sizeClass = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-12 text-lg' : 'size-10 text-sm'
  if (src) {
    return (
      <div className={cn('flex items-center justify-center rounded-full overflow-hidden shrink-0', sizeClass)}>
        <img src={src} alt="" className="size-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className={cn('flex items-center justify-center rounded-full font-semibold text-white shrink-0 select-none', sizeClass)}
      style={{ background: avatarColor(seed) }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-4 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-transparent" />
      {label ? <span className="text-xs text-[var(--text-muted)]">{label}</span> : null}
    </span>
  )
}

const BANNER_TONES: Record<string, string> = {
  info: 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)]',
  warning: 'bg-[var(--warning-soft)] border-[color-mix(in_srgb,var(--warning)_28%,transparent)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft)] border-[color-mix(in_srgb,var(--danger)_28%,transparent)] text-[var(--danger)]',
  accent: 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-text)]',
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
      className={cn('flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm', BANNER_TONES[tone])}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      {children}
    </div>
  )
}

export function Field({
  label,
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
    <div className="flex flex-col gap-1.5">
      {label ? <label className="text-sm font-medium text-[var(--text)]">{label}</label> : null}
      {children}
      {error ? (
        <span className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-[var(--text-muted)]">{hint}</span>
      ) : null}
    </div>
  )
}

/**
 * Accessible modal: focus moves in on open and returns on close, Escape
 * dismisses, and a click on the backdrop dismisses. Focus is trapped so
 * keyboard users cannot tab into the inert page behind it.
 */
export function Modal({
  title,
  onClose,
  children,
  labelledBy = 'modal-title',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  labelledBy?: string
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
    focusable?.[0]?.focus()

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={ref}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id={labelledBy} className="text-lg font-semibold text-[var(--text)]">
            {title}
          </h2>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
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
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-[var(--text)]">{label}</span>
        {description ? (
          <span className="block mt-0.5 text-xs text-[var(--text-muted)]">{description}</span>
        ) : null}
      </span>
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => { if (!disabled) onChange(!checked) }}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]',
          disabled && 'opacity-50',
        )}
      >
        <span
          className={cn(
            'pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </label>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      {body ? (
        <p className="text-sm text-[var(--text-muted)] max-w-md">{body}</p>
      ) : null}
      {action}
    </div>
  )
}

/** Copy-to-clipboard button with a transient confirmation label. */
export function CopyButton({
  value,
  label,
  className = '',
}: {
  value: string
  label?: string
  className?: string
}) {
  const t = useT()
  const [copied, setCopied] = useCopyState()
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors',
        className,
      )}
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
    </button>
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
