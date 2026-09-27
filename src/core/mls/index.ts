/**
 * Crow MLS module — barrel export.
 *
 * Provides Messaging Layer Security group encryption primitives.
 *
 * ⚠️  The MLS runtime is currently an **architecture stub**.
 *     All crypto operations throw `MLS_NOT_IMPLEMENTED`.
 *     See {@link MLSRuntime} for the full interface contract.
 */

export type { MLSGroupState, MLSMember, MLSKeyPackage } from './types';
export { MLSRuntime, MLS_NOT_IMPLEMENTED } from './mlsRuntime';
export { GroupManager } from './groupManager';
export type { GroupStore } from './groupManager';
