import { useMemo, useState } from 'react'
import { useApp } from '../../crow/store'
import { useI18n } from '../../i18n'
import { useNavigate, useRoute } from '../../crow/router'
import { Avatar, EmptyState } from '../components/primitives'
import { PlusIcon, ShieldCheckIcon } from '../components/Icons'
import { displayName } from './ChatList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <header className="flex items-center gap-2 min-h-[3.25rem] px-3 py-2 bg-card border-b border-border">
        <h1 className="flex-1 min-w-0">{t('contacts.title')}</h1>
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
        <div className="p-2 px-3">
          <Input
            type="search"
            placeholder={t('common.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {list.length === 0 ? (
          <EmptyState
            title={t('contacts.empty')}
            action={<Button onClick={() => navigate({ name: 'add-contact' })}>{t('contacts.add')}</Button>}
          />
        ) : (
          list.map((contact) => (
            <button
              key={contact.pubkey}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 text-start hover:bg-accent/50',
                open === contact.pubkey && 'bg-accent/30',
              )}
              aria-current={open === contact.pubkey || undefined}
              onClick={() => navigate({ name: 'contact', peer: contact.pubkey })}
            >
              <Avatar
                name={displayName(contact, contact.pubkey)}
                seed={contact.pubkey}
                src={contact.avatar}
                size="sm"
              />
              <span className="flex-1 min-w-0 truncate">{displayName(contact, contact.pubkey)}</span>
              {contact.verification === 'verified' ? (
                <ShieldCheckIcon size={15} className="text-success" />
              ) : null}
              {contact.blocked ? <Badge variant="destructive">{t('chat.block')}</Badge> : null}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
