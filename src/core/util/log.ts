/**
 * Logging that is safe to leave in a privacy app: levels are off by default in
 * production, and payload contents are never passed through. Enable at runtime
 * with `localStorage.setItem('crow:debug', '1')`.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function threshold(): number {
  try {
    if (globalThis.localStorage?.getItem('crow:debug') === '1') return ORDER.debug
  } catch {
    /* storage can be blocked; fall through to the default */
  }
  return process.env.NODE_ENV === 'development' ? ORDER.info : ORDER.warn
}

function emit(level: Level, scope: string, msg: string, extra?: unknown) {
  if (ORDER[level] < threshold()) return
  const line = `[crow:${scope}] ${msg}`
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  if (extra === undefined) fn(line)
  else fn(line, extra)
}

export interface Logger {
  debug(msg: string, extra?: unknown): void
  info(msg: string, extra?: unknown): void
  warn(msg: string, extra?: unknown): void
  error(msg: string, extra?: unknown): void
}

export const createLogger = (scope: string): Logger => ({
  debug: (m, e) => emit('debug', scope, m, e),
  info: (m, e) => emit('info', scope, m, e),
  warn: (m, e) => emit('warn', scope, m, e),
  error: (m, e) => emit('error', scope, m, e),
})
