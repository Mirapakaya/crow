import type { ReactNode } from 'react'
import { DisplayControls } from './DisplayControls'
import { LockIcon } from './Icons'

/**
 * Chrome shared by every screen shown before the vault is open: welcome,
 * onboarding, restore, and lock.
 *
 * The bar holds the wordmark and the language and theme switches. Putting them
 * here rather than on each screen means there is no state of the app in which
 * someone can see the interface but not change its language — which, for an app
 * whose first audience reads Persian, is the difference between usable and not.
 */
export function EntryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="flex items-center justify-between gap-3 w-full max-w-[25rem] mx-auto px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Brand />
        <DisplayControls />
      </div>
      <div className="flex flex-col flex-1 justify-center w-full max-w-[25rem] mx-auto px-4 pb-12 gap-4">{children}</div>
    </div>
  )
}

/**
 * Wordmark. The name is never translated — it is the product — so it is pinned
 * to LTR and to the Latin face even when the surrounding page is Persian.
 */
export function Brand() {
  return (
    <span className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-foreground select-none" dir="ltr">
      <span className="grid place-items-center w-6 h-6 rounded-sm bg-primary text-primary-foreground shrink-0" aria-hidden="true">
        <LockIcon size={13} />
      </span>
      Crow
    </span>
  )
}
