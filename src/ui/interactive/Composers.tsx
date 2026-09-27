import { useState } from 'react'
import { useApp } from '../../app/store'
import { useI18n } from '../../i18n'
import { Modal, Toggle } from '../components/primitives'
import { CloseIcon, PlusIcon } from '../components/Icons'
import { makeChecklist, makePoll, MAX_QUESTION_CHARS } from '../../core/models/interactive'
import { MAX_CHECKLIST_ITEMS, MAX_ITEM_CHARS, MAX_POLL_OPTIONS } from '../../core/models/protocol'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

/**
 * Write a poll or a checklist and send it to the open conversation.
 *
 * Validation is the same `makePoll`/`makeChecklist` the protocol layer uses,
 * so a form this lets through is one every receiver accepts, and the error it
 * shows is the reason the receiver would have refused it.
 */

function Lines({
  values,
  onChange,
  min,
  max,
  label,
  placeholder,
  addLabel,
}: {
  values: string[]
  onChange: (values: string[]) => void
  min: number
  max: number
  label: string
  placeholder: (n: number) => string
  addLabel: string
}) {
  const { t } = useI18n()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-[var(--text)]">{label}</legend>
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            dir="auto"
            value={value}
            maxLength={MAX_ITEM_CHARS}
            placeholder={placeholder(index + 1)}
            aria-label={placeholder(index + 1)}
            className="flex-1"
            onChange={(event) => onChange(values.map((v, i) => (i === index ? event.target.value : v)))}
          />
          {values.length > min ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('interactive.removeRow')}
              onClick={() => onChange(values.filter((_, i) => i !== index))}
            >
              <CloseIcon size={16} />
            </Button>
          ) : null}
        </div>
      ))}
      {values.length < max ? (
        <Button variant="ghost" size="sm" onClick={() => onChange([...values, ''])}>
          <PlusIcon size={15} />
          {addLabel}
        </Button>
      ) : null}
    </fieldset>
  )
}

export function PollComposer({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const sendPoll = useApp((s) => s.sendPoll)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [multi, setMulti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!question.trim()) return setError(t('interactive.needQuestion'))
    if (options.filter((option) => option.trim()).length < 2) return setError(t('interactive.needOptions'))
    let poll
    try {
      poll = makePoll(question, options, multi)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    setBusy(true)
    const sent = await sendPoll(poll)
    setBusy(false)
    if (sent) onClose()
  }

  return (
    <Modal title={t('interactive.newPoll')} onClose={onClose} labelledBy="poll-composer-title">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label>{t('interactive.question')}</Label>
          <Input
            dir="auto"
            value={question}
            maxLength={MAX_QUESTION_CHARS}
            placeholder={t('interactive.questionPlaceholder')}
            onChange={(event) => {
              setQuestion(event.target.value)
              setError(null)
            }}
          />
          {error ? <span className="text-sm text-[var(--danger)]" role="alert">{error}</span> : null}
        </div>
        <Lines
          values={options}
          onChange={(next) => {
            setOptions(next)
            setError(null)
          }}
          min={2}
          max={MAX_POLL_OPTIONS}
          label={t('interactive.options')}
          placeholder={(n) => t('interactive.option', { n })}
          addLabel={t('interactive.addOption')}
        />
        <Toggle label={t('interactive.multi')} checked={multi} onChange={setMulti} />
        <Button type="submit" className="w-full" disabled={busy}>
          {t('interactive.send')}
        </Button>
      </form>
    </Modal>
  )
}

export function ChecklistComposer({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const sendChecklist = useApp((s) => s.sendChecklist)
  const [title, setTitle] = useState('')
  const [items, setItems] = useState(['', ''])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!title.trim()) return setError(t('interactive.needTitle'))
    if (!items.some((item) => item.trim())) return setError(t('interactive.needItems'))
    let checklist
    try {
      checklist = makeChecklist(title, items)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    setBusy(true)
    const sent = await sendChecklist(checklist)
    setBusy(false)
    if (sent) onClose()
  }

  return (
    <Modal title={t('interactive.newChecklist')} onClose={onClose} labelledBy="checklist-composer-title">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label>{t('interactive.title')}</Label>
          <Input
            dir="auto"
            value={title}
            maxLength={MAX_QUESTION_CHARS}
            placeholder={t('interactive.titlePlaceholder')}
            onChange={(event) => {
              setTitle(event.target.value)
              setError(null)
            }}
          />
          {error ? <span className="text-sm text-[var(--danger)]" role="alert">{error}</span> : null}
        </div>
        <Lines
          values={items}
          onChange={(next) => {
            setItems(next)
            setError(null)
          }}
          min={1}
          max={MAX_CHECKLIST_ITEMS}
          label={t('interactive.items')}
          placeholder={(n) => t('interactive.item', { n })}
          addLabel={t('interactive.addItem')}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {t('interactive.send')}
        </Button>
      </form>
    </Modal>
  )
}
