/**
 * Build a root-relative URL that respects the configured base path.
 *
 * Crow is normally deployed at `/` (Vercel) but can also be exported to a
 * subdirectory such as `/crow` (GitHub Pages). This helper keeps hard-coded
 * asset paths working under both layouts.
 *
 * The base path is taken from `NEXT_PUBLIC_CROW_BASE_PATH` so it is available
 * in both server and client code. Absolute URLs (http/https) are returned
 * unchanged.
 */
export const CROW_BASE_PATH =
  process.env.NEXT_PUBLIC_CROW_BASE_PATH ?? ''

export function withBase(path: string): string {
  if (/^https?:\/\//.test(path) || path.startsWith('//')) {
    return path
  }
  const base = CROW_BASE_PATH.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalized}` : normalized
}
