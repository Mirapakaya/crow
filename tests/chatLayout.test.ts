// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useApp } from '@/app/store'
import { ChatView } from '@/ui/screens/ChatView'
import { HOLD_MS } from '@/ui/components/hold'
import { levelOf, sectionOf } from '@/app/layout'
import { parseHash } from '@/app/router'
import type { Contact, Conversation, Message } from '@/core/models/types'

/**
 * A conversation is one column (ADR-060): every date, message and call is a
 * child of the same stream, in the order it happened, with its side carried by
 * the row — never two lists, one per person, and never a status beside a
 * bubble as a column of its own. On a touch screen a held finger opens a
 * message's menu, since the buttons beside a bubble are hover-only.
 */

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const me = 'a'.repeat(64)
const peer = 'b'.repeat(64)
const HOUR = 3_600_000
const start = new Date(2026, 8, 20, 9).getTime()

const contact: Contact = {
  id: 'c',
  pubkey: peer,
  npub: 'npub1peer',
  name: 'Alex',
  relays: [],
  verification: 'verified',
  source: 'manual',
  accepted: true,
  addedAt: 0,
  lastSeenAt: 0,
  blocked: false,
}

const conversation: Conversation = {
  id: 'convo',
  kind: 'direct',
  peerPubkey: peer,
  members: [peer],
  accepted: true,
  lastActivity: start,
  unread: 0,
  pinned: false,
}

function message(id: string, direction: 'in' | 'out', at: number, extra: Partial<Message> = {}): Message {
  return {
    id,
    convoId: 'convo',
    direction,
    status: direction === 'out' ? 'read' : 'delivered',
    ts: at,
    tsCoarse: at,
    body: `message ${id}`,
    authorPubkey: direction === 'out' ? me : peer,
    ...extra,
  }
}

// Across two days, both sides, a call between them and a message that failed.
const history: Message[] = [
  message('m1', 'in', start),
  message('m2', 'out', start + 60_000),
  message('m3', 'in', start + 120_000),
  message('m4', 'out', start + HOUR, {
    body: '',
    call: { media: 'audio', outcome: 'completed', durationMs: 5000 },
  }),
  message('m5', 'in', start + 24 * HOUR),
  message('m6', 'out', start + 25 * HOUR, { status: 'failed' }),
]

let root: Root
let host: HTMLElement

async function renderChat(messages: Message[]) {
  useApp.setState({
    identity: { pubkey: me } as never,
    contacts: new Map([[peer, contact]]),
    conversations: [conversation],
    conversationsLoaded: true,
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(createElement(ChatView, { address: peer })))
  // Mounting opens the conversation, which starts from an empty page; the
  // history is what a load would put there.
  await act(async () => useApp.setState({ messages }))
}

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('the conversation column', () => {
  beforeEach(() => renderChat(history))

  it('is one stream holding every entry, in the order it happened', () => {
    const lists = host.querySelectorAll('.message-list')
    expect(lists).toHaveLength(1)
    const streams = lists[0]!.querySelectorAll('.message-stream')
    expect(streams).toHaveLength(1)
    const stream = streams[0]!
    expect(lists[0]!.children).toHaveLength(1)

    // Every row in the conversation is a child of that one stream.
    const rows = [...host.querySelectorAll('.bubble-row')]
    expect(rows).toHaveLength(history.length)
    for (const row of rows) expect(row.parentElement).toBe(stream)

    const entries = [...stream.children].filter((child) => !child.matches('.faint, .btn'))
    const read = entries.map((entry) =>
      entry.classList.contains('day-separator')
        ? 'day'
        : `${entry.id.replace('msg-', '')}:${entry.classList.contains('out') ? 'out' : 'in'}`,
    )
    expect(read).toEqual(['day', 'm1:in', 'm2:out', 'm3:in', 'm4:out', 'day', 'm5:in', 'm6:out'])
  })

  it('says a message failed under its bubble, inside its row', () => {
    const row = host.querySelector('#msg-m6')!
    expect([...row.children].map((child) => child.className)).toEqual(['bubble', 'bubble-failed'])
  })

  it('keeps the side on the row, not on a column per person', () => {
    const stream = host.querySelector('.message-stream')!
    const sides = [...stream.querySelectorAll(':scope > .bubble-row')].map((row) =>
      row.classList.contains('out') ? 'out' : 'in',
    )
    expect(sides).toEqual(['in', 'out', 'in', 'out', 'in', 'out'])
    expect(host.querySelector('.message-stream .message-stream')).toBeNull()
  })
})

describe('holding a message', () => {
  beforeEach(() => renderChat(history.slice(0, 3)))

  const bubble = (id: string) => host.querySelector<HTMLElement>(`#msg-${id} .bubble`)!
  const menu = () => document.querySelector('.popover')
  const press = (target: HTMLElement, type: string, init: PointerEventInit = {}) =>
    act(() => {
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', ...init }))
    })

  it('opens its menu after a held finger, with reactions and reply', async () => {
    vi.useFakeTimers()
    await press(bubble('m1'), 'pointerdown', { clientX: 10, clientY: 10 })
    await act(() => vi.advanceTimersByTime(HOLD_MS - 50))
    expect(menu()).toBeNull()
    await act(() => vi.advanceTimersByTime(50))
    expect(menu()).not.toBeNull()
    expect(menu()!.querySelectorAll('.quick-emoji').length).toBeGreaterThan(0)
    const items = [...menu()!.querySelectorAll(':scope > button')].map((b) => b.textContent)
    expect(items).toContain('Reply')

    // The click the lifted finger produces does not also press what was under it.
    await press(bubble('m1'), 'pointerup')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    await act(() => void bubble('m1').dispatchEvent(click))
    expect(click.defaultPrevented).toBe(true)
  })

  it('leaves a held mouse button alone: a mouse has hover and a right button', async () => {
    vi.useFakeTimers()
    await press(bubble('m1'), 'pointerdown', { pointerType: 'mouse' })
    await act(() => vi.advanceTimersByTime(HOLD_MS * 2))
    expect(menu()).toBeNull()
  })

  it('lets a finger that moves scroll instead', async () => {
    vi.useFakeTimers()
    await press(bubble('m2'), 'pointerdown', { clientX: 10, clientY: 10 })
    await press(bubble('m2'), 'pointermove', { clientX: 10, clientY: 40 })
    await act(() => vi.advanceTimersByTime(HOLD_MS * 2))
    expect(menu()).toBeNull()
  })

  it('opens on a right click, but leaves a link to the browser', async () => {
    const right = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    await act(() => void bubble('m2').dispatchEvent(right))
    expect(right.defaultPrevented).toBe(true)
    expect(menu()).not.toBeNull()

    const link = document.createElement('a')
    link.href = 'https://example.com'
    bubble('m3').append(link)
    const onLink = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    await act(() => void link.dispatchEvent(onLink))
    expect(onLink.defaultPrevented).toBe(false)
  })
})

describe('the panes of a wide window', () => {
  it('puts every route beside the list it belongs to, at its depth', () => {
    const cases: [string, ReturnType<typeof sectionOf>, number][] = [
      ['#/', 'chats', 0],
      [`#/c/${peer}`, 'chats', 1],
      ['#/g/' + '0'.repeat(32), 'chats', 1],
      ['#/g/' + '0'.repeat(32) + '/info', 'chats', 2],
      ['#/new-group', 'chats', 2],
      ['#/contacts', 'contacts', 0],
      [`#/p/${peer}`, 'contacts', 1],
      ['#/settings', 'settings', 0],
      ['#/settings/security', 'settings', 1],
      ['#/about', 'settings', 1],
      // Reached from more than one list: beside whichever it was opened from.
      ['#/add', null, 2],
      [`#/verify/${peer}`, null, 2],
      ['#/i/payload', null, 2],
    ]
    for (const [hash, section, level] of cases) {
      const route = parseHash(hash)
      expect([hash, sectionOf(route), levelOf(route)]).toEqual([hash, section, level])
    }
  })
})
