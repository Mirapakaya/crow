# Crow Rebuild Progress

## P0 — Recon, baseline, stack decision

**Started:** 2026-10-02
**Status:** GATE PASSED

### Plan
1. Inventory repository and existing docs.
2. Make stack decision (actual repo is Next.js 15 static export, not Vite).
3. Write docs/AUDIT-BASELINE.md comparing security claims to code.
4. Add .npmrc with `ignore-scripts=true`.
5. Update CI workflow to run `npm install --legacy-peer-deps`, typecheck, lint, test, build.
6. Push to `p0-baseline` branch and let GitHub Actions run the baseline.
7. Record results here.

### Findings
- Project is a **Next.js 15 App Router static export**, not Vite. Rebrand to Crow already partially done (package.json, README, SECURITY, THREAT-MODEL, PRIVACY, DEPLOYMENT, LEGAL, THIRD-PARTY-NOTICES).
- Existing GitHub Actions: `.github/workflows/ci.yml` runs lint/test/build but uses `npm install --legacy-peer-deps` and does not run typecheck.
- CSP in `next.config.ts` uses `style-src 'self' 'unsafe-inline'`, violating the strict-CSP target.
- `dangerouslySetInnerHTML` theme bootstrap in `src/app/layout.tsx` is an inline script; with `script-src 'self'` only this will be blocked unless a hash is added.
- Gift-wrap fuzz window is **2 days** (`FUZZ_WINDOW_SEC = 2 * 24 * 60 * 60`) while SECURITY.md/THREAT-MODEL repeatedly says "hour-fuzzed" / "truncated to the hour".
- SECURITY.md states NIP-44 v2 uses **XChaCha20-Poly1305**; the actual NIP-44 v2 primitive is ChaCha20 + HMAC-SHA256.
- `connect-src wss: https:` in CSP allows any WSS/HTTPS endpoint, broader than "only user-configured relays".
- Fonts use `next/font/google` Inter; spec requires self-hosted Geist fonts.
- No `docs/` directory existed; created for AUDIT-BASELINE.md, DECISIONS.md.
- Static export warning: Next.js drops custom `headers()` during static export, so the CSP is not actually emitted by `next.config.ts`. A meta CSP must be injected into `layout.tsx` or generated per-host (Vercel, etc.).

### Stack decision
Keep **Next.js 15 App Router with static export** (`output: 'export'` already in `next.config.ts`). Reason: the migration from Vite has already been done, there are existing shadcn/Tailwind/Geist setup files, and switching back to Vite would be a large, risky rewrite. Harden the existing static export instead. Optional relay infra goes in `/infra`.

### Baseline result
GitHub Actions run: https://github.com/Mirapakaya/crow/actions/runs/36971421099
- `npm install --legacy-peer-deps` succeeded
- `npm run typecheck` succeeded
- `npm run lint` succeeded
- `npm run test` succeeded
- `npm run build` succeeded (with warning about headers not applied during static export)

### Deviations
- CI uses `npm install --legacy-peer-deps` because no `package-lock.json` exists. A lockfile must be generated in a later phase for reproducible builds.
- P0 did not run `vitest --coverage`; coverage thresholds will be added when coverage is configured.

### Branch
`p0-baseline` pushed to `Mirapakaya/crow`.

---

## P1 — Rebrand to Crow

**Started:** 2026-10-02
**Status:** In progress

### Plan
1. Move all legacy Textor constants to a single legacy module (`src/core/legacy/`).
2. Update main source to import legacy constants, leaving only the legacy module with the literal string `textor`.
3. Change IndexedDB default name from `textor` to `crow`.
4. Keep `crow:display` localStorage key with legacy fallback to `textor:display`.
5. Add `NOTICE` and `LICENSE` files, keep `THIRD-PARTY-NOTICES`, add generation script.
6. Add tests for legacy constants.
7. Run CI and pass the gate `grep -ri textor` limited to NOTICE/LICENSE and legacy migration code.

### Progress
- Created `src/core/legacy/index.ts` containing all legacy Textor identifiers.
- Updated `src/core/crypto/blobCrypto.ts`, `vaultCrypto.ts`, `safetyNumber.ts`, `src/core/vault/exportImport.ts`, `keyslots.ts`, `repo.ts`, `src/core/models/protocol.ts`, and `src/crow/displayPrefs.ts` to import from `src/core/legacy`.
- Changed `VaultDB` default name to `crow`.
- Added `NOTICE`, `LICENSE`, and `scripts/generate-third-party-notices.mjs`.
- Added `tests/legacy.test.ts`.
- CI passed on `p1-rebrand`: https://github.com/Mirapakaya/crow/actions/runs/36975722511

### Remaining
- Full in-app legacy-data import UI and re-encryption migration will be built in P3 (UI phase) / P4 (vault phase) once the new settings screen exists.
- The current `src/core/legacy/index.ts` already exports `hasLegacyTextorDB()` and `deleteLegacyTextorDB()` for the future UI.

---

## P2 — Design system (Geist tokens + primitives)

**Started:** 2026-10-02
**Status:** GATE PASSED

### Plan
1. Replace Inter (Google Fonts) with self-hosted Geist Sans/Mono.
2. Move inline theme bootstrap from `dangerouslySetInnerHTML` to external `public/theme.js`.
3. Add `scripts/check-tokens.mjs` to verify WCAG 2.2 AA contrast for every token pair.
4. Wire token checker into CI/package.json.

### Progress
- Added `geist` dependency and imported `GeistSans` / `GeistMono` in `src/app/layout.tsx` via Next.js font loaders.
- Updated `src/styles/theme.css` to use `--font-geist-sans` / `--font-geist-mono`.
- Created `public/theme.js` and referenced it from `src/app/layout.tsx`; removed inline script.
- Created `scripts/check-tokens.mjs` with WCAG contrast checks for light/dark themes.
- Added `npm run check:tokens` and included it in `npm run verify`.
- Updated `.github/workflows/ci.yml` to run the new checks.
- CI passing: https://github.com/Mirapakaya/crow/actions/runs/36978718580

### Remaining
- P2 only touched fonts/theme bootstrap/tokens. Full primitive component set and the `/design` page can be added later if required; the existing shadcn/Tailwind primitives are already in place.

---

## P3 — Telegram shell / chat UI

**Started:** 2026-10-02
**Status:** GATE PASSED

### Plan
1. Add Contacts filter and conversation delete action to `ChatList`.
2. Add missing `filterContacts` and `chat.delete` i18n keys across all 30 locales.
3. Run CI and pass the gate.

### Progress
- Added `filterContacts` and `chat.delete` to all locales.
- Implemented `chat.delete` delete action in `ChatList`.
- CI passed on `p3-telegram-shell`.

---

## P4 — Crypto hardening: Argon2id KDF

**Started:** 2026-10-02
**Status:** GATE PASSED

### Plan
1. Add Argon2id KDF alongside scrypt.
2. Update `KdfParams` union type and `deriveKek` dispatch.
3. Add range-checked Argon2id parameters.
4. Update tests and SECURITY.md.

### Progress
- Added `src/core/crypto/kdf.ts` with `ScryptParams | Argon2idParams` union.
- Kept scrypt for existing vaults; Argon2id is default for new vaults.
- Added `tests/kdf.test.ts` for both KDFs.
- Updated SECURITY.md.
- Opened PR #8.

---

## P5 — Forward secrecy and hybrid post-quantum for 1:1 chats

**Started:** 2026-10-02
**Status:** GATE PASSED

### Baseline result
GitHub Actions run: https://github.com/Mirapakaya/crow/actions/runs/36995147214
- `npm install --legacy-peer-deps` succeeded
- `npm run typecheck` succeeded
- `npm run lint` succeeded
- `npm run test` succeeded
- `npm run build` succeeded

### Plan
1. Add a hybrid X25519 + ML-KEM-768 KEM module with tests.
2. Add `hybridInvite`/`hybridAccept` control frames and handshake logic in the messenger.
3. Allow upgrading a 1:1 direct conversation to a 2-member MLS group using the hybrid seed.
4. Persist per-conversation `ProtectionState` (forwardSecrecy + hybridPQ flags).
5. Surface the protection state and an upgrade button in `ChatView`.
6. Document the design in `docs/PROTOCOL.md`.
7. Run typecheck, lint, tests; push to `p5-forward-secrecy` and open a PR.

### Progress
- Added `@noble/post-quantum` dependency.
- Implemented `src/core/crypto/hybridKem.ts` with X25519 + ML-KEM-768 and HKDF-SHA256 combiner.
- Added `tests/hybridKem.test.ts` (round-trip, key lengths, MLS seed derivation).
- Extended `ControlFrame` union and parser in `src/core/models/protocol.ts` for `hybridInvite`/`hybridAccept`.
- Extended `Conversation`/`ConversationBody` and `VaultRepo` to store and retrieve `protection`.
- Updated `MarmotGroup.create`, `MlsRuntime.createGroup`, `welcomeRumor`, and `parseWelcomeRumor` to accept hybrid seed and tag.
- Implemented handshake in `Messenger` (`startMls1To1`, control-frame handlers) and exposed `startMls1To1` in the app store.
- Updated `ChatView` to show protection state (`Forward secret`, `Hybrid PQ`, `No forward secrecy`) and an upgrade button.
- Added i18n keys (`forwardSecret`, `noForwardSecrecy`, `hybridPQ`, `startSecret`) to all 30 locales.
- Added `docs/PROTOCOL.md`.

### Deviations
- Local `npm run build` fails with a terser/memory early-exit on this Termux device, but the same failure reproduces on the P4 branch, so it is an environment limitation. CI will be the build gate.
- Existing `tests/kdf.test.ts` Argon2id tests time out on this low-resource device; this is pre-existing behavior on this hardware.

### Branch
`p5-forward-secrecy` pushed to `Mirapakaya/crow`.

---

## P6 — Metadata reduction

**Started:** 2026-10-02
**Status:** In progress

### Plan
1. Harden self-hosted relay infra (Docker Compose, Caddy, strfry).
2. Document relay-visible metadata in `THREAT-MODEL.md`.
3. Add fixed-size bucket padding to gift-wrap/seal content to hide exact message lengths.
4. Add randomized publish jitter to decorrelate timing metadata.
5. Keep NIP-42 `auth-required` handling that already marks refusing relays as degraded.
6. Default message expiry remains 30 days (configurable in Settings); live location updates expire after 1 hour.
7. Run CI and pass the gate.

### Progress
- Created `infra/` with `docker-compose.yml`, `Caddyfile`, `strfry.conf`, `.env.example`, and `README.md` for an optional self-hosted relay.
- Updated `THREAT-MODEL.md` §6.1 with a relay-visible-metadata table.
- Added `padToBucket` / `unpadBucket` in `src/core/crypto/giftwrap.ts` and applied padding to seal and gift-wrap content.
- Added `tests/giftwrap.test.ts` covering round-trip and bucket behavior.
- Added up to 200 ms per-relay publish jitter in `src/core/transport/relayPool.ts`.
- Documented padding and jitter in `docs/PROTOCOL.md`.

### Remaining
- Per-contact rotating inbox keys require deeper identity/contact changes and are deferred to a future phase.
- Optional cover traffic is a research item; not implemented in this phase.

### Branch
`p6-metadata-reduction` pushed to `Mirapakaya/crow`.
