import { useRef, type MouseEvent, type PointerEvent } from 'react'

/** How long a finger rests on a message before its menu opens: about the platforms' own figure. */
export const HOLD_MS = 450
/** How far it may drift and still be holding rather than scrolling. */
const SLOP_PX = 10

/**
 * A message's menu, opened the way a phone opens one — by holding a finger on
 * it — and, with a mouse, by the right button.
 *
 * iOS fires no `contextmenu` for a long press, so the hold is timed here.
 * Android fires one as well, and opening an open menu again changes nothing.
 * The click a lifted finger can still produce is swallowed, so a hold on a
 * reaction or a poll option does not also press it. A right click on a link,
 * a picture or a selection is left to the browser: its menu is the one wanted
 * there. A finger gets this menu wherever it holds.
 */
export function useHold(open: (at: HTMLElement) => void) {
  const timer = useRef(0)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const held = useRef(false)
  const cancel = () => {
    clearTimeout(timer.current)
    origin.current = null
  }

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      cancel()
      held.current = false
      if (event.pointerType === 'mouse') return
      const at = event.currentTarget
      origin.current = { x: event.clientX, y: event.clientY }
      timer.current = window.setTimeout(() => {
        origin.current = null
        held.current = true
        open(at)
      }, HOLD_MS)
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const from = origin.current
      if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > SLOP_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!held.current) return
      held.current = false
      event.preventDefault()
      event.stopPropagation()
    },
    onContextMenu(event: MouseEvent<HTMLElement>) {
      // A finger is down, or has just held: Android's own long press.
      const touch = origin.current !== null || held.current
      const target = event.target as Element
      const native = target.closest('a[href]:not(.bubble-quote), img, video') || String(getSelection() ?? '')
      if (native && !touch) return
      event.preventDefault()
      cancel()
      open(event.currentTarget)
    },
  }
}
