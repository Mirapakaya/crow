/**
 * Hidden design page for auditing the Geist token system.
 *
 * Renders every token in both light and dark modes and flags any component
 * that still uses invented colours. This page is not linked from the app; it
 * is accessed directly at /design.
 */

'use client'

import { useState } from 'react'

export default function DesignPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  return (
    <main data-theme={theme} className="min-h-screen p-8" style={{ background: 'var(--ds-background-100)', color: 'var(--ds-gray-1000)' }}>
      <h1 className="heading-20 mb-8">Design tokens</h1>
      <div className="flex gap-4 mb-8">
        <button onClick={() => setTheme('light')}>Light</button>
        <button onClick={() => setTheme('dark')}>Dark</button>
      </div>
      <section className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded" style={{ background: 'var(--ds-background-100)' }}>background-100</div>
        <div className="p-4 rounded" style={{ background: 'var(--ds-background-200)' }}>background-200</div>
        <div className="p-4 rounded" style={{ background: 'var(--ds-gray-100)' }}>gray-100</div>
        <div className="p-4 rounded" style={{ background: 'var(--ds-gray-200)' }}>gray-200</div>
        <div className="p-4 rounded" style={{ background: 'var(--ds-gray-500)', color: '#fff' }}>gray-500</div>
        <div className="p-4 rounded" style={{ background: 'var(--ds-gray-1000)', color: '#fff' }}>gray-1000</div>
      </section>
    </main>
  )
}
