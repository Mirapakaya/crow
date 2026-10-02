# Crow Security Audit & Release Gate

**Version:** 3.0.0 · **Date:** 2026-10-02

This document records the pre-release security review for the Crow 3.0.0 rebuild.

## Scope

- Source: `Mirapakaya/crow` repository
- Branches reviewed: `p0-baseline` through `p8-deployment-targets`
- Target release: `v3.0.0`

## Checklist

| # | Control | Status |
|---|---------|--------|
| 1 | TypeScript strict typecheck passes | ✅ `npm run typecheck` passes |
| 2 | Linter passes with no errors | ✅ `npm run lint` passes |
| 3 | Unit tests pass | ✅ 185/188 pass locally; 3 Argon2id tests timeout on the low-resource Termux device but pass in CI |
| 4 | Production static export builds | ✅ CI build passes on GitHub Actions |
| 5 | CSP is enforced in the static export | ✅ `<meta http-equiv>` tag added in `src/app/layout.tsx` |
| 6 | SRI on theme bootstrap | ✅ `integrity` attribute added to `public/theme.js` |
| 7 | Dependency audit reviewed | ⚠️ 8 vulnerabilities found (see below) |
| 8 | Threat model updated | ✅ `THREAT-MODEL.md` updated through P6 |
| 9 | Protocol documentation updated | ✅ `docs/PROTOCOL.md` updated through P7 |
| 10 | Deployment documented | ✅ Docker + GitHub Pages + Vercel/Cloudflare/Netlify in `DEPLOYMENT.md` |

## Dependency audit

`npm audit --audit-level=high` reports 8 vulnerabilities:

| Package | Severity | Issue | Note |
|---------|----------|-------|------|
| `postcss` | high | XSS via unescaped `</style>`; source map path traversal | Transitive via `next`. Fix requires `next@16.3.8` (breaking). |
| `serialize-javascript` | high | RCE via `RegExp.flags` / `Date.prototype.toISOString`; DoS | Transitive via `@ducanh2912/next-pwa`. Fix requires major upgrade. |
| `sharp` | high | libvips/libheif vulnerabilities | Only used at build time for image optimization; static export does not use `sharp` at runtime. |

### Assessment

- None of the vulnerabilities are in Crow's own cryptographic code.
- `postcss` and `serialize-javascript` are transitive build-time dependencies; the generated static export does not execute them in the browser.
- Upgrading them is a breaking change (Next.js 16, next-pwa 10) and is deferred to a follow-up release so it can be validated end-to-end.

## Release decision

**Gate status:** PASSED with noted dependency exceptions.

The release can proceed. The dependency upgrades are tracked as post-release maintenance.
