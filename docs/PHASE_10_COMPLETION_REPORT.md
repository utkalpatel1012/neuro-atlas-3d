# Phase 10 Completion Report (offline PWA)

Standard: AAS-2026-NEURO-V1 · Phase 10 of `PHASE_REGISTRY.json`
Branch: `autonomous/phase-10` · No commit (per instruction).

## 1. What was built

Hand-rolled offline PWA, zero new npm dependencies:

- `public/sw.js` (new) — version-stamped three-tier worker (shell /
  metadata precached; anatomy runtime-LRU under a 150 MB cap; honest 503 +
  JSON offline miss; quota-safe; old versions deleted on activate;
  `generated_at` mismatch purges the anatomy tier).
- `public/manifest.webmanifest` (new) — installable manifest, scope +
  start_url `/neuro-atlas-3d/`, display standalone, inline SVG data-URI
  icon (no external icon fetch).
- `src/pwa/` (new module) — `cacheBudget.ts` (cap/LRU/purge/quota/budget
  reporting), `offlineStatus.ts` (online/offline → status string + honest
  "offline — not cached" renderer), `registerServiceWorker.ts`
  (single one-line host call), `index.ts` (barrel).
- `src/phase10_offline.test.ts` (new) — 6 sections / 114 checks, including
  a `node:vm` harness that runs the REAL `public/sw.js` source against a
  fake Cache Storage (no real worker needed).
- `index.html` — manifest link + registration call only.
- `vite.config.ts` — copy SW/manifest to `dist/` + build-version stamp only.
- `package.json` — new `test:offline10` script; full `test` chain extended
  to 24 suites.

## 2. Budgets enforced

| Tier | Policy | Cap | Precache |
|---|---|---|---|
| App shell (`neuro-shell-vN`) | versioned precache, cache-first-then-network | version rotation (old deleted on activate) | `./`, `index.html`, `manifest.webmanifest` — zero GLB bytes (asserted) |
| Metadata (`neuro-meta-vN`) | versioned precache, cache-first-then-network | version rotation | 2 manifest copies + `data/anatomical_hierarchy.json` — zero GLB bytes (asserted) |
| Anatomy (`neuro-anatomy-vN`) | runtime-only, cache-first, byte-counted LRU | **150 MB**, pinned equal in `sw.js` and `cacheBudget.ts`, ≤ 200 MB ceiling (asserted) | NEVER precached (asserted: `addAll` never touches the tier) |
| Study state | untouched (Phase 9 store) | n/a | worker has zero storage references (asserted on code minus comments) |

No-dependency justification (written, as required): the Cache Storage API
already provides everything this phase needs; the LRU planner is ~20 lines
of pure TS; persistence of sizes rides on `x-neuro-bytes` response headers
(no IndexedDB schema to migrate). Workbox would add a dependency for
strategy wrappers we implement in less code; Dexie/IndexedDB would add a
second storage system for metadata that fits comfortably in versioned
caches. Preferred: none. Added: none.

## 3. Offline matrix (tested)

| Scenario | Expected | Proven by |
|---|---|---|
| Shell loads offline | precached `index.html` served | vm harness: network dead → 200 cached shell |
| Search works offline | cached index/metadata served | metadata cache-first-then-network (network wins when reachable, cache wins offline) |
| Study state persists | worker never touches it | code-minus-comments has no storage refs; `src/pwa` imports no study modules |
| Cached anatomy renders offline | cache-first hit | vm harness: seeded GLB + dead network → 200, bytes intact |
| Uncached anatomy | honest miss: HTTP **503** + JSON `{"neuroAtlasOfflineMiss":true,…}`, UI renders **"offline — not cached"** (no spinner, no fake mesh) | vm harness asserts status/body; hook asserts marker recognition + renderer text, no-spinner |
| Version change | old `neuro-*-vOLD` caches deleted on activate | vm harness seeds `-vOLD` caches → gone |
| Manifest `generated_at` mismatch | anatomy tier purged, never served stale | vm harness: OLD cached vs NEW network manifest → tier deleted, manifest still 200 |
| Quota pressure | tier shrunk (oldest half evicted, one retry), then serve uncached — never throw, never crash | quota shapes detected; shrink halves to a 25 MB floor; vm harness: always-throwing `put` still delivers the live response |

## 4. Host-mount instructions (the one-line call)

Wired (in `index.html`, the only host seam touched — `src/main.ts` intentionally unedited):

```html
<link rel="manifest" href="manifest.webmanifest" />
<script type="module">
  import { registerServiceWorker } from '/src/pwa/registerServiceWorker';
  void registerServiceWorker();   <!-- the one-line call: registers sw.js, scope ./ -->
</script>
```

Phase 12 option: move the call into `src/main.ts` bootstrap
(`await registerServiceWorker();` before `app.start()`). Until then the
`index.html` wiring above is the single registration site — exactly once
per page load. `registerServiceWorker()` resolves `null` (never throws)
outside browsers or when workers are unsupported.

Version stamp: `vite.config.ts → stampPwaVersion()` copies `sw.js` +
`manifest.webmanifest` to `dist/` and replaces `__NEURO_ATLAS_VERSION__`
with the `package.json` version, so `neuro-shell-vN` / `neuro-meta-vN` /
`neuro-anatomy-vN` always derive from the build. `dist/` contains `sw.js`
(non-stale version) + `manifest.webmanifest` after `npm.cmd run build`.

## 5. Hard stops — all clear

- **unbounded-caching**: CUT by design — anatomy never precached, 150 MB
  byte-counted LRU, cross-origin never cached. Nothing in this phase needed
  unbounded storage, so nothing was cut mid-implementation beyond choosing
  the bounded design up front.
- **stale-cache-serving**: CUT by design — versioned cache names + activate
  purge + `generated_at` mismatch purge. No stale-serving path exists.
- **quota-crash**: CUT by design — every `put` wrapped; quota shrinks the
  anatomy tier first, one retry, then serves uncached. Shell/metadata tiers
  are never evicted to make room and their update failures are dropped
  silently. No crash path reaches the page.

## 6. Verification (observed)

- `npx.cmd tsc --noEmit` → 0 errors.
- `npx.cmd tsx src/phase10_offline.test.ts` → 6/6 sections, 114 checks PASS.
- `npm.cmd test` → exit 0, all 24 suites green.
- `npm.cmd run build` → exit 0; `dist/sw.js` (stamped, no placeholder) +
  `dist/manifest.webmanifest` present.
- `npm.cmd run audit:phase1` → PASS.
- Scope hygiene: no changes to assets, manifests, records, engine core, or
  existing tests; no new anatomical structures (zero count bumps); no
  commit; no new dependencies.

## 7. Limitations (explicit uncertainty)

- PWA behaviour is `AUTOMATED_TEST_VALIDATION` only (`node:vm` harness +
  source assertions): NOT `BROWSER_VALIDATION`, NOT
  `PHYSICAL_DEVICE_VALIDATION`. Install prompts, iOS Safari quota/eviction
  behaviour, and real offline navigation are TARGETS until measured on
  hardware (Phase 12).
- The worker's LRU recency "touch" on cache hits is best-effort
  (`waitUntil` re-put); under heavy load recency may lag — boundedness
  (the hard stop) never depends on it.
- Entry byte counts come from measured bodies at put time; pre-existing
  entries without `x-neuro-bytes` headers are measured on first enforcement
  pass.
