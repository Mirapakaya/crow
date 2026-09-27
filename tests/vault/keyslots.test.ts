import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultDB } from '@vault/db';
import { KeySlotManager } from '@vault/keyslots';

/** Delete the IndexedDB databases used by VaultDB to ensure test isolation. */
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

describe('KeySlotManager', () => {
  let db: VaultDB;

  beforeEach(async () => {
    await cleanVaultDB();
    db = new VaultDB();
  });

  afterEach(async () => {
    db.close();
    await cleanVaultDB();
  });

  it('add slot → unlock slot roundtrip', async () => {
    const masterKey = crypto.getRandomValues(new Uint8Array(32));
    await KeySlotManager.addSlot(db, 'passphrase', 'my-secret-passphrase', masterKey);

    const recovered = await KeySlotManager.unlockSlot(db, 0, 'my-secret-passphrase');

    expect(Array.from(recovered)).toEqual(Array.from(masterKey));
  }, 15_000);

  it('wrong credential fails', async () => {
    const masterKey = crypto.getRandomValues(new Uint8Array(32));
    await KeySlotManager.addSlot(db, 'passphrase', 'correct-passphrase', masterKey);

    await expect(KeySlotManager.unlockSlot(db, 0, 'wrong-passphrase')).rejects.toThrow(
      /Invalid credential/,
    );
  }, 15_000);

  it('remove slot works', async () => {
    const masterKey = crypto.getRandomValues(new Uint8Array(32));
    await KeySlotManager.addSlot(db, 'passphrase', 'first-pass', masterKey);
    await KeySlotManager.addSlot(db, 'pin', '123456', masterKey);

    const slotsBefore = await KeySlotManager.listSlots(db);
    expect(slotsBefore).toHaveLength(2);

    await KeySlotManager.removeSlot(db, 0);

    const slotsAfter = await KeySlotManager.listSlots(db);
    expect(slotsAfter).toHaveLength(1);
    expect(slotsAfter[0].method).toBe('pin');
  }, 30_000);

  it('cannot remove last remaining slot', async () => {
    const masterKey = crypto.getRandomValues(new Uint8Array(32));
    await KeySlotManager.addSlot(db, 'passphrase', 'only-pass', masterKey);

    await expect(KeySlotManager.removeSlot(db, 0)).rejects.toThrow(
      /Cannot remove the last keyslot/,
    );
  }, 15_000);

  it('multiple slots work independently', async () => {
    const masterKey = crypto.getRandomValues(new Uint8Array(32));
    await KeySlotManager.addSlot(db, 'passphrase', 'passphrase-1', masterKey);
    await KeySlotManager.addSlot(db, 'pin', '654321', masterKey);

    const recovered1 = await KeySlotManager.unlockSlot(db, 0, 'passphrase-1');
    const recovered2 = await KeySlotManager.unlockSlot(db, 1, '654321');

    expect(Array.from(recovered1)).toEqual(Array.from(masterKey));
    expect(Array.from(recovered2)).toEqual(Array.from(masterKey));
  }, 20_000);

  it('cannot unlock non-existent slot', async () => {
    await expect(KeySlotManager.unlockSlot(db, 99, 'whatever')).rejects.toThrow(
      /Keyslot 99 not found/,
    );
  });

  it('slots are assigned indices 0–7', async () => {
    const masterKey = crypto.getRandomValues(new Uint8Array(32));
    for (let i = 0; i < 3; i++) {
      await KeySlotManager.addSlot(db, 'passphrase', `pass-${i}`, masterKey);
    }

    const slots = await KeySlotManager.listSlots(db);
    const ids = slots.map((s) => s.id).sort((a, b) => a - b);
    expect(ids).toEqual([0, 1, 2]);
  }, 30_000);

  it('changeSlotCredential requires valid old credential', async () => {
    const masterKey = crypto.getRandomValues(new Uint8Array(32));
    await KeySlotManager.addSlot(db, 'passphrase', 'old-passphrase', masterKey);

    // Wrong old credential should throw
    await expect(
      KeySlotManager.changeSlotCredential(db, 0, 'wrong-old', 'new-passphrase'),
    ).rejects.toThrow();
  }, 15_000);

  it('changeSlotCredential re-wraps the master key with new credential', async () => {
    const masterKey = crypto.getRandomValues(new Uint8Array(32));
    await KeySlotManager.addSlot(db, 'passphrase', 'old-passphrase', masterKey);

    // Change the credential
    await KeySlotManager.changeSlotCredential(db, 0, 'old-passphrase', 'new-passphrase');

    // Old credential should no longer work for direct unwrap
    // (the wrapping key changed, so unlockSlot with old-pass fails at GCM unwrap)
    await expect(KeySlotManager.unlockSlot(db, 0, 'old-passphrase')).rejects.toThrow();

    // Verify the new salt and wrappedKey were stored
    const slotAfter = await db.keyslots.get(0);
    expect(slotAfter).toBeDefined();
    expect(slotAfter!.salt).toBeDefined();
    expect(slotAfter!.wrappedKey).toBeDefined();
  }, 60_000);

  it('changeSlotCredential on non-existent slot throws', async () => {
    await expect(KeySlotManager.changeSlotCredential(db, 99, 'old', 'new')).rejects.toThrow(
      /Keyslot 99 not found/,
    );
  });
});
