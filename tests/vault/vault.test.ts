import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Vault } from '@vault/vault';

/** Delete the IndexedDB databases used by Vault to ensure test isolation. */
async function cleanVaultDB(): Promise<void> {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name && db.name.startsWith('crow-vault')) {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(db.name!);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  }
}

describe('Vault', () => {
  let vault: Vault;

  beforeEach(async () => {
    await cleanVaultDB();
    vault = new Vault();
  });

  afterEach(async () => {
    // Ensure vault is left in a clean state
    if (vault.isUnlocked()) {
      vault.lock();
    }
    await cleanVaultDB();
  });

  it('initialize → unlock → lock roundtrip', async () => {
    // Initially locked
    expect(vault.state).toBe('locked');
    expect(vault.isUnlocked()).toBe(false);

    await vault.initialize('my-secret-passphrase');

    // After init, should be unlocked
    expect(vault.state).toBe('unlocked');
    expect(vault.isUnlocked()).toBe(true);

    const masterKey = vault.getMasterKey();
    expect(masterKey).toHaveLength(32);

    vault.lock();

    expect(vault.state).toBe('locked');
    expect(vault.isUnlocked()).toBe(false);
  }, 15_000);

  it('getMasterKey throws when locked', () => {
    expect(() => vault.getMasterKey()).toThrow('Vault is locked');
  });

  it('hasVault returns false before init, true after', async () => {
    expect(await vault.hasVault()).toBe(false);

    await vault.initialize('test-passphrase');

    expect(await vault.hasVault()).toBe(true);
  }, 15_000);

  it('unlock with correct credential after init', async () => {
    await vault.initialize('my-passphrase');
    vault.lock();

    expect(vault.isUnlocked()).toBe(false);

    await vault.unlock('my-passphrase');
    expect(vault.isUnlocked()).toBe(true);
  }, 15_000);

  it('unlock with wrong credential fails', async () => {
    await vault.initialize('correct-passphrase');
    vault.lock();

    await expect(vault.unlock('wrong-passphrase')).rejects.toThrow(/Invalid credential/);
    expect(vault.isUnlocked()).toBe(false);
  }, 15_000);

  it('cannot initialize when already unlocked (must be locked)', async () => {
    await vault.initialize('first-passphrase');

    // After init, vault is unlocked; re-initializing throws "must be locked"
    await expect(vault.initialize('second-passphrase')).rejects.toThrow(
      /Vault must be locked to initialize/,
    );
  }, 15_000);

  it('cannot re-initialize even after lock if keyslots exist', async () => {
    await vault.initialize('first-passphrase');
    vault.lock();

    // Now vault is locked but keyslots still exist in DB
    await expect(vault.initialize('second-passphrase')).rejects.toThrow(
      /Vault already initialized/,
    );
  }, 15_000);

  it('deriveTableKey produces different keys per table', async () => {
    await vault.initialize('passphrase');

    const messagesKey = vault.deriveTableKey('messages');
    const contactsKey = vault.deriveTableKey('contacts');

    expect(messagesKey).toHaveLength(32);
    expect(contactsKey).toHaveLength(32);

    expect(Array.from(messagesKey)).not.toEqual(Array.from(contactsKey));
  }, 15_000);

  it('deriveTableKey throws when vault is locked', () => {
    expect(() => vault.deriveTableKey('messages')).toThrow('Vault is locked');
  });

  it('lock zeroes master key in memory', async () => {
    await vault.initialize('test-passphrase');
    const masterKeyRef = vault.getMasterKey();

    vault.lock();

    // The key reference should be zeroed
    expect(masterKeyRef.every((b) => b === 0)).toBe(true);
  }, 15_000);

  it('supports different unlock methods', async () => {
    await vault.initialize('123456', 'pin');
    vault.lock();

    // Unlock with pin method
    await vault.unlock('123456', 'pin');
    expect(vault.isUnlocked()).toBe(true);
  }, 15_000);
});
