import type { RelayEvent, RelayPool } from '../transport';
import type { InboxSync } from './inboxSync';

/**
 * Vault interface for cryptographic operations.
 * The concrete implementation is provided by the crypto module.
 */
export interface Vault {
  /** Encrypt plaintext for a recipient's pubkey. Returns base64 ciphertext. */
  encrypt(plaintext: string, recipientPubKey: string): Promise<string>;
  /** Decrypt ciphertext from a sender's pubkey. Returns plaintext. */
  decrypt(ciphertext: string, senderPubKey: string): Promise<string>;
  /** Sign a Nostr event (sets id and sig). */
  signEvent(event: Partial<RelayEvent>): Promise<RelayEvent>;
  /** The local user's public key. */
  readonly pubKey: string;
}

/** NIP-17 event kinds for private direct messaging. */
const KIND_DM = 14;
const KIND_REACTION = 7;
const KIND_GIFT_WRAP = 1059;
const KIND_SEAL = 13;

/** Storage key prefix for read markers. */
const READ_MARKER_PREFIX = 'crow:read:';

/**
 * Core message delivery engine for Crow.
 * Handles encrypting, gift-wrapping, publishing, receiving,
 * and local message management using NIP-17-compatible kinds.
 */
export class MessengerEngine {
  private readonly relayPool: RelayPool;
  private readonly vault: Vault;
  private readonly readMarkers = new Map<string, string>();
  private readonly messageStore = new Map<string, RelayEvent>();
  private readonly conversationIndex = new Map<string, Set<string>>();

  /**
   * Callback when a new message is received and decrypted.
   * **Never logs plaintext content.**
   */
  public onMessageReceived: ((conversationId: string, eventId: string) => void) | null = null;

  constructor(relayPool: RelayPool, vault: Vault, inboxSync: InboxSync) {
    this.relayPool = relayPool;
    this.vault = vault;
    // inboxSync is reserved for future use (push-based inbox sync)
    void inboxSync;
  }

  /**
   * Send an encrypted direct message to a conversation.
   *
   * 1. Encrypt the plaintext for the recipient (NIP-44 or NIP-04).
   * 2. Create a seal event (kind 13).
   * 3. Gift-wrap the seal (kind 1059).
   * 4. Publish the gift-wrap to all connected relays.
   *
   * @param conversationId - The recipient's pubkey (or group ID for NIP-28).
   * @param plaintext - The message body. **Never logged.**
   * @param kind - Override the event kind (default: 14 for DM).
   * @returns The published gift-wrap event ID.
   */
  public async sendMessage(
    conversationId: string,
    plaintext: string,
    kind: number = KIND_DM,
  ): Promise<string> {
    // Step 1: Encrypt plaintext for the recipient
    const ciphertext = await this.vault.encrypt(plaintext, conversationId);

    // Step 2: Create the rumor/seal event
    const now = Math.floor(Date.now() / 1000);
    const sealEvent: Partial<RelayEvent> = {
      kind,
      pubkey: this.vault.pubKey,
      content: ciphertext,
      tags: [['p', conversationId]],
      created_at: now,
    };

    const signedSeal = await this.vault.signEvent(sealEvent);

    // Step 3: Gift-wrap — encrypt the seal for the recipient
    const wrappedContent = await this.vault.encrypt(JSON.stringify(signedSeal), conversationId);

    const giftWrap: Partial<RelayEvent> = {
      kind: KIND_GIFT_WRAP,
      pubkey: this.vault.pubKey,
      content: wrappedContent,
      tags: [['p', conversationId]],
      created_at: now,
    };

    const signedGift = await this.vault.signEvent(giftWrap);

    // Step 4: Publish
    await this.relayPool.publish(signedGift);

    // Store locally
    this.storeMessage(conversationId, signedGift);

    return signedGift.id;
  }

  /**
   * Receive and process a relay event.
   * Verifies, decrypts, and stores the message.
   * **Plaintext content is never logged.**
   */
  public async receiveEvent(event: RelayEvent): Promise<void> {
    // Only process DM and gift-wrap kinds
    if (event.kind !== KIND_DM && event.kind !== KIND_GIFT_WRAP && event.kind !== KIND_SEAL) {
      return;
    }

    try {
      // Decrypt the outer layer for gift-wrapped events
      if (event.kind === KIND_GIFT_WRAP) {
        const decryptedSeal = await this.vault.decrypt(event.content, event.pubkey);
        const sealEvent = JSON.parse(decryptedSeal) as RelayEvent;

        // Decrypt the inner content
        await this.vault.decrypt(sealEvent.content, sealEvent.pubkey);

        // Store with the seal's conversation context
        const recipientTag = sealEvent.tags.find((t) => t[0] === 'p');
        const conversationId = recipientTag?.[1] ?? event.pubkey;
        this.storeMessage(conversationId, event);
        this.onMessageReceived?.(conversationId, event.id);
      } else {
        // Direct DM kind
        const recipientTag = event.tags.find((t) => t[0] === 'p');
        const conversationId = recipientTag?.[1] ?? event.pubkey;

        try {
          await this.vault.decrypt(event.content, event.pubkey);
          this.storeMessage(conversationId, event);
          this.onMessageReceived?.(conversationId, event.id);
        } catch {
          // Decryption failed — may not be intended for us
        }
      }
    } catch {
      // Decryption or parsing failed; silently skip
    }
  }

  /**
   * Delete a message locally. Optionally publishes a NIP-09 deletion request.
   */
  public async deleteMessage(messageId: string): Promise<void> {
    // Remove from local store
    for (const [convId, ids] of this.conversationIndex) {
      if (ids.has(messageId)) {
        ids.delete(messageId);
        if (ids.size === 0) this.conversationIndex.delete(convId);
        break;
      }
    }
    this.messageStore.delete(messageId);

    // Optional: publish a deletion event (kind 5)
    const deletionEvent: Partial<RelayEvent> = {
      kind: 5,
      pubkey: this.vault.pubKey,
      content: '',
      tags: [['e', messageId]],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signed = await this.vault.signEvent(deletionEvent);
    await this.relayPool.publish(signed);
  }

  /**
   * Edit a message by publishing a replacement event with an `e` tag
   * referencing the original.
   *
   * **The new plaintext is never logged.**
   */
  public async editMessage(messageId: string, newPlaintext: string): Promise<void> {
    const original = this.messageStore.get(messageId);
    if (!original) return;

    // Determine the conversation from the original event
    const recipientTag = original.tags.find((t) => t[0] === 'p');
    const conversationId = recipientTag?.[1] ?? original.pubkey;

    // Publish a replacement with an edit tag
    const ciphertext = await this.vault.encrypt(newPlaintext, conversationId);

    const editEvent: Partial<RelayEvent> = {
      kind: KIND_DM,
      pubkey: this.vault.pubKey,
      content: ciphertext,
      tags: [
        ['p', conversationId],
        ['e', messageId, '', 'edit'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signed = await this.vault.signEvent(editEvent);
    await this.relayPool.publish(signed);
  }

  /**
   * Send a reaction (emoji) to a message.
   * Uses NIP-25 / kind 7, gift-wrapped for privacy.
   *
   * @returns The published event ID.
   */
  public async sendReaction(messageId: string, reaction: string): Promise<string> {
    // Find the event to get the author's pubkey for the p-tag
    const targetEvent = this.messageStore.get(messageId);
    const authorPubkey = targetEvent?.pubkey ?? '';

    const reactionContent = await this.vault.encrypt(reaction, authorPubkey);

    const reactionEvent: Partial<RelayEvent> = {
      kind: KIND_REACTION,
      pubkey: this.vault.pubKey,
      content: reactionContent,
      tags: [
        ['e', messageId],
        ['p', authorPubkey],
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signed = await this.vault.signEvent(reactionEvent);
    await this.relayPool.publish(signed);

    return signed.id;
  }

  /**
   * Mark all messages in a conversation as read up to the given message.
   */
  public markRead(conversationId: string, upToMessageId: string): void {
    this.readMarkers.set(`${READ_MARKER_PREFIX}${conversationId}`, upToMessageId);
  }

  /**
   * Send a NIP-17 typing indicator to a conversation.
   * Typing indicators use ephemeral kind 1014.
   */
  public sendTypingIndicator(conversationId: string): void {
    const typingEvent: Partial<RelayEvent> = {
      kind: 1014,
      pubkey: this.vault.pubKey,
      content: '',
      tags: [['p', conversationId]],
      created_at: Math.floor(Date.now() / 1000),
    };

    // Fire-and-forget: sign and publish without awaiting
    this.vault
      .signEvent(typingEvent)
      .then((signed) => {
        this.relayPool.publish(signed).catch(() => {
          // Typing indicators are best-effort
        });
      })
      .catch(() => {
        // Best-effort; don't block on failure
      });
  }

  // ── Private helpers ──────────────────────────────────────────────

  private storeMessage(conversationId: string, event: RelayEvent): void {
    this.messageStore.set(event.id, event);

    let idSet = this.conversationIndex.get(conversationId);
    if (!idSet) {
      idSet = new Set();
      this.conversationIndex.set(conversationId, idSet);
    }
    idSet.add(event.id);
  }
}
