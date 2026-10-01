import type { CSSProperties, ReactNode } from 'react'

interface SkeletonProps {
  /** Number of skeleton rows/items to render. */
  count?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
  /** Whether the skeleton should pulse; false for static placeholders. */
  animate?: boolean
}

/**
 * Accessible loading placeholder.
 *
 * Uses `aria-busy` and `aria-label` so screen readers announce that content
 * is loading, while a subtle pulse animation shows progress to sighted users.
 * Respects `prefers-reduced-motion` through CSS.
 */
export function Skeleton({ count = 1, className = '', style, children, animate = true }: SkeletonProps) {
  const base = `skeleton ${animate ? 'skeleton-pulse' : ''} ${className}`.trim()
  if (children) {
    return (
      <span className={base} style={style} aria-busy="true" aria-label="Loading…">
        {children}
      </span>
    )
  }
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className={base} style={style} aria-busy="true" aria-label="Loading…" />
      ))}
    </>
  )
}
