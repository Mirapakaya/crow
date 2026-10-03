# CROW — COMPLETE MASTER SPEC (one file, give it to assistant Code CLI as-is)

This single file is the whole job: research answer, repo findings, crypto spec, UI spec, deploy, tests, pen-test, and the phase-by-phase instructions. You do three things:

1. Run the setup block (section 0).
2. Save this file as `MASTER-SPEC.md` in the project root.
3. Paste ONE line into assistant (below). It reads this file and runs every phase itself.

## THE ONE LINE TO PASTE INTO MASTER-SPEC

```
Read MASTER-SPEC.md completely, it is your full spec. Execute phases P0 through P9 in order without asking me questions. Keep state in PROGRESS.md and resume from it if the context resets. Commit locally after each phase, never push. Stop only at the P9 step that needs my Codespace results, or if something is truly impossible.
```

If assistant loses context (free models have small windows), paste this instead and it picks up where it stopped:

```
Re-read MASTER-SPEC.md sections 1 and 7, then read PROGRESS.md and continue from the first phase whose GATE is not marked passed.
```

---

## 0. SETUP (Termux, in order)

```bash
termux-setup-storage                       # once, grant storage access
pkg update -y && pkg install -y nodejs git unzip
mkdir -p ~/crow-work && cd ~/crow-work
# The zip is on the SD card. npm needs symlinks + exec permission, which SD/FAT storage does not give.
# So copy the zip into Termux home and work there:
ls -la "/storage/94CB-EF0B/Android/data/com.termux/files/guava/altercpre/zip/"
cp "/storage/94CB-EF0B/Android/data/com.termux/files/guava/altercpre/zip/"*.zip .
unzip -q -o ./*.zip
cd legacy messenger-main 2>/dev/null || cd "$(ls -d */ | head -1)"
node -v    # must be >= 20.19
git init -q 2>/dev/null; git add -A; git commit -qm "baseline: imported source" || true
cp ~/crow-work/CROW-MASTER.md ./MASTER-SPEC.md   # put this file in ~/crow-work first, then this copies it in
assistant                                       # start assistant Code, then paste the one line above
```

Environment fact: Playwright/Chromium, ZAP, testssl.sh and Lighthouse do not run properly in Termux. Work is split in two tiers:
- Tier A (Termux): tsc, eslint, vitest, build, node scripts.
- Tier B (GitHub Codespace or Actions): Playwright E2E, extension-attack simulation, ZAP, testssl, Lighthouse, scanners. Appendix B has the bash block.

---

## A. WHAT I FOUND (zip + repo)

**Your zip (legacy messenger-main, read directly, 272 files):** Vite 8 + React 19 + TypeScript + Dexie + Zustand + nostr-tools + ts-mls + @noble/*. It is a serverless Nostr messenger with:
- 1:1 messages: NIP-17 + NIP-44 v2 + NIP-59 gift wraps (rumor kind 14, seal kind 13, wrap kind 1059 from a one-time key, timestamps fuzzed up to 2 days back).
- Groups: small NIP-17 groups (max 8) and MLS (RFC 9420, ciphersuite 0x0001) via Marmot for up to 100 with forward secrecy.
- Vault: XChaCha20-Poly1305 per record with AAD, LUKS-style keyslots (passphrase, PIN, pattern, WebAuthn/biometric, recovery phrase), scrypt N=2^16 r=8 p=1, HKDF-SHA256, HMAC-blinded index keys.
- Calls: WebRTC DTLS-SRTP, signalling through sealed gift wraps. Attachments: blobCrypto. PWA, i18n en+fa, 60+ test files, CSP meta tag, frame guard.
- Known gaps: no forward secrecy for 1:1, PIN brute-force risk if storage is copied, `style-src 'unsafe-inline'`, relays see recipient pubkey/size/timing, extensions can read memory after unlock.

**Crow repo (github.com/Mirapakaya/crow):** GitHub blocks automated reading of file contents, so I read the README, architecture diagram, folder list, THREAT-MODEL.md and PR titles, not every source file. Findings: it is already a Next.js 15 static-export migration of legacy messenger (src/app renamed to src/crow, Tailwind + shadcn/ui + Radix, Geist fonts, SVG logo), with docs (SECURITY, PRIVACY, THREAT-MODEL, DEPLOYMENT, BUILD_ENVIRONMENT, LEGAL), vercel.json, 56 commits, AGPL-3.0, and a README that lists post-quantum ML-KEM-768 + ML-DSA-65 as "Stage 2". It states "Crow has not been independently audited". Doc/code mismatches to fix: README says "hour-fuzzed" but legacy messenger code fuzzes up to 2 days; "ChaCha20-Poly1305" is wrong for NIP-44 (ChaCha20 + HMAC-SHA256); the README claims relay delivery is encrypted while relays still see metadata.

If a `crow-repo/` folder sits beside the project, reuse its assets, i18n and docs. Do not copy anything you cannot verify.

---

## B. TOP ENCRYPTION CATALOG (names, protocols, what each is for)

"Top powerful" = right primitive at each layer, composed correctly. No single algorithm secures the app.

| Layer | Use | Standard / protocol | Library | Status |
|---|---|---|---|---|
| Chat 1:1 (today) | NIP-17 DMs, NIP-44 v2 (secp256k1 ECDH, HKDF-SHA256, ChaCha20 + HMAC-SHA256, padding), NIP-59 seal + gift wrap | Nostr NIPs | nostr-tools, @noble | in code |
| Chat 1:1 (upgrade) | MLS as a 2-member group: forward secrecy + post-compromise security via epoch ratchet | RFC 9420 | ts-mls | add |
| Group chat | MLS (Marmot over Nostr), ciphersuite 0x0001; prefer 0x0003 (ChaCha20-Poly1305) if ts-mls supports it | RFC 9420 | ts-mls | in code, extend |
| Post-quantum | Hybrid: X25519 + ML-KEM-768 mixed with HKDF and transcript hash (X-Wing style). Optional ML-DSA-65 signatures. Not "quantum-proof": PQ MLS suites are still drafts | FIPS 203 / 204 | @noble/post-quantum | add, experimental |
| Local DB | XChaCha20-Poly1305 (24-byte nonce), AAD = table+key, HKDF-SHA256 subkeys, HMAC-blinded index ids | RFC 8439 ext. / RFC 5869 | @noble/ciphers | in code |
| Passphrase KDF | Argon2id (>=64 MiB, t>=3) replacing scrypt; scrypt kept for migration | RFC 9106 | @noble/hashes | add |
| Device unlock | WebAuthn + PRF extension (hmac-secret) keyslot | W3C WebAuthn L3 | WebCrypto | extend |
| Relay transport | WSS over TLS 1.3, HSTS preload; payload already E2EE so relay sees ciphertext only. Relays still see IP, recipient pubkey, size, timing | RFC 8446 | browser | in code |
| Metadata | Per-contact rotating inbox keys, size buckets, jitter, optional cover traffic, NIP-40 expiration, NIP-42 AUTH only to trusted relays | NIP-40/42/65 | app code | add |
| Calls | DTLS-SRTP, fingerprints authenticated by sealed signalling, relay-only ICE mode to hide IP | RFC 5764 | WebRTC | in code, extend |
| Files | Per-file random key, chunked AEAD with chunk index in AAD (blocks reorder/truncation) | AEAD | @noble/ciphers | extend |
| Backup | Argon2id-derived key + XChaCha20-Poly1305, versioned header | RFC 9106 | @noble | extend |
| Build integrity | CSP + Trusted Types, SRI, Ed25519-signed build manifest, reproducible build, SBOM | W3C CSP3 | build scripts | add |

Rejected on purpose: custom ciphers or ratchets, AES-CBC, RSA key exchange, PGP/OTR, crypto in WASM blobs loaded from a CDN, "military-grade" marketing. Double Ratchet is not hand-built because MLS already provides the ratchet here.

---

## 1. STANDING RULES (read before every task)

## Mission
Crow is a private end-to-end-encrypted messenger that ships as a STATIC web app (no backend we operate)
and talks to Nostr-style relays (public or self-run). Ground truth for the code is the imported legacy messenger
source in this directory (Vite + React 19 + TypeScript + Dexie + nostr-tools + ts-mls + @noble/*).
Rebrand and redesign it completely as "Crow", then harden it. Do NOT rewrite the crypto from scratch.
Reuse and strengthen what exists, and do not delete the existing tests; extend them.

## Stack decision (make it in Phase 0, then stick to it)
- Default: keep Vite + React 19 + TS strict. Reason: pure static output, strict CSP with no inline script,
  60+ existing tests, nothing server-side to misconfigure.
- Exception: if a sibling folder named `crow-repo/` exists (a Next.js 15 static-export + shadcn/Tailwind
  migration), reuse its rebrand assets, i18n and docs, but do not adopt a Next runtime. Static export only.
- No backend may ever be introduced into the app. Optional separate relay infra goes in /infra only.

## Non-negotiables
1. Production-ready code only. No TODO, no placeholder, no stub, no "implement later", no mock crypto.
2. Never invent a cryptographic primitive or protocol. Use audited libs ( @noble/*, ts-mls, nostr-tools,
   WebCrypto). Where a design needs a composition, write it down in docs/PROTOCOL.md with test vectors.
3. Zero third-party network requests. Only user-configured wss:// relays, optional user-configured
   TURN/STUN, and same-origin assets. No analytics, no fonts from CDNs, no remote images, no telemetry.
4. Secrets (identity key, vault data key, MLS state, plaintext) never touch localStorage, sessionStorage,
   URLs, logs, the service-worker cache, or error reports. Logging is off in production.
5. Every claim in UI copy and docs must be TRUE and testable. Banned words: "unhackable", "military-grade",
   "100% secure", "NSA-proof", "zero knowledge" (unless it is literally true). Say what is protected and what is not.
6. Keep the AGPL-3.0-or-later LICENSE, keep original copyright notices and add a NOTICE crediting the
   legacy messenger authors and every third-party license. The Crow name and visual identity are ours; code stays AGPL.
   Footer/About must link to the corresponding source (AGPL section 13).
7. GIT: commit locally after every phase with a clear message. NEVER git push, never force-push, never
   rewrite history. The old CLAUDE.md in this repo is the previous maintainer's workflow and does not apply:
   delete it and its single-commit/force-push/workflow-rotation rules, plus scripts/rotateWorkflow.* and its test,
   unless a later phase needs them (it will not).
8. Work autonomously. Make decisions, write them to docs/DECISIONS.md, do not ask me questions unless
   something is truly impossible to infer. When unsure, pick the more secure and more private option.

## Work protocol (every phase)
1. Read docs/ARCHITECTURE.md, PROTOCOL.md, THREAT-MODEL.md, DECISIONS.md and the files you will touch.
2. Write a short plan to PROGRESS.md. 3. Implement fully. 4. Add or extend tests in the same phase.
5. Run: npm run typecheck && npm run lint && npm test && npm run build. Fix until green.
6. Update docs. Append results + any deviations to PROGRESS.md. 7. Commit locally. 8. Report in one short paragraph and continue.
A phase is done only when its GATE passes. Mark it passed in PROGRESS.md, then start the next phase automatically.

## Output hygiene
Prefer small focused edits. Do not paste whole large files into chat. After editing, show only a diff summary.
If a command output is long, tail it. If you hit a context limit, write state to PROGRESS.md and continue.

---

## 2. CRYPTO + PROTOCOL SPEC (what "top powerful" actually means, by layer)

Honest framing first. There is no single "most powerful encryption". Security comes from the right primitive at each layer plus sound composition. The stack below uses what current, reviewed practice recommends. Some items already exist in the legacy messenger code; the rest are upgrades. Crow has not been independently audited, and the UI must say so.

### 2.1 Transport (device ↔ relay)
- WSS over TLS 1.3 only. Reject `ws://` except `ws://localhost` in dev. HSTS with preload on the host.
- "Are relays encrypted?" The relay connection is TLS-encrypted, and every message payload is already E2EE before it reaches the relay, so a relay never sees plaintext. A relay still sees metadata: your IP, the recipient public key, event size, timing. Section 2.5 reduces that; it cannot be reduced to zero.
- Optional: user-set proxy/Tor onion relay URLs (`ws://xxxx.onion` allowed only when the browser is Tor Browser). Warn that normal browsers cannot reach .onion.

### 2.2 One-to-one messages (existing: NIP-17 + NIP-44 v2 + NIP-59)
- Rumor (kind 14) → Seal (kind 13, signed by sender real key) → Gift Wrap (kind 1059, signed by a one-time ephemeral key, p-tagged to recipient).
- NIP-44 v2: secp256k1 ECDH → HKDF-SHA256 (salt "nip44-v2") → per-message keys → ChaCha20 + HMAC-SHA256 (encrypt-then-MAC), 32-byte random nonce, power-of-two-ish padding. Note: this is ChaCha20 + HMAC, NOT ChaCha20-Poly1305. Fix any doc/UI text that says otherwise.
- Existing timestamp fuzzing is up to 2 days backwards. Keep it, and make docs/PRIVACY consistent with the code (the Crow docs say "hour-fuzzed"; check the real value in giftwrap.ts and document THAT).
- Verify on receive: seal signature, rumor.pubkey == seal.pubkey (anti-impersonation), kind allow-list, size limits, replay cache keyed by rumor id.
- KNOWN GAP: static ECDH gives no forward secrecy and no post-compromise security for 1:1. See 2.3.

### 2.3 Forward secrecy + post-quantum (upgrade, biggest security win)
- Move 1:1 chats onto MLS (RFC 9420) as 2-member groups using the existing ts-mls + Marmot (MLS over Nostr) code. That gives forward secrecy and post-compromise security through epoch ratcheting. Keep NIP-17 as a compatibility/fallback path, clearly labelled "no forward secrecy" in the conversation header.
- Ciphersuite: current code uses MLS 0x0001 (X25519, AES-128-GCM, SHA-256, Ed25519). Add 0x0003 (X25519, ChaCha20-Poly1305, Ed25519) as preferred where ts-mls supports it. Negotiate through KeyPackage capabilities; refuse downgrade below the strongest mutually supported suite and show a warning if downgraded.
- Post-quantum: PQ MLS ciphersuites are still IETF drafts, so do not claim "quantum-proof". Implement a HYBRID layer: for each MLS epoch secret exchange or 1:1 session establishment, additionally encapsulate with ML-KEM-768 (FIPS 203) alongside X25519 (X-Wing style hybrid), and mix both shared secrets plus a transcript hash through HKDF-SHA256 so that breaking either one is not enough. Library: ` @noble/post-quantum` (ml_kem768; check whether a hybrid is exported in the installed version, otherwise compose X25519 + ML-KEM-768 via HKDF yourself, with test vectors and a written design note). ML-DSA-65 (FIPS 204) signatures are optional and gated behind a flag in this pass.
- Reference designs to follow in docs: Signal PQXDH + Double Ratchet, and Signal's later post-quantum ratchet work. Do NOT hand-roll a ratchet; MLS already is the ratchet here.
- Key rotation: MLS update proposals at least weekly (existing) and after any device/session event. Delete used key material immediately.

### 2.4 Local storage (existing: vault) + upgrades
- Per-record XChaCha20-Poly1305 (24-byte random nonce) with AAD = table + primary key (binds record to its address). Keep.
- Key hierarchy: random 32-byte dataKey wrapped by LUKS-style keyslots (passphrase, PIN/pattern, recovery phrase, WebAuthn/biometric, instant). HKDF-SHA256 derives recordKey and indexKey; blinded index ids via HMAC. Keep.
- KDF upgrade: replace/augment scrypt (N=2^16, r=8, p=1) with Argon2id (RFC 9106; ` @noble/hashes/argon2`, pure JS so no WASM or CSP loosening): memory >= 64 MiB, t >= 3, p = 1, stored per keyslot; benchmark in a Worker and auto-pick the strongest setting that unlocks in <= 2.5 s on a mid-range phone. Keep scrypt for old vaults and migrate on next unlock. Keep `assertKdfParams` range-checking of header values.
- PIN keyslot weakness (already in the threat model): a 4-6 digit PIN can be brute-forced offline if browser storage is copied. Enforce: PIN is only offered as a convenience on top of a device-bound WebAuthn key (PRF extension where available) so the PIN alone is never the sole secret; otherwise force a minimum 6-word passphrase suggestion. Show a plain-language strength meter with estimated offline cost.
- WebAuthn/biometric keyslot: use the PRF extension (hmac-secret) to derive a keyslot key from the authenticator; non-extractable where WebCrypto allows. secp256k1 is NOT available in WebCrypto, so the identity key must live in JS memory while unlocked: keep it in a dedicated Worker that exposes only sign / ecdh / unwrap calls and never returns the raw key to the main thread.
- Memory hygiene: zeroize Uint8Arrays after use (best effort, document that JS GC can copy), auto-lock on idle, on tab hide (configurable), and on `pagehide`. On lock: drop the Worker, clear in-memory stores, clear Zustand state.
- Attachments: existing blobCrypto + blobTransfer. Require per-file random key, chunked AEAD with chunk-index in the nonce/AAD (prevents reorder/truncation), padded sizes.
- Encrypted backup/export: keep, require Argon2id-derived key, versioned header, integrity check, refuse import of oversized or malformed files.
- Honest limit (put this in the app's Security screen): browser storage cannot guarantee secure erase.

### 2.5 Metadata reduction toward relays (do all that are feasible in a static app)
- Per-contact inbox keys: derive a distinct receive pubkey per contact (and rotate per epoch) so a relay cannot link all your mail to one pubkey. Publish them through the sealed channel, never in a public profile.
- Padding to fixed size buckets (e.g. 1 KiB, 4 KiB, 16 KiB, 64 KiB) on top of NIP-44 padding.
- Jittered, randomized send delay and randomized relay subset per message; occasional cover (dummy) wraps to random contacts' inbox keys, user-toggleable with an honest battery/data note.
- Relay hygiene: use the NIP-65 / kind 10050 inbox-relay model; allow NIP-42 AUTH only to relays the user explicitly trusts; respect NIP-40 expiration tags (set short expirations by default for wraps).
- Optional self-run relay in /infra (strfry or nostr-rs-relay behind Caddy): accept only kinds the app uses, cap event size, enforce expiration, rate-limit, no IP logging, NIP-42 AUTH to read kind 1059 only for the addressed pubkey, disk encryption on the host. This is a recommendation for the operator; the app never assumes it.
- Calls: DTLS-SRTP with fingerprints authenticated through the sealed signalling (existing). Default to relay-only ICE (TURN) when "hide my IP" is on. Document that direct connections reveal IPs.

### 2.6 Identity and verification
- secp256k1 identity + BIP-39 recovery (existing). Safety numbers + QR verification (existing). Add key-change warnings that block sending until acknowledged, and a persistent "verified / unverified" badge in the chat header.
- Optional second device identity is OUT OF SCOPE for this pass. Do not half-build multi-device.

---
## 3. EXTENSION + LEAKAGE DEFENSE (be honest: this can be reduced, not eliminated)

A browser extension with page access runs in the same browser and can read the DOM, patch `fetch`/`WebSocket`/`crypto`, and read what the user sees. No web app can fully block that. The goal: remove every cheap leak, shrink the window of exposure, detect common attacks, and tell the user the truth. Implement ALL of the following and write the limit into the Security screen:

1. CSP (meta in static builds, HTTP header where the host allows): `default-src 'none'`; script-src 'self' (no inline, no eval, no `wasm-unsafe-eval` unless proven needed); style-src 'self' (remove 'unsafe-inline': move to hashed/nonce-free external CSS, no style attributes injected by libraries; if a library needs inline styles, use CSSOM); connect-src 'self' wss:; img-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none' (header only); `require-trusted-types-for 'script'` + a strict Trusted Types policy where supported; upgrade-insecure-requests.
2. Other headers (script generates per host, see section 5): Referrer-Policy no-referrer; X-Content-Type-Options nosniff; Permissions-Policy denying everything the app does not use (camera/mic only on call pages, geolocation only when sharing); Cross-Origin-Opener-Policy same-origin; Cross-Origin-Resource-Policy same-origin; Cross-Origin-Embedder-Policy require-corp where compatible; HSTS preload; `Cache-Control` no-store for index.html, immutable for hashed assets.
3. Keep the frame guard (anti-clickjacking) and also check `document.referrer`/`ancestorOrigins`.
4. Subresource integrity for every emitted script/style; a build-hash manifest; show the running build fingerprint in About; sign the manifest with an Ed25519 key (offline minisign-style) and have the service worker refuse updates whose signature fails. Document key custody.
5. Secrets handling: identity key and crypto operations live in a dedicated Worker; main thread gets results only. No secrets in React state, DOM attributes, `data-*`, or the URL hash. Plaintext lives only in memory while the chat is open; unrendered chats stay encrypted.
6. Input hygiene: message composer, search, passphrase and PIN fields get `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"`, `data-lpignore="true"`, `data-1p-ignore`, `data-form-type="other"`, and passphrase fields use real `type="password"` with a custom on-screen PIN pad option so keystroke-capturing extensions see less. Disable spellcheck/translate on message content (`translate="no"`).
7. Anti-scrape and anti-capture, best effort only: `user-select` controls on sensitive screens, blur message content when the tab loses focus or the app locks (option "privacy blur"), hide previews in the app switcher via a lock overlay on `visibilitychange`, optional "hide message text in notifications" (there are no push notifications anyway).
8. Tamper detection (warn, never trust): at unlock and periodically, check that `window.fetch`, `WebSocket`, `crypto.subtle`, `Worker`, `postMessage` and `JSON.parse` are still native (via `Function.prototype.toString` + frozen references captured at first line of main.tsx before any other code, and `Object.freeze` on our own API objects); observe unexpected `<script>`, `<iframe>`, `<link>`, shadow roots, and large DOM mutations outside our root with a MutationObserver. On detection: lock the vault, show a clear warning ("something in your browser modified this page, possibly an extension"), and offer a "continue anyway" option that is logged locally. This is a heuristic and will not catch a careful attacker; say so in the UI.
9. Recommended safe modes in the UI (Security screen > "Hardened mode"): open Crow in its own browser profile with no extensions, install it as a PWA/standalone window, or use Tor Browser. Provide a one-tap checklist, not a promise.
10. Supply chain: lockfile pinned versions, `npm ci` only, `npm audit signatures`, osv-scanner in CI, no postinstall scripts (`ignore-scripts=true` in .npmrc), no dependencies loaded at runtime from CDNs, license check, SBOM (CycloneDX) generated on build, reproducible build check (two clean builds must produce identical hashes).
11. Error handling: ErrorBoundary never shows or sends stack traces containing data; no crash reporting endpoint.
12. Clipboard: copy-to-clipboard of secrets (recovery phrase, nsec/npub exports) shows a warning and auto-clears the clipboard after 30 s where permitted; recovery phrase is displayed behind a hold-to-reveal control.

---

## 4. UI SPEC — Vercel Geist look, Telegram (Android + iOS) layout, on the web

### 4.1 Rebrand to Crow (everything)
- Name: Crow. Replace every "legacy messenger" in code, i18n (en, fa, and any added locale), manifest, index.html, icons, docs, tests, storage names (DB name, localStorage keys such as `legacy:*` → `crow:*`, `legacy-lazy` chunk names), service-worker name, package.json, README, SECURITY.md, PRIVACY.md, THREAT-MODEL, LICENSE headers' attribution lines (keep original copyright, add Crow).
- Provide a one-time data migration: if a legacy `legacy` IndexedDB/localStorage exists, offer an in-app "Import existing legacy messenger data" that re-wraps it under the new names, then deletes the old stores after confirmation.
- New logo: a minimal geometric crow mark (single SVG, 24×24 grid, works as favicon, maskable icon and mono mask-icon), generated by scripts/generate-icons.mjs into all icon sizes. Wordmark in Geist Sans, tight tracking.
- Voice: calm, plain, honest. Short sentences.

### 4.2 Design tokens (Geist)
- Fonts: Geist Sans + Geist Mono, self-hosted (npm `geist` or ` @fontsource`, bundled, no CDN). Keep Vazirmatn for Persian.
- Colors: follow Vercel's Geist color system. Define tokens with Geist-style names: `--ds-background-100`, `--ds-background-200`, `--ds-gray-100…1000`, `--ds-blue-…`, `--ds-red-…`, `--ds-amber-…`, `--ds-green-…`, plus semantic aliases (`--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent`, `--danger`, `--success`). Anchors: dark theme background pure black (#000), light theme white (#fff), neutral text ~#ededed on dark / ~#171717 on light, one blue accent (approx #0070f3 family). Steps 1-3 component backgrounds, 4-6 borders/hover, 7-8 solid/high-contrast backgrounds, 9-10 text. If you cannot reach vercel.com/geist/colors, derive the 10-step scales yourself, and PROVE accessibility with a script: every text/background token pair must pass WCAG 2.2 AA (4.5:1 body, 3:1 large/UI). Fail the build if not (extend scripts/check-tokens.mjs).
- Radius, spacing, shadows: Geist-style, 1px hairline borders instead of heavy shadows, 6/8/12 px radii, 4px spacing grid, subtle focus rings (2px accent with 2px offset), `prefers-reduced-motion` respected, motion 120–200 ms ease-out only.
- Themes: system / light / dark, no flash on load (inline-free theme bootstrap via external tiny script file allowed by CSP 'self').
- Components: rebuild primitives (Button, IconButton, Input, Switch, Segmented control, Tabs, Sheet/Drawer, Dialog, Popover, Menu, Toast, Badge, Avatar, Skeleton, Tooltip, List row) as accessible, keyboard-operable components. shadcn/ui + Radix is allowed only if it does not force inline styles that break the CSP; otherwise hand-roll with plain CSS files (default).

### 4.3 Layout = Telegram, for the web
Desktop/tablet (>= 900 px): three regions like Telegram Web.
- Left column (320–420 px, resizable): header with hamburger/menu button + search field (focus expands to global search over chats, contacts and messages — all searched locally on decrypted data in memory only), folder tabs row (All, Unread, Groups, Contacts-only, Archived; user-defined filters), chat list rows (avatar, name, last-message preview, time, unread badge, mute, pin, delivery ticks), swipe/hover actions (pin, mute, archive, delete), floating compose button.
- Center: chat header (back on mobile, avatar, name, status line, verified badge, call/video/search/more), message list with date separators, grouped bubbles with tails, reply-quote, forward header, reactions, polls/checklists/location cards, voice-note waveform bubbles, scroll-to-bottom button with unread count, composer bar (attach, emoji/sticker panel, text field, mic ⇄ send morph button, reply/edit banner, draft persistence encrypted).
- Right panel (slide-in, 340 px): profile / group info, shared media, safety number, disappearing messages, block, delete.
- Hamburger drawer (Telegram-style): profile card, New Group, Contacts, Calls, Saved Messages (a local encrypted self-chat), Settings, Security, Relays, About, theme toggle.

Mobile (< 900 px): single pane with push/slide navigation.
- Android-feel: top app bar with search, drawer, FAB for compose.
- iOS-feel: bottom tab bar (Contacts, Calls, Chats, Settings) with large-title headers and pull-down search. Pick ONE per device by `navigator` hints with a user override in Settings > Appearance ("Navigation style: Bottom tabs / Drawer"). Default bottom tabs. Safe-area insets honored, 44 px minimum tap targets, haptics where `navigator.vibrate` exists, overscroll behaviors tuned, virtual-keyboard aware composer (visualViewport).

Every screen in the app must be redesigned in this system. Screens that exist in the source (redo ALL): Onboarding, LockScreen, ChatList, ChatView, Contacts, ContactDetail, AddContact, InviteScreen, VerifyScreen, NewGroup, GroupInfo, SecureGroupPanel, Settings (Settings, SettingsPage, SecuritySettings, DataSettings, RelaySettings, CallSettings), BackupCeremony, RestoreBackup, AboutScreen, CallOverlay, CallBubble, LocationPicker / LocationViewer / LiveBanner, PollCard / ChecklistCard, EmojiPicker, ForwardSheet, MessageInfo, UpdatePrompt, ErrorBoundary, ConnectionStatus.

Also required: empty states, error states, loading skeletons, offline banner, relay-degraded banner, first-run guided tour (3 cards), full keyboard shortcuts (Ctrl/Cmd+K search, Esc back, arrows to move between chats, Ctrl+Enter send option), full RTL mirror, screen-reader labels, focus management, 200% zoom support, 320 px minimum width.

New "Security Center" screen: lock status, encryption status per chat (1:1 NIP-17 vs MLS, forward secrecy yes/no, hybrid PQ yes/no), relay list health, build fingerprint, extension-risk checklist (section 3.9), the honest limits list, "run self-check" button (section 3.8).

---

## 5. DEPLOY ANYWHERE

Single source of truth: `scripts/gen-headers.mjs` defines the CSP and security headers once and emits host files into `/deploy`. Output is a static `dist/` that works with a relative or configurable base path. Routing: keep hash routing (works on GitHub Pages, IPFS, any static host with no rewrites) so no host needs SPA fallback rules.

Generate and test configs for:
- Vercel: `vercel.json` with headers for all routes; framework "Other", output `dist`.
- GitHub Pages: Actions workflow (typecheck, lint, test, build, check bundle, upload-pages-artifact, deploy). Headers are impossible there, so the meta CSP + frame guard are used and the docs say what is weaker on Pages. One stable workflow filename.
- Render: `render.yaml` static site with header rules.
- Netlify / Cloudflare Pages: `_headers` file.
- Fly.io: `Dockerfile` (Caddy or nginx-unprivileged serving dist, non-root, read-only FS) + `fly.toml`.
- Railway: `Dockerfile` + `railway.json`, honoring `$PORT`.
- Self-host: `docker-compose.yml` with Caddy (auto-TLS, headers, HTTP/3) and an OPTIONAL `strfry` relay profile for local relays with a hardened config; plus an nginx example and a plain `npx serve dist` note.
- IPFS: documented, hash routing, relative base.
Each target gets a doc section `docs/DEPLOY.md` with exact steps and a "headers check" command (`curl -sI`), and a CI job that builds the Docker images and checks headers against the expected set.

---

## 6. TESTING AND PENETRATION TESTING (before any deploy)

### Tier A (Termux-safe, run every phase)
- `tsc --noEmit`, `eslint` (strict + `eslint-plugin-security` + react-hooks), `vitest` with coverage thresholds (core/crypto, core/vault, core/transport >= 90% lines).
- Known-answer tests: official NIP-44 v2 vectors; RFC 9180 HPKE vectors (existing mlsSuite test); MLS interop vectors where ts-mls provides them; Wycheproof-style tests for ChaCha20-Poly1305/XChaCha20-Poly1305 (tamper every byte, truncate, wrong AAD, wrong nonce); ML-KEM known-answer tests; Argon2id RFC 9106 vectors.
- Property tests (fast-check): encrypt/decrypt round trip, sealed blob never decrypts under wrong AAD, invite/URL codec fuzz (never throws uncaught, never hangs), event parser fuzz (random JSON, huge sizes, deep nesting, prototype-pollution keys like `__proto__`), attachment chunk reorder/truncation rejected.
- Hostile-relay simulation (extend tests/fakeRelay.ts): replay, reorder, duplicate, drop, delayed, malformed, oversized, wrong kind, forged seal pubkey, wrong p-tag, timestamp in the future, endless EOSE-less streams. App must stay correct and never crash or leak.
- Canary tests: send messages containing unique canary strings, then scan localStorage, sessionStorage, IndexedDB raw values, Cache Storage, service-worker caches, console output, and the URL; canary must appear NOWHERE in plaintext.
- Egress test: assert the set of outgoing requests equals {same-origin assets, user-configured relays}. Anything else fails the test.
- Header test: `scripts/check-headers.mjs` validates every generated host file against the required header set.
- Token/contrast check, bundle size budget (existing check-bundle), license check, SBOM generation, reproducible-build check.

### Tier B (GitHub Codespace / Actions)
- Playwright E2E, two browser contexts: onboarding, invite exchange, send/receive, groups, MLS 1:1, calls with fake media, backup/restore, lock/unlock, migration from legacy legacy messenger data, RTL, mobile and desktop viewports, offline.
- Extension-attack simulation (Playwright with an injected "malicious extension" script that: reads DOM text, runs MutationObserver on the message list, monkey-patches `fetch`/`WebSocket`/`crypto.subtle`/`Worker.postMessage`, reads IndexedDB, hooks keyboard events on the passphrase field, tries `eval`, injects `<script>` and `<iframe>`). Expected results are documented per attack: BLOCKED by CSP, DETECTED by tamper check, or LIMITED/NOT PREVENTED (listed honestly in THREAT-MODEL). No attack may be silently successful without being documented.
- Heap/memory test via Chrome DevTools Protocol: after lock, take a heap snapshot and search for canary plaintext and key bytes; report findings, fix what is controllable.
- OWASP ZAP baseline + active scan against the built app served locally; testssl.sh and securityheaders-style check against each deployed preview; Lighthouse (PWA, accessibility >= 95, performance >= 90); axe-core accessibility pass on every screen.
- Dependency scans: `npm audit`, `osv-scanner`, `semgrep` (p/typescript, p/react, p/security-audit, p/secrets), `gitleaks`.
- Final report `docs/PENTEST-REPORT.md`: every test, result, residual risk. Release is BLOCKED on any open high/critical finding.

---

---

## 7. PHASES (run P0 to P9 in order, automatically; each ends with a GATE)

Before each phase: re-read sections 1 and the sections it references. After each phase: update PROGRESS.md, commit locally, continue.

### P0 — Recon, baseline, stack decision
```
Read MASTER-SPEC.md. Inventory the project: package.json, vite.config.ts, index.html, src/main.tsx, src/app/*,
src/core/* (crypto, vault, transport, mls, calls, engine), docs/*, tests/*.
1) Run npm ci (or npm install if ci fails), then npm run typecheck, lint, test, build. Record the baseline in PROGRESS.md.
2) Make and record the stack decision per MASTER-SPEC.md. 3) Write docs/AUDIT-BASELINE.md: for each security claim
in README/SECURITY/THREAT-MODEL compare it to the actual code and list mismatches (example already known:
fuzz window size vs docs, ChaCha20+HMAC vs "Poly1305" wording, style-src 'unsafe-inline' in the CSP).
4) Create .npmrc with ignore-scripts=true and make sure install and build still work.
GATE: baseline green or failures explained, AUDIT-BASELINE.md complete, committed.
```

### P1 — Rebrand to Crow (names, storage, icons, docs, license hygiene)
```
Do the full rebrand from MASTER-SPEC.md / spec 4.1. Replace every legacy messenger reference (code, i18n en+fa, manifest, index.html,
package.json, docs, tests, storage keys, DB name, chunk names, service-worker names). Write the one-time legacy-data
migration with tests. Create the Crow logo SVG and regenerate all icons. Replace the stale CLAUDE.md and the
rotate-workflow scripts per MASTER-SPEC.md rule 7. Add NOTICE and THIRD-PARTY-NOTICES generation, keep LICENSE.
Add PRIVACY.md and update SECURITY.md/THREAT-MODEL.md to say "Crow".
GATE: grep -ri legacy returns only the NOTICE/LICENSE attribution and the legacy-migration code; all checks green.
```

### P2 — Design system (Geist tokens + primitives)
```
Implement spec 4.2: tokens, themes (no flash), self-hosted Geist fonts, full primitive component set in plain CSS
with accessible behavior, an in-app hidden /#/design page showing every component in every state and theme.
Extend scripts/check-tokens.mjs to enforce WCAG AA for every token pair. Remove style-src 'unsafe-inline' from the
CSP if the build still passes; if a library forces inline styles, replace the library or use CSSOM.
GATE: contrast check passes, design page renders all states, CSP has no unsafe-inline, tests green.
```

### P3 — Telegram-style shell and every screen
```
Implement spec 4.3. Build the responsive shell (3-pane desktop, single-pane mobile with bottom-tab and drawer modes),
then redo EVERY screen listed in 4.3 on the new system, keeping all existing behavior and tests passing.
Add search, folders, pin/mute/archive, Saved Messages, right info panel, keyboard shortcuts, empty/error/loading states,
RTL, safe-area handling, virtual-keyboard handling. Add component tests plus layout tests at 320, 390, 768, 1024, 1440 px.
GATE: no screen left on the old styling; layout tests green; manual-check list in PROGRESS.md; all checks green.
```
### P4 — Crypto hardening
```
Implement spec 2.4 and the KDF/keyslot parts of 2.2: Argon2id keyslots with Worker benchmarking and migration from
scrypt, PIN policy tied to WebAuthn PRF where available, identity-key Worker isolation (no raw key on the main thread),
zeroization and lock-time cleanup, attachment chunk AAD, hardened backup format. Add all Known-answer, tamper and property
tests from section 6 Tier A for these modules. Update docs/PROTOCOL.md with exact formats and versioning.
GATE: new tests green, coverage thresholds met, old vaults still open and migrate, no secret on main thread (test proves it).
```

### P5 — Forward secrecy and hybrid post-quantum
```
Implement spec 2.3: MLS-based 1:1 chats on the existing ts-mls/Marmot code with clear UI state ("Forward secrecy: on"),
fallback path labelled, suite negotiation and downgrade protection, hybrid X25519 + ML-KEM-768 layer mixed via HKDF
with transcript binding, key-change warnings. Write the design note in docs/PROTOCOL.md with test vectors. Add interop-style
tests, ratchet tests (old keys cannot decrypt new epochs and vice versa), and downgrade-attack tests.
Do not claim "quantum-proof" anywhere; use "hybrid post-quantum key exchange (experimental, not audited)".
GATE: tests green, UI shows true per-chat protection state, THREAT-MODEL updated with what this does and does not change.
```

### P6 — Metadata reduction
```
Implement spec 2.5: per-contact rotating inbox keys, padding buckets, jittered/randomized publish, optional cover traffic toggle,
short default expirations, relay trust levels and NIP-42 handling, relay-only ICE mode. Keep everything optional where it costs
battery/data and explain the trade-off in the UI. Add the /infra directory with a hardened strfry (or nostr-rs-relay) config,
Caddy config and compose profile, with a README. Tests: relay-side view simulation proves a relay cannot link two contacts to one
inbox key, and padding sizes fall in buckets.
GATE: tests green, relay-visible-metadata table in THREAT-MODEL matches the code exactly.
```

### P7 — Extension and leakage defense
```
Implement section 3 completely: CSP + trusted types, scripts/gen-headers.mjs as the single source of header truth, SRI +
signed build manifest + service-worker signature check, input hygiene, privacy blur, tamper detection, Security Center screen,
clipboard clearing, hold-to-reveal recovery phrase. Capture native references at the very first line of main.tsx. Write the
extension-attack simulation script for Tier B (Playwright) and document expected outcomes per attack in THREAT-MODEL.
GATE: Tier A tests green; Tier B script written and runnable in Codespaces; every attack outcome documented honestly.
```

### P8 — Deployment targets
```
Implement section 5: generate and test host configs for Vercel, GitHub Pages, Render, Netlify/Cloudflare, Fly.io, Railway,
self-host (Caddy + optional relay), IPFS. Write docs/DEPLOY.md, a headers checker, Dockerfiles that run as non-root with a
read-only filesystem, and one stable CI workflow (verify -> build -> header check -> deploy job gated on main). Confirm the same dist/
works under a subpath and at root.
GATE: check-headers passes for every target, docker builds succeed in CI, DEPLOY.md steps verified.
```

### P9 — Pen-test, fix, release gate
```
Run everything in section 6. Tier A locally. Then print a ready-to-run bash block for the user to execute Tier B in a GitHub Codespace
(install Playwright, run E2E, extension simulation, heap scan, ZAP baseline, testssl, Lighthouse, axe, semgrep, osv-scanner, gitleaks) and
wait for the results to be pasted back. Fix every high/critical finding, re-test, and write docs/PENTEST-REPORT.md with residual risks.
Produce RELEASE-CHECKLIST.md.
GATE: zero open high/critical findings, report complete, all checks green, user told exactly which results they must paste back.
```

---

## 8. FINAL ACCEPTANCE (all must be true before anyone calls Crow "done")

- No "legacy messenger" left except attribution + migration. AGPL license, NOTICE and source link present.
- All screens on the Geist design system with the Telegram layout; passes axe, contrast, RTL, 320 px.
- 1:1 chats show their real protection state; MLS forward secrecy works; hybrid PQ layer tested; no false claims.
- Vault: Argon2id, no raw identity key on the main thread, lock wipes memory state, canary tests pass.
- Network egress limited to same-origin + user-chosen relays/TURN. Header sets validated for all deploy targets.
- Extension-attack simulation results documented; remaining risks stated plainly in the Security Center and THREAT-MODEL.
- Reproducible build, signed manifest, SBOM, dependency scans clean.
- docs/PENTEST-REPORT.md complete with residual risks. UI and README say "not independently audited" until a real third-party audit exists.

---

## APPENDIX B. TIER B BASH BLOCK (paste in a GitHub Codespace, in the project folder)

assistant adjusts test file names to what it actually created. Run, then paste the outputs back to assistant for P9.

```bash
npm ci && npm run build
npx playwright install --with-deps chromium
npx playwright test                                   # E2E + extension-attack simulation + canary/egress tests
npx vite preview --port 4173 &                        # serve the built app (or: npx serve dist -l 4173)
sleep 3
docker run --rm --network host -v "$PWD":/zap/wrk:rw ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://localhost:4173 -r zap-report.html
npx lighthouse http://localhost:4173 --only-categories=performance,accessibility,pwa,best-practices \
  --chrome-flags="--headless --no-sandbox" --output html --output-path ./lighthouse.html
pip install semgrep && semgrep --config p/typescript --config p/react --config p/security-audit --config p/secrets src
docker run --rm -v "$PWD":/src ghcr.io/google/osv-scanner:latest --lockfile=/src/package-lock.json
docker run --rm -v "$PWD":/repo zricethezav/gitleaks:latest detect --source /repo --no-git
npm audit --omit=dev && npm audit signatures
# after you deploy a preview: 
# docker run --rm drwetter/testssl.sh https://YOUR-PREVIEW-URL
```
