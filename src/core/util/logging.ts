/**
 * Structured logging for Crow.
 *
 * Provides category-scoped loggers with configurable global level
 * and **automatic redaction** of sensitive fields.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NEVER log: private keys, plaintext messages, secrets,       ║
 * ║  passphrases, tokens, or mnemonics.                         ║
 * ║                                                              ║
 * ║  Fields named 'key', 'privateKey', 'secret', 'passphrase',  ║
 * ║  'token', or 'mnemonic' are automatically replaced with     ║
 * ║  "[REDACTED]" before any output is written.                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

/** Supported log levels, ordered by severity. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/** Field names that are automatically redacted from log data. */
const REDACT_KEYS = new Set([
  'key',
  'privateKey',
  'secret',
  'passphrase',
  'token',
  'mnemonic',
]);

/** Global log level shared by all Logger instances. */
let globalLevel: LogLevel = 'info';

/**
 * Set the global log level.
 *
 * All loggers (existing and future) respect this threshold.
 */
export function setGlobalLevel(level: LogLevel): void {
  globalLevel = level;
}

/**
 * Get the current global log level.
 */
export function getGlobalLevel(): LogLevel {
  return globalLevel;
}

/**
 * Redact sensitive fields in a data object.
 *
 * Returns a shallow copy with redacted keys replaced by `"[REDACTED]"`.
 */
function redact(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return data;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = REDACT_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return out;
}

/**
 * Category-scoped logger.
 *
 * Each module should create its own `Logger` instance with a
 * descriptive category so log lines can be filtered at a glance.
 */
export class Logger {
  private category: string;

  constructor(category: string) {
    this.category = category;
  }

  /**
   * Override the effective level for this logger instance only.
   *
   * `undefined` means "use the global level".
   */
  setLevel(_level: LogLevel): void {
    // Per-instance level override not yet wired; this is a
    // placeholder for future per-category filtering.
  }

  /** Log at DEBUG level. */
  debug(msg: string, data?: Record<string, unknown>): void {
    this.write('debug', msg, data);
  }

  /** Log at INFO level. */
  info(msg: string, data?: Record<string, unknown>): void {
    this.write('info', msg, data);
  }

  /** Log at WARN level. */
  warn(msg: string, data?: Record<string, unknown>): void {
    this.write('warn', msg, data);
  }

  /** Log at ERROR level. */
  error(msg: string, data?: Record<string, unknown>): void {
    this.write('error', msg, data);
  }

  // ── Internal ────────────────────────────────────────────────

  private write(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[globalLevel]) return;

    const safe = redact(data);
    const ts = new Date().toISOString();
    const prefix = `[${ts}] [${level.toUpperCase()}] [${this.category}]`;

    if (safe && Object.keys(safe).length > 0) {
      console.log(`${prefix} ${msg}`, safe);
    } else {
      console.log(`${prefix} ${msg}`);
    }
  }
}
