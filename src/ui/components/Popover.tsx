import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'
import { cn } from '../../lib/utils'

const MARGIN = 8
const OFFSET = 4

export interface PopoverProps {
  anchor: HTMLElement | null
  onClose: () => void
  children: ReactNode
  label: string
  className?: string
}

interface Placement {
  left: number
  top: number
  above: boolean
}

export function Popover({ anchor, onClose, children, label, className }: PopoverProps) {
  const { dir } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)

  const reposition = useCallback(() => {
    const panel = panelRef.current
    if (!anchor || !panel) return

    const trigger = anchor.getBoundingClientRect()
    const { width, height } = panel.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight

    const below = trigger.bottom + OFFSET
    const roomBelow = viewportHeight - below - MARGIN
    const roomAbove = trigger.top - OFFSET - MARGIN
    const above = roomBelow < height && roomAbove > roomBelow
    let top = above ? trigger.top - height - OFFSET : below

    let left = dir === 'rtl' ? trigger.left : trigger.right - width

    left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, viewportWidth - width - MARGIN))
    top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, viewportHeight - height - MARGIN))

    setPlacement({ left, top, above })
  }, [anchor, dir])

  useLayoutEffect(reposition, [reposition])

  useEffect(() => {
    const onScroll = () => reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [reposition])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => reposition())
    observer.observe(panel)
    return () => observer.disconnect()
  }, [reposition])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || anchor?.contains(target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        anchor?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [anchor, onClose])

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [])

  return createPortal(
    <div
      ref={panelRef}
      className={cn(
        'fixed z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg',
        'data-[above=true]:animate-in data-[above=true]:fade-in-0 data-[above=true]:slide-in-from-bottom-2',
        'data-[above=false]:animate-in data-[above=false]:fade-in-0 data-[above=false]:slide-in-from-top-2',
        className,
      )}
      role="menu"
      aria-label={label}
      data-above={placement?.above ? 'true' : 'false'}
      style={{
        left: placement?.left ?? 0,
        top: placement?.top ?? 0,
        visibility: placement ? 'visible' : 'hidden',
      }}
      onKeyDown={(event) => {
        const items = [...(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
        if (items.length === 0) return
        const index = items.indexOf(document.activeElement as HTMLElement)
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          items[(index + 1) % items.length]?.focus()
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          items[(index - 1 + items.length) % items.length]?.focus()
        }
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
