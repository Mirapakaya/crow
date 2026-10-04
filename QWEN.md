# CROW FIX PASS (paste-ready for Qwen Code)

Run in the project root: `cp CROW-FIX-VERIFIED.md QWEN.md`, then paste ONE line into qwen:
`Read QWEN.md fully. Run F0 to F9 in order, autonomously. Keep state in PROGRESS-FIX.md and resume from it if context resets. Commit locally after each phase, never push.`

## RULES
1. Production code only. No TODO, stubs, placeholder, mock crypto.
2. Mark a GATE passed only if its checks ran and passed. Paste the command result summary into PROGRESS-FIX.md. The previous pass marked gates passed that were not met. Do not repeat that. First reset the false "GATE PASSED" lines in PROGRESS.md.
3. No custom cryptography. Audited libs only ( @noble/*, ts-mls, nostr-tools, WebCrypto). Write each composition in docs/PROTOCOL.md with test vectors.
4. Zero third-party requests. Allowed: same-origin, user-set wss relays, user-set STUN/TURN.
5. No claim in UI or docs that code does not prove. Keep "not independently audited". Banned words: unhackable, military-grade, quantum-proof, 100% secure.
6. Keep AGPL-3.0, NOTICE, source link. Never show Vercel or Next.js logos/wordmarks in the app.
7. Decide alone, log to docs/DECISIONS.md. Keep Next.js 15 static export (no rewrite).
8. Termux: if `next build` runs out of memory use `NODE_OPTIONS=--max-old-space-size=1536`; CI/Codespace is the build gate. Edit small; never paste big files into chat.

## VERIFIED FINDINGS (from reading crow-S1011H)
CRITICAL
- C1 "Hybrid PQ" is not real. hybridKem.ts derives a seed, but runtime.createGroup only passes it as local creation `entropy` to MarmotGroup.create. The MLS key schedule and Welcome HPKE stay X25519-only, and the responder never uses the seed. UI and `protection.hybridPQ` still claim hybrid PQ.
- C2 Padding is broken. giftwrap.ts `padToBucket` pads the base64 NIP-44 ciphertext with "\0". On the wire these are `\u0000` runs (6 bytes each), so a relay strips them and gets the exact length, and buckets are not real buckets.
- C3 CSP is weak. script-src and style-src have 'unsafe-inline', connect-src is `wss: https:` (any host), and there is no frame-ancestors or X-Frame-Options (impossible in a meta tag; Next `headers()` is dropped by static export). No Trusted Types. Next's static export inlines bootstrap scripts, so a strict CSP needs build-time hashes.
- C4 Identity `secretKey` sits in the main-thread Zustand store (store.ts `identity`). Only the KDF runs in a Worker, so any same-page script can read the key.
HIGH
- H1 PROGRESS.md says Dockerfile, nginx.conf, .dockerignore were added. None exist. No Render/Fly/Railway/Netlify configs, no header generator.
- H2 No package-lock.json (it is gitignored). CI uses `npm install --legacy-peer-deps`: not reproducible, hides conflicts. No audit gate.
- H3 Base-path bugs: layout.tsx loads `/theme.js` absolute; manifest start_url "/" breaks under CROW_BASE_PATH=/crow. Workflows trigger only on branch S1011H.
- H4 src/core/legacy and the migration were deleted. Existing Textor/old-vault users lose data silently.
- H5 Only 18 test files. None for vault/keyslots, blobCrypto, MLS/Marmot, messenger, relayPool, calls, invite parsing, CSP/headers. 3 Argon2id tests time out on weak devices. No coverage thresholds.
- H6 Docs contradict code. README lists hybrid key exchange. SECURITY.md says 1:1 has no forward secrecy and lists only the classical MLS suite. PROGRESS.md claims P1-P9 passed, yet: P2 skipped primitives and design page, P3 only added a filter and delete, P6 skipped inbox keys and cover traffic, P7 only added a meta CSP and SRI, P9 only ran npm audit.
MEDIUM
- M1 Publish jitter is 200 ms: no real timing decorrelation.
- M2 Missing: tamper detection, privacy blur, clipboard auto-clear, hold-to-reveal recovery phrase, Security Center, Trusted Types.
- M3 Referrer-Policy is strict-origin-when-cross-origin (want no-referrer). Permissions-Policy only allows, does not deny the rest.
- M4 QrCode uses dangerouslySetInnerHTML. Components use inline `style={{}}` (e.g. ChatList), which blocks removing style 'unsafe-inline'.
- M5 `next/font/google` Vazirmatn needs network at build, which breaks offline/Termux builds.
- M6 Calls (audited, mostly sound): accepted contacts only, ring window, replay dedupe, perfect negotiation, SDP/candidate caps, relay-only ICE option. Flaws: default STUN is Google + Cloudflare (defaultRelays.ts), which leaks the IP to third parties and breaks rule 4; callSession.receive applies setRemoteDescription before the fingerprint check; a future-dated rumor timestamp passes the ring-window check; no per-peer offer rate limit (each offer triggers a `bye busy` reply).
- M7 Profile frames (messenger.ts 'profile') are not gated on `accepted`. Their `relays` list is stored per contact and later pre-warmed, so a stranger can make your client connect to relays they choose (IP and query metadata leak). No ws:// or private-host rejection seen in relayUrl.ts.
UI (static review; render and fix what you see)
- U1 Two design systems: ~3,200 lines hand CSS (app.css, chat.css, theme.css) plus a Tailwind/shadcn bridge in globals.css with hard-coded HSL that diverges from theme.css. Example: prefers-color-scheme:light sets --primary blue, explicit light theme sets near-black.
- U2 Colors are invented, not Geist: `--n-0..950`, `--n-dark-*`, blue-100..950 inverted, `--n-50` darker than `--n-100`.
- U3 Mixed icon sets: lucide-react (8 files) + custom Icons.tsx + calls/icons.tsx, with different sizes and strokes.
- U4 Telegram parity partial. The wide split exists (useWide, sidebar + detail + TabBar). Chat filters are only All/Unread/Groups/Contacts; no archive, mute, folders, drawer menu, Saved Messages, or right info panel found.
- U5 Ad-hoc inline margins and one-off CSS instead of tokens. No design page, no screenshot tests.

## PHASES (each ends with a GATE)

F0 Truth baseline
- `npm install --package-lock-only --ignore-scripts`; remove package-lock.json from .gitignore; CI uses `npm ci` (drop --legacy-peer-deps, fix real peer conflicts). Verify ignore-scripts does not break sharp/next-pwa builds.
- Write docs/AUDIT-FIX.md: every finding above with status. Fix README/SECURITY/PROGRESS claims to match code.
GATE: `npm ci && npm run verify` green; lockfile committed; docs honest.

F1 Deploy anywhere + base path
- Add `withBase()` helper. Load theme.js through it; recompute SRI at postbuild. manifest start_url/scope/icons relative. Test builds with and without CROW_BASE_PATH=/crow.
- Create (they must exist on disk): Dockerfile (node build, then nginx-unprivileged, non-root, read-only FS), nginx.conf, .dockerignore, vercel.json, public/_headers (Netlify/Cloudflare), render.yaml, fly.toml, railway.json, docker-compose.yml (Caddy, optional strfry profile), docs/DEPLOY.md.
- `scripts/gen-headers.mjs` is the single source for every host file. `scripts/check-headers.mjs` validates all. CI: on PR and main: npm ci, verify, build, check-headers, docker build. Pages deploy on main.
GATE: `ls` shows every file; check-headers passes; dist has no root-absolute asset paths.

F2 CSP and leakage
- `scripts/postbuild-csp.mjs`: hash every inline script/style in dist/**/*.html into the meta CSP and into the header files. Target: default-src 'none'; script-src 'self' + hashes; style-src-elem 'self' + hashes; style-src-attr 'none' (allow 'unsafe-inline' only if a test proves React/Radix needs it, and document why); connect-src 'self' wss: (add https: only for a feature that needs it, scoped); img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; worker-src 'self'; manifest-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; require-trusted-types-for 'script'; trusted-types crow; upgrade-insecure-requests.
- Headers (host files): frame-ancestors 'none', Referrer-Policy no-referrer, nosniff, Permissions-Policy deny-all except camera/mic/geolocation=(self), COOP same-origin, CORP same-origin, HSTS preload, no-store on html, immutable on hashed assets. Add a JS frame-guard for hosts without headers (GitHub Pages) and say what is weaker there.
- Replace inline style props with classes. Render QR as React nodes/canvas. Self-host Vazirmatn ( @fontsource or local woff2).
- Signed build manifest: `scripts/sign-manifest.mjs` (Ed25519, @noble/curves, key from env). The app verifies it before activating a service-worker update and shows the build fingerprint in About.
GATE: test parses the generated CSP: no 'unsafe-inline' or 'unsafe-eval' in script-src; every host file passes; hashes match dist.

F3 Crypto truth
- Hybrid PQ for real: bind the 32-byte hybrid secret into MLS. Preferred: an MLS external PSK in the first commit (check ts-mls 1.6.4 PSK support). If unsupported: an outer XChaCha20-Poly1305 layer on every MLS app message, keyed by HKDF(MLS exporter("crow-hybrid"), hybridSecret, epoch), with hybridSecret hash-ratcheted each epoch, and the hybrid handshake re-run weekly. Tests must prove: wrong secret cannot decrypt; responder derives the same key; ciphertext changes with the secret. Until this passes, set hybridPQ:false everywhere and remove the badge and README claim.
- Identity isolation: `identity.worker.ts` holds the secret key and exposes only sign, nip44 encrypt/decrypt and unwrap. The main thread keeps a handle. Lock terminates the worker. Test: no 32-byte secret in store state; grep finds `secretKey` only in worker/vault modules.
- Vault: migrate scrypt to Argon2id on next unlock (not only on passphrase change). Benchmark in a Worker, pick the strongest setting that unlocks in 2.5 s or less, floor 19 MiB / t=2. Tests inject tiny params (no timeouts). PIN keyslot only with WebAuthn PRF, or require 8+ characters. Auto-lock on idle and pagehide; zeroize.
- Restore a tested legacy-data import (Textor vault/localStorage) with fixtures.
GATE: new tests green; coverage floor 85% on core/crypto, core/vault, core/mls; docs/PROTOCOL.md matches code.

F4 Metadata
- Fix padding: pad the plaintext inside NIP-44 (wrapper `{r: rumor, p: padString}`) so the wire event length lands in buckets 1K/4K/16K/64K. Receive path accepts old and new formats. Delete the NUL padding on ciphertext.
- Jitter: random 0.5-5 s, user setting Off/Low/High; independent per relay; publish to a random subset of at least 2 write relays.
- Per-contact rotating inbox keys: derive via HKDF(sk, "crow-inbox"|contact|month), exchange in a sealed control frame, subscribe to all active keys, keep old ones 7 days. Optional cover traffic (off by default) as dummy wraps to your own inbox keys.
GATE: relay-view test: wire content has no \u0000 padding, lengths fall in buckets, two contacts get different p-tags.

F5 Calls and relay-input fixes
- Remove built-in STUN. Default to none, add an off-by-default "Use public STUN" toggle with a plain privacy note and a clear "calls may fail behind NAT without STUN/TURN" message. "Hide my IP" forces iceTransportPolicy 'relay' and errors clearly if no TURN (no silent fallback).
- Check the fingerprint before setRemoteDescription. Reject offers with `at` more than 60 s in the future. Rate-limit offers per peer (3/min), then drop silently. Stop all tracks on end; permission-denied UX; keyboard-operable overlay.
- Profile frames: only from accepted contacts. Never connect to a frame-supplied relay until the user taps accept. Reject ws:// (except localhost in dev), loopback and private-range hosts, and cap the list at 6.
- Tests with a mocked RTCPeerConnection: state machine, malformed/oversized SDP, fingerprint mismatch, future-dated offer, offer flood.
GATE: tests green; findings M6 and M7 closed in docs/AUDIT-FIX.md.

F6 Extension and leak defense in code
- `bootstrap.ts` runs first and captures native fetch, WebSocket, crypto.subtle, Worker, postMessage; freeze our API objects. Tamper check at unlock and every 60 s, plus a MutationObserver for foreign script/iframe/shadow roots outside our root. On detection: lock the vault and warn, with an honest "heuristic, not proof" note.
- Privacy blur on tab hide or lock; clipboard auto-clear after 30 s for secrets; hold-to-reveal recovery phrase; input hygiene (autocomplete/autocorrect/autocapitalize/spellcheck off, data-lpignore, data-1p-ignore, translate="no").
- Security Center screen: per-chat protection (1:1 vs MLS, forward secrecy, hybrid PQ true/false), relay health, build fingerprint, hardened-mode checklist (own browser profile with no extensions, installed PWA, Tor Browser), and the honest limit: a malicious extension with page access cannot be fully blocked.
GATE: tests green; Tier B extension-attack script exists in tests/e2e.

F7 UI rebuild (spec below). F7a tokens (delete invented ramps and the HSL bridge), F7b primitives, F7c shell and all screens, F7d Telegram parity, F7e states and a11y.
GATE: contrast script passes; one token source; no screen on old styles; screenshots at 360, 768, 1280 in light and dark committed.

F8 Tests
- Add tests for everything in H5. Add vitest coverage thresholds. Known-answer vectors (NIP-44, ML-KEM, Argon2id RFC 9106). Wycheproof-style tamper tests for XChaCha20-Poly1305. fast-check fuzz for invite/URL/event parsers (incl. `__proto__` keys). Canary test: unique strings sent in chats must appear in no storage, console or URL. Egress test: requests equal same-origin + configured relays.
- Hostile-relay fake: replay, reorder, duplicate, drop, oversize, forged seal, future timestamps.
GATE: `npm run verify` green with coverage.

F9 Pen-test and release
- Print one bash block for the user to run in a GitHub Codespace: Playwright E2E (two contexts) and the extension-attack script; ZAP baseline (docker `ghcr.io/zaproxy/zaproxy:stable zap-baseline.py`), Lighthouse, axe, `semgrep --config p/typescript --config p/react --config p/security-audit --config p/secrets`, osv-scanner, gitleaks, `npm audit --omit=dev`. Wait for pasted results, fix high/critical, write docs/PENTEST-REPORT.md with residual risks.
GATE: zero open high/critical; report complete.

## UI SPEC: GEIST (checked against vercel.com/geist pages)
Scope: `/design.md` is Vercel's guide for Vercel-authored report sites, "not product UI". Take its principles only. Do NOT use Vercel's wordmark, triangle, authorship shell, `.vbg-*` CSS or Google Fonts links. ` @vercel/geistcn` and ` @vercel/geistcn-assets` are Vercel-internal: do not depend on them. Rebuild the patterns.
- Fonts: `geist` npm package (Geist Sans/Mono, OFL, self-hosted) + Vazirmatn for Persian. Geist Mono only for identifiers: npub, safety numbers, fingerprints, relay URLs, build hash. Tabular numerals for times, counts, badges.
- Colors: one file `tokens.css`, Geist names. Scales: `--ds-background-100/200`, `--ds-gray-100..1000`, `--ds-gray-alpha-100..1000`, and blue, red, amber, green, teal, purple, pink 100..1000. Fixed meaning: 100 default bg, 200 hover bg, 300 active bg, 400 default border, 500 hover border, 600 active border, 700 high-contrast bg, 800 its hover, 900 secondary text/icons, 1000 primary text/icons. Background-100 is the default; use Background-200 sparingly. Use exact values from vercel.com/geist/colors if you can fetch them. Otherwise anchors (approximate, mark `/* approx */`): light bg-100 #fff, bg-200 #fafafa, gray-1000 #171717; dark bg-100 #0a0a0a, bg-200 #000, gray-1000 #ededed; blue-700 near #0070f3. Keep role aliases (--bg, --surface, --border, --text, --text-muted, --accent, --danger, --success) pointing at `--ds-*`. Generate Tailwind colors from `var(--ds-*)`; no duplicate HSL values. Enforce WCAG AA in check-tokens: 4.5:1 text, 3:1 UI and borders, both themes.
- Type roles (class per role): heading-24/20/16, label-16/14/13/12, copy-16/14/13, button-14, mono-13. Weights regular, medium, semibold only. Sentence case. No all-caps eyebrows. Prose 60-68 characters per line.
- Materials: radii 6/8/12; 1px hairline borders (inset ring from gray-alpha-400) instead of shadows; shadows only for menus, popovers and dialogs; no gradients, glows, blobs, glass or textures.
- Principles from design.md: monochrome first; color only for state/action with a non-color cue (icon or text); spacing and alignment before borders and cards; no cards inside cards; no pills or capsules for ordinary metadata (unread count and verified mark are the exceptions, with icon plus text); equal peers share one role and alignment; every gap has one owner (container sets gap, children no margins); motion 120-200 ms only to explain a state change; honor prefers-reduced-motion; light and dark equal in hierarchy. The app keeps a theme control in Settings (system/light/dark).
- Avatar (Geist pattern): sizes 24, 32, 48, 64. Local only, never load remote images (no Gravatar/GitHub). Fallback is 1-2 UPPERCASE letters from the display name (no emoji or punctuation), background chosen deterministically from the pubkey out of gray/blue/green/amber/purple/teal scales at step 700 with text on contrast. `placeholder` only as a loading shell. Group avatars via an AvatarGroup (first member on top, overlap scales with size, `+N` after a limit), one accessible label. Size by adjacent text: 24 beside label-14, 32 beside label-16, 48-64 in headers and onboarding.
- Grid: Geist Grid (visible guides and cross marks) is for marketing and docs pages only. Use it on Onboarding, About, Security Center header and the landing page, with guides `aria-hidden` and 3:1 guide contrast. Inside chat, lists and settings use plain CSS grid/flex. No nested Grids.
- Icons: one outline set at one stroke weight (keep lucide-react, delete custom Icons.tsx and calls/icons.tsx duplicates, or redraw them to match). 16/20 px. Icon-only buttons need aria-label and a tooltip. No icon tiles, no decorative icons.
- Brand: new Crow mark and wordmark in Geist Sans, one SVG, works as favicon and maskable icon. Credits page names Geist (OFL) in plain text.
- Layout = Telegram on web. Desktop (900 px and up): resizable left list (320-420) with header (menu, search), folder tabs (All, Unread, Groups, Contacts, Archived, custom), rows (avatar, name, preview, time, unread, mute, pin, ticks) with hover actions; center chat (header with avatar/name/status/verified/call/search/more, date separators, grouped bubbles, reply, forward, reactions, scroll-to-bottom with count, composer with attach, emoji, mic/send morph, edit/reply banner); right info panel (media, safety number, disappearing, block); menu drawer (profile, New Group, Contacts, Calls, Saved Messages, Settings, Security). Mobile: single pane with slide navigation, bottom tabs default (Contacts, Calls, Chats, Settings) or drawer (Settings option), safe-area insets, 44 px targets, visualViewport-aware composer.
- Every screen redone on this system: Onboarding, Lock, ChatList, ChatView, Contacts, ContactDetail, AddContact, Invite, Verify, groups, all Settings pages, Backup/Restore, About, Call overlay, Location, Poll/Checklist, EmojiPicker, Forward, MessageInfo, UpdatePrompt, ErrorBoundary. Add empty, error, loading (skeleton), offline and relay-degraded states, RTL mirror, 320 px minimum, 200% zoom, shortcuts (Ctrl/Cmd+K search, Esc back, arrows between chats), and a hidden `/design` page showing every component in every state and theme.

## FINAL ACCEPTANCE
All gates truly passed with evidence. No false security claim in UI or docs. 1:1 and group protection shown truthfully per chat. Lockfile, CI, every deploy file present and checked. Strict CSP generated and tested. Identity key never on the main thread. Padding and inbox-key tests pass. UI on one Geist token source in both themes. docs/PENTEST-REPORT.md complete. README and UI say "not independently audited".
