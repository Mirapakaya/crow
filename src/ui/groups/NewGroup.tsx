import { useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { goBack, useNavigate } from '../../app/router'
import { Avatar } from '../components/primitives'
import { SegmentedControl } from '../components/SegmentedControl'
import { displayName } from '../screens/ChatList'
import { MAX_GROUP_MEMBERS, MAX_MLS_MEMBERS, MAX_SUBJECT_CHARS } from '../../core/models/protocol'
import { explainFailure, useSecureText } from './secureText'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { ArrowLeft, Lock, Users, ShieldCheck, Plus, AlertTriangle } from 'lucide-react'

type Kind = 'small' | 'secure'

export function NewGroup() {
  const { t } = useI18n()
  const text = useSecureText()
  const navigate = useNavigate()
  const contacts = useApp((s) => s.contacts)
  const createGroup = useApp((s) => s.createGroup)
  const createSecureGroup = useApp((s) => s.createSecureGroup)
  const toast = useApp((s) => s.toast)
  const [kind, setKind] = useState<Kind>('small')
  const [subject, setSubject] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const candidates = useMemo(
    () =>
      [...contacts.values()]
        .filter((contact) => contact.accepted && !contact.blocked)
        .sort((a, b) => displayName(a, a.pubkey).localeCompare(displayName(b, b.pubkey))),
    [contacts],
  )
  const secure = kind === 'secure'
  const room = (secure ? MAX_MLS_MEMBERS : MAX_GROUP_MEMBERS) - 1
  const full = chosen.length >= room
  const enough = chosen.length >= (secure ? 1 : 2)

  const toggle = (pubkey: string) =>
    setChosen((current) =>
      current.includes(pubkey)
        ? current.filter((entry) => entry !== pubkey)
        : current.length >= room
          ? current
          : [...current, pubkey],
    )

  const switchKind = (next: Kind) => {
    setKind(next)
    setProblem(null)
    if (next === 'small') setChosen((current) => current.slice(0, MAX_GROUP_MEMBERS - 1))
  }

  const create = async () => {
    setBusy(true)
    setProblem(null)
    if (!secure) {
      const id = await createGroup(chosen, subject)
      setBusy(false)
      if (id) navigate({ name: 'group', id }, true)
      return
    }
    try {
      const { id, missing } = await createSecureGroup(chosen, subject)
      if (missing.length > 0) {
        const names = missing.map((pubkey) => displayName(contacts.get(pubkey), pubkey)).join(', ')
        toast(text('someMissing', { names }))
      }
      navigate({ name: 'group', id }, true)
    } catch (err) {
      setProblem(
        err instanceof Error && /can be added/.test(err.message)
          ? text('noneReady')
          : explainFailure(text, err),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 shrink-0 min-h-[3.25rem] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => goBack()}>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="flex-1 text-base font-semibold tracking-tight text-[var(--text)]">{t('groups.newGroup')}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {candidates.length < (secure ? 1 : 2) ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-[var(--text-muted)]">
            <Users size={32} strokeWidth={1.25} className="text-[var(--text-faint)]" />
            <h3 className="text-[var(--text)]">{t('groups.noContacts')}</h3>
            <Button className="mt-2" onClick={() => navigate({ name: 'add-contact' })}>
              <Plus size={16} />
              {t('chats.addContact')}
            </Button>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[34rem] flex flex-col gap-4 p-4">
            <SegmentedControl
              label={text('kindLabel')}
              value={kind}
              onChange={switchKind}
              options={[
                { value: 'small', label: text('kindSmall') },
                { value: 'secure', label: text('kindSecure') },
              ]}
            />

            {secure ? (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-sm text-[var(--accent-text)]">
                <Lock size={18} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <strong>{text('secureTitle')}</strong>
                  <span className="text-xs">{text('secureBody', { max: MAX_MLS_MEMBERS })}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-sm text-[var(--accent-text)]">
                <Users size={18} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <strong>{t('groups.limitTitle', { max: MAX_GROUP_MEMBERS })}</strong>
                  <span className="text-xs">{t('groups.limitBody')}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>{t('groups.name')}</Label>
              <Input
                dir="auto"
                value={subject}
                maxLength={MAX_SUBJECT_CHARS}
                placeholder={t('groups.namePlaceholder')}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] px-1 [dir=rtl]_[:root]&:normal-case [dir=rtl]_[:root]&:tracking-normal" id="group-members-label">
                {t('groups.pickMembers')}
              </span>
              <span className="text-xs text-[var(--text-muted)] tabular-nums" aria-live="polite">
                {full ? t('groups.full') : t('groups.chosen', { n: chosen.length, max: room })}
              </span>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden" role="group" aria-labelledby="group-members-label">
              {candidates.map((contact) => {
                const on = chosen.includes(contact.pubkey)
                const name = displayName(contact, contact.pubkey)
                return (
                  <label key={contact.pubkey} className={`flex items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)] first:border-t-0 cursor-pointer transition-colors hover:bg-[var(--surface-hover)]${!on && full ? ' opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="h-[1.125rem] w-[1.125rem] appearance-none shrink-0 rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--surface)] cursor-pointer transition-colors checked:bg-[var(--accent)] checked:border-[var(--accent)] grid place-items-center after:content-[''] after:w-[0.3rem] after:h-[0.6rem] after:border-t-0 after:border-r-[2px] after:border-b-[2px] after:border-l-0 after:border-solid after:border-[var(--accent-fg)] after:rotate-45 after:translate-[-1px,1px] after:opacity-0 checked:after:opacity-100"
                      checked={on}
                      aria-label={name}
                      disabled={!on && full}
                      onChange={() => toggle(contact.pubkey)}
                    />
                    <Avatar name={name} seed={contact.pubkey} src={contact.avatar} size="sm" />
                    <span className="flex-1 truncate text-sm text-[var(--text)]">
                      <bdi>{name}</bdi>
                    </span>
                    {contact.verification === 'verified' ? (
                      <ShieldCheck size={15} className="text-[var(--success)]" />
                    ) : null}
                  </label>
                )
              })}
            </div>

            {secure ? null : <p className="text-xs text-[var(--text-muted)]">{t('groups.fixedMembers')}</p>}

            {problem ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] px-3 py-2.5 text-sm text-[var(--danger)]">
                <AlertTriangle size={16} />
                <span className="flex-1">{problem}</span>
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={!enough || busy}
              aria-busy={busy}
              onClick={() => void create()}
            >
              {busy && secure ? text('finding') : t('groups.create')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
