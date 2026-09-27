// Vault module — barrel export

export { VaultDB, type EncryptedRecord, type KeySlotRecord, type MetaRecord } from './db';
export { KeySlotManager } from './keyslots';
export { Vault, vault, type VaultState } from './vault';
export { VaultRepo } from './repo';
export { exportVault, importVault } from './exportImport';
