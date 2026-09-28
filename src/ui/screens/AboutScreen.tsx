import { useI18n } from '../../i18n'
import { SettingsPage } from './SettingsPage'
import { APP_VERSION, BUILD_TIME, SOURCE_URL } from '../../crow/meta'
import { useApp } from '../../crow/store'
import { relayLabel } from '../../core/transport/relayUrl'
import { useAboutText } from './aboutText'
import { Card } from '@/components/ui/card'

/**
 * "What leaves your device".
 *
 * A privacy claim nobody can check is just marketing. This page states, in
 * plain language, every network destination the app talks to and what each one
 * can observe — including the parts that are uncomfortable, like the IP address
 * a direct connection reveals and the absence of forward secrecy.
 */
export function AboutScreen() {
  const { t } = useI18n()
  const about = useAboutText()
  // Filtered here, not in the selector: a selector that returns a new array
  // on every call never settles, and React gives up on the screen.
  const relays = useApp((s) => s.relayEntries).filter((entry) => entry.enabled)

  const sections: { title: string; body: string; extra?: string[] }[] = [
    {
      title: about('relaysTitle'),
      body: about('relaysBody'),
      extra: [about('relaysSee'), about('relaysCannot')],
    },
    { title: about('hostTitle'), body: about('hostBody') },
    { title: about('directTitle'), body: about('directBody') },
    { title: about('stunTitle'), body: about('stunBody') },
    { title: about('deviceTitle'), body: t('privacy.deviceBody') },
  ]

  return (
    <SettingsPage title={about('title')}>
      <p className="text-muted-foreground">{t('privacy.intro')}</p>

      {sections.map((section) => (
        <Card key={section.title} className="p-4 flex flex-col gap-2">
          <h3 className="text-base">{section.title}</h3>
          <p className="text-muted-foreground text-xs">{section.body}</p>
          {section.extra?.map((line) => (
            <p key={line} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
        </Card>
      ))}

      {relays.length > 0 ? (
        <Card className="p-4 flex flex-col gap-2">
          <h3 className="text-base">{t('settings.relays')}</h3>
          <p className="text-sm text-muted-foreground" dir="ltr" lang="en">
            {relays.map((entry) => relayLabel(entry.url)).join(' · ')}
          </p>
        </Card>
      ) : null}

      <Card className="p-4 flex flex-col gap-2">
        <h3 className="text-base text-warning">{about('limitsTitle')}</h3>
        <ul className="flex flex-col gap-2 text-muted-foreground text-xs pl-[1.1rem]">
          <li>{about('limitsForwardSecrecy')}</li>
          <li>{about('limitsMetadata')}</li>
          <li>{about('limitsNoPush')}</li>
          <li>{about('limitsXss')}</li>
        </ul>
      </Card>

      <Card className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{t('settings.version')}</span>
          <code className="font-mono text-xs">{APP_VERSION}</code>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{t('settings.sourceCode')}</span>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer noopener">
            github
          </a>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{t('settings.licence')}</span>
          <span className="font-mono text-xs">AGPL-3.0-or-later</span>
        </div>
        <p className="text-sm text-muted-foreground" dir="ltr" lang="en">
          {BUILD_TIME}
        </p>
      </Card>
    </SettingsPage>
  )
}
