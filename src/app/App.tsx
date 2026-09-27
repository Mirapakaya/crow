import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useApp, getMessenger, getVault, isCallLive } from './store'
import { loadCallsChunk } from './callsChunk'
import { applyDisplayPrefs } from './displayPrefs'
import { useRoute, useNavigate, type Route } from './router'
import { levelOf, sectionOf, useWide, type Section } from './layout'
import { I18nContext, LOCALE_DIRECTION, translate, type I18nContextValue } from '../i18n'
import { ChatList } from '../ui/screens/ChatList'
import { ChatView } from '../ui/screens/ChatView'
import { ContactsList } from '../ui/screens/Contacts'
import { LockScreen } from '../ui/screens/LockScreen'
import {
  AboutScreen,
  AddContact,
  BackupCeremony,
  CallSettings,
  ContactDetail,
  DataSettings,
  GroupInfo,
  InviteScreen,
  NewGroup,
  Onboarding,
  PrivacySettings,
  RelaySettings,
  SecuritySettings,
  SettingsHome,
  VerifyScreen,
} from '../ui/lazyViews'
import { Banner, Spinner } from '../ui/components/primitives'
import { EntryLayout } from '../ui/components/EntryLayout'
import { ConnectionBar } from '../ui/components/ConnectionStatus'
import { UpdatePrompt } from './UpdatePrompt'
import { cn } from '../lib/utils'
import { MessageSquare, Users, Settings, X } from 'lucide-react'

export function App() {
  const phase = useApp((s) => s.phase)
  const settings = useApp((s) => s.settings)
  const boot = useApp((s) => s.boot)

  const i18n = useMemo<I18nContextValue>(
    () => ({
      locale: settings.locale,
      dir: LOCALE_DIRECTION[settings.locale],
      t: (key, values) => translate(settings.locale, key, values),
    }),
    [settings.locale],
  )

  useEffect(() => {
    void boot()
  }, [boot])

  useEffect(() => {
    applyDisplayPrefs({ locale: settings.locale, theme: settings.theme })
  }, [settings.locale, settings.theme])

  return (
    <I18nContext.Provider value={i18n}>
      <Shell phase={phase} />
      <ToastRegion />
      <UpdatePrompt />
    </I18nContext.Provider>
  )
}

function Shell({ phase }: { phase: ReturnType<typeof useApp.getState>['phase'] }) {
  const route = useRoute()
  const t = useTranslate()
  const bootError = useApp((s) => s.bootError)
  const wide = useWide()

  useLifecycleEffects()

  if (phase === 'boot') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
        <Spinner label={t('common.loading')} />
      </div>
    )
  }

  if (phase === 'unsupported') {
    return (
      <div className="flex min-h-dvh bg-[var(--bg)]">
        <EntryLayout>
          <Banner tone="danger">{t('errors.unsupported')}</Banner>
          <p className="text-[var(--text-muted)]">{t('errors.storageBlocked')}</p>
          {bootError ? (
            <p className="font-mono text-sm text-[var(--text-muted)]" dir="ltr">
              {bootError}
            </p>
          ) : null}
        </EntryLayout>
      </div>
    )
  }

  if (phase === 'onboarding') {
    return (
      <div className="flex min-h-dvh bg-[var(--bg)]">
        <Suspense
          fallback={
            <EntryLayout>
              <Spinner label={t('common.loading')} />
            </EntryLayout>
          }
        >
          <Onboarding />
        </Suspense>
      </div>
    )
  }

  if (phase === 'locked') {
    return (
      <div className="flex min-h-dvh bg-[var(--bg)]">
        <LockScreen />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh max-h-dvh flex-col bg-[var(--bg)]">
      <CallLayer />
      <ConnectionBar />
      <BackupGate />
      <Panes route={route} wide={wide} />
    </div>
  )
}

const PICK: Record<Section, 'nav.pickChat' | 'nav.pickContact' | 'nav.pickSetting'> = {
  chats: 'nav.pickChat',
  contacts: 'nav.pickContact',
  settings: 'nav.pickSetting',
}

function Panes({ route, wide }: { route: Route; wide: boolean }) {
  const t = useTranslate()
  const [kept, keep] = useState<Section>(() => sectionOf(route) ?? 'chats')
  const section = sectionOf(route) ?? kept
  if (section !== kept) keep(section)
  const level = levelOf(route)
  return (
    <div className={cn('flex min-h-0 flex-1', wide && 'flex-row')}>
      {wide ? (
        <div className="flex w-[clamp(18rem,32%,26rem)] shrink-0 flex-col border-e border-[var(--border)]">
          <div className="flex min-h-0 flex-1 flex-col">
            <Suspense fallback={<RouteLoading />}>
              {section === 'chats' ? (
                <ChatList />
              ) : section === 'contacts' ? (
                <ContactsList />
              ) : (
                <SettingsHome />
              )}
            </Suspense>
          </div>
          <TabBar section={section} />
        </div>
      ) : null}
      <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col')} data-level={wide ? level : undefined}>
        {wide && level === 0 ? (
          <p className="m-auto rounded-full bg-[var(--surface-3)] px-3 py-1 text-sm text-[var(--text-muted)]">
            {t(PICK[section])}
          </p>
        ) : (
          <Suspense fallback={<RouteLoading />}>
            <RouteView route={route} />
          </Suspense>
        )}
      </div>
      {wide || immersive(route) ? null : <TabBar section={sectionOf(route)} />}
    </div>
  )
}

const CallOverlay = lazy(() => loadCallsChunk().then((chunk) => ({ default: chunk.CallOverlay })))

function CallLayer() {
  const call = useApp((s) => s.call)
  if (!call) return null
  return (
    <Suspense fallback={null}>
      <CallOverlay />
    </Suspense>
  )
}

function BackupGate() {
  const identity = useApp((s) => s.identity)
  const deferred = useApp((s) => s.backupDeferred)
  if (!identity || identity.mnemonicBackedUp || !identity.mnemonic) return null
  if (deferred) return null
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[var(--bg)]">
      <Suspense fallback={<RouteLoading />}>
        <BackupCeremony mnemonic={identity.mnemonic} />
      </Suspense>
    </div>
  )
}

function RouteLoading() {
  const t = useTranslate()
  return (
    <div className="flex min-h-[12rem] flex-1 items-center justify-center animate-in fade-in-0 duration-200 [animation-delay:180ms]">
      <Spinner label={t('common.loading')} />
    </div>
  )
}

function RouteView({ route }: { route: Route }) {
  switch (route.name) {
    case 'chats':
      return <ChatList />
    case 'chat':
      return <ChatView key={route.peer} address={route.peer} />
    case 'group':
      return <ChatView key={route.id} address={route.id} />
    case 'group-info':
      return <GroupInfo id={route.id} />
    case 'new-group':
      return <NewGroup />
    case 'contacts':
      return <ContactsList />
    case 'contact':
      return <ContactDetail peer={route.peer} />
    case 'add-contact':
      return <AddContact />
    case 'invite':
      return <InviteScreen payload={route.payload} />
    case 'verify':
      return <VerifyScreen peer={route.peer} />
    case 'settings':
      return <SettingsHome />
    case 'settings-relays':
      return <RelaySettings />
    case 'settings-privacy':
      return <PrivacySettings />
    case 'settings-security':
      return <SecuritySettings />
    case 'settings-data':
      return <DataSettings />
    case 'settings-calls':
      return <CallSettings />
    case 'about':
      return <AboutScreen />
  }
}

const immersive = (route: Route): boolean =>
  route.name === 'chat' ||
  route.name === 'group' ||
  route.name === 'group-info' ||
  route.name === 'new-group' ||
  route.name === 'invite' ||
  route.name === 'verify' ||
  route.name === 'add-contact'

function TabBar({ section }: { section: Section | null }) {
  const t = useTranslate()
  const navigate = useNavigate()
  const conversations = useApp((s) => s.conversations)
  const unread = conversations.reduce((total, c) => total + c.unread, 0)

  const tabs: { route: Route; label: string; Icon: typeof MessageSquare; badge?: number }[] = [
    { route: { name: 'chats' }, label: t('nav.chats'), Icon: MessageSquare, badge: unread },
    { route: { name: 'contacts' }, label: t('nav.contacts'), Icon: Users },
    { route: { name: 'settings' }, label: t('nav.settings'), Icon: Settings },
  ]

  return (
    <nav
      className="flex shrink-0 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)]"
      aria-label={t('nav.chats')}
    >
      {tabs.map((tab) => {
        const active = tab.route.name === section
        return (
          <button
            key={tab.route.name}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(tab.route)}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-0.5 py-2 px-1 border-none bg-transparent cursor-pointer transition-colors',
              active ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
          >
            <div className="relative">
              <tab.Icon size={20} strokeWidth={1.75} />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-2 flex min-w-[1rem] h-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[0.6rem] font-semibold tabular-nums text-[var(--accent-fg)]">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[0.625rem] font-medium leading-none">{tab.label}</span>
            {active ? (
              <span className="absolute top-0 inset-x-1/4 h-0.5 rounded-full bg-[var(--accent)]" />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function ToastRegion() {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-60 flex flex-col items-center gap-2 px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-96 items-center gap-3 rounded-[var(--radius-md)] border bg-[var(--surface)] px-4 py-3 text-sm shadow-[var(--shadow-lg)] animate-in slide-in-from-bottom-2 fade-in-0',
            toast.tone === 'danger' && 'border-[color-mix(in_srgb,var(--danger)_45%,transparent)]',
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function useLifecycleEffects(): void {
  const settings = useApp((s) => s.settings)
  const lock = useApp((s) => s.lock)
  const phase = useApp((s) => s.phase)
  const setWindowFocus = useApp((s) => s.setWindowFocus)

  useEffect(() => {
    if (phase !== 'ready') return
    const vault = getVault()
    const touch = () => vault.touch()
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'focus']
    for (const event of events) addEventListener(event, touch, { passive: true })
    return () => {
      for (const event of events) removeEventListener(event, touch)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'ready') return
    const onOnline = () => getMessenger()?.wake('online')
    const onFocus = () => {
      setWindowFocus(true)
      getMessenger()?.wake('focus')
    }
    const onBlur = () => setWindowFocus(false)
    const onVisibility = () => {
      const visible = document.visibilityState === 'visible'
      setWindowFocus(visible)
      if (visible) getMessenger()?.wake('visible')
      else if (settings.lockOnHide && !isCallLive(useApp.getState().call)) lock()
    }
    const onPageShow = (event: PageTransitionEvent) => {
      setWindowFocus(document.visibilityState === 'visible')
      if (event.persisted) getMessenger()?.wake('resume')
    }
    const onResume = () => getMessenger()?.wake('resume')
    const onOffline = () => getMessenger()?.refreshSyncState()

    addEventListener('online', onOnline)
    addEventListener('offline', onOffline)
    addEventListener('focus', onFocus)
    addEventListener('blur', onBlur)
    addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('resume', onResume)
    return () => {
      removeEventListener('online', onOnline)
      removeEventListener('offline', onOffline)
      removeEventListener('focus', onFocus)
      removeEventListener('blur', onBlur)
      removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('resume', onResume)
    }
  }, [phase, settings.lockOnHide, lock, setWindowFocus])

  useEffect(() => {
    const onHide = () => void getMessenger()?.persistRelayHealth()
    addEventListener('pagehide', onHide)
    return () => removeEventListener('pagehide', onHide)
  }, [])
}

function useTranslate() {
  const locale = useApp((s) => s.settings.locale)
  return useMemo(
    () => (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) =>
      translate(locale, key, values),
    [locale],
  )
}
