/**
 * 3D Neuroanatomy Atlas: Phase 10 PWA module barrel.
 * Standard: AAS-2026-NEURO-V1
 */

export {
  ANATOMY_CACHE_CAP_BYTES,
  ANATOMY_CACHE_CAP_MB,
  ANATOMY_CACHE_MIN_BYTES,
  ANATOMY_CACHE_PREFIX,
  META_CACHE_PREFIX,
  OFFLINE_MISS_MARKER,
  OFFLINE_MISS_STATUS,
  SHELL_CACHE_PREFIX,
  estimateAnatomyUsage,
  estimateStorageBudget,
  isQuotaError,
  planEviction,
  shouldPurgeAnatomy,
  shrinkForQuota,
} from './cacheBudget';
export type { LruEntry, StorageBudget } from './cacheBudget';
export {
  OFFLINE_NOT_CACHED_MESSAGE,
  getOfflineStatusString,
  isOfflineMissBodyText,
  isOfflineMissStatus,
  offlineStatusMessage,
  renderOfflineNotCached,
  subscribeOfflineStatus,
} from './offlineStatus';
export type { OfflineStatus } from './offlineStatus';
export { registerServiceWorker } from './registerServiceWorker';
export type { RegisterOptions } from './registerServiceWorker';
