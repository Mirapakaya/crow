import type { ReactNode } from 'react'
import { DisplayControls } from './DisplayControls'
import { Shield } from 'lucide-react'

export function EntryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-contain">
      <div className="flex w-full max-w-[25rem] mx-auto items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-0 shrink-0">
        <Brand />
        <DisplayControls />
      </div>
      <div className="flex flex-1 flex-col justify-center w-full max-w-[25rem] mx-auto px-4 pb-[3rem] gap-4">
        {children}
      </div>
    </div>
  )
}

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--text)] select-none" dir="ltr">
      <span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)]" aria-hidden="true">
        <Shield size={13} strokeWidth={2.5} />
      </span>
      Crow
    </span>
  )
}
