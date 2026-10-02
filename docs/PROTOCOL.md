# Crow protocol notes

This document records the cryptographic compositions Crow uses and the
current state of each one. It is a design record, not a security audit.

## 1:1 forward secrecy

Direct NIP-17 conversations in Crow have no forward secrecy: an attacker who
later learns a participant's static Nostr secret can decrypt past sealed
messages. To upgrade a 1:1 conversation, Crow creates a two-member MLS group
using the existing ts-mls/Marmot code. Once the group is active, messages are
encrypted under MLS, which provides per-epoch key ratcheting and both forward
secrecy and post-compromise security.

The upgrade is user-initiated from the chat header. It requires the peer to
have a published KeyPackage (`mlsInvites` enabled in Settings).

## Hybrid X25519 + ML-KEM-768 handshake

When an MLS 1:1 upgrade starts, the devices perform a single-round-trip
handshake before the group is created:

1. Initiator: generate an ephemeral X25519 keypair and an ML-KEM-768 keypair.
   Advertise the concatenated public key in a `hybridInvite` control frame.
2. Responder: generate an ephemeral X25519 keypair, perform X25519 DH against
   the initiator's X25519 public key, and encapsulate a shared secret under
   the initiator's ML-KEM-768 public key. Send the responder's X25519 public
   key + ML-KEM-768 ciphertext in a `hybridAccept` frame.
3. Initiator: decapsulate the ML-KEM-768 ciphertext, compute the same X25519
   DH, and derive a 32-byte seed with HKDF-SHA256 over the DH result, the
   KEM shared secret, and a transcript of the public values.
4. The initiator creates the two-member MLS group using that seed as the
temporary group entropy and marks the conversation `hybridPQ: true`.

The shared secret is not persisted; only the `hybridPQ` flag on the
conversation is. Breaking either the X25519 DH or ML-KEM-768 would not be
enough to recover the seed, because both are mixed by HKDF-SHA-256.

## NIP-17 fallback

If the peer has no KeyPackage, the app keeps the original direct conversation
and labels it "No forward secrecy" in the chat header. The user can retry the
upgrade later.

## Honest limits

- Browser storage cannot guarantee secure erase; the OS may keep copies.
- MLS forward secrecy protects future epochs, not past messages that were sent
  before the upgrade.
- Metadata (recipient public key, timing, approximate size) is still visible to
  relays even when message contents are encrypted.

## Metadata padding

NIP-44 already rounds plaintext length to the next power-of-two boundary. Crow
adds a second layer of fixed-size bucket padding to the encrypted content of
every gift wrap and seal, so the payload seen by a relay falls into one of a
small set of sizes (256 B, 512 B, 1 KB, 2 KB, 4 KB, ... 512 KB). Trailing null
bytes are stripped before decryption. The padding hides the exact length of the
original message from relays that observe frame sizes.

## Publish jitter

The relay pool applies a small, uniformly random delay (up to 200 ms) before
sending each event to a relay. This decorrelates the publish timestamp visible
to a relay from the exact moment the user pressed send, reducing the precision
of timing metadata.

## Extension and leakage defenses

The static export is served with a strict Content Security Policy via a
`<meta>` tag in `src/app/layout.tsx`. The policy:

- forbids inline scripts (`script-src 'self'`),
- restricts frames, objects, and forms,
- keeps style inline only because Next.js needs it during hydration,
- allows WebSocket/HTTPS `connect-src` so user-configured relays work.

`theme.js` is loaded with a Subresource Integrity hash so a compromised server
cannot substitute an arbitrary bootstrap script. The same CSP string is shared
between the Next.js HTTP headers (when a server build is used) and the meta
tag (the effective policy for the static export).
