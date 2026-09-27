import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { foldChecklist, type ChecklistSpec, type InteractiveUpdate } from '../../core/models/interactive'
import { MAX_CHECKLIST_ITEMS, MAX_ITEM_CHARS } from '../../core/models/protocol'
import { PlusIcon } from '../components/Icons'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/utils'

export interface ChecklistCardProps {
  checklist: ChecklistSpec
  convoId: string
  messageId: string
  updates: readonly InteractiveUpdate[] | undefined
  nameOf: (pubkey: string) => string
  onCheck: (itemId: string, done: boolean) => void
  onAdd: (label: string) => void
}

/**
 * A checklist everyone in the conversation can tick and add to. Each line
 * shows the state the newest change gave it, and who made that change.
 */
export function ChecklistCard({
  checklist,
  convoId,
  messageId,
  updates,
  nameOf,
  onCheck,
  onAdd,
}: ChecklistCardProps) {
  const { t } = useI18n()
  const [draft, setDraft] = useState('')
  const entries = useMemo(
    () => foldChecklist(checklist, convoId, updates ?? []),
    [checklist, convoId, updates],
  )
  const done = entries.filter((entry) => entry.done).length
  const headingId = `list-${messageId}`

  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--text)]" id={headingId} dir="auto">
          {checklist.title}
        </span>
        <span className="text-xs text-[var(--text-muted)] tabular-nums">{t('interactive.progress', { done, total: entries.length })}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => (
          <li key={entry.id}>
            <label
              className={cn(
                'flex items-center gap-2.5 py-1 text-sm',
                entry.done && 'text-[var(--text-muted)] line-through',
              )}
              title={entry.by ? t('interactive.tickedBy', { name: nameOf(entry.by) }) : undefined}
            >
              <input
                type="checkbox"
                className="size-4 rounded-[var(--radius-sm)] border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-2"
                checked={entry.done}
                onChange={(event) => onCheck(entry.id, event.target.checked)}
              />
              <span className="flex-1 min-w-0" dir="auto">
                {entry.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {entries.length < MAX_CHECKLIST_ITEMS ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const label = draft.trim()
            if (!label) return
            onAdd(label)
            setDraft('')
          }}
        >
          <Input
            dir="auto"
            value={draft}
            maxLength={MAX_ITEM_CHARS}
            placeholder={t('interactive.newItemPlaceholder')}
            aria-label={t('interactive.addItem')}
            className="flex-1"
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label={t('interactive.addItem')}
            disabled={!draft.trim()}
          >
            <PlusIcon size={16} />
          </Button>
        </form>
      ) : null}
    </div>
  )
}
