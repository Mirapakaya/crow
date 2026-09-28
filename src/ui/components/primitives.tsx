import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Users, Copy, Check } from 'lucide-react'
import { useT } from '../../i18n'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Avatar as ShadcnAvatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Label } from './ui/label'
import { Skeleton } from './ui/skeleton'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { cn } from '@/lib/utils'

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
  const sizeClass = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-[var(--accent-fg)]',
        sizeClass,
      )}
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
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
  return (
    <ShadcnAvatar className={sizeClass}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback style={{ background: avatarColor(seed), color: 'var(--accent-fg)' }}>
        {initials(name)}
      </AvatarFallback>
    </ShadcnAvatar>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="row" style={{ gap: '0.5rem' }}>
      <span
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--surface-3)] border-t-[var(--accent)]"
        aria-hidden="true"
      />
      {label ? <span className="muted small">{label}</span> : null}
    </span>
  )
}

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'accent'
  children: ReactNode
}) {
  const toneClass =
    tone === 'warning'
      ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
      : tone === 'danger'
        ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
        : tone === 'accent'
          ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
          : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
  return (
    <div
      className={cn('rounded-md px-4 py-3 text-sm', toneClass)}
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
    <div className="field space-y-2">
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  labelledBy,
  closable,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  closable?: boolean
}) {
  void labelledBy
  void closable
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
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
      className="row-between"
      style={{ padding: 'var(--space-3) var(--space-4)', cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span className="grow">
        <span style={{ display: 'block', fontWeight: 'var(--weight-medium)' }}>{label}</span>
        {description ? (
          <span className="hint" style={{ display: 'block', marginTop: 'var(--space-0-5)' }}>
            {description}
          </span>
        ) : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
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
    <Card className="empty">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {body ? <CardDescription>{body}</CardDescription> : null}
      </CardHeader>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
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
    <Button
      variant="outline"
      size="sm"
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
      {copied ? <Check size={16} /> : <Copy size={16} />}
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

export { Skeleton }
