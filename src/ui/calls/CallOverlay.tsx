import { useEffect, useRef, useState } from 'react'
import { isCallLive, useApp } from '../../crow/store'
import { navigate } from '../../crow/router'
import { Avatar } from '../components/primitives'
import { LockIcon, PhoneIcon, VideoIcon } from '../components/Icons'
import { displayName } from '../screens/ChatList'
import { formatCallDuration } from '../format'
import { isStickyEnd, type CallControl, type CallView } from '../../core/calls/callManager'
import type { IceDiagnosisKind } from '../../core/calls/diagnose'
import { useCallText, type CallTextFn, type CallTextKey } from './strings'
import {
  FlipCameraIcon,
  HangUpIcon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  ScreenShareIcon,
  VideoOffIcon,
} from './icons'
import { playRingback, playRingtone } from './tones'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Everything a call puts on screen: the incoming-call prompt, the call
 * itself, the bar it shrinks to while you read a conversation, and the way it
 * ended. Mounted at the top of the app only while there is a call, from the
 * call chunk (ADR-046).
 */
export function CallOverlay() {
  const call = useApp((s) => s.call)
  if (!call) return null
  // A new call starts expanded, whatever the last one was left as.
  return <CallLayer key={`${call.peer}:${call.startedAt}`} call={call} />
}

function CallLayer({ call }: { call: CallView }) {
  const control = useApp((s) => s.callControl)
  const contact = useApp((s) => s.contacts.get(call.peer))
  const ct = useCallText()
  const name = displayName(contact, call.peer)
  const [minimized, setMinimized] = useState(false)

  useCallSounds(call.phase)
  useIncomingNotification(call, name, ct)
  useWakeLock(call)

  const live = isCallLive(call)
  const expanded =
    !minimized ||
    call.phase === 'incoming' ||
    (call.phase === 'ended' && !!call.ended && isStickyEnd(call.ended.kind))
  const root = useRef<HTMLDivElement>(null)
  useInertBehind(root, expanded)

  useEffect(() => {
    if (!expanded || !live) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMinimized(true)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [expanded, live])

  return (
    <div ref={root} className="contents">
      {/* Always mounted, so minimising the call never interrupts what you hear. */}
      <MediaElement kind="audio" stream={call.remote.stream} />
      {call.phase === 'incoming' ? (
        <IncomingCall call={call} name={name} avatar={contact?.avatar} ct={ct} control={control} />
      ) : expanded ? (
        <CallScreen
          call={call}
          name={name}
          avatar={contact?.avatar}
          ct={ct}
          control={control}
          onMinimize={live ? () => setMinimized(true) : undefined}
        />
      ) : (
        <button
          className="flex min-h-[2.25rem] shrink-0 items-center gap-2 bg-green-600 px-4 pb-1 pt-[calc(0.5rem+env(safe-area-inset-top))] text-start text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-[-4px]"
          onClick={() => setMinimized(false)}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden="true" />
          <bdi className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold">{name}</bdi>
          <span className="tabular-nums">
            <CallStatus call={call} name={name} ct={ct} />
          </span>
          <span className="ms-auto opacity-85 whitespace-nowrap">{ct('expand')}</span>
        </button>
      )}
    </div>
  )
}

/**
 * While the call covers the app, the app behind it is out of reach: not
 * focusable, not clickable, not read out. Without this, Tab walks out of the
 * call into a conversation nobody can see.
 */
function useInertBehind(root: React.RefObject<HTMLDivElement | null>, covering: boolean): void {
  useEffect(() => {
    const own = root.current
    const parent = own?.parentElement
    if (!covering || !parent) return
    const behind = [...parent.children].filter(
      (element): element is HTMLElement =>
        element !== own && element instanceof HTMLElement && !element.inert,
    )
    for (const element of behind) element.inert = true
    return () => {
      for (const element of behind) element.inert = false
    }
  }, [root, covering])
}

// --- incoming ---------------------------------------------------------------------

function IncomingCall({
  call,
  name,
  avatar,
  ct,
  control,
}: {
  call: CallView
  name: string
  avatar?: string
  ct: CallTextFn
  control: (action: CallControl) => void
}) {
  const accept = useRef<HTMLButtonElement>(null)
  useEffect(() => accept.current?.focus(), [])
  const video = call.media === 'video'
  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-black/60 p-4">
      <div
        className="flex w-full max-w-[22rem] flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 pt-5 text-center shadow-lg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="call-incoming-name"
        aria-describedby="call-incoming-kind"
      >
        <Avatar name={name} seed={call.peer} src={avatar} size="lg" />
        <bdi id="call-incoming-name" className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold">
          {name}
        </bdi>
        <span id="call-incoming-kind" className="inline-flex items-center gap-1 text-muted-foreground">
          {video ? <VideoIcon size={15} /> : <PhoneIcon size={15} />}
          {ct(video ? 'incomingVideo' : 'incomingVoice')}
        </span>
        <div className="my-3 mt-1 flex justify-center gap-7">
          <CallButton
            label={ct('decline')}
            tone="danger"
            showLabel
            onClick={() => control({ type: 'decline' })}
            icon={<HangUpIcon size={24} />}
          />
          <CallButton
            ref={accept}
            label={ct('accept')}
            tone="accept"
            showLabel
            onClick={() => control({ type: 'accept' })}
            icon={video ? <VideoIcon size={24} /> : <PhoneIcon size={24} />}
          />
        </div>
        {video ? (
          <Button variant="ghost" size="sm" onClick={() => control({ type: 'accept', media: 'audio' })}>
            {ct('acceptVoice')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// --- the call ---------------------------------------------------------------------

function CallScreen({
  call,
  name,
  avatar,
  ct,
  control,
  onMinimize,
}: {
  call: CallView
  name: string
  avatar?: string
  ct: CallTextFn
  control: (action: CallControl) => void
  onMinimize?: () => void
}) {
  const primary = useRef<HTMLButtonElement>(null)
  useEffect(() => primary.current?.focus(), [])
  const { local, remote } = call
  const ended = call.phase === 'ended'
  const answered = call.phase === 'connected' || call.phase === 'reconnecting'
  const showRemote = answered && remote.video && !!remote.stream
  const showLocal = !ended && !!local.stream
  // Only the front camera is mirrored: that is how people expect to see
  // themselves. A screen or a back camera shows the world as it is.
  const mirrored = local.camera && !local.screen && local.facing === 'user'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-crow-nearBlack text-white"
      role="dialog"
      aria-modal="true"
      aria-label={ct('callWith', { name })}
    >
      <div className="absolute inset-0 grid place-items-center overflow-hidden">
        {showRemote ? (
          <MediaElement
            kind="video"
            stream={remote.stream}
            className="absolute inset-0 h-full w-full bg-crow-nearBlack"
            fit={remote.screen ? 'contain' : 'cover'}
          />
        ) : null}
        {showLocal ? (
          <MediaElement
            kind="video"
            stream={local.stream}
            className={cn(
              'absolute z-[2] bg-crow-graphite object-cover shadow-lg',
              answered
                ? 'bottom-[calc(3.5rem+1.5rem+0.75rem+env(safe-area-inset-bottom))] end-4 aspect-[3/4] w-[clamp(5.5rem,24vw,10rem)] rounded-md border border-white/20'
                : 'inset-0 h-full w-full opacity-55',
            )}
            mirrored={mirrored}
          />
        ) : null}
        {!showRemote ? (
          <div className="relative flex flex-col items-center gap-4">
            <Avatar name={name} seed={call.peer} src={avatar} size="lg" />
            {answered && call.media === 'video' && !remote.video ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-medium whitespace-nowrap text-white">
                <VideoOffIcon size={14} />
                {ct('cameraIsOff')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative z-[3] flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        {onMinimize ? (
          <button
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-none bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            aria-label={ct('minimize')}
            title={ct('minimize')}
            onClick={onMinimize}
          >
            <MinimizeIcon size={18} />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <bdi className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold tracking-tight leading-tight">{name}</bdi>
          <span className="text-sm text-white/80" aria-live="polite">
            <CallStatus call={call} name={name} ct={ct} />
          </span>
        </div>
        {answered ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
            title={ct(call.path === 'relay' ? 'relayedHint' : 'directHint')}
          >
            <LockIcon size={13} />
            <span className="sr-only">{ct('encrypted')} · </span>
            {call.path ? ct(call.path === 'relay' ? 'relayed' : 'direct') : ct('encrypted')}
          </span>
        ) : null}
      </div>

      <div className="relative z-[3] flex flex-col items-center gap-2 px-4 text-center" aria-live="polite">
        {call.notReached && call.phase === 'outgoing' ? (
          <p className="max-w-[26rem] rounded-md bg-crow-nearBlack/70 p-2 px-3 text-sm leading-snug text-white/90">{ct('notReached', { name })}</p>
        ) : null}
        {answered && !remote.audio ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-medium whitespace-nowrap text-white">
            <MicOffIcon size={14} />
            {ct('theyMuted', { name })}
          </span>
        ) : null}
        {answered && remote.screen ? <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-medium whitespace-nowrap text-white">{ct('theyShare', { name })}</span> : null}
        {local.screen && !ended ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-medium whitespace-nowrap text-white">
            <ScreenShareIcon size={14} />
            {ct('sharing')}
          </span>
        ) : null}
        {call.notice ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-xs font-medium whitespace-nowrap text-crow-nearBlack">
            {ct(call.notice === 'camera-unavailable' ? 'cameraUnavailable' : 'screenFailed')}
          </span>
        ) : null}
      </div>

      {ended ? (
        <CallEnding call={call} name={name} ct={ct} control={control} primary={primary} />
      ) : (
        <div className="relative z-[3] mt-auto flex flex-wrap justify-center gap-4 bg-gradient-to-t from-black/60 to-transparent p-6 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <CallButton
            label={ct(local.muted ? 'unmute' : 'mute')}
            pressed={local.muted}
            onClick={() => control({ type: 'mute', muted: !local.muted })}
            icon={local.muted ? <MicOffIcon size={22} /> : <MicIcon size={22} />}
          />
          <CallButton
            label={ct(local.camera ? 'cameraOff' : 'cameraOn')}
            pressed={!local.camera}
            onClick={() => control({ type: 'camera', on: !local.camera })}
            icon={local.camera ? <VideoIcon size={22} /> : <VideoOffIcon size={22} />}
          />
          {local.camera && local.canFlip ? (
            <CallButton
              label={ct('flip')}
              onClick={() => control({ type: 'flip' })}
              icon={<FlipCameraIcon size={22} />}
            />
          ) : null}
          {local.canShare ? (
            <CallButton
              label={ct(local.screen ? 'stopShare' : 'share')}
              pressed={local.screen}
              onClick={() => control({ type: 'screen', on: !local.screen })}
              icon={<ScreenShareIcon size={22} />}
            />
          ) : null}
          <CallButton
            ref={primary}
            label={ct('hangUp')}
            tone="danger"
            onClick={() => control({ type: 'hangup' })}
            icon={<HangUpIcon size={24} />}
          />
        </div>
      )}
    </div>
  )
}

const DIAGNOSIS: Record<IceDiagnosisKind, CallTextKey> = {
  'symmetric-nat': 'diagSymmetric',
  blocked: 'diagBlocked',
  'peer-blocked': 'diagPeerBlocked',
  'turn-failed': 'diagTurnFailed',
  unknown: 'diagUnknown',
}

const MEDIA: Record<string, CallTextKey> = {
  denied: 'mediaDenied',
  missing: 'mediaMissing',
  busy: 'mediaBusy',
  failed: 'mediaFailed',
}

/** How the call ended, and — when there is something to do about it — what. */
function CallEnding({
  call,
  name,
  ct,
  control,
  primary,
}: {
  call: CallView
  name: string
  ct: CallTextFn
  control: (action: CallControl) => void
  primary: React.RefObject<HTMLButtonElement | null>
}) {
  const end = call.ended
  if (!end || !isStickyEnd(end.kind)) return <div className="call-controls" />

  let title: string
  let body: string
  let turn: CallTextKey | null = null
  if (end.kind === 'failed') {
    title = ct('failedTitle')
    body = end.diagnosis ? ct(DIAGNOSIS[end.diagnosis.kind], { name }) : ct('failedPeer', { name })
    if (end.diagnosis) turn = end.diagnosis.kind === 'turn-failed' ? 'checkTurn' : 'setUpTurn'
  } else if (end.kind === 'media') {
    title = ct('mediaTitle')
    body = ct(MEDIA[end.media ?? 'failed'] ?? 'mediaFailed')
  } else if (end.kind === 'relay-needs-turn') {
    title = ct('mediaTitle')
    body = ct('relayNeedsTurn')
    turn = 'setUpTurn'
  } else {
    title = ct('mediaTitle')
    body = ct('endedError')
  }

  return (
    <div
      className="relative z-[3] mx-4 mb-[calc(2rem+env(safe-area-inset-bottom))] mt-auto flex w-[min(100%-2rem,26rem)] flex-col gap-3 self-center rounded-lg border border-border bg-card p-5 text-start text-card-foreground shadow-lg"
      role="alert"
    >
      <strong className="text-base font-semibold">{title}</strong>
      <p className="leading-snug text-muted-foreground">{body}</p>
      <div className="flex flex-wrap gap-2">
        {turn ? (
          <Button
            className="flex-1"
            onClick={() => {
              control({ type: 'dismiss' })
              navigate({ name: 'settings-calls' })
            }}
          >
            {ct(turn)}
          </Button>
        ) : null}
        <Button
          ref={primary}
          variant="outline"
          className="flex-1"
          onClick={() => control({ type: 'dismiss' })}
        >
          {ct('close')}
        </Button>
      </div>
    </div>
  )
}

const ENDED: Record<string, CallTextKey> = {
  hangup: 'endedHangup',
  cancelled: 'endedCancelled',
  declined: 'endedDeclined',
  busy: 'endedBusy',
  unanswered: 'endedUnanswered',
  missed: 'endedMissed',
  lost: 'endedLost',
  // The card below says what went wrong; the status line just says it is over.
  failed: 'endedHangup',
  media: 'endedHangup',
  'relay-needs-turn': 'endedHangup',
  error: 'endedHangup',
}

/** One line: calling, ringing, the running clock, or how it ended. */
function CallStatus({ call, name, ct }: { call: CallView; name: string; ct: CallTextFn }) {
  const now = useNow(call.phase === 'connected' || call.phase === 'reconnecting')
  switch (call.phase) {
    case 'outgoing':
      return <>{ct('calling')}</>
    case 'ringing':
      return <>{ct('ringing')}</>
    case 'incoming':
      return <>{ct(call.media === 'video' ? 'incomingVideo' : 'incomingVoice')}</>
    case 'connecting':
      return <>{ct('connecting')}</>
    case 'reconnecting':
      return <>{ct('reconnecting')}</>
    case 'connected':
      return (
        <bdi className="call-clock">{formatCallDuration(Math.max(0, now - (call.connectedAt ?? now)))}</bdi>
      )
    case 'ended':
      return <>{ct(ENDED[call.ended?.kind ?? 'hangup'] ?? 'endedHangup', { name })}</>
  }
}

// --- pieces -----------------------------------------------------------------------

function CallButton({
  label,
  icon,
  onClick,
  pressed,
  tone,
  showLabel,
  ref,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  pressed?: boolean
  tone?: 'danger' | 'accept'
  showLabel?: boolean
  ref?: React.Ref<HTMLButtonElement>
}) {
  const button = (
    <Button
      ref={ref}
      className={cn(
        'h-14 w-14 rounded-full transition-colors active:scale-95',
        tone === 'danger'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : tone === 'accept'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-white/15 text-white hover:bg-white/25',
        pressed === true && 'bg-white text-crow-nearBlack hover:bg-white',
      )}
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      onClick={onClick}
    >
      {icon}
    </Button>
  )
  if (!showLabel) return button
  return (
    <span className="flex flex-col items-center gap-2">
      {button}
      <span className="text-xs font-medium text-white/70" aria-hidden="true">
        {label}
      </span>
    </span>
  )
}

/**
 * A `<video>` or `<audio>` bound to a stream. The stream object is replaced
 * only when its tracks change, so re-renders do not restart playback.
 */
function MediaElement({
  kind,
  stream,
  className,
  mirrored,
  fit,
}: {
  kind: 'audio' | 'video'
  stream: MediaStream | null
  className?: string
  mirrored?: boolean
  fit?: 'cover' | 'contain'
}) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (element.srcObject !== stream) element.srcObject = stream
    if (stream) void element.play().catch(() => undefined)
  }, [stream])
  if (kind === 'audio') return <audio ref={ref} autoPlay className="sr-only" />
  return (
    <video
      ref={ref}
      className={cn(className, mirrored && '-scale-x-100', fit === 'contain' && 'object-contain')}
      autoPlay
      playsInline
      // Picture only: sound comes from the one audio element, so it keeps
      // playing when the call is minimised and is never heard twice.
      muted
    />
  )
}

/** The time, refreshed every second while `ticking`. */
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!ticking) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [ticking])
  return now
}

/** Ring while a call is coming in; purr while ours rings at the other end. */
function useCallSounds(phase: CallView['phase']): void {
  useEffect(() => {
    if (phase !== 'incoming' && phase !== 'ringing') return
    const tone = phase === 'incoming' ? playRingtone() : playRingback()
    return () => tone.stop()
  }, [phase])
}

/**
 * A call ringing in a background tab says so, if notifications are on. The
 * one notification that names what it is about: a call cannot wait to be read.
 */
function useIncomingNotification(call: CallView, name: string, ct: CallTextFn): void {
  const enabled = useApp((s) => s.settings.notificationsEnabled)
  const ringing = call.phase === 'incoming'
  const body = ct(call.media === 'video' ? 'incomingVideo' : 'incomingVoice')
  useEffect(() => {
    if (!ringing || !enabled || typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted' || document.visibilityState === 'visible') return
    let shown: Notification | null = null
    try {
      shown = new Notification(name, { body, tag: 'crow-call', requireInteraction: true })
      shown.onclick = () => {
        focus()
        shown?.close()
      }
    } catch {
      /* some browsers insist on a service-worker registration */
    }
    return () => shown?.close()
  }, [ringing, enabled, name, body])
}

/** Keep the screen on while a video call is up; a dimming screen is a frozen picture. */
function useWakeLock(call: CallView): void {
  const wanted = call.phase === 'connected' && (call.local.camera || call.local.screen || call.remote.video)
  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock
    if (!wanted || !wakeLock) return
    let sentinel: WakeLockSentinel | null = null
    let released = false
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      wakeLock
        .request('screen')
        .then((lock) => {
          if (released) void lock.release()
          else sentinel = lock
        })
        .catch(() => undefined)
    }
    acquire()
    // The browser drops the lock whenever the page is hidden.
    document.addEventListener('visibilitychange', acquire)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', acquire)
      void sentinel?.release().catch(() => undefined)
    }
  }, [wanted])
}
