import { useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { goBack, useNavigate } from '../../app/router'
import { Avatar, CopyButton } from '../components/primitives'
import { shortNpub, toNpub } from '../../core/identity/keys'
import { relayLabel } from '../../core/transport/relayUrl'
import { formatDateTime } from '../format'
import { displayName } from './ChatList'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import {
  ArrowLeft,
  MessageSquare,
  Shield,
  Trash2,
  Ban,
  UserX,
} from 'lucide-react'

export function ContactDetail({ peer }: { peer: string }) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const contacts = useApp((s) => s.contacts)
  const updateContact = useApp((s) => s.updateContact)
  const removeContact = useApp((s) => s.removeContact)

  const contact = contacts.get(peer)
  const [name, setName] = useState(contact?.name ?? '')
  const [note, setNote] = useState(contact?.note ?? '')

  if (!contact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <Button variant="ghost" size="icon" className="btn-back" aria-label={t('common.back')} onClick={() => goBack()}>
            <ArrowLeft size={18} strokeWidth={1.75} />
          </Button>
        </header>
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-[var(--text-muted)]">
          <UserX size={32} strokeWidth={1.25} className="text-[var(--text-faint)]" />
          <h3 className="text-[var(--text)]">{t('common.unknown')}</h3>
        </div>
      </div>
    )
  }

  const label = displayName(contact, peer)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <Button variant="ghost" size="icon" className="btn-back" aria-label={t('common.back')} onClick={() => goBack()}>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="flex-1 truncate text-base font-semibold tracking-tight text-[var(--text)]">{label}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[32rem] flex flex-col gap-4 p-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <Avatar name={label} seed={peer} src={contact.avatar} size="lg" />
            <h2 className="text-base font-semibold text-[var(--text)]">{label}</h2>
            {contact.about ? <p className="text-xs text-[var(--text-muted)]">{contact.about}</p> : null}
            <Badge variant={contact.verification === 'verified' ? 'success' : 'secondary'}>
              {contact.verification === 'verified' ? t('contacts.verified') : t('contacts.unverified')}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => navigate({ name: 'chat', peer })}
              disabled={contact.blocked}
            >
              <MessageSquare size={16} />
              {t('nav.chats')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate({ name: 'verify', peer })}>
              <Shield size={16} />
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
              <span className="text-xs text-[var(--text-muted)]">{t('contacts.noteHint')}</span>
              <Textarea
                style={{ minHeight: '3.5rem' }}
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                onBlur={() => {
                  if (note !== (contact.note ?? '')) void updateContact(peer, { note })
                }}
              />
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal">
              {t('contacts.copyKey')}
            </span>
            <code className="font-mono text-xs text-[var(--text)] break-all">
              {toNpub(peer)}
            </code>
            <CopyButton value={toNpub(peer)} />
            {contact.relays.length > 0 ? (
              <p className="text-[0.75rem] text-[var(--text-faint)]">{contact.relays.map(relayLabel).join(' · ')}</p>
            ) : null}
            <p className="text-[0.75rem] text-[var(--text-faint)]">
              {t('common.add')}: {formatDateTime(contact.addedAt, locale)}
            </p>
          </div>

          {contact.blocked ? (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--danger)]">
              <Ban size={16} />
              <span className="flex-1">{t('chat.blocked')}</span>
              <Button variant="ghost" size="sm" onClick={() => void updateContact(peer, { blocked: false })}>
                {t('chat.unblock')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (confirm(t('contacts.blockConfirm'))) void updateContact(peer, { blocked: true })
              }}
            >
              <Ban size={16} />
              {t('chat.block')}
            </Button>
          )}

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => {
              if (!confirm(t('contacts.removeConfirm'))) return
              void removeContact(peer)
              navigate({ name: 'contacts' }, true)
            }}
          >
            <Trash2 size={16} />
            {t('common.remove')}
          </Button>

          <p className="text-xs text-[var(--text-muted)]">{shortNpub(toNpub(peer))}</p>
        </div>
      </div>
    </div>
  )
}
