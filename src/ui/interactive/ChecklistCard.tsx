import { useMemo, useState } from 'react'
import { foldChecklist, type ChecklistSpec, type InteractiveUpdate } from '../../core/models/interactive'
import { MAX_CHECKLIST_ITEMS, MAX_ITEM_CHARS } from '../../core/models/protocol'
import { PlusIcon } from '../components/Icons'
import { useInteractiveText } from './interactiveText'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

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
  const text = useInteractiveText()
  const [draft, setDraft] = useState('')
  const entries = useMemo(
    () => foldChecklist(checklist, convoId, updates ?? []),
    [checklist, convoId, updates],
  )
  const done = entries.filter((entry) => entry.done).length
  const headingId = `list-${messageId}`

  return (
    <div className="min-w-[min(16rem,62vw)] gap-2 whitespace-normal" role="group" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold" id={headingId} dir="auto">
          {checklist.title}
        </span>
        <span className="tabular-nums text-sm text-muted-foreground">
          {text('progress', { done, total: entries.length })}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => (
          <li key={entry.id}>
            <label
              className={cn(
                'flex cursor-pointer items-start gap-2 py-1',
                entry.done && 'text-muted-foreground/65 line-through',
              )}
              title={entry.by ? text('tickedBy', { name: nameOf(entry.by) }) : undefined}
            >
              <Checkbox
                checked={entry.done}
                onChange={(event) => onCheck(entry.id, event.target.checked)}
              />
              <span className="min-w-0 flex-1" dir="auto">
                {entry.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {entries.length < MAX_CHECKLIST_ITEMS ? (
        <form
          className="mt-2 flex items-center gap-1"
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
            placeholder={text('newItemPlaceholder')}
            aria-label={text('addItem')}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            aria-label={text('addItem')}
            disabled={!draft.trim()}
          >
            <PlusIcon size={16} />
          </button>
        </form>
      ) : null}
    </div>
  )
}
