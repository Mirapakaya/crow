import { useRef, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { nextSegmentIndex } from './segmentedNav'
import { cn } from '../../lib/utils'

export interface Segment<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  title?: string
}

/**
 * A row of mutually exclusive options.
 *
 * Built on the ARIA radiogroup pattern:
 *  - the group is one tab stop (roving tabindex)
 *  - arrow keys move between options and select as they go
 *  - screen readers announce "Dark, radio button, 3 of 3"
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  compact = false,
}: {
  value: T
  options: readonly Segment<T>[]
  onChange: (next: T) => void
  label: string
  compact?: boolean
}) {
  const { dir } = useI18n()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const select = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    buttons.current[index]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const target = nextSegmentIndex(event.key, index, options.length, dir)
    if (target === null) return
    event.preventDefault()
    select(target)
  }

  const selected = options.findIndex((option) => option.value === value)

  return (
    <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5" role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (selected === -1 && index === 0) ? 0 : -1}
            {...(option.title
              ? { 'aria-label': option.title, title: option.title }
              : compact
                ? { 'aria-label': option.label, title: option.label }
                : {})}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              checked
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              compact && 'px-2 py-1',
            )}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.icon}
            {compact && option.icon ? null : <span>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
