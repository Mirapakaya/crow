import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { goBack } from '../../crow/router'
import { BackIcon } from '../components/Icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * The frame every settings screen sits in: a back button and a title. Its own
 * module because the settings screens live in two chunks — Security travels
 * with the rest of the unlock setup (ADR-054) — and both need it.
 */
export function SettingsPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <header className="flex items-center gap-2 min-h-[3.25rem] px-3 py-2 bg-card border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common.back')}
          onClick={() => goBack({ name: 'settings' })}
        >
          <BackIcon />
        </Button>
        <h1 className="flex-1 min-w-0 text-base font-semibold">{title}</h1>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className={cn('w-full max-w-2xl mx-auto p-4 flex flex-col gap-4')} style={{ maxWidth: '34rem' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
