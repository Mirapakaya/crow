# Decisions

## 2026-10-02 — Stack decision (P0)

**Decision:** Keep the existing Next.js 15 App Router static export stack (`output: 'export'`, `distDir: 'dist'`).

**Why:**
- The project has already been migrated from Vite to Next.js 15 static export.
- Reverting to Vite would be a large rewrite with no security benefit.
- Next.js static export still produces a fully static site with no server-side runtime, satisfying the "no backend we operate" requirement.
- Existing shadcn/ui, Tailwind CSS, Geist fonts (via next/font/google currently), and deployment configs can be reused and hardened.

**Consequences:**
- CSP and security headers are emitted via `next.config.ts` `headers()` and as meta tags in the static export.
- Build tooling is Next.js instead of Vite; scripts in `package.json` (typecheck, lint, test, build) remain the same interface.
- Optional relay infra goes in `/infra` only.
