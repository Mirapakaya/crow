/**
 * Crow messenger — core crypto barrel export.
 *
 * Re-exports every public symbol from the crypto sub-modules
 * so consumers can import from a single entry point:
 *
 *   import { encrypt, sealRecord, ReplayGuard } from "./core/crypto";
 */

// Type definitions
export type {
  CryptoKeyPair,
  SealedMessage,
  PrekeyBundle,
  GroupKeyUpdate,
  EncryptedEnvelope,
} from './types';

// NIP-44 v2 encryption
export {
  encrypt as nip44Encrypt,
  decrypt as nip44Decrypt,
  getConversationKey,
  getSharedSecret,
} from './nip44';

// Gift wrap / sealed sender
export { giftWrap, unGiftWrap } from './giftwrap';

// Vault record encryption
export { sealRecord, unsealRecord, deriveVaultKey, generateSalt } from './vaultCrypto';

// Chunked blob encryption
export { CHUNK_SIZE, encryptBlob, decryptBlob, generateBlobKey } from './blobCrypto';

// Key derivation
export { deriveKey, deriveSubKey, stretchPin, randomBytes, DEFAULT_SCRYPT_PARAMS } from './kdf';
export type { ScryptParams } from './kdf';

// Safety number verification
export { computeSafetyNumber, computeSafetyNumberFingerprint } from './safetyNumber';

// Key rotation
export { rotateSigningKey, verifyKeyTransition } from './keyRotation';

// Replay protection
export { ReplayGuard, MAX_REPLAY_CACHE_AGE } from './replay';
