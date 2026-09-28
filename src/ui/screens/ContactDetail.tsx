import { useState } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { goBack, useNavigate } from '../../crow/router'
import { Avatar, Banner, CopyButton, EmptyState, Field } from '../components/primitives'
import { confirmDanger } from '../components/dialog'
import { BackIcon, TrashIcon } from '../components/Icons'
import { shortNpub, toNpub } from '../../core/identity/keys'
import { relayLabel } from '../../core/transport/relayUrl'
import { formatDateTime } from '../format'
import { displayName } from './ChatList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
    <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
      <BackIcon />
    </Button>
  )

  // Removed on another screen, or a link to someone never added: still a
  // page with a way back, not a dead end.
  if (!contact) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <header className="flex items-center gap-2 min-h-[3.25rem] px-3 py-2 bg-card border-b border-border">
          {back}
        </header>
        <EmptyState title={t('common.unknown')} />
      </div>
    )
  }

  const label = displayName(contact, peer)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <header className="flex items-center gap-2 min-h-[3.25rem] px-3 py-2 bg-card border-b border-border">
        {back}
        <h1 className="flex-1 min-w-0 truncate">{label}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-4" style={{ maxWidth: '32rem' }}>
          <div className="flex flex-col gap-2 text-center">
            <div className="grid place-items-center">
              <Avatar name={label} seed={peer} src={contact.avatar} size="lg" />
            </div>
            <h2 className="text-lg font-semibold">{label}</h2>
            {contact.about ? <p className="text-sm text-muted-foreground">{contact.about}</p> : null}
            <Badge variant={contact.verification === 'verified' ? 'success' : 'secondary'}>
              {contact.verification === 'verified' ? t('contacts.verified') : t('contacts.unverified')}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button
              className="flex-1"
              onClick={() => navigate({ name: 'chat', peer })}
              disabled={contact.blocked}
            >
              {t('nav.chats')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate({ name: 'verify', peer })}>
              {t('contacts.verify')}
            </Button>
          </div>

          <Card className="flex flex-col gap-4 p-4">
            <Field label={t('contacts.nameLabel')}>
              <Input
                value={name}
                maxLength={64}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => {
                  if (name !== contact.name) void updateContact(peer, { name })
                }}
              />
            </Field>
            <Field label={t('contacts.noteLabel')} hint={t('contacts.noteHint')}>
              <Textarea
                className="min-h-[3.5rem]"
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                onBlur={() => {
                  if (note !== (contact.note ?? '')) void updateContact(peer, { note })
                }}
              />
            </Field>
          </Card>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {t('contacts.copyKey')}
            </span>
            <code className="font-mono text-sm break-all">{toNpub(peer)}</code>
            <CopyButton value={toNpub(peer)} />
            {contact.relays.length > 0 ? (
              <p className="text-sm text-muted-foreground/70">{contact.relays.map(relayLabel).join(' · ')}</p>
            ) : null}
            <p className="text-sm text-muted-foreground/70">
              {t('common.add')}: {formatDateTime(contact.addedAt, locale)}
            </p>
          </div>

          {contact.blocked ? (
            <Banner tone="danger">
              <span className="flex-1 min-w-0">{t('chat.blocked')}</span>
              <Button variant="ghost" size="sm" onClick={() => void updateContact(peer, { blocked: false })}>
                {t('chat.unblock')}
              </Button>
            </Banner>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                if (await confirmDanger(t('chat.block'), t('chat.block'), t('contacts.blockConfirm'))) {
                  void updateContact(peer, { blocked: true })
                }
              }}
            >
              {t('chat.block')}
            </Button>
          )}

          <Button
            variant="destructive"
            className="w-full"
            onClick={async () => {
              if (
                !(await confirmDanger(t('common.remove'), t('common.remove'), t('contacts.removeConfirm')))
              ) {
                return
              }
              void removeContact(peer)
              navigate({ name: 'contacts' }, true)
            }}
          >
            <TrashIcon size={16} />
            {t('common.remove')}
          </Button>

          <p className="text-sm text-muted-foreground">{shortNpub(toNpub(peer))}</p>
        </div>
      </div>
    </div>
  )
}
