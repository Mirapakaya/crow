import { useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { useNavigate, useRoute } from '../../app/router'
import { Avatar } from '../components/primitives'
import { displayName } from './ChatList'
import { cn } from '../../lib/utils'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Users, Plus, Search, ShieldCheck } from 'lucide-react'

export function ContactsList() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const contacts = useApp((s) => s.contacts)
  const [query, setQuery] = useState('')
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{t('contacts.title')}</h1>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('contacts.add')}
          onClick={() => navigate({ name: 'add-contact' })}
        >
          <Plus size={18} strokeWidth={1.75} />
        </Button>
      </header>

      {contacts.size > 5 ? (
        <div className="px-3 py-1.5">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
            <Input
              type="search"
              placeholder={t('common.search')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-[var(--text-muted)]">
            <Users size={32} strokeWidth={1.25} className="text-[var(--text-faint)]" />
            <h3 className="text-[var(--text)]">{t('contacts.empty')}</h3>
            <Button className="mt-2" onClick={() => navigate({ name: 'add-contact' })}>
              {t('contacts.add')}
            </Button>
          </div>
        ) : (
          list.map((contact) => {
            const active = open === contact.pubkey
            return (
              <button
                key={contact.pubkey}
                aria-current={active || undefined}
                onClick={() => navigate({ name: 'contact', peer: contact.pubkey })}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 border-none bg-transparent text-left cursor-pointer transition-colors',
                  active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)]',
                )}
              >
                <Avatar
                  name={displayName(contact, contact.pubkey)}
                  seed={contact.pubkey}
                  src={contact.avatar}
                  size="sm"
                />
                <span className="flex-1 truncate text-sm text-[var(--text)]">{displayName(contact, contact.pubkey)}</span>
                {contact.verification === 'verified' ? (
                  <ShieldCheck size={15} className="text-[var(--success)]" />
                ) : null}
                {contact.blocked ? (
                  <Badge variant="destructive">{t('chat.block')}</Badge>
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
