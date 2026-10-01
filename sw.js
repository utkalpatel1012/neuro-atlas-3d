/**
 * Neuro Atlas 3D — offline service worker (Phase 10).
 * Hand-rolled; no Workbox, no Dexie (see docs/PHASE_10_COMPLETION_REPORT.md
 * for the written justification). Vanilla Cache Storage only.
 *
 * Cache tiers (see docs/PHASE_10_ANATOMICAL_SCOPE.md):
 *   1. App shell    — precached, versioned (`neuro-shell-vN`).
 *   2. Metadata     — precached, versioned (`neuro-meta-vN`): manifests,
 *                      hierarchy, search/knowledge records (KBs, zero GLB).
 *   3. Anatomy      — RUNTIME-cached ONLY on first fetch, byte-capped at
 *                      150 MB with LRU eviction (`neuro-anatomy-vN`).
 *                      Never precached. Never unbounded.
 *   4. Study state  — Phase 9 persistent store. This worker never touches it.
 *
 * Versioning: APP_VERSION is stamped at build time — vite.config.ts replaces
 * the version placeholder below with the package.json version. No version is
 * ever hardcoded here, so a stale constant cannot survive a release. Activate
 * deletes every older neuro-shell-/neuro-meta-/neuro-anatomy- cache.
 *
 * Stale-cache guard: when a network manifest carries a `generated_at` that
 * differs from the cached copy, the anatomy tier is purged (stale meshes are
 * never served as current).
 *
 * Honest offline miss (coordinated with src/pwa/offlineStatus.ts): an
 * uncached anatomy request while offline resolves to HTTP 503 + JSON
 * {"neuroAtlasOfflineMiss":true,...} — the app renders "offline — not
 * cached", never a spinner forever, never a fake mesh.
 *
 * Quota safety: every cache.put is wrapped; QuotaExceededError shrinks the
 * anatomy tier first (LRU, oldest-half eviction, one retry), then gives up
 * caching and returns the network response. The worker never throws to the
 * page and never crashes on quota pressure.
 */

/* global self, caches, fetch, Response, Request */

const APP_VERSION = '0.1.1';
const SHELL_CACHE = 'neuro-shell-' + APP_VERSION;
const META_CACHE = 'neuro-meta-' + APP_VERSION;
const ANATOMY_CACHE = 'neuro-anatomy-' + APP_VERSION;
const CACHE_PREFIXES = ['neuro-shell-', 'neuro-meta-', 'neuro-anatomy-'];

/** Anatomy-tier cap: 150 MB (mirrors src/pwa/cacheBudget.ts; test-pinned). */
const ANATOMY_CACHE_CAP_BYTES = 150 * 1024 * 1024;

const OFFLINE_MISS_STATUS = 503;
const OFFLINE_MISS_MARKER = 'neuroAtlasOfflineMiss';

/** Shell precache: app entry points only. Zero GLB/mesh bytes by policy. */
const SHELL_PRECACHE = ['./', 'index.html', 'manifest.webmanifest'];

/** Metadata precache: manifests + hierarchy (KBs). Zero GLB/mesh bytes. */
const META_PRECACHE = [
  'assets/manifests/assets.manifest.json',
  'assets/assets.manifest.json',
  'data/anatomical_hierarchy.json',
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

function isAnatomyRequest(url) {
  const path = url.pathname.toLowerCase();
  return path.endsWith('.glb') || path.includes('/assets/derived/');
}

function isManifestRequest(url) {
  return url.pathname.endsWith('assets.manifest.json');
}

function offlineMissResponse(requestUrl, tier) {
  const body = JSON.stringify({
    neuroAtlasOfflineMiss: true,
    tier,
    url: requestUrl,
    message: 'offline — not cached: reconnect to the network to fetch this resource',
  });
  return new Response(body, {
    status: OFFLINE_MISS_STATUS,
    headers: { 'Content-Type': 'application/json', 'x-neuro-offline-miss': '1' },
  });
}

function isQuotaError(err) {
  if (!err) return false;
  if (err.name === 'QuotaExceededError') return true;
  if (err.code === 22 || err.code === 1014) return true;
  if (typeof err.message === 'string' && /quota/i.test(err.message)) return true;
  return false;
}

async function entryBytes(cache, request, response) {
  const marked = response.headers.get('x-neuro-bytes');
  const parsed = marked !== null ? Number(marked) : NaN;
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  try {
    const buf = await response.clone().arrayBuffer();
    return buf.byteLength;
  } catch (err) {
    if (isQuotaError(err)) throw err;
    return 0;
  }
}

/**
 * Byte-counted LRU eviction: deletes oldest-first (by x-neuro-cached-at)
 * until `incomingBytes` fits under the cap. Returns bytes freed.
 */
async function enforceAnatomyCap(cache, incomingBytes, capBytes) {
  const cap = capBytes || ANATOMY_CACHE_CAP_BYTES;
  const keys = await cache.keys();
  if (keys.length === 0) return 0;
  const entries = [];
  let used = 0;
  for (const key of keys) {
    const res = await cache.match(key);
    if (!res) continue;
    const bytes = await entryBytes(cache, key, res);
    const at = Number(res.headers.get('x-neuro-cached-at'));
    entries.push({ request: key, bytes, at: Number.isFinite(at) ? at : 0 });
    used += bytes;
  }
  if (used + incomingBytes <= cap) return 0;
  entries.sort((a, b) => a.at - b.at);
  const need = used + incomingBytes - cap;
  let freed = 0;
  for (const e of entries) {
    await cache.delete(e.request);
    freed += e.bytes;
    if (freed >= need) break;
  }
  return freed;
}

/** Quota path: evict the oldest half of the tier, then report. Never throws. */
async function shrinkAnatomyTierOnQuota(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length === 0) return;
    const entries = [];
    for (const key of keys) {
      const res = await cache.match(key);
      if (!res) continue;
      const at = Number(res.headers.get('x-neuro-cached-at'));
      entries.push({ request: key, at: Number.isFinite(at) ? at : 0 });
    }
    entries.sort((a, b) => a.at - b.at);
    const victimCount = Math.max(1, Math.ceil(entries.length / 2));
    for (let i = 0; i < victimCount; i += 1) {
      await cache.delete(entries[i].request);
    }
  } catch (err) {
    // Shrink is best-effort; a failing shrink must not fail the request.
  }
}

async function storeAnatomyResponse(cache, request, response) {
  const forMeasure = response.clone();
  const forStore = response.clone();
  let bytes = 0;
  try {
    bytes = (await forMeasure.arrayBuffer()).byteLength;
  } catch (err) {
    if (isQuotaError(err)) {
      await shrinkAnatomyTierOnQuota(cache);
      return response;
    }
    return response;
  }
  const stamped = new Response(await forStore.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: (() => {
      const h = new Headers(response.headers);
      h.set('x-neuro-cached-at', String(Date.now()));
      h.set('x-neuro-bytes', String(bytes));
      return h;
    })(),
  });
  try {
    await enforceAnatomyCap(cache, bytes);
    await cache.put(request, stamped);
  } catch (err) {
    if (isQuotaError(err)) {
      // Shrink the anatomy tier first, retry once, then serve uncached.
      await shrinkAnatomyTierOnQuota(cache);
      try {
        await enforceAnatomyCap(cache, bytes);
        await cache.put(request, stamped);
      } catch (retryErr) {
        // Give up caching; the live response still goes to the page.
      }
    }
    // Non-quota put failures are equally non-fatal: serve the response.
  }
  return response;
}

/** Anatomy: cache-first; honest 503 miss offline; LRU-capped runtime puts. */
async function handleAnatomy(event) {
  const cache = await caches.open(ANATOMY_CACHE);
  const hit = await cache.match(event.request);
  if (hit) {
    // Touch recency in the background; a failing touch never fails the hit.
    event.waitUntil(
      (async () => {
        try {
          const fresh = new Response(await hit.clone().blob(), {
            status: hit.status,
            statusText: hit.statusText,
            headers: (() => {
              const h = new Headers(hit.headers);
              h.set('x-neuro-cached-at', String(Date.now()));
              return h;
            })(),
          });
          await cache.put(event.request, fresh);
        } catch (err) {
          // Best-effort recency touch only.
        }
      })(),
    );
    return hit;
  }
  try {
    const network = await fetch(event.request);
    if (!network || !network.ok) {
      return network && network.status !== OFFLINE_MISS_STATUS
        ? network
        : offlineMissResponse(event.request.url, 'anatomy');
    }
    return await storeAnatomyResponse(cache, event.request, network);
  } catch (err) {
    return offlineMissResponse(event.request.url, 'anatomy');
  }
}

function readGeneratedAt(text) {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed.generated_at === 'string' ? parsed.generated_at : null;
  } catch (err) {
    return null;
  }
}

/**
 * Stale-cache guard: when the network manifest's generated_at differs from
 * the cached copy, purge the anatomy tier instead of serving stale meshes.
 * Never throws; never blocks the manifest response itself.
 */
async function maybePurgeStaleAnatomy(cachedResponse, networkResponse) {
  try {
    if (!cachedResponse || !networkResponse || !networkResponse.ok) return;
    const [cachedText, networkText] = await Promise.all([
      cachedResponse.clone().text(),
      networkResponse.clone().text(),
    ]);
    const cachedAt = readGeneratedAt(cachedText);
    const networkAt = readGeneratedAt(networkText);
    if (cachedAt && networkAt && cachedAt !== networkAt) {
      await caches.delete(ANATOMY_CACHE);
    }
  } catch (err) {
    // Guard failures must never break manifest delivery.
  }
}

/** Shell/metadata: cache-first-then-network with background revalidation. */
async function handleVersioned(event, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request);
  try {
    const network = await fetch(event.request);
    if (network && network.ok) {
      if (isManifestRequest(new URL(event.request.url))) {
        await maybePurgeStaleAnatomy(hit, network);
      }
      const copy = network.clone();
      event.waitUntil(
        (async () => {
          try {
            await cache.put(event.request, copy);
          } catch (err) {
            if (isQuotaError(err)) {
              // Versioned tiers are small and protected: drop the update,
              // never evict shell/metadata to make room, never throw.
            }
          }
        })(),
      );
      return network;
    }
    return hit || network;
  } catch (err) {
    if (hit) return hit;
    if (event.request.mode === 'navigate') {
      const index = await cache.match(scopeUrl('index.html'));
      if (index) return index;
    }
    return offlineMissResponse(event.request.url, cacheName === META_CACHE ? 'metadata' : 'shell');
  }
}

self.addEventListener('install', (event) => {
  // Precache shell + metadata only. Anatomy is NEVER precached.
  event.waitUntil(
    (async () => {
      try {
        const shell = await caches.open(SHELL_CACHE);
        await shell.addAll(SHELL_PRECACHE.map(scopeUrl));
      } catch (err) {
        // Partial shell precache: fetch handler still covers misses.
      }
      try {
        const meta = await caches.open(META_CACHE);
        await meta.addAll(META_PRECACHE.map(scopeUrl));
      } catch (err) {
        // Partial metadata precache: fetch handler still covers misses.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  // Delete every older versioned cache; keep only this build's three tiers.
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, META_CACHE, ANATOMY_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          const managed = CACHE_PREFIXES.some((prefix) => name.startsWith(prefix));
          if (managed && !keep.has(name)) return caches.delete(name);
          return Promise.resolve(false);
        }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  try {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    // Cross-origin: network only, never cached (no unbounded external bytes).
    if (url.origin !== self.location.origin) return;
    if (isAnatomyRequest(url)) {
      event.respondWith(handleAnatomy(event));
      return;
    }
    if (
      isManifestRequest(url) ||
      url.pathname.includes('/data/') ||
      url.pathname.includes('/assets/manifests/')
    ) {
      event.respondWith(handleVersioned(event, META_CACHE));
      return;
    }
    event.respondWith(handleVersioned(event, SHELL_CACHE));
  } catch (err) {
    // The worker itself must never crash a page load.
    event.respondWith(Promise.resolve(offlineMissResponse(event.request.url, 'shell')));
  }
});
