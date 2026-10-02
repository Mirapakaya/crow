# Crow Rebuild Progress

## P0 — Recon, baseline, stack decision

**Started:** 2026-10-02

### Plan
1. Inventory repository and existing docs.
2. Make stack decision (actual repo is Next.js 15 static export, not Vite).
3. Write docs/AUDIT-BASELINE.md comparing security claims to code.
4. Add .npmrc with `ignore-scripts=true`.
5. Update CI workflow to run `npm ci`, typecheck, lint, test, build.
6. Push to `p0-baseline` branch and let GitHub Actions run the baseline.
7. Record results here.

### Findings so far
- Project is a **Next.js 15 App Router static export**, not Vite. Rebrand to Crow already partially done (package.json, README, SECURITY, THREAT-MODEL, PRIVACY, DEPLOYMENT, LEGAL, THIRD-PARTY-NOTICES).
- Existing GitHub Actions: `.github/workflows/ci.yml` runs lint/test/build but uses `npm install --legacy-peer-deps` and does not run typecheck.
- CSP in `next.config.ts` uses `style-src 'self' 'unsafe-inline'`, violating the strict-CSP target.
- `dangerouslySetInnerHTML` theme bootstrap in `src/app/layout.tsx` is an inline script; with `script-src 'self'` only this will be blocked unless a hash is added.
- Gift-wrap fuzz window is **2 days** (`FUZZ_WINDOW_SEC = 2 * 24 * 60 * 60`) while SECURITY.md/THREAT-MODEL repeatedly says "hour-fuzzed" / "truncated to the hour".
- SECURITY.md states NIP-44 v2 uses **XChaCha20-Poly1305**; the actual NIP-44 v2 primitive is ChaCha20 + HMAC-SHA256.
- `connect-src wss: https:` in CSP allows any WSS/HTTPS endpoint, broader than "only user-configured relays".
- Fonts use `next/font/google` Inter; spec requires self-hosted Geist fonts.
- No `docs/` directory existed; created for AUDIT-BASELINE.md.

### Stack decision
Keep **Next.js 15 App Router with static export** (`output: 'export'` already in `next.config.ts`). Reason: the migration from Vite has already been done, there are existing shadcn/Tailwind/Geist setup files, and switching back to Vite would be a large, risky rewrite. Harden the existing static export instead. Optional relay infra will go in `/infra`.
