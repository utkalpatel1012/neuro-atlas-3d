/**
 * 3D Neuroanatomy Atlas: shared batch-staging core (Phase 5.x consolidation)
 * Standard: AAS-2026-NEURO-V1
 *
 * ONE generic staging loop shared by `prepare_gyral_batch.ts`,
 * `prepare_deep_batch.ts` and `prepare_posterior_batch.ts`. Each caller keeps its
 * own item table plus a small spec (source resolution, verification, ingestion
 * template, verdict shapes) and delegates the loop, the immutable staging copy,
 * and the ledger write to `prepareBatch(spec)`. Pure refactor: no new anatomy,
 * no new provenance, no behaviour change.
 *
 * Certified behaviours preserved here (not relaxed):
 * - PUBLISHED-FIRST acquisition precedence lives in `update_manifest.ts`; the
 *   posterior spec additionally preserves a previously recorded acquisition
 *   date via `readPriorAcquisitionDate` (never synthesised, never `new Date()`).
 * - Posterior pinned-hash gating: staged bytes are compared against the
 *   committed pins in `data/phase52_source_hashes.json`, never against
 *   themselves. The rejection wording lives in the posterior wrapper so the
 *   regression guard keeps seeing it there.
 * - Laterality is asserted from measured source geometry, never filenames.
 * - Provenance is never derived from filesystem timestamps (no
 *   timestamp-derived dates anywhere in this directory's pipeline code).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface PrepVerdict {
  assetId: string;
  structureId: string;
  state: 'SOURCE_AVAILABLE' | 'PREP_FAILED';
  detail: string;
  // Architecture N4: the anatomical category travels through the ledger so the
  // batch runner can select a category-appropriate QA profile.
  category: string;
  // Gyral batches additionally carry the staged content identity; other
  // batches omit these keys (their specs never set them).
  sourceHash?: string;
  byteLength?: number;
}

/** Per-item inputs the shared loop needs from the host environment. */
export interface StagingContext {
  projectRoot: string;
  /** Resolved from the spec's stage-dir env name (mirror batches); '' when the
   *  spec stages from in-repo sources instead (gyral batch). */
  stageDir: string;
}

/** What a spec's `prepareOne` must return for a successfully staged item. */
export interface StagingSuccess {
  /** Absolute path of `assets/raw/<assetId>`; the loop writes ingestion.json here. */
  rawDir: string;
  /** Ingestion record object (ingestAsset schema + derivation block), built by
   *  the spec with its exact historical key order. */
  ingestion: unknown;
  /** Human-readable ledger detail line, built by the spec. */
  detail: string;
  /** Set by specs whose ledger records content identity (gyral batch). */
  sourceHash?: string;
  byteLength?: number;
}

export interface BatchStagingSpec<TItem> {
  items: readonly TItem[];
  projectRoot: string;
  batchName: string;
  /** Historical generator string of the owning wrapper (recorded in data). */
  generator: string;
  /** Repo-relative ledger path, e.g. `data/phase5_batch1.json`. */
  ledgerRelativePath: string;
  /** Env var overriding the mirror stage directory (deep/posterior batches). */
  stageDirEnvName?: string;
  stageDirDefault?: string;
  /** Stage + verify + build the ingestion record for one item (throws on any
   *  integrity failure). The spec owns every batch-specific check. */
  prepareOne: (item: TItem, ctx: StagingContext) => StagingSuccess;
  /** Build the ledger verdicts with each batch's historical key order. */
  successVerdict: (item: TItem, result: StagingSuccess) => PrepVerdict;
  failureVerdict: (item: TItem, message: string) => PrepVerdict;
}

/** SHA-256 of a file's bytes. */
export function sha256File(p: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

/** SHA-256 of an in-memory buffer. */
export function sha256Bytes(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Today's date as `YYYY-MM-DD` (run stamp for fresh acquisitions). */
export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export interface SourceBBox {
  center: [number, number, number];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  tris: number;
}

function scanBinaryStl(
  stlPath: string,
  onBadVertex: (triangle: number) => Error
): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number; tris: number } {
  const buf = fs.readFileSync(stlPath);
  const tris = buf.readUInt32LE(80);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50;
    for (let v = 0; v < 3; v++) {
      const x = buf.readFloatLE(base + 12 + v * 12);
      const y = buf.readFloatLE(base + 16 + v * 12);
      const z = buf.readFloatLE(base + 20 + v * 12);
      if (![x, y, z].every(Number.isFinite)) throw onBadVertex(t);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, maxX, minY, maxY, minZ, maxZ, tris };
}

/**
 * Full source-frame bounding box of a binary STL (deep-batch semantics,
 * including its historical non-finite-vertex wording).
 */
export function measureSourceBbox(stlPath: string): SourceBBox {
  const s = scanBinaryStl(stlPath, () => new Error(`Non-finite vertex in ${stlPath}.`));
  const r = (v: number): number => Number(v.toFixed(2));
  return {
    center: [r((s.minX + s.maxX) / 2), r((s.minY + s.maxY) / 2), r((s.minZ + s.maxZ) / 2)],
    minX: s.minX,
    maxX: s.maxX,
    minY: s.minY,
    maxY: s.maxY,
    minZ: s.minZ,
    maxZ: s.maxZ,
    tris: s.tris
  };
}

export interface SourceXStats {
  centerX: number;
  minX: number;
  maxX: number;
  tris: number;
}

/**
 * Source-frame X extent of a binary STL (posterior-batch semantics:
 * midline-span check needs X only; historical wording preserved).
 */
export function measureSourceX(stlPath: string): SourceXStats {
  const buf = fs.readFileSync(stlPath);
  const tris = buf.readUInt32LE(80);
  let minX = Infinity;
  let maxX = -Infinity;
  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50;
    for (let v = 0; v < 3; v++) {
      const x = buf.readFloatLE(base + 12 + v * 12);
      if (!Number.isFinite(x)) throw new Error(`Non-finite vertex in ${stlPath}.`);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  return { centerX: Number(((minX + maxX) / 2).toFixed(2)), minX, maxX, tris };
}

/**
 * Committed expected SHA-256 pins for mirror downloads
 * (`data/phase52_source_hashes.json`). Absent file = empty map; the caller
 * (posterior spec) refuses to ingest unpinned items.
 */
export function loadPinnedSourceHashes(projectRoot: string, pinnedRelativePath: string): Map<string, string> {
  const pinned = new Map<string, string>();
  const p = path.join(projectRoot, pinnedRelativePath);
  if (!fs.existsSync(p)) return pinned;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const s of doc.sources ?? []) {
    if (s && typeof s.fma_id === 'string' && typeof s.sha256 === 'string') {
      pinned.set(s.fma_id, s.sha256);
    }
  }
  return pinned;
}

/**
 * Previously recorded acquisition date of an existing ingestion record, or
 * null when absent/unparseable (caller records an explicit gap instead of
 * inventing a date).
 */
export function readPriorAcquisitionDate(ingestionPath: string): string | null {
  if (!fs.existsSync(ingestionPath)) return null;
  try {
    const prior = JSON.parse(fs.readFileSync(ingestionPath, 'utf8'));
    if (typeof prior.acquisition_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(prior.acquisition_date)) {
      return prior.acquisition_date;
    }
  } catch { /* fall through to null */ }
  return null;
}

/**
 * Create `rawDir` and stage one verified file into it. A pre-existing staged
 * file with different bytes is an immutability violation (throws); an
 * identical file is left untouched. Returns the staged destination path.
 */
export function stageCopyImmutable(rawDir: string, fileName: string, stagedPath: string, hash: string): string {
  fs.mkdirSync(rawDir, { recursive: true });
  const dest = path.join(rawDir, fileName);
  if (fs.existsSync(dest)) {
    const existing = sha256File(dest);
    if (existing !== hash) throw new Error(`Staged file exists with different hash (immutability): ${dest}`);
  } else {
    fs.copyFileSync(stagedPath, dest);
  }
  return dest;
}

/**
 * Shared staging loop: per-item `prepareOne`, ingestion write, verdict
 * capture (failures never throw the batch), ledger write, summary logging.
 */
export function prepareBatch<TItem>(spec: BatchStagingSpec<TItem>): PrepVerdict[] {
  const stageDir = spec.stageDirEnvName
    ? (process.env[spec.stageDirEnvName] || spec.stageDirDefault || '')
    : (spec.stageDirDefault || '');
  const ctx: StagingContext = { projectRoot: spec.projectRoot, stageDir };
  const verdicts: PrepVerdict[] = [];
  for (const item of spec.items) {
    try {
      const result = spec.prepareOne(item, ctx);
      fs.writeFileSync(path.join(result.rawDir, 'ingestion.json'), JSON.stringify(result.ingestion, null, 2), 'utf8');
      verdicts.push(spec.successVerdict(item, result));
    } catch (err) {
      verdicts.push(spec.failureVerdict(item, `Preparation failed: ${(err as Error).message}`));
    }
  }
  const batchRecord = {
    batch: spec.batchName,
    generated_at: new Date().toISOString(),
    generator: spec.generator,
    items: verdicts
  };
  fs.writeFileSync(path.join(spec.projectRoot, spec.ledgerRelativePath), JSON.stringify(batchRecord, null, 2), 'utf8');
  const ok = verdicts.filter((v) => v.state === 'SOURCE_AVAILABLE').length;
  console.log(`[BATCH PREP] ${ok}/${verdicts.length} assets SOURCE_AVAILABLE → ${spec.ledgerRelativePath}`);
  for (const v of verdicts.filter((v) => v.state !== 'SOURCE_AVAILABLE')) {
    console.error(`[BATCH PREP] ${v.assetId}: ${v.detail}`);
  }
  return verdicts;
}
