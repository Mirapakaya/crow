/**
 * NIP-44 v2 compatible encryption layer for Crow messenger.
 *
 * Implements the NIP-44 v2 spec using:
 * - secp256k1 ECDH  (@noble/curves/secp256k1)
 * - ChaCha20        (@noble/ciphers/chacha)
 * - HMAC-SHA256     (@noble/hashes/hmac + sha256)
 *
 * Conversation key derivation follows the NIP-44 v2 construction:
 *   conversation_key = SHA-256(shared_secret)
 *   The conversation key is then used with ChaCha20 and an
 *   HMAC-SHA256 MAC for authenticated encryption.
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { chacha20 } from "@noble/ciphers/chacha";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";

// NIP-44 v2 constants
const VERSION = 0x02;
const PAD_PREFIX = 0x6c; // 'l' — length-prefixed padding marker

// ── Internal helpers ────────────────────────────────────────────────

/** Compute the conversation key from an ECDH shared secret. */
function convKeyFromShared(shared: Uint8Array): Uint8Array {
  return sha256(shared);
}

/** Pads plaintext to a fixed boundary to hide length. */
function pad(plaintext: string): Uint8Array {
  const encoded = new TextEncoder().encode(plaintext);
  const len = encoded.length;

  // NIP-44 v2 padding: next power of 2 ≥ 32, capped at 2^17
  let paddedLen = 32;
  while (paddedLen < len + 3) {
    paddedLen *= 2;
    if (paddedLen > 2 ** 17) {
      paddedLen = 2 ** 17;
      break;
    }
  }

  const buf = new Uint8Array(paddedLen);
  buf[0] = PAD_PREFIX;
  // 2-byte big-endian content length
  buf[1] = (len >> 8) & 0xff;
  buf[2] = len & 0xff;
  buf.set(encoded, 3);
  // Remaining bytes stay zero — random padding not needed for AEAD
  return buf;
}

/** Unpad a padded plaintext buffer back to a string. */
function unpad(data: Uint8Array): string {
  if (data[0] !== PAD_PREFIX) throw new Error("nip44: invalid padding prefix");
  const len = (data[1] << 8) | data[2];
  return new TextDecoder().decode(data.slice(3, 3 + len));
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Derive an ECDH shared secret on secp256k1.
 *
 * @param privateKey - Sender's 32-byte private key.
 * @param publicKey  - Recipient's 32-byte compressed (or raw) public key.
 * @returns 32-byte shared secret.
 */
export function getSharedSecret(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array {
  // secp256k1.getSharedSecret returns 65 bytes (04 || x || y);
  // we return only the x-coordinate as the 32-byte shared secret.
  const full = secp256k1.getSharedSecret(privateKey, publicKey);
  return full.slice(1, 33);
}

/**
 * Derive a conversation key from an ECDH shared secret.
 *
 * @param sharedSecret - 32-byte ECDH shared secret.
 * @returns 32-byte conversation key (SHA-256 of shared secret).
 */
export function getConversationKey(sharedSecret: Uint8Array): Uint8Array {
  return convKeyFromShared(sharedSecret);
}

/**
 * Encrypt a plaintext string using NIP-44 v2.
 *
 * Format: base64(version ‖ nonce ‖ ciphertext ‖ mac)
 * - version : 1 byte  (0x02)
 * - nonce   : 24 bytes
 * - ciphertext: ChaCha20(padded_plaintext)
 * - mac     : 32-byte HMAC-SHA256(key=conversationKey, data=version‖nonce‖ciphertext)
 *
 * @param plaintext       - UTF-8 string to encrypt.
 * @param conversationKey - 32-byte conversation key.
 * @returns Base64-encoded sealed message.
 */
export function encrypt(
  plaintext: string,
  conversationKey: Uint8Array,
): string {
  const nonce = new Uint8Array(24);
  crypto.getRandomValues(nonce);

  const padded = pad(plaintext);
  const ciphertext = chacha20(conversationKey, nonce, padded);

  // MAC input = version ‖ nonce ‖ ciphertext
  const macInput = new Uint8Array(1 + nonce.length + ciphertext.length);
  macInput[0] = VERSION;
  macInput.set(nonce, 1);
  macInput.set(ciphertext, 1 + nonce.length);

  const mac = hmac(sha256, conversationKey, macInput);

  // Assemble sealed message
  const sealed = new Uint8Array(1 + nonce.length + ciphertext.length + mac.length);
  sealed[0] = VERSION;
  sealed.set(nonce, 1);
  sealed.set(ciphertext, 1 + nonce.length);
  sealed.set(mac, 1 + nonce.length + ciphertext.length);

  return base64Encode(sealed);
}

/**
 * Decrypt a NIP-44 v2 sealed message.
 *
 * @param ciphertext      - Base64-encoded sealed message.
 * @param conversationKey - 32-byte conversation key.
 * @returns Decrypted UTF-8 string.
 * @throws Error on version mismatch, MAC failure, or invalid padding.
 */
export function decrypt(
  ciphertext: string,
  conversationKey: Uint8Array,
): string {
  const sealed = base64Decode(ciphertext);

  if (sealed[0] !== VERSION) {
    throw new Error(`nip44: unsupported version ${sealed[0]}`);
  }

  const nonce = sealed.slice(1, 25);
  const mac = sealed.slice(sealed.length - 32);
  const ct = sealed.slice(25, sealed.length - 32);

  // Verify MAC
  const macInput = new Uint8Array(1 + nonce.length + ct.length);
  macInput[0] = VERSION;
  macInput.set(nonce, 1);
  macInput.set(ct, 1 + nonce.length);
  const expectedMac = hmac(sha256, conversationKey, macInput);

  if (!constantTimeEqual(mac, expectedMac)) {
    throw new Error("nip44: MAC verification failed");
  }

  const padded = chacha20(conversationKey, nonce, ct);
  return unpad(padded);
}

// ── Utility helpers ─────────────────────────────────────────────────

/** Constant-time comparison of two byte arrays. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

function base64Encode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary);
}

function base64Decode(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
