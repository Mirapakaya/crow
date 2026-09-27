export type MemberRole = 'admin' | 'member';

export interface GroupState {
  conversationId: string;
  epoch: number;
  members: GroupMember[];
  adminPubKeys: string[];
  createdAt: number;
}

export interface GroupMember {
  pubKey: string;
  role: MemberRole;
  joinedAt: number;
  devices: string[]; // device IDs
}
