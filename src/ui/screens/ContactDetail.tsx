import { useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { goBack, useNavigate } from '../../app/router'
import { Avatar, CopyButton, EmptyState } from '../components/primitives'
import { confirmDanger } from '../components/dialog'
import { ArrowLeft, Trash } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { shortNpub, toNpub } from '../../core/identity/keys'
import { relayLabel } from '../../core/transport/relayUrl'
import { formatDateTime } from '../format'
import { displayName } from './ChatList'

/**
 * One contact: their name and note, their key, verifying and blocking them.
 * Reached from the contact list, and not on the way to answering a message, so
 * it is lazy (ADR-058).
 */
export function ContactDetail({ peer }: { peer: string }) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const contacts = useApp((s) => s.contacts)
  const updateContact = useApp((s) => s.updateContact)
  const removeContact = useApp((s) => s.removeContact)

  const contact = contacts.get(peer)
  const [name, setName] = useState(contact?.name ?? '')
  const [note, setNote] = useState(contact?.note ?? '')

  const back = (
    <Button variant="ghost" size="icon" className="btn-back shrink-0" aria-label={t('common.back')} onClick={() => goBack()}>
      <ArrowLeft size={18} strokeWidth={1.75} />
    </Button>
  )

  // Removed on another screen, or a link to someone never added: still a
  // page with a way back, not a dead end.
  if (!contact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
          {back}
        </header>
        <EmptyState title={t('common.unknown')} />
      </div>
    )
  }

  const label = displayName(contact, peer)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        {back}
        <h1 className="flex-1 truncate text-base font-semibold tracking-tight text-[var(--text)]">{label}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[32rem] flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2 items-center text-center">
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <Avatar name={label} seed={peer} src={contact.avatar} size="lg" />
            </div>
            <h2 style={{ fontSize: 'var(--step-1)' }}>{label}</h2>
            {contact.about ? <p className="text-sm text-[var(--text-muted)]">{contact.about}</p> : null}
            <Badge variant={contact.verification === 'verified' ? 'success' : 'outline'}>
              {contact.verification === 'verified' ? t('contacts.verified') : t('contacts.unverified')}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => navigate({ name: 'chat', peer })} disabled={contact.blocked}>
              {t('nav.chats')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate({ name: 'verify', peer })}>
              {t('contacts.verify')}
            </Button>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t('contacts.nameLabel')}</Label>
              <Input
                value={name}
                maxLength={64}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => {
                  if (name !== contact.name) void updateContact(peer, { name })
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('contacts.noteLabel')}</Label>
              <Textarea
                style={{ minHeight: '3.5rem' }}
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                onBlur={() => {
                  if (note !== (contact.note ?? '')) void updateContact(peer, { note })
                }}
              />
              <span className="text-xs text-[var(--text-muted)]">{t('contacts.noteHint')}</span>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{t('contacts.copyKey')}</span>
            <code className="mono small" style={{ wordBreak: 'break-all' }}>
              {toNpub(peer)}
            </code>
            <CopyButton value={toNpub(peer)} />
            {contact.relays.length > 0 ? (
              <p className="text-xs text-[var(--text-faint)]">{contact.relays.map(relayLabel).join(' · ')}</p>
            ) : null}
            <p className="text-xs text-[var(--text-faint)]">
              {t('common.add')}: {formatDateTime(contact.addedAt, locale)}
            </p>
          </div>

          {contact.blocked ? (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              <span className="flex-1">{t('chat.blocked')}</span>
              <Button variant="ghost" size="sm" onClick={() => void updateContact(peer, { blocked: false })}>
                {t('chat.unblock')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={async () => {
              if (await confirmDanger(t('chat.block'), t('chat.block'), t('contacts.blockConfirm'))) {
                void updateContact(peer, { blocked: true })
              }
            }}>
              {t('chat.block')}
            </Button>
          )}

          <Button variant="destructive" className="w-full" onClick={async () => {
            if (!(await confirmDanger(t('common.remove'), t('common.remove'), t('contacts.removeConfirm')))) {
              return
            }
            void removeContact(peer)
            navigate({ name: 'contacts' }, true)
          }}>
            <Trash size={16} />
            {t('common.remove')}
          </Button>

          <p className="text-xs text-[var(--text-muted)]">{shortNpub(toNpub(peer))}</p>
        </div>
      </div>
    </div>
  )
}
