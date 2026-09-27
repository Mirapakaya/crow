import { sha256 } from '@noble/hashes/sha256';
import type { NobleKeyPair } from './keygen';

/**
 * A registered device in the Crow identity layer.
 */
export interface DeviceRecord {
  /** Unique device identifier (16-char hex). */
  id: string;
  /** Human-readable device name (e.g. "Chrome on Android"). */
  name: string;
  /** 33-byte compressed secp256k1 public key for this device. */
  publicKey: Uint8Array;
  /** Unix timestamp (ms) when the device was first registered. */
  createdAt: number;
  /** Unix timestamp (ms) of last activity. */
  lastActiveAt: number;
  /** Whether the user has verified this device out-of-band. */
  verified: boolean;
}

/**
 * Generate a random 16-character hex device identifier.
 *
 * @returns 16 hex characters (8 bytes of entropy).
 */
export function generateDeviceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive a human-readable device name from the browser environment.
 *
 * Falls back to `"Unknown Device"` in non-browser contexts.
 */
export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unknown Device';

  const ua = navigator.userAgent;

  // Detect OS
  let os = 'Unknown OS';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Detect browser
  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
}

/**
 * Create a new {@link DeviceRecord} from a freshly generated key pair.
 *
 * @param keyPair  An identity or device key pair.
 * @returns A fully populated device record with `verified: false`.
 */
export function createDeviceRecord(keyPair: NobleKeyPair): DeviceRecord {
  return {
    id: generateDeviceId(),
    name: getDeviceName(),
    publicKey: keyPair.publicKey,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    verified: false,
  };
}

/**
 * Compute a short fingerprint for display and out-of-band verification.
 *
 * Takes the first 8 hex characters of SHA-256(publicKey), formatted as
 * two groups of 4 for readability (e.g. `"a1b2 · c3d4"`).
 *
 * @param device  The device record to fingerprint.
 * @returns Human-readable fingerprint string.
 */
export function fingerprintDevice(device: DeviceRecord): string {
  const hash = sha256(device.publicKey);
  const hex = Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 4)} · ${hex.slice(4, 8)}`;
}
