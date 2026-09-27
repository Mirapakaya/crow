export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[]; // pubKeys
  displayName?: string;
  avatarUrl?: string;
  lastMessageAt: number;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  isPinned: boolean;
  disappearingPolicy?: DisappearingPolicy;
  createdAt: number;
}

export interface DisappearingPolicy {
  enabled: boolean;
  durationMs: number;
}
