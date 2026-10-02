/**
 * Single source of truth for the Content-Security-Policy string.
 *
 * Used by:
 *  - next.config.ts (HTTP headers, only during `next dev` or server builds)
 *  - src/app/layout.tsx (<meta http-equiv> for static export)
 *
 * The static export drops custom headers(), so the meta tag is the effective
 * policy in production.
 */

export const CROW_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src wss: https:",
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')
