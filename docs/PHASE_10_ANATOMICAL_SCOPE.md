# Phase 10 Scope (offline PWA)

## Objective (registry)

Service worker, IndexedDB/Dexie if justified, offline asset cache/search/notes/
material. Budgeted caching only; stable data/runtime architecture prerequisite.

## Budget (the defining constraint)

Unlimited anatomy caching is prohibited. The mesh payload is 100MB+; mobile Safari
quotas are small and evictable. Cache tiers:

1. **App shell (precached, versioned):** HTML, JS, CSS — small, always fresh via
   version-stamped cache name; old versions deleted on activate.
2. **Metadata (precached):** asset manifests, hierarchy, search index, knowledge
   records, structure records — KBs, versioned with the shell.
3. **Anatomy (runtime-cached, bounded):** GLB/LOD files cached ONLY on first fetch,
   under an explicit MB cap (default 150 MB) with LRU eviction. Never pre-cached.
4. **Study state:** already localStorage (Phase 9) — untouched.

Stale-cache serving is prohibited: versioned cache names + manifest `generated_at`
comparison; mismatch purges anatomy tier, never serves stale meshes as current.

## Offline matrix (tested)

Shell loads offline · search works offline (cached index) · study state persists ·
cached anatomy renders offline · uncached anatomy shows an honest "offline — not
cached" state (never a spinner forever, never a fake mesh).

## Out of scope

Background sync, push notifications, new dependencies (hand-rolled SW; no Workbox
unless justified in writing), any anatomy pre-caching.
