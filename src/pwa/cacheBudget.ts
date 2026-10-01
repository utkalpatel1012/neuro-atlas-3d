/**
 * 3D Neuroanatomy Atlas: Phase 10 cache-budget manager.
 * Standard: AAS-2026-NEURO-V1
 *
 * Pure, dependency-free budget logic shared (by documented mirror) with
 * `public/sw.js`. The service worker keeps its own small inline copy because
 * a worker script cannot import TS modules; the two copies are pinned equal
 * by `src/phase10_offline.test.ts` (cap value, miss marker, eviction order).
 *
 * Hard stops enforced: unbounded-caching (150 MB cap + LRU eviction),
 * stale-cache-serving (generated_at mismatch purges the anatomy tier),
 * quota-crash (quota errors shrink the tier, never throw to UI).
 */

/** Default anatomy-tier cap: 150 MB (scope-mandated; must stay <= 200 MB). */
export const ANATOMY_CACHE_CAP_MB = 150;

/** Anatomy-tier cap in bytes. */
export const ANATOMY_CACHE_CAP_BYTES = ANATOMY_CACHE_CAP_MB * 1024 * 1024;

/** Floor for quota-driven shrinking: never shrink the tier below 25 MB. */
export const ANATOMY_CACHE_MIN_BYTES = 25 * 1024 * 1024;

/** Versioned cache-name prefixes (full name = prefix + build version). */
export const SHELL_CACHE_PREFIX = 'neuro-shell-';
export const META_CACHE_PREFIX = 'neuro-meta-';
export const ANATOMY_CACHE_PREFIX = 'neuro-anatomy-';

/** Honest offline-miss signal: HTTP status the app recognises. */
export const OFFLINE_MISS_STATUS = 503;

/** Honest offline-miss signal: JSON marker the app recognises. */
export const OFFLINE_MISS_MARKER = 'neuroAtlasOfflineMiss';

/** One cache entry for eviction planning. */
export interface LruEntry {
  url: string;
  bytes: number;
  /** Epoch ms of last use (older = evicted first). */
  lastAccess: number;
}

/**
 * LRU eviction plan: oldest-first URLs to delete so `incomingBytes` fits
 * under `capBytes`. Pure — no Cache API needed, unit-tested with fakes.
 * Returns [] when everything already fits. Never throws on empty input.
 */
export function planEviction(
  entries: LruEntry[],
  capBytes: number,
  incomingBytes: number,
): string[] {
  const sizes = entries.map((e) => (Number.isFinite(e.bytes) && e.bytes > 0 ? e.bytes : 0));
  const used = sizes.reduce((a, b) => a + b, 0);
  if (used + incomingBytes <= capBytes) return [];
  const ordered = entries
    .map((e, i) => ({ url: e.url, bytes: sizes[i], lastAccess: e.lastAccess }))
    .sort((a, b) => a.lastAccess - b.lastAccess);
  const evict: string[] = [];
  let freed = 0;
  const need = used + incomingBytes - capBytes;
  for (const e of ordered) {
    evict.push(e.url);
    freed += e.bytes;
    if (freed >= need) break;
  }
  return evict;
}

/**
 * Stale-cache guard: purge the anatomy tier when the cached manifest's
 * `generated_at` differs from the network manifest's. Missing values are
 * inconclusive (never purge on missing data — return false).
 */
export function shouldPurgeAnatomy(
  cachedGeneratedAt: string | null | undefined,
  networkGeneratedAt: string | null | undefined,
): boolean {
  if (!cachedGeneratedAt || !networkGeneratedAt) return false;
  return cachedGeneratedAt !== networkGeneratedAt;
}

/** True for quota errors (all known shapes); never throws on odd input. */
export function isQuotaError(err: unknown): boolean {
  if (!err || (typeof err !== 'object' && typeof err !== 'function')) return false;
  const e = err as { name?: unknown; code?: unknown; message?: unknown };
  if (e.name === 'QuotaExceededError') return true;
  // Legacy DOMException codes: 22 (QUOTA_EXCEEDED_ERR), 1014 (NS_ERROR_DOM_QUOTA_REACHED).
  if (e.code === 22 || e.code === 1014) return true;
  if (typeof e.message === 'string' && /quota/i.test(e.message)) return true;
  return false;
}

/**
 * Quota-driven shrink: halve the tier cap, floored at ANATOMY_CACHE_MIN_BYTES.
 * The anatomy tier always shrinks first; shell/metadata tiers are untouched.
 */
export function shrinkForQuota(currentCapBytes: number): number {
  const halved = Math.floor(currentCapBytes / 2);
  return Math.max(halved, ANATOMY_CACHE_MIN_BYTES);
}

/** Reported storage budget (nulls where the platform exposes nothing). */
export interface StorageBudget {
  quotaBytes: number | null;
  usageBytes: number | null;
  anatomyCapBytes: number;
  /** Whether current usage fits the quota; null when unknown. */
  fits: boolean | null;
}

/**
 * Quota estimate via navigator.storage. Safe outside browsers (nulls).
 * Never throws; never touches study-state storage.
 */
export async function estimateStorageBudget(): Promise<StorageBudget> {
  const fallback: StorageBudget = {
    quotaBytes: null,
    usageBytes: null,
    anatomyCapBytes: ANATOMY_CACHE_CAP_BYTES,
    fits: null,
  };
  try {
    const nav = globalThis.navigator as Navigator | undefined;
    const storage = nav?.storage;
    if (!storage || typeof storage.estimate !== 'function') return fallback;
    const est = await storage.estimate();
    const quotaBytes = typeof est.quota === 'number' ? est.quota : null;
    const usageBytes = typeof est.usage === 'number' ? est.usage : null;
    return {
      quotaBytes,
      usageBytes,
      anatomyCapBytes: ANATOMY_CACHE_CAP_BYTES,
      fits: quotaBytes !== null && usageBytes !== null ? usageBytes <= quotaBytes : null,
    };
  } catch {
    return fallback;
  }
}

/**
 * Best-effort sum of anatomy-tier bytes from Cache Storage metadata headers
 * (`x-neuro-bytes`, written by the worker at put time). Returns null when
 * Cache Storage is unavailable or unreadable. Never throws, never caches.
 */
export async function estimateAnatomyUsage(): Promise<number | null> {
  try {
    const cacheStorage = (globalThis as { caches?: CacheStorage }).caches;
    if (!cacheStorage || typeof cacheStorage.keys !== 'function') return null;
    const names = await cacheStorage.keys();
    const anatomy = names.filter((n) => n.startsWith(ANATOMY_CACHE_PREFIX));
    let total = 0;
    for (const name of anatomy) {
      const cache = await cacheStorage.open(name);
      const keys = await cache.keys();
      for (const req of keys) {
        const res = await cache.match(req);
        if (!res) continue;
        const header = res.headers.get('x-neuro-bytes');
        const parsed = header !== null ? Number(header) : NaN;
        if (Number.isFinite(parsed) && parsed >= 0) {
          total += parsed;
        } else {
          const buf = await res.clone().arrayBuffer();
          total += buf.byteLength;
        }
      }
    }
    return total;
  } catch {
    return null;
  }
}
