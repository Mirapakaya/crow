import { useApp } from '../../app/store'
import { useI18n, LOCALE_NAMES } from '../../i18n'
import { useNavigate, useRoute, type Route } from '../../app/router'
import { Avatar } from '../components/primitives'
import { MonitorIcon, MoonIcon, SunIcon } from '../components/Icons'
import { SegmentedControl } from '../components/SegmentedControl'
import { SettingsPage } from './SettingsPage'
import type { LocaleCode, ThemePreference } from '../../core/models/types'
import { APP_VERSION, SOURCE_URL } from '../../app/meta'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import {
  Globe,
  Shield,
  Lock,
  Phone,
  Download,
  ChevronRight,
} from 'lucide-react'

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
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{t('settings.title')}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[34rem] flex flex-col gap-4 p-4">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
            {t('settings.profile')}
          </span>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={identity.name} seed={identity.pubkey} src={identity.avatar} size="lg" />
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <span className="font-semibold text-[var(--text)]">{identity.name}</span>
                <code className="font-mono text-[0.75rem] text-[var(--text-faint)] break-all">
                  {identity.npub}
                </code>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t('settings.profileBody')}</p>

            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.displayName')}</Label>
              <Input
                key={`name:${identity.name}`}
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
              <Input
                key={`about:${identity.about}`}
                defaultValue={identity.about}
                maxLength={200}
                onBlur={(event) => {
                  if (event.target.value !== identity.about) void updateProfile({ about: event.target.value })
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-transparent text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]">
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
          </div>

          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
            {t('settings.appearance')}
          </span>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="p-3 px-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t('settings.language')}</Label>
                <select
                  className="flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition-colors focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
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
            <div className="border-t border-[var(--border-subtle)] p-3 px-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t('settings.theme')}</Label>
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
              </div>
            </div>
            <div className="border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <span className="text-sm font-medium text-[var(--text)]">{t('settings.enterToSend')}</span>
              </div>
              <Switch
                checked={settings.enterToSend}
                onCheckedChange={(checked) => void saveSettings({ enterToSend: checked })}
              />
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <NavRow icon={<Globe size={18} strokeWidth={1.75} />} label={t('settings.relays')} to={{ name: 'settings-relays' }} />
            <NavRow icon={<Shield size={18} strokeWidth={1.75} />} label={t('settings.privacy')} to={{ name: 'settings-privacy' }} />
            <NavRow icon={<Phone size={18} strokeWidth={1.75} />} label={t('settings.calls')} to={{ name: 'settings-calls' }} />
            <NavRow icon={<Lock size={18} strokeWidth={1.75} />} label={t('settings.security')} to={{ name: 'settings-security' }} />
            <NavRow icon={<Download size={18} strokeWidth={1.75} />} label={t('settings.data')} to={{ name: 'settings-data' }} />
          </div>

          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
            {t('settings.aboutSection')}
          </span>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <NavRow label={t('settings.whatLeaves')} to={{ name: 'about' }} />
            <a
              className="flex items-center gap-3 w-full px-4 py-3 border-none bg-transparent text-left cursor-pointer text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)] border-t border-[var(--border-subtle)] [&:not(:first-child)]:border-t"
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="flex-1">{t('settings.sourceCode')}</span>
              <ChevronRight size={16} className="text-[var(--text-faint)]" />
            </a>
            <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)] cursor-default">
              <span className="flex-1 text-[var(--text-muted)]">{t('settings.version')}</span>
              <code className="font-mono text-xs">{APP_VERSION}</code>
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={() => lock()}>
            <Lock size={16} strokeWidth={1.75} />
            {t('settings.lockNow')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NavRow({ icon, label, to }: { icon?: React.ReactNode; label: string; to: Route }) {
  const navigate = useNavigate()
  const current = useRoute().name === to.name
  return (
    <button
      className={cn(
        'flex items-center gap-3 w-full px-4 py-3 border-none bg-transparent text-left cursor-pointer text-[var(--text)] transition-colors',
        current ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)]',
        '[&:not(:first-child)]:border-t [&:not(:first-child)]:border-[var(--border-subtle)]',
      )}
      aria-current={current || undefined}
      onClick={() => navigate(to)}
    >
      {icon ? <span className="text-[var(--text-muted)]">{icon}</span> : null}
      <span className="flex-1">{label}</span>
      <ChevronRight size={16} className="text-[var(--text-faint)]" />
    </button>
  )
}

export function PrivacySettings() {
  const { t } = useI18n()
  const settings = useApp((s) => s.settings)
  const saveSettings = useApp((s) => s.saveSettings)
  const toast = useApp((s) => s.toast)

  const notificationsBlocked = typeof Notification === 'undefined' || Notification.permission === 'denied'

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
        <SettingsToggle
          label={t('settings.notifications')}
          description={t('settings.notificationsBody')}
          checked={settings.notificationsEnabled && !notificationsBlocked}
          disabled={notificationsBlocked}
          onCheckedChange={(enabled) => void setNotifications(enabled)}
        />
        <SettingsToggle
          label={t('settings.readReceipts')}
          checked={settings.sendReadReceipts}
          onCheckedChange={(sendReadReceipts) => void saveSettings({ sendReadReceipts })}
        />
        <SettingsToggle
          label={t('settings.typingIndicators')}
          checked={settings.sendTypingIndicators}
          onCheckedChange={(sendTypingIndicators) => void saveSettings({ sendTypingIndicators })}
        />
        <SettingsToggle
          label={t('settings.directConnection')}
          description={t('settings.directConnectionBody')}
          checked={settings.enableDirectConnection}
          onCheckedChange={(enableDirectConnection) => void saveSettings({ enableDirectConnection })}
        />
        <SettingsToggle
          label={t('settings.publicProfile')}
          description={t('settings.publicProfileBody')}
          checked={settings.publishPublicProfile}
          onCheckedChange={(publishPublicProfile) => void saveSettings({ publishPublicProfile })}
        />
        <SettingsToggle
          label={t('settings.mlsInvites')}
          description={t('settings.mlsInvitesBody')}
          checked={settings.mlsInvites}
          onCheckedChange={(mlsInvites) => void saveSettings({ mlsInvites })}
        />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.retention')}</Label>
          <select
            className="flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition-colors focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
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
          <span className="text-xs text-[var(--text-muted)]">{t('settings.messageExpiryBody')}</span>
          <select
            className="flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition-colors focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
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
      </div>

      <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-xs text-[var(--accent-text)]">
        {t('privacy.limitsForwardSecrecy')}
      </div>
    </SettingsPage>
  )
}

function SettingsToggle({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-subtle)] first:border-t-0">
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm font-medium text-[var(--text)]', disabled && 'text-[var(--text-faint)]')}>{label}</span>
        {description ? (
          <span className="block mt-0.5 text-xs text-[var(--text-muted)]">{description}</span>
        ) : null}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

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
