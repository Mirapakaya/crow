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
    <Button size="icon" variant="ghost" aria-label={t('common.back')} title={t('common.back')} onClick={() => goBack()}>
      <BackIcon />
    </Button>
  )

  // Removed on another screen, or a link to someone never added: still a
  // page with a way back, not a dead end.
  if (!contact) {
    return (
      <div className="screen">
        <header className="app-header">{back}</header>
        <EmptyState title={t('common.unknown')} />
      </div>
    )
  }

  const label = displayName(contact, peer)

  return (
    <div className="screen">
      <header className="app-header">
        {back}
        <h1 className="grow truncate">{label}</h1>
      </header>

      <div className="screen-scroll">
        <div className="container stack" style={{ maxWidth: '32rem' }}>
          <div className="stack-sm center">
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <Avatar name={label} seed={peer} src={contact.avatar} size="lg" />
            </div>
            <h2 style={{ fontSize: 'var(--step-1)' }}>{label}</h2>
            {contact.about ? <p className="muted small">{contact.about}</p> : null}
            <span className={`badge ${contact.verification === 'verified' ? 'badge-success' : ''}`}>
              {contact.verification === 'verified' ? t('contacts.verified') : t('contacts.unverified')}
            </span>
          </div>

          <div className="row">
            <Button
              className="grow"
              onClick={() => navigate({ name: 'chat', peer })}
              disabled={contact.blocked}
            >
              {t('nav.chats')}
            </Button>
            <Button variant="outline" className="grow" onClick={() => navigate({ name: 'verify', peer })}>
              {t('contacts.verify')}
            </Button>
          </div>

          <div className="card stack">
            <Field label={t('contacts.nameLabel')}>
              <input
                className="input"
                value={name}
                maxLength={64}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => {
                  if (name !== contact.name) void updateContact(peer, { name })
                }}
              />
            </Field>
            <Field label={t('contacts.noteLabel')} hint={t('contacts.noteHint')}>
              <textarea
                className="textarea"
                style={{ minHeight: '3.5rem' }}
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                onBlur={() => {
                  if (note !== (contact.note ?? '')) void updateContact(peer, { note })
                }}
              />
            </Field>
          </div>

          <div className="card stack-sm">
            <span className="section-title">{t('contacts.copyKey')}</span>
            <code className="mono small" style={{ wordBreak: 'break-all' }}>
              {toNpub(peer)}
            </code>
            <CopyButton value={toNpub(peer)} />
            {contact.relays.length > 0 ? (
              <p className="faint">{contact.relays.map(relayLabel).join(' · ')}</p>
            ) : null}
            <p className="faint">
              {t('common.add')}: {formatDateTime(contact.addedAt, locale)}
            </p>
          </div>

          {contact.blocked ? (
            <Banner tone="danger">
              <span className="grow">{t('chat.blocked')}</span>
              <Button
                size="sm"
                onClick={() => void updateContact(peer, { blocked: false })}
              >
                {t('chat.unblock')}
              </Button>
            </Banner>
          ) : (
            <Button
              variant="outline" block
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
            variant="destructive" block
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

          <p className="hint">{shortNpub(toNpub(peer))}</p>
        </div>
      </div>
    </div>
  )
}
