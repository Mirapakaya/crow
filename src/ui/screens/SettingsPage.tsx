import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { goBack } from '../../crow/router'
import { BackIcon } from '../components/Icons'
import { Button } from '../components/ui/button'

/**
 * The frame every settings screen sits in: a back button and a title. Its own
 * module because the settings screens live in two chunks — Security travels
 * with the rest of the unlock setup (ADR-054) — and both need it.
 */
export function SettingsPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="screen">
      <header className="app-header">
        <Button
          size="icon" variant="ghost"
          aria-label={t('common.back')} title={t('common.back')}
          onClick={() => goBack({ name: 'settings' })}
        >
          <BackIcon />
        </Button>
        <h1 className="grow">{title}</h1>
      </header>
      <div className="screen-scroll">
        <div className="container stack" style={{ maxWidth: '34rem' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
