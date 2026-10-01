import { describe, it, expect } from 'vitest'
import { parseHash, routeToHash, type Route } from '../src/crow/router'

describe('router', () => {
  describe('parseHash', () => {
    it('parses root as chats', () => {
      expect(parseHash('#/')).toEqual({ name: 'chats' })
      expect(parseHash('#')).toEqual({ name: 'chats' })
      expect(parseHash('')).toEqual({ name: 'chats' })
    })

    it('parses chat route', () => {
      const peer = 'a'.repeat(64)
      expect(parseHash(`#/c/${peer}`)).toEqual({ name: 'chat', peer })
    })

    it('parses group route', () => {
      const id = 'b'.repeat(32)
      expect(parseHash(`#/g/${id}`)).toEqual({ name: 'group', id })
    })

    it('parses group-info route', () => {
      const id = 'b'.repeat(32)
      expect(parseHash(`#/g/${id}/info`)).toEqual({ name: 'group-info', id })
    })

    it('parses new-group route', () => {
      expect(parseHash('#/new-group')).toEqual({ name: 'new-group' })
    })

    it('parses contacts route', () => {
      expect(parseHash('#/contacts')).toEqual({ name: 'contacts' })
    })

    it('parses add-contact route', () => {
      expect(parseHash('#/add')).toEqual({ name: 'add-contact' })
    })

    it('parses contact route', () => {
      const peer = 'c'.repeat(64)
      expect(parseHash(`#/p/${peer}`)).toEqual({ name: 'contact', peer })
    })

    it('parses verify route', () => {
      const peer = 'd'.repeat(64)
      expect(parseHash(`#/verify/${peer}`)).toEqual({ name: 'verify', peer })
    })

    it('parses settings routes', () => {
      expect(parseHash('#/settings')).toEqual({ name: 'settings' })
      expect(parseHash('#/settings/relays')).toEqual({ name: 'settings-relays' })
      expect(parseHash('#/settings/privacy')).toEqual({ name: 'settings-privacy' })
      expect(parseHash('#/settings/security')).toEqual({ name: 'settings-security' })
      expect(parseHash('#/settings/data')).toEqual({ name: 'settings-data' })
      expect(parseHash('#/settings/calls')).toEqual({ name: 'settings-calls' })
    })

    it('parses search route', () => {
      expect(parseHash('#/search')).toEqual({ name: 'search' })
    })

    it('parses about route', () => {
      expect(parseHash('#/about')).toEqual({ name: 'about' })
    })

    it('parses invite route', () => {
      expect(parseHash('#/i/somepayload')).toEqual({ name: 'invite', payload: 'somepayload' })
    })

    it('rejects invalid peer keys', () => {
      expect(parseHash('#/c/short')).toEqual({ name: 'chats' })
      expect(parseHash('#/p/short')).toEqual({ name: 'contacts' })
    })

    it('rejects invalid group ids', () => {
      expect(parseHash('#/g/short')).toEqual({ name: 'chats' })
    })
  })

  describe('routeToHash', () => {
    it('round-trips all route types', () => {
      const peer = 'a'.repeat(64)
      const groupId = 'b'.repeat(32)
      const routes: Route[] = [
        { name: 'chats' },
        { name: 'chat', peer },
        { name: 'group', id: groupId },
        { name: 'group-info', id: groupId },
        { name: 'new-group' },
        { name: 'contacts' },
        { name: 'contact', peer },
        { name: 'add-contact' },
        { name: 'invite', payload: 'abc123' },
        { name: 'verify', peer },
        { name: 'settings' },
        { name: 'settings-relays' },
        { name: 'settings-privacy' },
        { name: 'settings-security' },
        { name: 'settings-data' },
        { name: 'settings-calls' },
        { name: 'search' },
        { name: 'about' },
      ]

      for (const route of routes) {
        const hash = routeToHash(route)
        const parsed = parseHash(hash)
        expect(parsed).toEqual(route)
      }
    })
  })
})
