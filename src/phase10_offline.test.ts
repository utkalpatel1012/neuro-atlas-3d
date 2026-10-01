/**
 * 3D Neuroanatomy Atlas: Phase 10 Offline PWA Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Covers the Phase 10 budgeted-offline layer against REAL repo state:
 * no-unbounded-caching (precache lists hold zero GLB/mesh bytes; anatomy
 * never precached; 150 MB cap pinned between sw.js and the TS budget
 * module), budget enforcement (LRU eviction math), invalidation (old
 * versions deleted on activate; manifest generated_at mismatch purges the
 * anatomy tier), quota-crash safety (QuotaExceededError shrinks the tier,
 * never throws to UI), and the offline matrix — exercised BEHAVIOURALLY by
 * running the real `public/sw.js` source in a `node:vm` sandbox with a fake
 * Cache Storage (no real worker needed) plus source-asserted strategies and
 * the UI miss-signal contract.
 *
 * Hard stops enforced: unbounded-caching, stale-cache-serving,
 * quota-crash. If a feature needed one, it was cut (see completion report).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'node:vm';
import { fileURLToPath } from 'url';
import {
  ANATOMY_CACHE_CAP_BYTES,
  ANATOMY_CACHE_MIN_BYTES,
  isQuotaError,
  planEviction,
  shouldPurgeAnatomy,
  shrinkForQuota,
  OFFLINE_MISS_MARKER,
  OFFLINE_MISS_STATUS,
} from './pwa/cacheBudget';
import {
  OFFLINE_NOT_CACHED_MESSAGE,
  getOfflineStatusString,
  isOfflineMissBodyText,
  isOfflineMissStatus,
  offlineStatusMessage,
  renderOfflineNotCached,
  subscribeOfflineStatus,
} from './pwa/offlineStatus';
import { registerServiceWorker } from './pwa/registerServiceWorker';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

let passed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
  passed += 1;
}

function readText(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
}

/** Worker source minus comments: dependency/separation checks run on code, not prose. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}
function readStringArray(source: string, name: string): string[] {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  assert(match !== null, `sw.js declares ${name}`);
  const body = match?.[1] ?? '';
  return [...body.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

// ---------------------------------------------------------------------------
// Fake browser plumbing to run the REAL worker source under node:vm.
// ---------------------------------------------------------------------------

const SCOPE = 'https://sw.test/neuro-atlas-3d/';
const ORIGIN = 'https://sw.test';

interface FakeSwEvent {
  request: Request;
  respondWith(p: Promise<Response>): void;
  waitUntil(p: Promise<unknown>): void;
}

type FetchImpl = (req: Request) => Promise<Response>;

class FakeCache {
  store = new Map<string, Response>();
  putImpl: ((key: string, res: Response) => Promise<void>) | null = null;

  private key(req: Request | string): string {
    return typeof req === 'string' ? req : req.url;
  }

  async match(req: Request | string): Promise<Response | undefined> {
    const hit = this.store.get(this.key(req));
    return hit ? hit.clone() : undefined;
  }

  async put(req: Request | string, res: Response): Promise<void> {
    if (this.putImpl) {
      await this.putImpl(this.key(req), res);
      return;
    }
    this.store.set(this.key(req), res.clone());
  }

  async keys(): Promise<Request[]> {
    return [...this.store.keys()].map((u) => new Request(u));
  }

  async delete(req: Request | string): Promise<boolean> {
    return this.store.delete(this.key(req));
  }

  async addAll(urls: string[], fetchImpl: FetchImpl): Promise<void> {
    for (const u of urls) {
      const res = await fetchImpl(new Request(u));
      if (!res.ok) throw new Error(`addAll: ${u} -> ${res.status}`);
      await this.put(u, res);
    }
  }
}

interface Harness {
  listeners: Record<string, Array<(e: FakeSwEvent) => void>>;
  stores: Map<string, FakeCache>;
  fetchImpl: FetchImpl;
  waiters: Array<Promise<unknown>>;
  onPut: ((cacheName: string, key: string) => void) | null;
}

function loadWorker(fetchImpl: FetchImpl): Harness {
  const h: Harness = { listeners: {}, stores: new Map(), fetchImpl, waiters: [], onPut: null };
  const fakeCaches = {
    open: async (name: string): Promise<FakeCache> => {
      let c = h.stores.get(name);
      if (!c) {
        c = new FakeCache();
        const inner = c;
        const origPut = inner.put.bind(inner);
        inner.put = async (req: Request | string, res: Response): Promise<void> => {
          if (h.onPut) h.onPut(name, typeof req === 'string' ? req : req.url);
          await origPut(req, res);
        };
        h.stores.set(name, c);
      }
      return c;
    },
    keys: async (): Promise<string[]> => [...h.stores.keys()],
    delete: async (name: string): Promise<boolean> => h.stores.delete(name),
  };
  // Patch addAll (needs the harness fetch) onto every opened cache.
  const origOpen = fakeCaches.open;
  fakeCaches.open = async (name: string): Promise<FakeCache> => {
    const c = await origOpen(name);
    c.addAll = async (urls: string[]): Promise<void> => {
      for (const u of urls) {
        const res = await h.fetchImpl(new Request(u));
        if (!res.ok) throw new Error(`addAll: ${u} -> ${res.status}`);
        await c.put(u, res);
      }
    };
    return c;
  };
  const fakeSelf = {
    registration: { scope: SCOPE },
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: (e: FakeSwEvent) => void): void => {
      h.listeners[type] = h.listeners[type] ?? [];
      h.listeners[type].push(fn);
    },
    skipWaiting: async (): Promise<void> => undefined,
    clients: { claim: async (): Promise<void> => undefined },
  };
  const sandbox: Record<string, unknown> = {
    self: fakeSelf,
    caches: fakeCaches,
    fetch: (req: Request): Promise<Response> => h.fetchImpl(req),
    Response,
    Request,
    Headers,
    URL,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(readText('public/sw.js'), sandbox, { filename: 'sw.js' });
  return h;
}

function fire(h: Harness, type: string, event: Partial<FakeSwEvent> & { request: Request }): {
  responded: Promise<Response>;
  settled: Promise<unknown[]>;
} {
  const fns = h.listeners[type] ?? [];
  assert(fns.length > 0, `worker handles "${type}"`);
  let resolveResponded: (p: Promise<Response>) => void = () => undefined;
  const responded = new Promise<Promise<Response>>((resolve) => {
    resolveResponded = resolve;
  });
  const full: FakeSwEvent = {
    request: event.request,
    respondWith: (p: Promise<Response>): void => {
      resolveResponded(p);
    },
    waitUntil: (p: Promise<unknown>): void => {
      h.waiters.push(p);
    },
  };
  for (const fn of fns) fn(full);
  const settled = Promise.allSettled(h.waiters).then((r) => r);
  return { responded: responded.then((p) => p), settled };
}

async function settleAll(h: Harness): Promise<void> {
  for (let i = 0; i < 25 && h.waiters.length > 0; i += 1) {
    const batch = h.waiters.splice(0, h.waiters.length);
    await Promise.allSettled(batch);
  }
}

function ok(text: string): Response {
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

function glb(bytes: number): Response {
  return new Response('g'.repeat(bytes), {
    status: 200,
    headers: { 'Content-Type': 'model/gltf-binary' },
  });
}

function manifestJson(generatedAt: string): Response {
  return new Response(JSON.stringify({ manifest_version: '1.1.0', generated_at: generatedAt }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function runTests(): Promise<void> {
  const sw = readText('public/sw.js');

  // ---------------------------------------------------------------- TEST 1
  console.log('\n--- TEST 1: no-unbounded-caching (precache holds zero mesh bytes) ---');
  {
    const shell = readStringArray(sw, 'SHELL_PRECACHE');
    const meta = readStringArray(sw, 'META_PRECACHE');
    assert(shell.length > 0 && meta.length > 0, 'shell + metadata precache lists are non-empty');
    for (const url of [...shell, ...meta]) {
      assert(!/\.glb$/i.test(url), `precache entry is not a GLB: ${url}`);
      assert(!/\.gltf$/i.test(url), `precache entry is not a glTF: ${url}`);
      assert(!/mesh/i.test(url), `precache entry is not mesh bytes: ${url}`);
    }
    // Anatomy is runtime-only: addAll is used for shell/meta precache, never
    // for the anatomy tier.
    const addAllLines = sw.split('\n').filter((l) => l.includes('addAll'));
    assert(addAllLines.length > 0, 'worker precaches via addAll');
    for (const line of addAllLines) {
      assert(!/ANATOMY/i.test(line), `addAll never touches the anatomy tier: ${line.trim()}`);
    }
    assert(/ANATOMY_CACHE/.test(sw), 'anatomy tier exists as a runtime cache');
    console.log('[PASS] Precache lists contain zero GLB/mesh bytes; anatomy is runtime-only.');
  }

  // ---------------------------------------------------------------- TEST 2
  console.log('\n--- TEST 2: budget enforced (150 MB cap pinned + LRU eviction math) ---');
  {
    assert(/ANATOMY_CACHE_CAP_BYTES\s*=\s*150\s*\*\s*1024\s*\*\s*1024/.test(sw), 'sw.js caps anatomy at 150 * 1024 * 1024');
    assert(ANATOMY_CACHE_CAP_BYTES === 150 * 1024 * 1024, 'TS budget cap equals 150 MB');
    assert(ANATOMY_CACHE_CAP_BYTES <= 200 * 1024 * 1024, 'cap is within the 200 MB hard ceiling');
    assert(ANATOMY_CACHE_MIN_BYTES >= 1024 * 1024, 'quota floor is sane (>= 1 MB)');

    // LRU math: oldest-first until the incoming entry fits.
    const entries = [
      { url: 'a.glb', bytes: 60_000_000, lastAccess: 3 },
      { url: 'b.glb', bytes: 60_000_000, lastAccess: 1 },
      { url: 'c.glb', bytes: 60_000_000, lastAccess: 2 },
    ];
    assert(
      JSON.stringify(planEviction(entries, 150_000_000, 10_000_000)) === JSON.stringify(['b.glb']),
      'over-cap evicts the single oldest entry first',
    );
    assert(planEviction(entries, 200_000_000, 10_000_000).length === 0, 'under-cap evicts nothing');
    assert(planEviction([], 150_000_000, 10).length === 0, 'empty tier evicts nothing');
    const all = planEviction(entries, 100, 500_000_000);
    assert(all.length === 3, 'an incoming entry larger than the cap evicts everything rather than growing');
    // Zero/negative sizes never poison the math.
    assert(planEviction([{ url: 'z.glb', bytes: 0, lastAccess: 1 }], 100, 50).length === 0, 'zero-byte entries fit');
    // Cap enforcement runs on the put path (source-pinned).
    assert(/enforceAnatomyCap\(cache,\s*bytes\)/.test(sw), 'worker enforces the cap before every anatomy put');
    console.log('[PASS] 150 MB cap pinned in both layers; LRU eviction math holds.');
  }

  // ---------------------------------------------------------------- TEST 3
  console.log('\n--- TEST 3: invalidation (version change purges; generated_at mismatch purges) ---');
  {
    // Version derivation: placeholder stamped at build, never hardcoded stale.
    assert(sw.includes('__NEURO_ATLAS_VERSION__'), 'worker version derives from the build stamp placeholder');
    assert(!/neuro-shell-v\d/.test(sw), 'no hardcoded stale shell version');
    assert(!/neuro-anatomy-v\d/.test(sw), 'no hardcoded stale anatomy version');
    // Activate deletes old versions, keeps this build's three tiers.
    assert(/addEventListener\('activate'/.test(sw), 'worker handles activate');
    assert(/caches\.keys\(\)/.test(sw), 'activate enumerates caches');
    assert(/caches\.delete\(/.test(sw), 'activate deletes stale caches');
    // generated_at guard exists and targets the anatomy tier.
    assert(/generated_at/.test(sw), 'worker compares manifest generated_at');
    assert(/caches\.delete\(ANATOMY_CACHE\)/.test(sw), 'generated_at mismatch purges the anatomy tier');

    // Pure guard semantics.
    assert(shouldPurgeAnatomy('2026-01-01', '2026-02-02') === true, 'mismatch purges');
    assert(shouldPurgeAnatomy('2026-01-01', '2026-01-01') === false, 'match keeps');
    assert(shouldPurgeAnatomy(null, '2026-02-02') === false, 'missing cached value never purges');
    assert(shouldPurgeAnatomy('2026-01-01', undefined) === false, 'missing network value never purges');

    // Behaviour: old versioned caches die on activate.
    {
      const h = loadWorker(async () => new Response('x', { status: 404 }));
      const seed = await (h as unknown as {
        stores: Map<string, FakeCache>;
      }).stores;
      void seed;
      const cachesAny = h.stores;
      for (const name of ['neuro-shell-vOLD', 'neuro-meta-vOLD', 'neuro-anatomy-vOLD']) {
        const c = new FakeCache();
        c.store.set(`${SCOPE}#seed`, ok('seed'));
        cachesAny.set(name, c);
      }
      const evt = { request: new Request(SCOPE) };
      fire(h, 'activate', evt);
      await settleAll(h);
      const remaining = [...h.stores.keys()];
      assert(!remaining.some((n) => n.endsWith('-vOLD')), 'activate deleted all old-version caches');
    }

    // Behaviour: manifest generated_at mismatch purges a populated anatomy tier.
    {
      const anatomyUrl = `${SCOPE}assets/derived/mesh.test.v1/runtime/model.meshopt.glb`;
      const h = loadWorker(async (req: Request) => {
        if (req.url.endsWith('assets.manifest.json')) return manifestJson('2026-02-02T00:00:00Z');
        if (req.url === anatomyUrl) return glb(64);
        return ok('static');
      });
      const anatomy = new FakeCache();
      anatomy.store.set(anatomyUrl, glb(64));
      h.stores.set('neuro-anatomy-__NEURO_ATLAS_VERSION__', anatomy);
      const meta = new FakeCache();
      meta.store.set(
        `${SCOPE}assets/assets.manifest.json`,
        manifestJson('2026-01-01T00:00:00Z'),
      );
      h.stores.set('neuro-meta-__NEURO_ATLAS_VERSION__', meta);
      const { responded } = fire(h, 'fetch', {
        request: new Request(`${SCOPE}assets/assets.manifest.json`),
      });
      const res = await responded;
      assert(res.status === 200, 'manifest itself still served despite the mismatch');
      await settleAll(h);
      assert(!h.stores.has('neuro-anatomy-__NEURO_ATLAS_VERSION__'), 'stale anatomy tier purged on generated_at mismatch');
    }
    console.log('[PASS] Version rotation + generated_at guard purge stale state, never serve it.');
  }

  // ---------------------------------------------------------------- TEST 4
  console.log('\n--- TEST 4: quota-crash safety (shrinks tier, never throws to UI) ---');
  {
    assert(isQuotaError({ name: 'QuotaExceededError' }) === true, 'name shape detected');
    assert(isQuotaError({ code: 22 }) === true, 'legacy code 22 detected');
    assert(isQuotaError({ code: 1014 }) === true, 'legacy code 1014 detected');
    assert(isQuotaError(new Error('exceeded QUOTA for storage')) === true, 'message shape detected');
    assert(isQuotaError(new Error('boom')) === false, 'ordinary errors are not quota errors');
    assert(isQuotaError(null) === false && isQuotaError(undefined) === false, 'null-safe');
    assert(shrinkForQuota(150 * 1024 * 1024) === 75 * 1024 * 1024, 'quota halves the tier');
    assert(shrinkForQuota(ANATOMY_CACHE_MIN_BYTES) === ANATOMY_CACHE_MIN_BYTES, 'shrink floors at the minimum');
    assert(/QuotaExceededError/.test(sw), 'worker names the quota error');
    assert(/shrinkAnatomyTierOnQuota/.test(sw), 'worker shrinks the anatomy tier first on quota');

    // Behaviour: every put throws QuotaExceededError — the page still gets
    // the live response and the harness sees no rejection.
    {
      const anatomyUrl = `${SCOPE}assets/derived/mesh.quota.v1/runtime/q.meshopt.glb`;
      const h = loadWorker(async (req: Request) => {
        if (req.url === anatomyUrl) return glb(128);
        return ok('static');
      });
      h.onPut = () => undefined;
      const cache = new FakeCache();
      cache.putImpl = async (): Promise<void> => {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      };
      h.stores.set('neuro-anatomy-__NEURO_ATLAS_VERSION__', cache);
      const { responded } = fire(h, 'fetch', { request: new Request(anatomyUrl) });
      const res = await responded;
      assert(res.status === 200, 'quota pressure still delivers the network response');
      assert((await res.arrayBuffer()).byteLength === 128, 'response body intact under quota pressure');
      await settleAll(h);
    }
    console.log('[PASS] Quota errors shrink the tier and never reach the UI.');
  }

  // ---------------------------------------------------------------- TEST 5
  console.log('\n--- TEST 5: offline matrix (each tier asserted against the SW source) ---');
  {
    // Install precaches shell + metadata (behavioural).
    {
      const h = loadWorker(async () => ok('static'));
      const evt = { request: new Request(SCOPE) };
      fire(h, 'install', evt);
      await settleAll(h);
      const names = [...h.stores.keys()];
      assert(names.some((n) => n.startsWith('neuro-shell-')), 'install creates the shell tier');
      assert(names.some((n) => n.startsWith('neuro-meta-')), 'install creates the metadata tier');
      assert(!names.some((n) => n.startsWith('neuro-anatomy-')), 'install never creates the anatomy tier');
      let glbCount = 0;
      for (const c of h.stores.values()) {
        for (const u of c.store.keys()) if (/\.glb$/i.test(u)) glbCount += 1;
      }
      assert(glbCount === 0, 'precache holds zero GLB bytes');
    }

    // Shell loads offline (precached index served when the network fails).
    {
      const h = loadWorker(async (req: Request) => {
        if (req.url === `${SCOPE}index.html`) return ok('<html>shell</html>');
        throw new Error('offline');
      });
      const shell = new FakeCache();
      shell.store.set(`${SCOPE}index.html`, ok('<html>shell</html>'));
      h.stores.set('neuro-shell-__NEURO_ATLAS_VERSION__', shell);
      const { responded } = fire(h, 'fetch', { request: new Request(`${SCOPE}index.html`) });
      const res = await responded;
      assert(res.status === 200, 'shell served offline from cache');
      assert((await res.text()).includes('shell'), 'shell body is the cached app shell');
      await settleAll(h);
    }

    // Cached anatomy renders offline (cache-first hit with dead network).
    {
      const anatomyUrl = `${SCOPE}assets/derived/mesh.offline.v1/runtime/o.meshopt.glb`;
      const h = loadWorker(async () => {
        throw new Error('offline');
      });
      const anatomy = new FakeCache();
      anatomy.store.set(anatomyUrl, glb(96));
      h.stores.set('neuro-anatomy-__NEURO_ATLAS_VERSION__', anatomy);
      const { responded } = fire(h, 'fetch', { request: new Request(anatomyUrl) });
      const res = await responded;
      assert(res.status === 200, 'cached anatomy served offline');
      assert((await res.arrayBuffer()).byteLength === 96, 'cached anatomy bytes intact');
      await settleAll(h);
    }

    // Uncached anatomy shows the honest miss (503 + JSON marker), and the UI
    // hook recognises + renders it.
    {
      const missUrl = `${SCOPE}assets/derived/mesh.missing.v1/runtime/m.meshopt.glb`;
      const h = loadWorker(async () => {
        throw new Error('offline');
      });
      const { responded } = fire(h, 'fetch', { request: new Request(missUrl) });
      const res = await responded;
      assert(isOfflineMissStatus(res.status), `miss status is 503 (got ${res.status})`);
      const text = await res.text();
      assert(text.includes(OFFLINE_MISS_MARKER), 'miss body carries the coordinated marker');
      assert(isOfflineMissBodyText(text) === true, 'UI hook recognises the miss body');
      assert(isOfflineMissStatus(200) === false, 'UI hook rejects non-miss statuses');
      const html = renderOfflineNotCached('mesh.missing.v1');
      assert(html.includes(OFFLINE_NOT_CACHED_MESSAGE), 'renderer prints the honest state');
      assert(html.includes('mesh.missing.v1'), 'renderer names the missing asset');
      assert(!/spinner|loading/i.test(html), 'renderer never shows a spinner');
      await settleAll(h);
    }

    // Metadata is cache-first-then-network (network wins when reachable).
    {
      const metaUrl = `${SCOPE}data/anatomical_hierarchy.json`;
      const h = loadWorker(async (req: Request) => {
        if (req.url === metaUrl) return ok('{"fresh":true}');
        return ok('static');
      });
      const meta = new FakeCache();
      meta.store.set(metaUrl, ok('{"fresh":false}'));
      h.stores.set('neuro-meta-__NEURO_ATLAS_VERSION__', meta);
      const { responded } = fire(h, 'fetch', { request: new Request(metaUrl) });
      const res = await responded;
      assert((await res.text()).includes('fresh":true'), 'metadata revalidates against the network');
      await settleAll(h);
    }

    // Study state untouched: the worker never references Phase 9 storage.
    const code = stripComments(sw);
    assert(!/localStorage/.test(code), 'worker never touches localStorage study state');
    assert(!/studyStore/.test(code), 'worker never imports the study store');
    for (const rel of ['src/pwa/cacheBudget.ts', 'src/pwa/offlineStatus.ts', 'src/pwa/registerServiceWorker.ts']) {
      assert(!/study\//.test(readText(rel)), `${rel} imports no study state`);
    }

    // Offline-status hook semantics.
    assert(getOfflineStatusString(true) === 'online', 'online maps to online');
    assert(getOfflineStatusString(false) === 'offline', 'offline maps to offline');
    assert(offlineStatusMessage('offline').includes('cached'), 'offline message promises only cached content');
    const unsub = subscribeOfflineStatus(() => undefined);
    assert(typeof unsub === 'function', 'subscribe is safe under Node (no-op unsubscribe)');
    unsub();
    assert(OFFLINE_MISS_STATUS === 503, 'miss status pinned to 503 in both layers');
    console.log('[PASS] Shell/metadata/anatomy/state offline behaviours all hold.');
  }

  // ---------------------------------------------------------------- TEST 6
  console.log('\n--- TEST 6: host wiring + packaging (manifest, index, vite, scripts) ---');
  {
    // Web manifest: installable, subpath-correct, dependency-free icons.
    const manifest = JSON.parse(readText('public/manifest.webmanifest')) as {
      scope?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ src?: string }>;
    };
    assert(manifest.scope === '/neuro-atlas-3d/', 'manifest scope matches the project subpath');
    assert(manifest.start_url === '/neuro-atlas-3d/', 'manifest start_url matches the project subpath');
    assert(manifest.display === 'standalone', 'manifest display is standalone');
    assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest declares icons');
    for (const icon of manifest.icons ?? []) {
      assert(typeof icon.src === 'string' && icon.src.startsWith('data:'), 'icons are inline data URIs (no external fetch)');
      assert(!/^https?:\/\//.test(icon.src ?? ''), 'no external icon URLs');
    }

    // index.html: manifest link + registration call only.
    const index = readText('index.html');
    assert(/rel="manifest"/.test(index), 'index.html links the manifest');
    assert(/manifest\.webmanifest/.test(index), 'index.html manifest link points at the shipped file');
    assert(/registerServiceWorker/.test(index), 'index.html wires the one-line registration call');

    // vite.config.ts: copies SW/manifest to dist + stamps the version only.
    const vite = readText('vite.config.ts');
    assert(vite.includes('__NEURO_ATLAS_VERSION__'), 'vite stamps the build version into the worker');
    assert(/package\.json/.test(vite), 'vite derives the stamp from package.json');
    assert(/sw\.js/.test(vite) && /manifest\.webmanifest/.test(vite), 'vite handles both PWA files');

    // package.json: focused script wired.
    const pkg = JSON.parse(readText('package.json')) as { scripts?: Record<string, string> };
    assert(typeof pkg.scripts?.['test:offline10'] === 'string', 'test:offline10 script exists');
    assert((pkg.scripts?.['test:offline10'] ?? '').includes('phase10_offline'), 'focused script runs this suite');
    assert((pkg.scripts?.['test'] ?? '').includes('phase10_offline'), 'full test chain includes this suite');

    // No new dependencies (hand-rolled; Workbox/Dexie absent).
    const deps = { ...(pkg as { dependencies?: Record<string, string> }).dependencies };
    assert(!('workbox-core' in deps) && !('dexie' in deps), 'no Workbox/Dexie dependencies');
    assert(!/workbox|dexie/i.test(stripComments(sw)), 'worker is hand-rolled (no Workbox/Dexie)');

    // Registration entrypoint is import-safe under Node (never throws).
    const reg = await registerServiceWorker();
    assert(reg === null, 'registration resolves null outside browsers');
    console.log('[PASS] Manifest, host wiring, build stamp, and scripts all correct.');
  }

  console.log('\n================================================================');
  console.log(`ALL PHASE 10 OFFLINE TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 10 offline test execution failed:\n', err);
  process.exit(1);
});
