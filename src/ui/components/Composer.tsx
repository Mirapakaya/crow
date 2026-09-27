import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useApp, type SendAttachmentInput } from '../../app/store'
import { useI18n } from '../../i18n'
import type { VoiceRecorder } from '../../media/recorder'
import { canRecordVoice } from '../../media/voiceSupport'
import { formatDuration } from '../../media/waveform'
import { MAX_RELAY_BYTES, sanitizeName, transportsFor } from '../../core/models/attachment'
import { PlusIcon, TrashIcon } from './Icons'
import { Popover } from './Popover'
import { LazyPicker } from './LazyPicker'
import { Spinner } from './primitives'
import { ChecklistComposer, LAZY_CHUNKS, PollComposer } from '../lazyViews'
import { Button } from '../../components/ui/button'

const MicIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
  </svg>
)

export function AttachButton({ disabled }: { disabled?: boolean }) {
  const { t } = useI18n()
  const sendAttachment = useApp((s) => s.sendAttachment)
  const toast = useApp((s) => s.toast)
  const input = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [form, setForm] = useState<'poll' | 'checklist' | null>(null)

  const handle = useCallback(
    async (file: File) => {
      setBusy(true)
      try {
        const { audioDuration, kindForFile, prepareImage, prepareVideoPoster } = await LAZY_CHUNKS.media()
        const kind = kindForFile(file)
        const name = sanitizeName(file.name || t('attachment.file'))
        const caption = (k: 'image' | 'video' | 'voice' | 'file'): string =>
          k === 'image'
            ? t('attachment.captionImage')
            : k === 'video'
              ? t('attachment.captionVideo')
              : k === 'voice'
                ? t('attachment.captionVoice')
                : `${t('attachment.captionFile')} · ${name}`
        let payload: SendAttachmentInput

        if (kind === 'image') {
          const prepared = await prepareImage(file)
          payload = prepared
            ? {
                bytes: prepared.bytes,
                kind: 'image',
                mime: prepared.mime,
                caption: caption('image'),
                name,
                width: prepared.width,
                height: prepared.height,
                ...(prepared.preview ? { preview: prepared.preview } : {}),
              }
            : {
                bytes: new Uint8Array(await file.arrayBuffer()),
                kind: 'file',
                mime: file.type || 'application/octet-stream',
                caption: caption('file'),
                name,
              }
        } else if (kind === 'voice') {
          const durationMs = await audioDuration(file)
          payload = {
            bytes: new Uint8Array(await file.arrayBuffer()),
            kind: 'voice',
            mime: file.type || 'audio/webm',
            caption: caption('voice'),
            name,
            ...(durationMs > 0 ? { durationMs } : {}),
          }
        } else if (kind === 'video') {
          const poster = await prepareVideoPoster(file)
          payload = {
            bytes: new Uint8Array(await file.arrayBuffer()),
            kind: 'video',
            mime: file.type || 'video/mp4',
            caption: caption('video'),
            name,
            ...(poster
              ? {
                  width: poster.width,
                  height: poster.height,
                  durationMs: poster.durationMs,
                  ...(poster.preview ? { preview: poster.preview } : {}),
                }
              : {}),
          }
        } else {
          payload = {
            bytes: new Uint8Array(await file.arrayBuffer()),
            kind: 'file',
            mime: file.type || 'application/octet-stream',
            caption: caption('file'),
            name,
          }
        }

        const reach = transportsFor(payload.bytes.length)
        if (!reach.direct) {
          toast(t('attachment.tooLarge'), 'danger')
          return
        }
        await sendAttachment(payload)
      } catch {
        toast(t('errors.generic'), 'danger')
      } finally {
        setBusy(false)
      }
    },
    [sendAttachment, t, toast],
  )

  const pick = (next: 'file' | 'poll' | 'checklist') => {
    setMenuOpen(false)
    if (next === 'file') input.current?.click()
    else setForm(next)
  }

  return (
    <>
      <button
        type="button"
        className="composer-action"
        ref={setAnchor}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t('interactive.menu')}
        title={t('interactive.menu')}
        disabled={disabled || busy}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <PlusIcon size={18} />
      </button>
      {menuOpen ? (
        <Popover anchor={anchor} onClose={() => setMenuOpen(false)} label={t('interactive.menu')}>
          <button type="button" role="menuitem" onClick={() => pick('file')}>
            {t('interactive.file')}
          </button>
          <button type="button" role="menuitem" onClick={() => pick('poll')}>
            {t('interactive.poll')}
          </button>
          <button type="button" role="menuitem" onClick={() => pick('checklist')}>
            {t('interactive.checklist')}
          </button>
        </Popover>
      ) : null}
      {form ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)]" role="status">
              <Spinner label={t('interactive.loading')} />
            </div>
          }
        >
          {form === 'poll' ? (
            <PollComposer onClose={() => setForm(null)} />
          ) : (
            <ChecklistComposer onClose={() => setForm(null)} />
          )}
        </Suspense>
      ) : null}
      <input
        ref={input}
        type="file"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void handle(file)
        }}
      />
    </>
  )
}

export function EmojiButton({
  disabled,
  onInsertEmoji,
}: {
  disabled?: boolean
  onInsertEmoji: (emoji: string) => void
}) {
  const { t } = useI18n()
  const sendSticker = useApp((s) => s.sendSticker)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)

  return (
    <>
      <button
        type="button"
        className="composer-action"
        ref={setAnchor}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('emoji.title')}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true" className="composer-emoji">
          ☺
        </span>
      </button>
      {open ? (
        <Popover
          anchor={anchor}
          onClose={() => setOpen(false)}
          label={t('emoji.title')}
          className="popover-picker"
        >
          <LazyPicker
            mode="compose"
            onPickEmoji={(emoji) => {
              setOpen(false)
              onInsertEmoji(emoji)
            }}
            onPickSticker={(sticker) => {
              setOpen(false)
              void sendSticker(sticker)
            }}
          />
        </Popover>
      ) : null}
    </>
  )
}

export function VoiceButton({ disabled }: { disabled?: boolean }) {
  const { t } = useI18n()
  const sendAttachment = useApp((s) => s.sendAttachment)
  const toast = useApp((s) => s.toast)
  const recorder = useRef<VoiceRecorder | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)

  useEffect(
    () => () => {
      recorder.current?.cancel()
      recorder.current = null
    },
    [],
  )

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setElapsed(recorder.current?.elapsedMs ?? 0), 200)
    return () => clearInterval(timer)
  }, [recording])

  const stop = useCallback(
    async (send: boolean) => {
      const active = recorder.current
      recorder.current = null
      setRecording(false)
      setElapsed(0)
      setLevel(0)
      if (!active) return
      if (!send) {
        active.cancel()
        return
      }
      const result = await active.stop()
      if (!result || result.bytes.length === 0) return
      if (result.bytes.length > MAX_RELAY_BYTES * 4) {
        toast(t('attachment.tooLarge'), 'danger')
        return
      }
      await sendAttachment({
        bytes: result.bytes,
        kind: 'voice',
        mime: result.mime,
        caption: `${t('attachment.captionVoice')} · ${formatDuration(result.durationMs)}`,
        durationMs: result.durationMs,
        waveform: result.waveform,
      })
    },
    [sendAttachment, t, toast],
  )

  const start = useCallback(async () => {
    let media: Awaited<ReturnType<typeof LAZY_CHUNKS.media>>
    try {
      media = await LAZY_CHUNKS.media()
    } catch {
      toast(t('errors.generic'), 'danger')
      return
    }
    const active = new media.VoiceRecorder()
    active.onLevel = setLevel
    active.onAutoStop = () => void stop(true)
    try {
      await active.start()
      recorder.current = active
      setRecording(true)
    } catch {
      active.cancel()
      toast(t('attachment.micDenied'), 'danger')
    }
  }, [stop, t, toast])

  if (!canRecordVoice()) return null

  if (recording) {
    return (
      <div className="flex items-center gap-2" role="group" aria-label={t('attachment.recording')}>
        <button
          type="button"
          className="composer-action"
          aria-label={t('attachment.recordCancel')}
          onClick={() => void stop(false)}
        >
          <TrashIcon size={17} />
        </button>
        <span className="recording-dot" aria-hidden="true" />
        <span className="text-xs tabular-nums text-[var(--text-muted)]">{formatDuration(elapsed)}</span>
        <span className="recording-meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.max(0.03, level)})` }} />
        </span>
        <button
          type="button"
          className="composer-send"
          aria-label={t('attachment.recordStop')}
          onClick={() => void stop(true)}
        >
          <MicIcon size={18} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="composer-action"
      aria-label={t('attachment.recordStart')}
      disabled={disabled}
      onClick={() => void start()}
    >
      <MicIcon size={18} />
    </button>
  )
}
