import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { goBack } from '../../app/router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/button'

export function SettingsPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <Button
          variant="ghost"
          size="icon"
          className="btn-back shrink-0"
          aria-label={t('common.back')}
          onClick={() => goBack({ name: 'settings' })}
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{title}</h1>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[34rem] flex flex-col gap-4 p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
