import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { LAZY_CHUNKS } from '../lazyViews'
import type { Sticker, StickerPack } from '../../core/models/types'
import { EMOJI_GROUPS } from './emojiSet'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

export interface EmojiPickerProps {
  mode: 'reaction' | 'compose'
  onPickEmoji: (emoji: string) => void
  onPickSticker?: (sticker: Sticker) => void
}

type Tab = 'emoji' | 'stickers'

export default function EmojiPicker({ mode, onPickEmoji, onPickSticker }: EmojiPickerProps) {
  const { t } = useI18n()
  const packs = useApp((s) => s.packs)
  const [tab, setTab] = useState<Tab>('emoji')

  return (
    <div className="flex flex-col" role="group" aria-label={t('emoji.title')}>
      {mode === 'compose' ? (
        <div className="flex border-b border-[var(--border)]" role="tablist" aria-label={t('emoji.title')}>
          <button
            type="button"
            role="tab"
            id="picker-tab-emoji"
            aria-selected={tab === 'emoji'}
            aria-controls="picker-panel"
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium transition-colors',
              tab === 'emoji' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)]',
            )}
            onClick={() => setTab('emoji')}
          >
            {t('emoji.tabEmoji')}
          </button>
          <button
            type="button"
            role="tab"
            id="picker-tab-stickers"
            aria-selected={tab === 'stickers'}
            aria-controls="picker-panel"
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium transition-colors',
              tab === 'stickers' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)]',
            )}
            onClick={() => setTab('stickers')}
          >
            {t('emoji.tabStickers')}
          </button>
        </div>
      ) : null}

      <div
        className="picker-panel"
        id="picker-panel"
        role="tabpanel"
        aria-labelledby={tab === 'emoji' ? 'picker-tab-emoji' : 'picker-tab-stickers'}
      >
        {tab === 'emoji' ? (
          <EmojiGrid onPick={onPickEmoji} />
        ) : (
          <StickerTab packs={packs} onPick={onPickSticker} />
        )}
      </div>
    </div>
  )
}

function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  const { t } = useI18n()
  return (
    <>
      {EMOJI_GROUPS.map((group) => (
        <section key={group.key} className="flex flex-col">
          <h3 className="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--text-muted)] [dir=rtl_&]:normal-case">{t(group.key)}</h3>
          <div className="grid grid-cols-8 gap-0.5 p-1">
            {group.emoji.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-xl hover:bg-[var(--surface-hover)] transition-colors"
                onClick={() => onPick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function StickerTab({ packs, onPick }: { packs: StickerPack[]; onPick?: (sticker: Sticker) => void }) {
  const { t } = useI18n()
  const importPack = useApp((s) => s.importStickerPack)
  const deletePack = useApp((s) => s.deleteStickerPack)
  const toast = useApp((s) => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const { prepareImage } = await LAZY_CHUNKS.media()
      const images: { bytes: Uint8Array; mime: string; width: number; height: number }[] = []
      for (const file of [...files].slice(0, 60)) {
        const prepared = await prepareImage(file)
        if (prepared) {
          images.push({
            bytes: prepared.bytes,
            mime: prepared.mime,
            width: prepared.width,
            height: prepared.height,
          })
        }
      }
      if (images.length === 0) {
        toast(t('emoji.importFailed'), 'danger')
        return
      }
      const name = files[0]?.name.replace(/\.[^.]+$/, '') ?? ''
      await importPack(name, images)
      toast(t('emoji.imported', { n: images.length }))
    } catch {
      toast(t('emoji.importFailed'), 'danger')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {packs.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">{t('emoji.noPacks')}</p>
      ) : (
        packs.map((pack) => (
          <section key={pack.id} className="flex flex-col gap-1">
            <h3 className="flex items-center justify-between px-1 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <span dir="auto" className="[dir=rtl_&]:normal-case">{pack.name}</span>
              <Button variant="ghost" size="sm" onClick={() => void deletePack(pack.id)}>
                {t('emoji.removePack')}
              </Button>
            </h3>
            <div className="grid grid-cols-4 gap-1">
              {pack.stickers.map((sticker) => (
                <StickerButton key={sticker.id} sticker={sticker} onPick={onPick} />
              ))}
            </div>
          </section>
        ))
      )}

      <div className="flex items-center gap-2 self-start">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? t('emoji.importing') : t('emoji.addPack')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={busy}
          onChange={(event) => void onFiles(event.target.files)}
        />
      </div>
    </div>
  )
}

function StickerButton({ sticker, onPick }: { sticker: Sticker; onPick?: (sticker: Sticker) => void }) {
  const openSticker = useApp((s) => s.openSticker)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void openSticker(sticker).then((next) => {
      if (live) setUrl(next)
    })
    return () => {
      live = false
    }
  }, [openSticker, sticker])

  return (
    <button type="button" className="flex items-center justify-center rounded-[var(--radius-md)] p-1 hover:bg-[var(--surface-hover)] transition-colors" onClick={() => onPick?.(sticker)} disabled={!url}>
      {url ? <img src={url} alt="" loading="lazy" className="size-full object-cover" /> : <span className="size-10 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-2)]" />}
    </button>
  )
}
