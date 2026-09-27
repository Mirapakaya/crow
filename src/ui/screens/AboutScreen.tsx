import { useI18n } from '../../i18n'
import { SettingsPage } from './SettingsPage'
import { APP_VERSION, BUILD_TIME, SOURCE_URL } from '../../app/meta'
import { useApp } from '../../app/store'
import { relayLabel } from '../../core/transport/relayUrl'
import { AlertTriangle } from 'lucide-react'

export function AboutScreen() {
  const { t } = useI18n()
  const relays = useApp((s) => s.relayEntries).filter((entry) => entry.enabled)

  const sections: { title: string; body: string; extra?: string[] }[] = [
    {
      title: t('privacy.relaysTitle'),
      body: t('privacy.relaysBody'),
      extra: [t('privacy.relaysSee'), t('privacy.relaysCannot')],
    },
    { title: t('privacy.hostTitle'), body: t('privacy.hostBody') },
    { title: t('privacy.directTitle'), body: t('privacy.directBody') },
    { title: t('privacy.stunTitle'), body: t('privacy.stunBody') },
    { title: t('privacy.deviceTitle'), body: t('privacy.deviceBody') },
  ]

  return (
    <SettingsPage title={t('privacy.title')}>
      <p className="text-sm text-[var(--text-muted)]">{t('privacy.intro')}</p>

      {sections.map((section) => (
        <div key={section.title} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">{section.title}</h3>
          <p className="text-xs text-[var(--text-muted)]">{section.body}</p>
          {section.extra?.map((line) => (
            <p key={line} className="text-xs text-[var(--text-muted)]">
              {line}
            </p>
          ))}
        </div>
      ))}

      {relays.length > 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">{t('settings.relays')}</h3>
          <p className="font-mono text-xs text-[var(--text-muted)]" dir="ltr" lang="en">
            {relays.map((entry) => relayLabel(entry.url)).join(' · ')}
          </p>
        </div>
      ) : null}

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--warning)]">
          <AlertTriangle size={16} />
          {t('privacy.limitsTitle')}
        </h3>
        <ul className="flex flex-col gap-2 text-xs text-[var(--text-muted)] list-disc ps-4">
          <li>{t('privacy.limitsForwardSecrecy')}</li>
          <li>{t('privacy.limitsMetadata')}</li>
          <li>{t('privacy.limitsNoPush')}</li>
          <li>{t('privacy.limitsXss')}</li>
        </ul>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">{t('settings.version')}</span>
          <code className="font-mono text-xs">{APP_VERSION}</code>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">{t('settings.sourceCode')}</span>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer noopener" className="text-[var(--accent-text)] hover:text-[var(--accent)] underline underline-offset-2">
            github
          </a>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">{t('settings.licence')}</span>
          <span className="font-mono text-xs">AGPL-3.0-or-later</span>
        </div>
        <p className="font-mono text-xs text-[var(--text-muted)]" dir="ltr" lang="en">
          {BUILD_TIME}
        </p>
      </div>
    </SettingsPage>
  )
}
