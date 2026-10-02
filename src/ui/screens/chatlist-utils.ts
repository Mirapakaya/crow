import { shortNpub, toNpub } from '../../core/identity/keys'
import type { Contact, Conversation, LocaleCode } from '../../core/models/types'

export function displayName(contact: Contact | undefined, pubkey: string): string {
  return contact?.name || contact?.remoteName || shortNpub(toNpub(pubkey))
}

/**
 * Names as a sentence would list them, in the reader's language — "Bob,
 * Carol and Dave" / «باب، کارول و دیو» — rather than joined with a Latin
 * comma that reads wrongly in Persian.
 */
export function listNames(names: readonly string[], locale: LocaleCode): string {
  try {
    return new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' }).format(names)
  } catch {
    return names.join(', ')
  }
}

/** What a conversation is called: its person, or its group's name, or who is in it. */
export function conversationTitle(
  conversation: Conversation,
  contacts: ReadonlyMap<string, Contact>,
  locale: LocaleCode,
): string {
  if (conversation.kind !== 'group') {
    return displayName(contacts.get(conversation.peerPubkey), conversation.peerPubkey)
  }
  if (conversation.subject) return conversation.subject
  const names = conversation.members.map((pubkey) => displayName(contacts.get(pubkey), pubkey))
  return listNames(names, locale)
}

/**
 * A request is a conversation the user has not taken: a direct one with a
 * contact they have not accepted, or a group started by someone outside their
 * address book.
 */
export const isRequest = (conversation: Conversation, contacts: ReadonlyMap<string, Contact>): boolean =>
  conversation.kind === 'group'
    ? !conversation.accepted
    : contacts.get(conversation.peerPubkey)?.accepted === false
