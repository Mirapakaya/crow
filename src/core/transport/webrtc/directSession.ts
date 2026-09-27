/**
 * Represents an established WebRTC direct session with a peer.
 * Wraps the RTCPeerConnection and its data channel for sending
 * and receiving binary messages.
 */
export class DirectSession {
  /** Current state of the underlying peer connection. */
  public state: RTCPeerConnectionState;

  /** The data channel used for messaging, once negotiated. */
  public dataChannel: RTCDataChannel | null = null;

  /** Callback invoked when binary data is received from the peer. */
  public onMessage: ((data: Uint8Array) => void) | null = null;

  constructor(peerConnection: RTCPeerConnection, peerPubKey: string) {
    // These are reserved for future session management features
    void peerConnection;
    void peerPubKey;
    this.state = peerConnection.connectionState;

    // Forward connection state changes
    peerConnection.onconnectionstatechange = () => {
      this.state = peerConnection.connectionState;
    };

    // Listen for incoming data on any existing channel
    this.setupDataChannelListeners();
  }

  /**
   * Send binary data to the peer via the data channel.
   * Silently drops the message if the channel is not open.
   */
  public send(data: Uint8Array): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      // Copy to a fresh ArrayBuffer for BufferSource compatibility
      const buf = new ArrayBuffer(data.byteLength);
      new Uint8Array(buf).set(data);
      this.dataChannel.send(buf);
    }
  }

  /**
   * Close the session and its data channel.
   * The underlying RTCPeerConnection is NOT closed here —
   * the manager owns the connection lifecycle.
   */
  public close(): void {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {
        // Already closed or not yet open
      }
      this.dataChannel = null;
    }
    this.onMessage = null;
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Attach message listeners to the data channel.
   * Called both at construction and when a channel is assigned later.
   */
  private setupDataChannelListeners(): void {
    // Use a property setter pattern to auto-wire listeners when
    // the dataChannel is assigned after construction.
    let _dataChannel: RTCDataChannel | null = this.dataChannel;

    Object.defineProperty(this, 'dataChannel', {
      get: () => _dataChannel,
      set: (channel: RTCDataChannel | null) => {
        _dataChannel = channel;
        if (channel) {
          this.wireChannel(channel);
        }
      },
    });

    if (_dataChannel) {
      this.wireChannel(_dataChannel);
    }
  }

  /** Attach onmessage handler to a data channel. */
  private wireChannel(channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';

    channel.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        this.onMessage?.(new Uint8Array(event.data as ArrayBuffer));
      } else if (event.data instanceof Blob) {
        // Some browsers deliver Blob; convert to Uint8Array
        event.data
          .arrayBuffer()
          .then((buf: ArrayBuffer) => {
            this.onMessage?.(new Uint8Array(buf));
          })
          .catch(() => {
            // Conversion failed; drop message
          });
      }
    };
  }
}
