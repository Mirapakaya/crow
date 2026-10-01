import { useMemo, useState } from 'react'
import { foldChecklist, type ChecklistSpec, type InteractiveUpdate } from '../../core/models/interactive'
import { MAX_CHECKLIST_ITEMS, MAX_ITEM_CHARS } from '../../core/models/protocol'
import { PlusIcon } from '../components/Icons'
import { useInteractiveText } from './interactiveText'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Checkbox } from '../components/ui/checkbox'

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
    <div className="checklist" role="group" aria-labelledby={headingId}>
      <div className="row-between">
        <span className="poll-question" id={headingId} dir="auto">
          {checklist.title}
        </span>
        <span className="hint tabular">{text('progress', { done, total: entries.length })}</span>
      </div>
      <ul className="checklist-items">
        {entries.map((entry) => (
          <li key={entry.id}>
            <label
              className={entry.done ? 'checklist-item done' : 'checklist-item'}
              title={entry.by ? text('tickedBy', { name: nameOf(entry.by) }) : undefined}
            >
              <Checkbox
                size="sm"
                checked={entry.done}
                onCheckedChange={(checked) => onCheck(entry.id, !!checked)}
              />
              <span className="grow" dir="auto">
                {entry.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {entries.length < MAX_CHECKLIST_ITEMS ? (
        <form
          className="checklist-add"
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
          <Button
            type="submit"
            size="icon" variant="ghost"
            aria-label={text('addItem')} title={text('addItem')}
            disabled={!draft.trim()}
          >
            <PlusIcon size={16} />
          </Button>
        </form>
      ) : null}
    </div>
  )
}
