/**
 * 3D Neuroanatomy Atlas: Phase 10 offline-status hook.
 * Standard: AAS-2026-NEURO-V1
 *
 * Online/offline events → UI status string, plus the honest
 * "offline — not cached" renderer for uncached anatomy (never a spinner
 * forever, never a fake mesh). DOM-optional: pure helpers run under Node;
 * only `subscribeOfflineStatus` touches `window`, guarded.
 */

import { OFFLINE_MISS_MARKER, OFFLINE_MISS_STATUS } from './cacheBudget';

/** UI status string. Exactly one of these two values. */
export type OfflineStatus = 'online' | 'offline';

/** Honest renderer text for uncached anatomy (shared with the worker). */
export const OFFLINE_NOT_CACHED_MESSAGE = 'offline — not cached';

/** Map a boolean connectivity flag to a UI status string. */
export function getOfflineStatusString(isOnline: boolean): OfflineStatus {
  return isOnline ? 'online' : 'offline';
}

/** Human-facing status line for the atlas UI. */
export function offlineStatusMessage(status: OfflineStatus): string {
  return status === 'online' ? 'online' : 'offline — showing cached content';
}

/**
 * Subscribe to browser online/offline events. Outside a browser this is a
 * no-op returning a no-op unsubscribe (keeps `tsx` suites green). The
 * callback fires immediately once with the current status.
 */
export function subscribeOfflineStatus(onChange: (status: OfflineStatus) => void): () => void {
  const w = globalThis as { window?: Window };
  if (typeof w.window === 'undefined' || typeof w.window.addEventListener !== 'function') {
    return () => undefined;
  }
  const emit = (): void => {
    try {
      onChange(getOfflineStatusString(w.window?.navigator?.onLine !== false));
    } catch {
      // Listener errors must never break the host UI.
    }
  };
  const goOnline = (): void => emit();
  const goOffline = (): void => emit();
  w.window.addEventListener('online', goOnline);
  w.window.addEventListener('offline', goOffline);
  emit();
  return () => {
    w.window?.removeEventListener('online', goOnline);
    w.window?.removeEventListener('offline', goOffline);
  };
}

/**
 * True when a response body carries the worker's offline-miss marker.
 * Coordinates with `public/sw.js` (status 503 + JSON marker).
 */
export function isOfflineMissBodyText(text: string): boolean {
  return text.includes(OFFLINE_MISS_MARKER);
}

/** True when a status code is the worker's offline-miss signal. */
export function isOfflineMissStatus(status: number): boolean {
  return status === OFFLINE_MISS_STATUS;
}

/**
 * Honest "offline — not cached" renderer: returns an HTML snippet the host
 * can inject where the mesh would render. Plain text + asset id + recovery
 * hint; no spinner, no placeholder geometry, no invented anatomy.
 */
export function renderOfflineNotCached(assetId: string): string {
  const safe = assetId.replace(/[<>&"]/g, '');
  return (
    `<div class="atlas-offline-miss" role="status">` +
    `<strong>${OFFLINE_NOT_CACHED_MESSAGE}</strong>` +
    `<span>Anatomy asset “${safe}” is not in the offline cache. ` +
    `Reconnect to load it — nothing is rendered in its place.</span>` +
    `</div>`
  );
}
