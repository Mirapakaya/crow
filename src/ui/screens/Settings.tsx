import { useApp } from '../../app/store'
import { useI18n, LOCALE_NAMES } from '../../i18n'
import { useNavigate, useRoute, type Route } from '../../app/router'
import { Avatar } from '../components/primitives'
import {
  ChevronRight,
  Globe,
  Lock,
  Monitor,
  Moon,
  Shield,
  Sun,
  Download,
  Phone,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { SegmentedControl } from '../components/SegmentedControl'
import { SettingsPage } from './SettingsPage'
import type { LocaleCode, ThemePreference } from '../../core/models/types'
import { APP_VERSION, SOURCE_URL } from '../../app/meta'
import { useAboutText } from './aboutText'

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{t('settings.title')}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[34rem] flex flex-col gap-4 p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{t('settings.profile')}</span>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={identity.name} seed={identity.pubkey} src={identity.avatar} size="lg" />
              <div className="flex-1 flex flex-col gap-2">
                <span style={{ fontWeight: 600 }}>{identity.name}</span>
                <code className="mono text-xs text-[var(--text-faint)]" style={{ wordBreak: 'break-all' }}>
                  {identity.npub}
                </code>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t('settings.profileBody')}</p>

            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.displayName')}</Label>
              <input
                key={`name:${identity.name}`}
                className="input"
                defaultValue={identity.name}
                maxLength={64}
                onBlur={(event) => {
                  const next = event.target.value.trim()
                  if (next && next !== identity.name) void updateProfile({ name: next })
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.about')}</Label>
              <input
                key={`about:${identity.about}`}
                className="input"
                defaultValue={identity.about}
                maxLength={200}
                onBlur={(event) => {
                  if (event.target.value !== identity.about) void updateProfile({ about: event.target.value })
                }}
              />
            </div>

            <div className="flex gap-2">
              <label className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-[var(--border)] bg-[var(--surface)] shadow-xs hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] text-[var(--text)] h-9 px-4 py-2 cursor-pointer flex-1 transition-[color,background-color,border-color,box-shadow]">
                {t('settings.avatarChoose')}
                <input
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
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
          </div>

          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{t('settings.appearance')}</span>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="p-3 px-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t('settings.language')}</Label>
                <select
                  className="input select"
                  value={settings.locale}
                  onChange={(event) => void saveSettings({ locale: event.target.value as LocaleCode })}
                >
                  {(Object.keys(LOCALE_NAMES) as LocaleCode[]).map((code) => (
                    <option key={code} value={code}>
                      {LOCALE_NAMES[code]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-3 px-4 border-t border-[var(--border)]">
              {/* The same control as on the entry screens, so the theme switch
                  looks and behaves identically wherever it is met. */}
              <div className="flex flex-col gap-1.5">
                <Label>{t('settings.theme')}</Label>
                <SegmentedControl
                  label={t('settings.theme')}
                  value={settings.theme}
                  options={[
                    { value: 'system', label: t('settings.themeSystem'), icon: <Monitor size={15} /> },
                    { value: 'light', label: t('settings.themeLight'), icon: <Sun size={15} /> },
                    { value: 'dark', label: t('settings.themeDark'), icon: <Moon size={15} /> },
                  ]}
                  onChange={(theme: ThemePreference) => void saveSettings({ theme })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 px-4 border-t border-[var(--border)]">
              <span>
                <span style={{ display: 'block', fontWeight: 'var(--weight-medium)' }}>{t('settings.enterToSend')}</span>
              </span>
              <Switch
                checked={settings.enterToSend}
                onCheckedChange={(enterToSend) => void saveSettings({ enterToSend })}
              />
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <NavRow
              icon={<Globe size={18} />}
              label={t('settings.relays')}
              to={{ name: 'settings-relays' }}
            />
            <NavRow
              icon={<Shield size={18} />}
              label={t('settings.privacy')}
              to={{ name: 'settings-privacy' }}
            />
            <NavRow
              icon={<Phone size={18} />}
              label={t('settings.calls')}
              to={{ name: 'settings-calls' }}
            />
            <NavRow
              icon={<Lock size={18} />}
              label={t('settings.security')}
              to={{ name: 'settings-security' }}
            />
            <NavRow
              icon={<Download size={18} />}
              label={t('settings.data')}
              to={{ name: 'settings-data' }}
            />
          </div>

          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{t('settings.aboutSection')}</span>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <NavRow label={t('settings.whatLeaves')} to={{ name: 'about' }} />
            <a className="flex w-full items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] border-t border-[var(--border)]" href={SOURCE_URL} target="_blank" rel="noreferrer noopener">
              <span className="flex-1">{t('settings.sourceCode')}</span>
              <ChevronRight size={16} style={{ color: 'var(--text-faint)' }} />
            </a>
            <div className="flex w-full items-center gap-3 px-4 py-3 border-t border-[var(--border)]" style={{ cursor: 'default' }}>
              <span className="flex-1 text-sm text-[var(--text-muted)]">{t('settings.version')}</span>
              <code className="mono small">{APP_VERSION}</code>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => lock()}>
            <Lock size={16} />
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
    <button
      className={`flex w-full items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)]${current ? ' bg-[var(--surface-hover)]' : ''}`}
      aria-current={current || undefined}
      onClick={() => navigate(to)}
    >
      {icon ? <span style={{ color: 'var(--text-muted)' }}>{icon}</span> : null}
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight size={16} style={{ color: 'var(--text-faint)' }} />
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
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="flex items-center justify-between p-3 px-4">
          <span className="flex-1">
            <span style={{ display: 'block', fontWeight: 'var(--weight-medium)' }}>{t('settings.notifications')}</span>
            <span className="text-xs text-[var(--text-muted)]" style={{ display: 'block', marginTop: 'var(--space-0-5)' }}>{t('settings.notificationsBody')}</span>
          </span>
          <Switch
            checked={settings.notificationsEnabled && !notificationsBlocked}
            disabled={notificationsBlocked}
            onCheckedChange={(enabled) => void setNotifications(enabled)}
          />
        </div>
        <div className="flex items-center justify-between p-3 px-4 border-t border-[var(--border)]">
          <span style={{ fontWeight: 'var(--weight-medium)' }}>{t('settings.readReceipts')}</span>
          <Switch
            checked={settings.sendReadReceipts}
            onCheckedChange={(sendReadReceipts) => void saveSettings({ sendReadReceipts })}
          />
        </div>
        <div className="flex items-center justify-between p-3 px-4 border-t border-[var(--border)]">
          <span style={{ fontWeight: 'var(--weight-medium)' }}>{t('settings.typingIndicators')}</span>
          <Switch
            checked={settings.sendTypingIndicators}
            onCheckedChange={(sendTypingIndicators) => void saveSettings({ sendTypingIndicators })}
          />
        </div>
        <div className="flex items-center justify-between p-3 px-4 border-t border-[var(--border)]">
          <span className="flex-1">
            <span style={{ display: 'block', fontWeight: 'var(--weight-medium)' }}>{t('settings.directConnection')}</span>
            <span className="text-xs text-[var(--text-muted)]" style={{ display: 'block', marginTop: 'var(--space-0-5)' }}>{t('settings.directConnectionBody')}</span>
          </span>
          <Switch
            checked={settings.enableDirectConnection}
            onCheckedChange={(enableDirectConnection) => void saveSettings({ enableDirectConnection })}
          />
        </div>
        <div className="flex items-center justify-between p-3 px-4 border-t border-[var(--border)]">
          <span className="flex-1">
            <span style={{ display: 'block', fontWeight: 'var(--weight-medium)' }}>{t('settings.publicProfile')}</span>
            <span className="text-xs text-[var(--text-muted)]" style={{ display: 'block', marginTop: 'var(--space-0-5)' }}>{t('settings.publicProfileBody')}</span>
          </span>
          <Switch
            checked={settings.publishPublicProfile}
            onCheckedChange={(publishPublicProfile) => void saveSettings({ publishPublicProfile })}
          />
        </div>
        <div className="flex items-center justify-between p-3 px-4 border-t border-[var(--border)]">
          <span className="flex-1">
            <span style={{ display: 'block', fontWeight: 'var(--weight-medium)' }}>{t('settings.mlsInvites')}</span>
            <span className="text-xs text-[var(--text-muted)]" style={{ display: 'block', marginTop: 'var(--space-0-5)' }}>{t('settings.mlsInvitesBody')}</span>
          </span>
          <Switch
            checked={settings.mlsInvites}
            onCheckedChange={(mlsInvites) => void saveSettings({ mlsInvites })}
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.retention')}</Label>
          <select
            className="input select"
            value={settings.retention}
            onChange={(event) =>
              void saveSettings({ retention: event.target.value as typeof settings.retention })
            }
          >
            <option value="forever">{t('settings.retentionForever')}</option>
            <option value="90d">{t('settings.retentionDays', { n: 90 })}</option>
            <option value="30d">{t('settings.retentionDays', { n: 30 })}</option>
            <option value="7d">{t('settings.retentionDays', { n: 7 })}</option>
          </select>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.messageExpiry')}</Label>
          <select
            className="input select"
            value={String(settings.messageExpirationDays)}
            onChange={(event) => void saveSettings({ messageExpirationDays: Number(event.target.value) })}
          >
            {[7, 30, 90, 365].map((days) => (
              <option key={days} value={days}>
                {t('settings.retentionDays', { n: days })}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{t('settings.messageExpiryBody')}</span>
      </div>

      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-text)]">
        <span className="small">{about('limitsForwardSecrecy')}</span>
      </div>
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
