import { describe, it, expect } from 'vitest'
import { displayName, listNames, conversationTitle, isRequest } from '../src/ui/screens/chatlist-utils'
import type { Contact, Conversation } from '../src/core/models/types'

function makeContact(overrides: Partial<Contact> & { pubkey: string }): Contact {
  return {
    pubkey: overrides.pubkey,
    name: null,
    remoteName: null,
    avatar: null,
    accepted: true,
    blocked: false,
    verification: 'none',
    ...overrides,
  }
}

function makeConvo(overrides: Partial<Conversation> & { id: string }): Conversation {
  return {
    kind: 'direct',
    peerPubkey: 'pk-' + overrides.id,
    members: [],
    subject: null,
    accepted: true,
    lastActivity: Date.now(),
    unread: 0,
    pinned: false,
    ...overrides,
  }
}

describe('displayName', () => {
  it('prefers contact name', () => {
    const contact = makeContact({ pubkey: 'abc', name: 'Alice' })
    expect(displayName(contact, 'abc')).toBe('Alice')
  })

  it('falls back to remoteName', () => {
    const contact = makeContact({ pubkey: 'abc', remoteName: 'Bob' })
    expect(displayName(contact, 'abc')).toBe('Bob')
  })

  it('prefers name over remoteName', () => {
    const contact = makeContact({ pubkey: 'abc', name: 'Alice', remoteName: 'Bob' })
    expect(displayName(contact, 'abc')).toBe('Alice')
  })

  it('returns npub for unknown contact', () => {
    const result = displayName(undefined, 'a'.repeat(64))
    expect(result).toBeTruthy()
    expect(result).toContain('npub')
  })
})

describe('listNames', () => {
  it('joins names in English', () => {
    const result = listNames(['Alice', 'Bob', 'Carol'], 'en')
    expect(result).toContain('Alice')
    expect(result).toContain('Bob')
    expect(result).toContain('Carol')
  })

  it('joins names in Persian (RTL)', () => {
    const result = listNames(['آلیس', 'باب'], 'fa')
    expect(result).toContain('آلیس')
    expect(result).toContain('باب')
  })

  it('single name returns just the name', () => {
    const result = listNames(['Alice'], 'en')
    expect(result).toBe('Alice')
  })

  it('empty list returns empty string', () => {
    const result = listNames([], 'en')
    expect(result).toBe('')
  })

  it('falls back for unknown locale', () => {
    const result = listNames(['A', 'B'], 'en')
    expect(result).toBeTruthy()
  })
})

describe('conversationTitle', () => {
  it('returns contact name for direct conversation', () => {
    const contact = makeContact({ pubkey: 'abc', name: 'Alice' })
    const contacts = new Map([['abc', contact]])
    const convo = makeConvo({ id: '1', kind: 'direct', peerPubkey: 'abc' })

    expect(conversationTitle(convo, contacts, 'en')).toBe('Alice')
  })

  it('returns subject for group with subject', () => {
    const contacts = new Map<string, Contact>()
    const convo = makeConvo({ id: '1', kind: 'group', subject: 'Team Chat', members: ['a', 'b'] })

    expect(conversationTitle(convo, contacts, 'en')).toBe('Team Chat')
  })

  it('returns member names for group without subject', () => {
    const a = makeContact({ pubkey: 'a', name: 'Alice' })
    const b = makeContact({ pubkey: 'b', name: 'Bob' })
    const contacts = new Map([['a', a], ['b', b]])
    const convo = makeConvo({ id: '1', kind: 'group', subject: null, members: ['a', 'b'] })

    const title = conversationTitle(convo, contacts, 'en')
    expect(title).toContain('Alice')
    expect(title).toContain('Bob')
  })
})

describe('isRequest', () => {
  it('accepted direct conversation is not a request', () => {
    const contact = makeContact({ pubkey: 'abc', accepted: true })
    const contacts = new Map([['abc', contact]])
    const convo = makeConvo({ id: '1', kind: 'direct', peerPubkey: 'abc', accepted: true })

    expect(isRequest(convo, contacts)).toBe(false)
  })

  it('unaccepted direct conversation is a request', () => {
    const contact = makeContact({ pubkey: 'abc', accepted: false })
    const contacts = new Map([['abc', contact]])
    const convo = makeConvo({ id: '1', kind: 'direct', peerPubkey: 'abc', accepted: true })

    expect(isRequest(convo, contacts)).toBe(true)
  })

  it('unaccepted group is a request', () => {
    const contacts = new Map<string, Contact>()
    const convo = makeConvo({ id: '1', kind: 'group', accepted: false, members: ['a'] })

    expect(isRequest(convo, contacts)).toBe(true)
  })

  it('accepted group is not a request', () => {
    const contacts = new Map<string, Contact>()
    const convo = makeConvo({ id: '1', kind: 'group', accepted: true, members: ['a'] })

    expect(isRequest(convo, contacts)).toBe(false)
  })
})
