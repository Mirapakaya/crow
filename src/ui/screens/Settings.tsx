import { useApp } from '../../crow/store'
import { useI18n, LOCALE_NAMES } from '../../i18n'
import { useNavigate, useRoute, type Route } from '../../crow/router'
import { Avatar, Banner, Field, Toggle } from '../components/primitives'
import {
  ChevronIcon,
  GlobeIcon,
  LockIcon,
  MonitorIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  DownloadIcon,
  PhoneIcon,
} from '../components/Icons'
import { SegmentedControl } from '../components/SegmentedControl'
import { SettingsPage } from './SettingsPage'
import type { LocaleCode, ThemePreference } from '../../core/models/types'
import { APP_VERSION, SOURCE_URL } from '../../crow/meta'
import { useAboutText } from './aboutText'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function SettingsHome() {
  const { t } = useI18n()
  const identity = useApp((s) => s.identity)
  const settings = useApp((s) => s.settings)
  const saveSettings = useApp((s) => s.saveSettings)
  const updateProfile = useApp((s) => s.updateProfile)
  const lock = useApp((s) => s.lock)
  const toast = useApp((s) => s.toast)

  if (!identity) return null

  const pickAvatar = async (file: File) => {
    if (file.size > 1024 * 1024) {
      toast(t('settings.avatarTooLarge'), 'danger')
      return
    }
    const dataUri = await downscaleToDataUri(file, 192)
    if (!dataUri) {
      toast(t('errors.generic'), 'danger')
      return
    }
    await updateProfile({ avatar: dataUri })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <header className="flex items-center gap-2 min-h-[3.25rem] px-3 py-2 bg-card border-b border-border">
        <h1 className="flex-1 min-w-0 text-base font-semibold">{t('settings.title')}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className={cn('w-full max-w-2xl mx-auto p-4 flex flex-col gap-4')} style={{ maxWidth: '34rem' }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {t('settings.profile')}
          </span>
          <Card className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={identity.name} seed={identity.pubkey} src={identity.avatar} size="lg" />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <span className="font-semibold" dir="auto">{identity.name}</span>
                <code className="font-mono text-sm text-muted-foreground/70 break-all" dir="ltr">
                  {identity.npub}
                </code>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.profileBody')}</p>

            {/*
              Uncontrolled and keyed by the stored value: the vault is the
              source of truth, edits commit on blur, and a profile update from
              anywhere else re-seeds the field by remounting it. Mirroring the
              identity into component state instead would mean a setState in an
              effect and a render cascade on every keystroke elsewhere.
            */}
            <Field label={t('settings.displayName')}>
              <Input
                key={`name:${identity.name}`}
                defaultValue={identity.name}
                maxLength={64}
                onBlur={(event) => {
                  const next = event.target.value.trim()
                  if (next && next !== identity.name) void updateProfile({ name: next })
                }}
              />
            </Field>

            <Field label={t('settings.about')}>
              <Input
                key={`about:${identity.about}`}
                defaultValue={identity.about}
                maxLength={200}
                onBlur={(event) => {
                  if (event.target.value !== identity.about) void updateProfile({ about: event.target.value })
                }}
              />
            </Field>

            <div className="flex items-center gap-3">
              <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                {t('settings.avatarChoose')}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void pickAvatar(file)
                  }}
                />
              </label>
              {identity.avatar ? (
                <Button variant="ghost" onClick={() => void updateProfile({ avatar: undefined })}>
                  {t('settings.avatarRemove')}
                </Button>
              ) : null}
            </div>
          </Card>

          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {t('settings.appearance')}
          </span>
          <Card className="p-0 overflow-hidden divide-y divide-border">
            <div className="py-3 px-4">
              <Field label={t('settings.language')}>
                <Select
                  value={settings.locale}
                  onChange={(event) => void saveSettings({ locale: event.target.value as LocaleCode })}
                >
                  {(Object.keys(LOCALE_NAMES) as LocaleCode[]).map((code) => (
                    <option key={code} value={code}>
                      {LOCALE_NAMES[code]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="py-3 px-4">
              {/* The same control as on the entry screens, so the theme switch
                  looks and behaves identically wherever it is met. */}
              <Field label={t('settings.theme')}>
                <SegmentedControl
                  label={t('settings.theme')}
                  value={settings.theme}
                  options={[
                    { value: 'system', label: t('settings.themeSystem'), icon: <MonitorIcon size={15} /> },
                    { value: 'light', label: t('settings.themeLight'), icon: <SunIcon size={15} /> },
                    { value: 'dark', label: t('settings.themeDark'), icon: <MoonIcon size={15} /> },
                  ]}
                  onChange={(theme: ThemePreference) => void saveSettings({ theme })}
                />
              </Field>
            </div>
            <Toggle
              label={t('settings.enterToSend')}
              checked={settings.enterToSend}
              onChange={(enterToSend) => void saveSettings({ enterToSend })}
            />
          </Card>

          <Card className="p-0 overflow-hidden divide-y divide-border">
            <NavRow
              icon={<GlobeIcon size={18} />}
              label={t('settings.relays')}
              to={{ name: 'settings-relays' }}
            />
            <NavRow
              icon={<ShieldIcon size={18} />}
              label={t('settings.privacy')}
              to={{ name: 'settings-privacy' }}
            />
            <NavRow
              icon={<PhoneIcon size={18} />}
              label={t('settings.calls')}
              to={{ name: 'settings-calls' }}
            />
            <NavRow
              icon={<LockIcon size={18} />}
              label={t('settings.security')}
              to={{ name: 'settings-security' }}
            />
            <NavRow
              icon={<DownloadIcon size={18} />}
              label={t('settings.data')}
              to={{ name: 'settings-data' }}
            />
          </Card>

          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {t('settings.aboutSection')}
          </span>
          <Card className="p-0 overflow-hidden divide-y divide-border">
            <NavRow label={t('settings.whatLeaves')} to={{ name: 'about' }} />
            <a className="flex items-center gap-3 w-full px-4 py-3 text-start hover:bg-accent/50" href={SOURCE_URL} target="_blank" rel="noreferrer noopener">
              <span className="flex-1 min-w-0">{t('settings.sourceCode')}</span>
              <ChevronIcon size={16} className="text-muted-foreground/70" />
            </a>
            <div className="flex items-center gap-3 w-full px-4 py-3 text-start" style={{ cursor: 'default' }}>
              <span className="flex-1 min-w-0 text-muted-foreground">{t('settings.version')}</span>
              <code className="font-mono text-xs">{APP_VERSION}</code>
            </div>
          </Card>

          <Button variant="outline" className="w-full" onClick={() => lock()}>
            <LockIcon size={16} />
            {t('settings.lockNow')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** A row that opens a settings page, marked as current while that page is open beside the list. */
export function NavRow({ icon, label, to }: { icon?: React.ReactNode; label: string; to: Route }) {
  const navigate = useNavigate()
  const current = useRoute().name === to.name
  return (
    <button className="flex items-center gap-3 w-full px-4 py-3 text-start hover:bg-accent/50" aria-current={current || undefined} onClick={() => navigate(to)}>
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      <span className="flex-1 min-w-0" dir="auto">{label}</span>
      <ChevronIcon size={16} className="text-muted-foreground/70" />
    </button>
  )
}

export function PrivacySettings() {
  const { t } = useI18n()
  const about = useAboutText()
  const settings = useApp((s) => s.settings)
  const saveSettings = useApp((s) => s.saveSettings)
  const toast = useApp((s) => s.toast)

  const notificationsBlocked = typeof Notification === 'undefined' || Notification.permission === 'denied'

  /**
   * Ask for permission at the moment the user turns the toggle on, never on
   * page load. A permission prompt that appears unprompted is the fastest way
   * to get permanently denied.
   */
  const setNotifications = async (enabled: boolean) => {
    if (!enabled) {
      await saveSettings({ notificationsEnabled: false })
      return
    }
    if (typeof Notification === 'undefined') return
    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission !== 'granted') {
      toast(t('settings.notificationsDenied'), 'danger')
      return
    }
    await saveSettings({ notificationsEnabled: true })
  }

  return (
    <SettingsPage title={t('settings.privacy')}>
      <Card className="p-0 overflow-hidden divide-y divide-border">
        <Toggle
          label={t('settings.notifications')}
          description={t('settings.notificationsBody')}
          checked={settings.notificationsEnabled && !notificationsBlocked}
          disabled={notificationsBlocked}
          onChange={(enabled) => void setNotifications(enabled)}
        />
        <Toggle
          label={t('settings.readReceipts')}
          checked={settings.sendReadReceipts}
          onChange={(sendReadReceipts) => void saveSettings({ sendReadReceipts })}
        />
        <Toggle
          label={t('settings.typingIndicators')}
          checked={settings.sendTypingIndicators}
          onChange={(sendTypingIndicators) => void saveSettings({ sendTypingIndicators })}
        />
        <Toggle
          label={t('settings.directConnection')}
          description={t('settings.directConnectionBody')}
          checked={settings.enableDirectConnection}
          onChange={(enableDirectConnection) => void saveSettings({ enableDirectConnection })}
        />
        <Toggle
          label={t('settings.publicProfile')}
          description={t('settings.publicProfileBody')}
          checked={settings.publishPublicProfile}
          onChange={(publishPublicProfile) => void saveSettings({ publishPublicProfile })}
        />
        <Toggle
          label={t('settings.mlsInvites')}
          description={t('settings.mlsInvitesBody')}
          checked={settings.mlsInvites}
          onChange={(mlsInvites) => void saveSettings({ mlsInvites })}
        />
      </Card>

      <Card className="p-4 flex flex-col gap-2">
        <Field label={t('settings.retention')}>
          <Select
            value={settings.retention}
            onChange={(event) =>
              void saveSettings({ retention: event.target.value as typeof settings.retention })
            }
          >
            <option value="forever">{t('settings.retentionForever')}</option>
            <option value="90d">{t('settings.retentionDays', { n: 90 })}</option>
            <option value="30d">{t('settings.retentionDays', { n: 30 })}</option>
            <option value="7d">{t('settings.retentionDays', { n: 7 })}</option>
          </Select>
        </Field>
      </Card>

      <Card className="p-4 flex flex-col gap-2">
        <Field label={t('settings.messageExpiry')} hint={t('settings.messageExpiryBody')}>
          <Select
            value={String(settings.messageExpirationDays)}
            onChange={(event) => void saveSettings({ messageExpirationDays: Number(event.target.value) })}
          >
            {[7, 30, 90, 365].map((days) => (
              <option key={days} value={days}>
                {t('settings.retentionDays', { n: days })}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Banner tone="accent">
        <span className="text-xs">{about('limitsForwardSecrecy')}</span>
      </Banner>
    </SettingsPage>
  )
}

/**
 * Re-encode an avatar to a small square JPEG data URI.
 *
 * Two reasons this is not just `FileReader.readAsDataURL`: the original may be
 * megabytes (and gets sent to every contact), and re-encoding through a canvas
 * strips EXIF, which routinely carries GPS coordinates.
 */
async function downscaleToDataUri(file: File, size: number): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    )
    bitmap.close()
    const dataUri = canvas.toDataURL('image/jpeg', 0.82)
    return dataUri.length <= 64 * 1024 ? dataUri : canvas.toDataURL('image/jpeg', 0.6)
  } catch {
    return null
  }
}
