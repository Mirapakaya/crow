export type AttachmentKind = 'image' | 'video' | 'audio' | 'file';

export interface AttachmentRef {
  id: string;
  kind: AttachmentKind;
  mimeType: string;
  size: number;
  encryptionKey: Uint8Array;
  chunks: AttachmentChunk[];
  fileName?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  thumbnail?: Uint8Array;    // Encrypted thumbnail
}

export interface AttachmentChunk {
  index: number;
  eventId?: string;          // Relay event ID after upload
  size: number;
  hash: string;              // SHA-256 integrity check
}
