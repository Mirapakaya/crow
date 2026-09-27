import type { RelayState, RelayEvent } from './types';

/** Default connection timeout in milliseconds. */
const CONNECT_TIMEOUT_MS = 10_000;

/** Maximum backoff delay in milliseconds. */
const MAX_BACKOFF_MS = 30_000;

/** Base backoff delay in milliseconds. */
const BASE_BACKOFF_MS = 1_000;

/** Subscription ID prefix to avoid collisions. */
const SUB_PREFIX = 'crow_sub_';

/**
 * Manages a single WebSocket connection to a Nostr relay.
 * Handles reconnection with exponential backoff and latency tracking.
 */
export class RelaySocket {
  /** Current connection state. */
  public state: RelayState = 'disconnected';

  /** Callback invoked when a relay event is received. */
  public onEvent: ((event: RelayEvent) => void) | null = null;

  /** Callback invoked when the connection state changes. */
  public onStateChange: ((state: RelayState) => void) | null = null;

  private ws: WebSocket | null = null;
  private readonly url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private subscriptions = new Map<string, object>();
  private subCounter = 0;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((err: Error) => void) | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPingTime = 0;
  private _latency = 0;
  private intentionallyClosed = false;

  /** Measured round-trip latency in milliseconds. */
  public get latency(): number {
    return this._latency;
  }

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Open a WebSocket connection to the relay.
   * Resolves when the connection is established, rejects on timeout.
   */
  public connect(): Promise<void> {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return Promise.resolve();
    }

    this.intentionallyClosed = false;
    this.setState('connecting');

    return new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        this.setState('disconnected');
        reject(new Error(`Failed to create WebSocket for ${this.url}: ${err}`));
        return;
      }

      this.connectTimer = setTimeout(() => {
        this.cleanupConnection();
        this.setState('disconnected');
        reject(new Error(`Connection to ${this.url} timed out`));
      }, CONNECT_TIMEOUT_MS);

      this.ws.onopen = () => {
        this.clearConnectTimer();
        this.reconnectAttempts = 0;
        this._latency = 0;
        this.setState('connected');
        this.resendSubscriptions();
        this.connectResolve?.();
        this.connectResolve = null;
        this.connectReject = null;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = () => {
        // onclose will fire after this; handle there
      };

      this.ws.onclose = () => {
        this.clearConnectTimer();
        this.connectReject?.(new Error(`Connection to ${this.url} closed before open`));
        this.connectResolve = null;
        this.connectReject = null;
        this.ws = null;
        if (!this.intentionallyClosed) {
          this.scheduleReconnect();
        } else {
          this.setState('disconnected');
        }
      };
    });
  }

  /** Cleanly close the WebSocket connection. No reconnection will be attempted. */
  public disconnect(): void {
    this.intentionallyClosed = true;
    this.clearReconnectTimer();
    this.clearConnectTimer();

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch {
        // already closed
      }
      this.ws = null;
    }
    this.setState('disconnected');
  }

  /**
   * Send a JSON object to the relay.
   * Silently drops the message if the socket is not open.
   */
  public send(event: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  /**
   * Subscribe to events matching the given filters.
   * @returns The subscription ID.
   */
  public subscribe(filters: object): string {
    const subId = `${SUB_PREFIX}${++this.subCounter}`;
    this.subscriptions.set(subId, filters);
    this.send(['REQ', subId, filters]);
    return subId;
  }

  /**
   * Unsubscribe from a previously created subscription.
   */
  public unsubscribe(subId: string): void {
    this.subscriptions.delete(subId);
    this.send(['CLOSE', subId]);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private setState(newState: RelayState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  private handleMessage(raw: string | ArrayBuffer | Blob): void {
    if (typeof raw !== 'string') return;

    let msg: unknown[];
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (!Array.isArray(msg) || msg.length < 2) return;

    const type = msg[0];

    if (type === 'EVENT' && msg.length >= 3) {
      const event = msg[2] as RelayEvent;
      // Basic shape validation
      if (
        event &&
        typeof event.kind === 'number' &&
        typeof event.pubkey === 'string' &&
        typeof event.id === 'string'
      ) {
        this.onEvent?.(event);
      }
    } else if (type === 'OK') {
      // Relay accepted an event: ["OK", eventId, success, message]
    } else if (type === 'EOSE') {
      // End of stored events: ["EOSE", subId]
    } else if (type === 'NOTICE') {
      // Relay notice: ["NOTICE", message]
    } else if (type === 'PONG') {
      // Custom pong for latency tracking
      this._latency = Date.now() - this.lastPingTime;
    }
  }

  /** Re-send all active subscriptions after a reconnection. */
  private resendSubscriptions(): void {
    for (const [subId, filters] of this.subscriptions) {
      this.send(['REQ', subId, filters]);
    }
  }

  /** Schedule a reconnection attempt with exponential backoff. */
  private scheduleReconnect(): void {
    this.setState('reconnecting');
    const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, this.reconnectAttempts), MAX_BACKOFF_MS);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // connect() will schedule another reconnect on failure
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectTimer(): void {
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private cleanupConnection(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
  }
}
