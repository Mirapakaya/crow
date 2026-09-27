/**
 * Mock WebSocket for unit tests.
 *
 * Simulates WebSocket connection states, records sent messages,
 * and allows triggering onmessage callbacks for testing.
 */

type MockWebSocketState = 'connecting' | 'open' | 'closing' | 'closed';

/**
 * Mock WebSocket implementation for unit tests.
 * Does not make real network connections.
 */
export class FakeWebSocket {
  public readyState: MockWebSocketState = 'connecting';
  public url: string;
  public protocol: string = '';

  // Event handlers
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  // Recorded data
  private sentMessages: string[] = [];

  // Statics for WebSocket compatibility
  public static CONNECTING = 0;
  public static OPEN = 1;
  public static CLOSING = 2;
  public static CLOSED = 3;

  // Instance aliases
  public CONNECTING = 0;
  public OPEN = 1;
  public CLOSING = 2;
  public CLOSED = 3;

  /**
   * @param url - WebSocket URL (stored, not connected).
   * @param autoConnect - If true, simulates an immediate open.
   */
  constructor(url: string, autoConnect: boolean = true) {
    this.url = url;

    if (autoConnect) {
      // Simulate async connection open on next tick
      setTimeout(() => {
        this.simulateOpen();
      }, 0);
    }
  }

  /** Simulate a successful connection. */
  simulateOpen(): void {
    this.readyState = 'open';
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  /** Simulate connection close. */
  simulateClose(code: number = 1000, reason: string = ''): void {
    this.readyState = 'closed';
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason, wasClean: true }));
    }
  }

  /** Simulate a connection error. */
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  /**
   * Simulate receiving a message from the "server".
   *
   * @param data - String data to deliver.
   */
  triggerMessage(data: string): void {
    if (this.readyState !== 'open') return;
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  /**
   * Send data through the mock socket.
   * Records the message for later inspection.
   */
  send(data: string): void {
    if (this.readyState !== 'open') {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  /** Close the mock socket. */
  close(code: number = 1000, reason: string = ''): void {
    this.readyState = 'closed';
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason, wasClean: code === 1000 }));
    }
  }

  // ── Inspection helpers ──────────────────────────────────────────

  /** Get all sent messages. */
  getMessages(): string[] {
    return [...this.sentMessages];
  }

  /** Get last sent message. */
  getLastMessage(): string | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  /** Get last sent message parsed as JSON. */
  getLastMessageJson(): unknown {
    const last = this.getLastMessage();
    return last ? JSON.parse(last) : undefined;
  }

  /** Clear recorded messages. */
  clearMessages(): void {
    this.sentMessages = [];
  }

  /** Check if the socket is currently open. */
  isOpen(): boolean {
    return this.readyState === 'open';
  }
}

/**
 * Install FakeWebSocket as the global WebSocket for tests.
 * Returns a restore function to undo the replacement.
 */
export function installFakeWebSocket(): {
  restore: () => void;
  createSocket: (url: string) => FakeWebSocket;
} {
  const originalWebSocket = globalThis.WebSocket;
  // Track the most recently created socket for inspection
  const _lastSocket: { current: FakeWebSocket | null } = { current: null };

  // Replace global WebSocket with our mock
  (globalThis as unknown as Record<string, unknown>).WebSocket = class extends FakeWebSocket {
    constructor(url: string) {
      super(url);
      _lastSocket.current = this;
    }
  };

  return {
    restore: () => {
      (globalThis as unknown as Record<string, unknown>).WebSocket = originalWebSocket;
      _lastSocket.current = null;
    },
    createSocket: (url: string): FakeWebSocket => {
      const socket = new FakeWebSocket(url);
      _lastSocket.current = socket;
      return socket;
    },
  };
}
