import type { AttachmentRef } from './attachment';

export type MessageKind = 'text' | 'image' | 'video' | 'audio' | 'file' | 'reaction' | 'system' | 'call' | 'deleted' | 'edited';
export type DeliveryState = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderPubKey: string;
  kind: MessageKind;
  content: string;            // Encrypted content (decrypted at display time)
  replyTo?: string;           // Message ID
  reactions?: Map<string, string[]>;  // emoji → senderPubKeys
  attachments?: AttachmentRef[];
  deliveryState: DeliveryState;
  createdAt: number;
  updatedAt?: number;
  editedAt?: number;
  expiresAt?: number;         // Disappearing message
  isDeleted: boolean;
  isPinned: boolean;
  isStarred: boolean;
}
