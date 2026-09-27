import { useMemo } from 'react'
import { useI18n } from '../../i18n'
import { tallyPoll, type InteractiveUpdate, type PollSpec } from '../../core/models/interactive'
import { CheckIcon } from '../components/Icons'
import { cn } from '../../lib/utils'

export interface PollCardProps {
  poll: PollSpec
  convoId: string
  messageId: string
  updates: readonly InteractiveUpdate[] | undefined
  selfPubkey: string
  nameOf: (pubkey: string) => string
  onVote: (choices: string[]) => void
}

/**
 * A poll, counted on this device from the votes this device holds.
 *
 * Each option is a toggle button rather than a radio: tapping your own choice
 * again withdraws it, which a radio group cannot express.
 */
export function PollCard({ poll, convoId, messageId, updates, selfPubkey, nameOf, onVote }: PollCardProps) {
  const { t } = useI18n()
  const result = useMemo(
    () => tallyPoll(poll, convoId, updates ?? [], selfPubkey),
    [poll, convoId, updates, selfPubkey],
  )
  const headingId = `poll-${messageId}`

  const choose = (optionId: string) => {
    const mine = result.mine
    if (poll.multi) {
      onVote(mine.includes(optionId) ? mine.filter((id) => id !== optionId) : [...mine, optionId])
    } else {
      onVote(mine[0] === optionId ? [] : [optionId])
    }
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={headingId}>
      <div className="text-sm font-medium text-[var(--text)]" id={headingId} dir="auto">
        {poll.question}
      </div>
      <div className="text-xs text-[var(--text-muted)]">{poll.multi ? t('interactive.chooseAny') : t('interactive.chooseOne')}</div>
      <ul className="flex flex-col gap-1">
        {result.options.map((option) => {
          const mine = result.mine.includes(option.id)
          const share = result.voters > 0 ? (option.count / result.voters) * 100 : 0
          return (
            <li key={option.id}>
              <button
                type="button"
                className={cn(
                  'relative flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors',
                  mine ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]' : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-hover)]',
                )}
                aria-pressed={mine}
                title={option.voters.map(nameOf).join('\n') || undefined}
                onClick={() => choose(option.id)}
              >
                <span className="absolute inset-y-0 left-0 rounded-[var(--radius-md)] bg-[var(--accent)]/10" style={{ inlineSize: `${share}%` }} aria-hidden="true" />
                <span className="relative shrink-0" aria-hidden="true">
                  {mine ? <CheckIcon size={12} /> : null}
                </span>
                <span className="relative flex-1 min-w-0" dir="auto">
                  {option.label}
                </span>
                <span className="relative text-xs tabular-nums text-[var(--text-muted)]">{option.count}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="text-xs text-[var(--text-muted)]" aria-live="polite">
        {result.voters > 0 ? t('interactive.votes', { n: result.voters }) : t('interactive.noVotes')}
      </div>
    </div>
  )
}
