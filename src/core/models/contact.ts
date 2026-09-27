export type ContactTrust = 'none' | 'verified' | 'unverified';

export interface Contact {
  pubKey: string;
  displayName: string;
  about?: string;
  avatarUrl?: string;
  trust: ContactTrust;
  safetyNumber?: string;
  isBlocked: boolean;
  isMuted: boolean;
  isArchived: boolean;
  addedAt: number;
  lastActiveAt?: number;
  devices: DeviceRef[];
}

export interface DeviceRef {
  deviceId: string;
  pubKey: string;
  name: string;
  verified: boolean;
  lastActiveAt: number;
}
