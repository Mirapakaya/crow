/**
 * Single source of truth for the Content-Security-Policy string.
 *
 * Used by:
 *  - next.config.ts (HTTP headers, only during `next dev` or server builds)
 *  - src/app/layout.tsx (<meta http-equiv> for static export)
 *  - scripts/gen-headers.mjs (host header files)
 *
 * The static export drops custom headers(), so the meta tag is the effective
 * policy in production.
 *
 * TODO (F2): remove 'unsafe-inline' from style-src once all inline `style={}`
 * props are replaced by Tailwind classes. Until then, the policy keeps it and
 * documents it as a known temporary exception.
 */

export const CROW_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self' 'unsafe-inline'",
  "style-src-attr 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' wss:",
  "font-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "upgrade-insecure-requests",
].join('; ')
