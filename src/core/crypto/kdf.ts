import { scryptAsync } from '@noble/hashes/scrypt.js'
import { argon2id } from '@noble/hashes/argon2.js'

/**
 * Passphrase stretching for the vault.
 *
 * scrypt is chosen over PBKDF2 (memory-hard, so GPU/ASIC cracking is far more
 * expensive) and over Argon2 (scrypt has a mature, audited pure-JS
 * implementation in @noble/hashes; no WASM, which keeps the CSP tight and the
 * static bundle self-contained).
 *
 * Parameters are stored per-vault so they can be raised later without breaking
 * existing vaults. Where more work is wanted, raising `p` costs no extra peak
 * memory (the passes run sequentially, so peak stays at N*r*128 bytes) whereas
 * raising `N` doubles it — and a 256 MB peak is a real out-of-memory risk on
 * mobile Safari.
 *
 * Argon2id is now supported as the preferred KDF. Existing scrypt vaults still
 * open and are migrated to Argon2id on the next passphrase change.
 */
export type KdfAlgo = 'scrypt' | 'argon2id'

export interface ScryptParams {
  readonly algo: 'scrypt'
  readonly N: number
  readonly r: number
  readonly p: number
}

export interface Argon2idParams {
  readonly algo: 'argon2id'
  /** Memory cost in KiB. */
  readonly m: number
  /** Iterations. */
  readonly t: number
  /** Parallelism. */
  readonly p: number
}

export type KdfParams = ScryptParams | Argon2idParams

/**
 * Measured, not guessed. Browser engines run this workload roughly 8x slower
 * than Node, so parameters were chosen against a real browser:
 *
 *   N=2^16 p=1  ~0.9 s   (desktop Chrome)   ~3-4 s on a mid-range phone
 *   N=2^17 p=1  ~1.8 s                      ~7-8 s
 *   N=2^16 p=4  ~3.5 s                      ~15 s
 *
 * Unlock happens on every auto-lock timeout, so anything past a couple of
 * seconds pushes people towards disabling auto-lock entirely - a net loss for
 * security. N=2^16, r=8, p=1 keeps peak memory at 64 MB (safe on mobile Safari)
 * and stays well inside the interactive budget.
 *
 * Parameters are stored per-vault, so this can be raised for new vaults without
 * breaking existing ones, and a passphrase change re-derives under the current
 * default.
 */
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = { algo: 'scrypt', N: 2 ** 16, r: 8, p: 1 }

/**
 * Argon2id parameters tuned for a mid-range phone.
 *
 * Target: <= 2.5 s unlock time. m=64 MiB (65536 KiB), t=3, p=1 is the minimum
 * recommended by RFC 9106 for memory-hard protection. Pure-JS performance on a
 * 2024 phone is roughly 2-3 s for these parameters.
 */
export const DEFAULT_ARGON2ID_PARAMS: Argon2idParams = { algo: 'argon2id', m: 64 * 1024, t: 3, p: 1 }

/** Default KDF for new vaults. */
export const DEFAULT_KDF_PARAMS: KdfParams = DEFAULT_ARGON2ID_PARAMS

/** Refuse absurd parameters from a tampered or corrupted vault header. */
export function assertKdfParams(params: KdfParams): void {
  if (params.algo === 'scrypt') {
    const { N, r, p } = params
    const powerOfTwo = Number.isInteger(N) && N > 1 && (N & (N - 1)) === 0
    if (!powerOfTwo || N < 2 ** 12 || N > 2 ** 20) throw new Error('KDF N out of range')
    if (!Number.isInteger(r) || r < 1 || r > 16) throw new Error('KDF r out of range')
    if (!Number.isInteger(p) || p < 1 || p > 16) throw new Error('KDF p out of range')
    return
  }
  if (params.algo === 'argon2id') {
    const { m, t, p } = params
    if (!Number.isInteger(m) || m < 8 * 1024 || m > 512 * 1024) throw new Error('Argon2id m out of range')
    if (!Number.isInteger(t) || t < 1 || t > 32) throw new Error('Argon2id t out of range')
    if (!Number.isInteger(p) || p < 1 || p > 16) throw new Error('Argon2id p out of range')
    return
  }
  throw new Error(`unsupported KDF: ${String((params as KdfParams).algo)}`)
}

export interface DeriveOptions {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

function normalizePassphrase(passphrase: string): string {
  // NFKC keeps a passphrase typed with a Persian keyboard (or any composed
  // script) hashing identically across platforms and input methods.
  return passphrase.normalize('NFKC')
}

async function scryptDerive(
  passphrase: string,
  salt: Uint8Array,
  params: ScryptParams,
  opts: DeriveOptions = {},
): Promise<Uint8Array> {
  return scryptAsync(normalizePassphrase(passphrase), salt, {
    N: params.N,
    r: params.r,
    p: params.p,
    dkLen: 32,
    maxmem: 128 * params.r * (params.N + params.p) + 1024 * 1024,
    onProgress: opts.onProgress
      ? (n: number) => {
          opts.signal?.throwIfAborted()
          opts.onProgress?.(n)
        }
      : undefined,
  })
}

async function argon2idDerive(
  passphrase: string,
  salt: Uint8Array,
  params: Argon2idParams,
): Promise<Uint8Array> {
  return argon2id(normalizePassphrase(passphrase), salt, {
    m: params.m,
    t: params.t,
    p: params.p,
    dkLen: 32,
  })
}

/**
 * Derive the key-encryption key from a passphrase. Runs on whatever thread
 * calls it; the app calls this through `kdfClient` so it lands in a worker and
 * the UI keeps painting.
 */
export async function deriveKek(
  passphrase: string,
  salt: Uint8Array,
  params: KdfParams = DEFAULT_KDF_PARAMS,
  opts: DeriveOptions = {},
): Promise<Uint8Array> {
  assertKdfParams(params)
  if (salt.length < 16) throw new Error('KDF salt must be at least 16 bytes')
  if (params.algo === 'scrypt') {
    return scryptDerive(passphrase, salt, params, opts)
  }
  return argon2idDerive(passphrase, salt, params)
}
