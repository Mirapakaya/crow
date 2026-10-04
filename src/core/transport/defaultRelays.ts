/**
 * Default relay set.
 *
 * Verified with `npm run relays:probe` (see scripts/probe-relays.mjs): each
 * accepts anonymous kind-1059 reads *and writes*, requires no NIP-42 AUTH, and
 * takes no payment. Testing writes matters: `offchain.pub` reads fine for
 * anyone but rejects publishes from keys outside its web of trust, which made
 * it a silently bad default until live delivery stats exposed it.
 *
 * Diversity across operators and software matters more than raw count — the
 * failure mode we are guarding against is one operator going down or deciding
 * to filter, not a global outage.
 *
 * Relay policy drifts, and defaults go stale. `nos.lol` and `nostr.mom` were
 * defaults until they began demanding NIP-42 AUTH for gift-wrap inbox reads;
 * Crow is anonymous and does not authenticate to relays, so they could no
 * longer deliver mail. Re-run the probe before trusting this list, and note
 * that the app now marks a relay that refuses our subscription as degraded
 * rather than letting it look healthy.
 *
 * Users can replace every entry. Nothing here is privileged: these are defaults,
 * not infrastructure we run or control.
 */
export const DEFAULT_DM_RELAYS: readonly string[] = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://relay.0xchat.com',
  'wss://nostr.oxtr.dev',
  'wss://purplerelay.com',
  'wss://offchain.pub',
]

/**
 * Offered in the UI as one-tap additions when a user prunes the defaults.
 *
 * Deliberately excludes relays that read fine but refuse anonymous writes:
 * `offchain.pub` (web of trust), `relay.nostrplebs.com` (NIP-05 required),
 * `nostr21.com` (blocks kind 1059), `relay.momostr.pink` (proof of work),
 * `eden.nostr.land` / `nostr.land` (paid + AUTH). Re-check with
 * `npm run relays:probe` before changing this list.
 */
export const SUGGESTED_RELAYS: readonly string[] = [
  ...DEFAULT_DM_RELAYS,
  'wss://nostr.bitcoiner.social',
  'wss://relay.mostr.pub',
  'wss://nostr-pub.wellorder.net',
  // Offered but not default: these currently require NIP-42 AUTH for inbox
  // reads. Listed so a user whose relay policy differs can still add them.
  'wss://nos.lol',
  'wss://nostr.mom',
]

/**
 * No built-in STUN/TURN servers. Crow avoids leaking the user's IP to any
 * third party. Users can add their own STUN/TURN servers in settings. Calls
 * between devices on the same private network or with direct public IPs still
 * work without any ICE server; calls behind restrictive NAT require a user-set
 * TURN server.
 */
export const DEFAULT_ICE_SERVERS: readonly RTCIceServer[] = []
