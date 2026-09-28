import { useMemo } from 'react'
import { tallyPoll, type InteractiveUpdate, type PollSpec } from '../../core/models/interactive'
import { CheckIcon } from '../components/Icons'
import { useInteractiveText } from './interactiveText'
import { cn } from '@/lib/utils'

export interface PollCardProps {
  poll: PollSpec
  /** The poll message's own conversation: only votes addressed there count. */
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
 * again withdraws it, which a radio group cannot express. The bar behind each
 * option fills from the reading edge, so it grows rightwards in English and
 * leftwards in Persian.
 */
export function PollCard({ poll, convoId, messageId, updates, selfPubkey, nameOf, onVote }: PollCardProps) {
  const text = useInteractiveText()
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
    <div className="min-w-[min(16rem,62vw)] gap-2 whitespace-normal" role="group" aria-labelledby={headingId}>
      <div className="font-semibold" id={headingId} dir="auto">
        {poll.question}
      </div>
      <div className="text-sm text-muted-foreground/75">{poll.multi ? text('chooseAny') : text('chooseOne')}</div>
      <ul className="flex flex-col gap-1">
        {result.options.map((option) => {
          const mine = result.mine.includes(option.id)
          const share = result.voters > 0 ? (option.count / result.voters) * 100 : 0
          return (
            <li key={option.id}>
              <button
                type="button"
                className={cn(
                  'relative z-0 flex min-h-[2.25rem] w-full items-center gap-2 overflow-hidden rounded-md border border-foreground/25 px-2 py-1 text-start transition-colors hover:border-foreground/45',
                  mine && 'border-current',
                )}
                aria-pressed={mine}
                title={option.voters.map(nameOf).join('\n') || undefined}
                onClick={() => choose(option.id)}
              >
                <span
                  className="absolute inset-y-0 start-0 -z-10 bg-current/15"
                  style={{ inlineSize: `${share}%` }}
                  aria-hidden="true"
                />
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-foreground/45" aria-hidden="true">
                  {mine ? <CheckIcon size={12} /> : null}
                </span>
                <span className="min-w-0 flex-1" dir="auto">
                  {option.label}
                </span>
                <span className="tabular-nums text-sm font-medium">{option.count}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="text-sm text-muted-foreground/75" aria-live="polite">
        {result.voters > 0 ? text('votes', { n: result.voters }) : text('noVotes')}
      </div>
    </div>
  )
}
