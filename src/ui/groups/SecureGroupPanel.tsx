import { useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { useNavigate } from '../../app/router'
import type { Conversation } from '../../core/models/types'
import { MAX_MLS_MEMBERS } from '../../core/models/protocol'
import { Avatar, Banner } from '../components/primitives'
import { confirmDanger } from '../components/dialog'
import { LockIcon, PlusIcon, RefreshIcon, ShieldCheckIcon, TrashIcon } from '../components/Icons'
import { displayName } from '../screens/ChatList'
import { explainFailure, useSecureText } from './secureText'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * RFC 9420's epoch authenticator, as people can read it aloud: the first 80
 * bits in five groups of four. Enough that a mismatch is never a coincidence,
 * short enough to compare across a table.
 */
export function formatSecurityCode(code: string): string {
  return (code.slice(0, 20).match(/.{4}/g) ?? []).join(' ')
}

function relative(sec: number, locale: string): string {
  const seconds = sec - Date.now() / 1000
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const days = Math.round(seconds / 86_400)
  if (Math.abs(days) >= 1) return format.format(days, 'day')
  const hours = Math.round(seconds / 3600)
  if (Math.abs(hours) >= 1) return format.format(hours, 'hour')
  return format.format(Math.round(seconds / 60), 'minute')
}

/**
 * Everything particular to a forward-secret group on its info screen: the
 * code members compare, how fresh this device's keys are, who runs it, and
 * the changes an MLS group — unlike a small one — can make to itself.
 */
export function SecureGroupPanel({ group }: { group: Conversation }) {
  const { t, locale } = useI18n()
  const text = useSecureText()
  const navigate = useNavigate()
  const contacts = useApp((s) => s.contacts)
  const identity = useApp((s) => s.identity)
  const changeSecureGroup = useApp((s) => s.changeSecureGroup)
  const deleteConversation = useApp((s) => s.deleteConversation)
  const toast = useApp((s) => s.toast)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [chosen, setChosen] = useState<string[]>([])
  const mls = group.mls!
  const self = identity?.pubkey ?? ''
  const amAdmin = mls.admins.includes(self)

  const addable = useMemo(
    () =>
      [...contacts.values()]
        .filter((c) => c.accepted && !c.blocked && !group.members.includes(c.pubkey))
        .sort((a, b) => displayName(a, a.pubkey).localeCompare(displayName(b, b.pubkey), locale)),
    [contacts, group.members, locale],
  )
  const room = MAX_MLS_MEMBERS - (group.members.length + 1)

  const run = async (change: Parameters<typeof changeSecureGroup>[1], after?: () => void) => {
    setBusy(true)
    try {
      const { missing } = await changeSecureGroup(group.id, change)
      if (missing.length > 0) {
        const names = missing.map((pubkey) => displayName(contacts.get(pubkey), pubkey)).join(', ')
        toast(text('someMissing', { names }))
      }
      after?.()
    } catch (err) {
      toast(explainFailure(text, err), 'danger')
    } finally {
      setBusy(false)
    }
  }

  if (mls.left) {
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="warning">
          <span className="grow">{text('left')}</span>
        </Banner>
        <Button
          variant="destructive"
          className="w-full"
          onClick={async () => {
            if (!(await confirmDanger(text('deleteHistory'), text('deleteHistory'), text('deleteConfirm'))))
              return
            void deleteConversation(group.id).then(() => navigate({ name: 'chats' }, true))
          }}
        >
          <TrashIcon size={16} />
          {text('deleteHistory')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <LockIcon size={16} />
          <strong>{text('badge')}</strong>
        </div>
        <p className="text-xs text-text-muted">{text('explainer')}</p>
        <div className="flex flex-col gap-2" aria-live="polite">
          <span className="section-title">{text('code')}</span>
          <code className="security-code" dir="ltr">
            {formatSecurityCode(mls.code)}
          </code>
          <span className="text-xs text-text-muted tabular">{text('generation', { n: mls.epoch })}</span>
          <p className="text-xs text-text-muted">{text('codeHint')}</p>
        </div>
        <p className="text-xs">{text('refreshed', { when: relative(mls.refreshedAt, locale) })}</p>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void run({ rotate: true })}
        >
          <RefreshIcon size={14} />
          {busy ? text('working') : text('refreshNow')}
        </Button>
      </div>

      <div className="card-section">
        {identity ? (
          <div className="flex w-full items-center gap-3 px-4 py-3 hover:bg-surface-hover">
            <Avatar name={identity.name} seed={identity.pubkey} src={identity.avatar} size="sm" />
            <span className="grow truncate">
              <bdi>{identity.name}</bdi>
            </span>
            {amAdmin ? <span className="badge">{text('admin')}</span> : null}
            <span className="text-xs text-text-muted">{t('groups.you')}</span>
          </div>
        ) : null}
        {[...group.members]
          .sort((a, b) =>
            displayName(contacts.get(a), a).localeCompare(displayName(contacts.get(b), b), locale),
          )
          .map((pubkey) => {
            const contact = contacts.get(pubkey)
            const name = displayName(contact, pubkey)
            return (
              <div key={pubkey} className="flex w-full items-center gap-3 px-4 py-3">
                <Avatar name={name} seed={pubkey} src={contact?.avatar} size="sm" />
                <span className="grow truncate">
                  <bdi>{name}</bdi>
                </span>
                {contact?.verification === 'verified' ? (
                  <ShieldCheckIcon size={15} style={{ color: 'var(--success)' }} />
                ) : null}
                {mls.admins.includes(pubkey) ? <span className="badge">{text('admin')}</span> : null}
                {amAdmin ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    disabled={busy}
                    aria-label={`${text('remove')} ${name}`}
                    onClick={async () => {
                      if (
                        await confirmDanger(text('remove'), text('remove'), text('removeConfirm', { name }))
                      ) {
                        void run({ remove: pubkey })
                      }
                    }}
                  >
                    {text('remove')}
                  </Button>
                ) : null}
              </div>
            )
          })}
      </div>

      {amAdmin ? (
        adding ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-text-muted">{addable.length > 0 ? text('addHint') : text('nobodyToAdd')}</p>
            {addable.length > 0 ? (
              <div className="card-section" role="group" aria-label={text('add')}>
                {addable.map((contact) => {
                  const on = chosen.includes(contact.pubkey)
                  const name = displayName(contact, contact.pubkey)
                  const blocked = !on && chosen.length >= room
                  return (
                    <label
                      key={contact.pubkey}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3',
                        blocked ? 'opacity-50 pointer-events-none' : 'cursor-pointer',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={on}
                        aria-label={name}
                        disabled={blocked}
                        onChange={() =>
                          setChosen((current) =>
                            on ? current.filter((p) => p !== contact.pubkey) : [...current, contact.pubkey],
                          )
                        }
                      />
                      <Avatar name={name} seed={contact.pubkey} src={contact.avatar} size="sm" />
                      <span className="grow truncate">
                        <bdi>{name}</bdi>
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                className="grow"
                disabled={busy || chosen.length === 0}
                onClick={() =>
                  void run({ add: chosen }, () => {
                    setAdding(false)
                    setChosen([])
                  })
                }
              >
                {busy ? text('finding') : text('addChosen', { n: chosen.length })}
              </Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full"
            disabled={room <= 0}
            onClick={() => setAdding(true)}
          >
            <PlusIcon size={16} />
            {text('add')}
          </Button>
        )
      ) : null}

      <Button
        variant="destructive"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          const note = amAdmin && group.members.length > 0 ? `\n\n${text('leaveAdmin')}` : ''
          if (!(await confirmDanger(text('leave'), text('leave'), text('leaveConfirm') + note))) return
          void run({ leave: true }, () => navigate({ name: 'chats' }, true))
        }}
      >
        {text('leave')}
      </Button>
    </div>
  )
}
