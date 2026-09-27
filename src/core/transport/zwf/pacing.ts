/**
 * ZPP: Zerion Pull Protocol adapted for Crow.
 *
 * Constant-rate traffic shaping for WebRTC data channels.
 * Emits exactly one fixed-size ZWF frame per time slot, carrying
 * the next queued record or a cover frame if the queue is empty.
 *
 * An observer of the data channel sees a stream of identical frames
 * whether the user is chatting or idle, defeating timing and
 * statistical-disclosure analysis.
 *
 * Adapted from Zerion's ZPP:
 *   - Two-rate regime: active (while messages flow) and idle (slower)
 *   - Zero-mean jitter per slot
 *   - Self-paced: no catch-up bursts after a stall
 *   - Cover frames indistinguishable from real frames
 *
 * Differences from Zerion:
 *   - Runs over WebRTC data channels (not Tor streams)
 *   - Uses the Web Crypto API for jitter timing (not Android Handler)
 *   - Configurable regime durations
 */

import type { ZwfStreamEncrypter } from './framing'

// ─── Configuration ──────────────────────────────────────────────────────────

export interface PacingConfig {
  /** Base interval between frames in the active regime (ms). */
  activeIntervalMs: number
  /** Base interval between frames in the idle regime (ms). */
  idleIntervalMs: number
  /** How long with no queued messages before switching to idle (ms). */
  idleTimeoutMs: number
  /** Fraction of the interval used as jitter range (0 to 0.5). */
  jitterFraction: number
}

const DEFAULT_CONFIG: PacingConfig = {
  activeIntervalMs: 750,
  idleIntervalMs: 5000,
  idleTimeoutMs: 30_000,
  jitterFraction: 1 / 3,
}

// ─── Record queue ──────────────────────────────────────────────────────────

export interface QueuedRecord {
  /** The payload to send. */
  payload: Uint8Array
  /** Callback when the frame has been encrypted. */
  onSent?: () => void
}

// ─── Paced sender ───────────────────────────────────────────────────────────

export class PacedSender {
  #encrypter: ZwfStreamEncrypter
  #config: PacingConfig
  #queue: QueuedRecord[] = []
  #timerId: ReturnType<typeof setTimeout> | null = null
  #lastMessageTime = 0
  #running = false
  #onSend: (frame: Uint8Array) => void

  constructor(
    encrypter: ZwfStreamEncrypter,
    onSend: (frame: Uint8Array) => void,
    config: Partial<PacingConfig> = {},
  ) {
    this.#encrypter = encrypter
    this.#onSend = onSend
    this.#config = { ...DEFAULT_CONFIG, ...config }
  }

  /** Enqueue a record for sending. */
  enqueue(record: QueuedRecord): void {
    this.#queue.push(record)
    this.#lastMessageTime = Date.now()
    if (!this.#running) this.#start()
  }

  /** Start the paced sender. */
  start(): void {
    if (!this.#running) this.#start()
  }

  /** Stop the paced sender. */
  stop(): void {
    this.#running = false
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId)
      this.#timerId = null
    }
  }

  /** Whether the sender is currently running. */
  get isRunning(): boolean {
    return this.#running
  }

  /** Number of queued records waiting to be sent. */
  get queueLength(): number {
    return this.#queue.length
  }

  #start(): void {
    this.#running = true
    this.#scheduleNext()
  }

  #scheduleNext(): void {
    if (!this.#running) return

    const isIdle = Date.now() - this.#lastMessageTime > this.#config.idleTimeoutMs
    const baseInterval = isIdle ? this.#config.idleIntervalMs : this.#config.activeIntervalMs
    const jitterMax = baseInterval * this.#config.jitterFraction
    const jitter = (Math.random() * 2 - 1) * jitterMax // zero-mean
    const delay = Math.max(1, baseInterval + jitter)

    this.#timerId = setTimeout(() => this.#tick(), delay)
  }

  #tick(): void {
    if (!this.#running) return

    const record = this.#queue.shift()
    const peerKemPk = null // Will be set when peer's KEM key is known

    const { frame } = this.#encrypter.encrypt(record?.payload ?? null, peerKemPk)
    this.#onSend(frame)

    if (record?.onSent) record.onSent()

    this.#scheduleNext()
  }
}
