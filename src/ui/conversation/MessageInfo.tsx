import { useApp } from '../../crow/store'
import { useI18n, type TranslationKey } from '../../i18n'
import { Modal } from '../components/primitives'
import { formatDateTime } from '../format'
import { displayName } from '../screens/ChatList'
import type { Message, MessageStatus } from '../../core/models/types'

const STATE: Record<MessageStatus, TranslationKey> = {
  queued: 'status.queued',
  sending: 'status.sending',
  sent: 'status.sent',
  delivered: 'status.delivered',
  read: 'status.read',
  failed: 'status.failed',
}

/**
 * A sent message's details: when it was sent, when it reached their device,
 * and when they read it — the facts behind its ticks, which show reading alone
 * (ADR-061). In a group each of those is per person, so there is a row each.
 * The times are the recipients' own, and never earlier than the message.
 */
export function MessageInfo({ message, onClose }: { message: Message; onClose: () => void }) {
  const { t, locale } = useI18n()
  const contacts = useApp((s) => s.contacts)
  const when = (at: number | undefined) => (at ? formatDateTime(at, locale) : t('chat.infoNotYet'))

  const pair = (key: string, label: string, value: string) => (
    <div key={key} className="grid grid-cols-2 gap-2 py-1">
      <dt dir="auto">{label}</dt>
      <dd className="text-end">{value}</dd>
    </div>
  )

  return (
    <Modal title={t('chat.infoTitle')} onClose={onClose}>
      <dl className="flex flex-col gap-1">
        {pair('sent', t('status.sent'), formatDateTime(message.ts, locale))}
        {message.receipts
          ? Object.entries(message.receipts).map(([pubkey, state]) => {
              const at = message.receiptsAt?.[pubkey]
              const label = displayName(contacts.get(pubkey), pubkey)
              return pair(
                pubkey,
                label,
                at ? `${t(STATE[state])} · ${formatDateTime(at, locale)}` : t(STATE[state]),
              )
            })
          : [
              // A read receipt says it arrived too, and is sometimes the only one sent.
              pair('delivered', t('status.delivered'), when(message.deliveredAt ?? message.readAt)),
              pair('read', t('status.read'), when(message.readAt)),
            ]}
        {pair('via', t('chat.infoVia'), message.via === 'direct' ? t('status.direct') : t('settings.relays'))}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">{t('chat.infoHint')}</p>
    </Modal>
  )
}
