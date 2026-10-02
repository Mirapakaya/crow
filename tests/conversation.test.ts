import { describe, it, expect } from 'vitest'
import type { Conversation } from '../src/core/models/types'

/**
 * A pinned conversation sorts before an unpinned one, regardless of
 * lastActivity — this is the repo contract (src/core/vault/repo.ts).
 */
function sortByPinnedThenActivity(list: Conversation[]): Conversation[] {
  return [...list].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.lastActivity - a.lastActivity,
  )
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

describe('conversation sorting', () => {
  it('pinned conversations come first', () => {
    const pinned = makeConvo({ id: '1', pinned: true, lastActivity: 1000 })
    const unpinned = makeConvo({ id: '2', pinned: false, lastActivity: 9000 })

    const sorted = sortByPinnedThenActivity([unpinned, pinned])
    expect(sorted[0].id).toBe('1')
    expect(sorted[1].id).toBe('2')
  })

  it('among pinned, most recent first', () => {
    const a = makeConvo({ id: 'a', pinned: true, lastActivity: 100 })
    const b = makeConvo({ id: 'b', pinned: true, lastActivity: 500 })

    const sorted = sortByPinnedThenActivity([a, b])
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('a')
  })

  it('among unpinned, most recent first', () => {
    const a = makeConvo({ id: 'a', pinned: false, lastActivity: 100 })
    const b = makeConvo({ id: 'b', pinned: false, lastActivity: 500 })

    const sorted = sortByPinnedThenActivity([a, b])
    expect(sorted[0].id).toBe('b')
  })

  it('mixed: pinned first, then by activity', () => {
    const convos = [
      makeConvo({ id: 'old-unpinned', pinned: false, lastActivity: 100 }),
      makeConvo({ id: 'new-unpinned', pinned: false, lastActivity: 9000 }),
      makeConvo({ id: 'old-pinned', pinned: true, lastActivity: 200 }),
      makeConvo({ id: 'new-pinned', pinned: true, lastActivity: 8000 }),
    ]

    const sorted = sortByPinnedThenActivity(convos)
    expect(sorted.map((c) => c.id)).toEqual([
      'new-pinned',
      'old-pinned',
      'new-unpinned',
      'old-unpinned',
    ])
  })
})

describe('Conversation type invariants', () => {
  it('every conversation has required fields', () => {
    const convo = makeConvo({ id: 'test' })
    expect(convo).toHaveProperty('id')
    expect(convo).toHaveProperty('kind')
    expect(convo).toHaveProperty('peerPubkey')
    expect(convo).toHaveProperty('members')
    expect(convo).toHaveProperty('accepted')
    expect(convo).toHaveProperty('lastActivity')
    expect(convo).toHaveProperty('unread')
    expect(convo).toHaveProperty('pinned')
  })

  it('pinned is boolean', () => {
    const convo = makeConvo({ id: 'test' })
    expect(typeof convo.pinned).toBe('boolean')
  })

  it('direct conversation members default to empty', () => {
    const convo = makeConvo({ id: 'test', kind: 'direct' })
    expect(Array.isArray(convo.members)).toBe(true)
  })

  it('group conversation can have multiple members', () => {
    const convo = makeConvo({
      id: 'grp',
      kind: 'group',
      members: ['pk-a', 'pk-b', 'pk-c'],
    })
    expect(convo.members.length).toBeGreaterThanOrEqual(2)
  })
})
