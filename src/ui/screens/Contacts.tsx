import { useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { useNavigate, useRoute } from '../../app/router'
import { Avatar, EmptyState } from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { PlusIcon, ShieldCheckIcon } from '../components/Icons'
import { displayName } from './ChatList'

export function ContactsList() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const contacts = useApp((s) => s.contacts)
  const [query, setQuery] = useState('')
  // The contact open beside this list, on a wide window.
  const route = useRoute()
  const open = route.name === 'contact' ? route.peer : null

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...contacts.values()]
      .filter((contact) => !needle || displayName(contact, contact.pubkey).toLowerCase().includes(needle))
      .sort(
        (a, b) =>
          Number(a.blocked) - Number(b.blocked) ||
          displayName(a, a.pubkey).localeCompare(displayName(b, b.pubkey)),
      )
  }, [contacts, query])

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="grow">{t('contacts.title')}</h1>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('contacts.add')}
          onClick={() => navigate({ name: 'add-contact' })}
        >
          <PlusIcon />
        </Button>
      </header>

      {contacts.size > 5 ? (
        <div style={{ padding: 'var(--space-2) var(--space-3)' }}>
          <Input
            type="search"
            placeholder={t('common.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <div className="screen-scroll">
        {list.length === 0 ? (
          <EmptyState
            title={t('contacts.empty')}
            action={
              <Button onClick={() => navigate({ name: 'add-contact' })}>
                {t('contacts.add')}
              </Button>
            }
          />
        ) : (
          list.map((contact) => (
            <Card
              key={contact.pubkey}
              className="mx-3 mb-2 overflow-hidden p-0"
            >
              <button
                className="list-row"
                aria-current={open === contact.pubkey || undefined}
                onClick={() => navigate({ name: 'contact', peer: contact.pubkey })}
              >
                <Avatar
                  name={displayName(contact, contact.pubkey)}
                  seed={contact.pubkey}
                  src={contact.avatar}
                  size="sm"
                />
                <span className="grow truncate">{displayName(contact, contact.pubkey)}</span>
                {contact.verification === 'verified' ? (
                  <ShieldCheckIcon size={15} style={{ color: 'var(--success)' }} />
                ) : null}
                {contact.blocked ? <span className="badge badge-danger">{t('chat.block')}</span> : null}
              </button>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
