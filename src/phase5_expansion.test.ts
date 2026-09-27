/**
 * 3D Neuroanatomy Atlas: Phase 5.0 Asset Expansion Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Covers §44 against REAL batch outputs (no synthetics): unique IDs,
 * provenance/license/laterality/coordinate/hash completeness, geometry
 * validity, manifest + hierarchy consistency, loading, LOD relations,
 * clipping/selection/focus/isolation/bookmarks on batch assets.
 * All previous Phase 0–4 suites must remain green (verified via `npm test`).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parseGLB } from '../scripts/pipeline/glb_utils';
import { AssetManager } from './engine/AssetManager';
import { AnatomicalEntityManager } from './engine/AnatomicalEntityManager';
import { AnatomicalAssemblyManager } from './engine/AnatomicalAssemblyManager';
import { MaterialManager } from './engine/MaterialManager';
import { SelectionManager } from './engine/SelectionManager';
import { VisibilityManager } from './engine/VisibilityManager';
import { CameraManager } from './engine/CameraManager';
import { SectionPlaneSet } from './engine/SectionPlaneSet';
import { ClippingAdapter } from './engine/ClippingAdapter';
import { createBookmark, serializeBookmark, deserializeBookmark } from './engine/sectionBookmarks';
import { AnatomicalEntityRecord } from './engine/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

function readJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8'));
}

function sha256File(rel: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(PROJECT_ROOT, rel))).digest('hex');
}

const BATCH_BASES = [
  'superior_frontal_gyrus',
  'middle_frontal_gyrus',
  'precentral_gyrus',
  'postcentral_gyrus',
  'supramarginal_gyrus',
  'angular_gyrus',
  'middle_temporal_gyrus',
  'cingulate_gyrus'
];

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 5.0 ASSET EXPANSION TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  const manifest = readJson('assets/manifests/assets.manifest.json');
  const structureFiles = fs.readdirSync(path.join(PROJECT_ROOT, 'data/structures')).filter((f) => f.endsWith('.json'));
  const records = structureFiles.map((f) => readJson(`data/structures/${f}`));

  // TEST 1: unique structure + asset IDs (§44).
  console.log('--- TEST 1: Unique IDs ---');
  const structureIds = records.map((r: any) => r.id);
  assert(new Set(structureIds).size === structureIds.length, `duplicate structure IDs (${structureIds.length} records)`);
  passed++;
  const assetIds = records.map((r: any) => r.asset_id);
  assert(new Set(assetIds).size === assetIds.length, 'duplicate asset IDs across structure records');
  passed++;
  assert(structureFiles.length === 20, `20 structure records (4 legacy + 16 batch), got ${structureFiles.length}`);
  passed++;
  assert(Object.keys(manifest.assets).length === 20, `manifest holds 20 assets, got ${Object.keys(manifest.assets).length}`);
  passed++;
  console.log('[PASS] Unique structure/asset IDs; 20 records; 20 manifest assets.');
  passed++;

  // TEST 2: provenance completeness (§6, §9, §44).
  console.log('\n--- TEST 2: Provenance completeness ---');
  for (const r of records) {
    const p = r.asset_provenance || {};
    for (const field of ['dataset_name', 'dataset_version', 'source_url', 'upstream_asset_id', 'upstream_license', 'attribution_text_required', 'resulting_sha256_hash', 'resulting_license']) {
      assert(typeof p[field] === 'string' && p[field].length > 0, `${r.id}: provenance field '${field}' present`);
      passed++;
    }
  }
  console.log('[PASS] Every asset carries dataset/version/URL/license/attribution/hashes.');
  passed++;

  // TEST 3: license metadata (§8, §44) — per-asset terms; uncertainty explicit.
  console.log('\n--- TEST 3: License metadata ---');
  for (const assetId of Object.keys(manifest.assets)) {
    const entry = manifest.assets[assetId];
    assert(typeof entry.upstream_license === 'string' && entry.upstream_license.length > 0, `${assetId}: upstream license recorded`);
    passed++;
    assert(typeof entry.legal_review_notes === 'string' && /LEGAL_REVIEW_REQUIRED/.test(entry.legal_review_notes), `${assetId}: retroactivity uncertainty explicit (no guessing)`);
    passed++;
    assert(entry.project_distribution_policy === 'CC-BY-SA-4.0', `${assetId}: distribution policy explicit`);
    passed++;
  }
  assert(manifest.production_whitelist.length === 20, 'whitelist covers all 20 production assets');
  passed++;
  assert((manifest.research_quarantine || []).length === 0, 'nothing quarantined in production manifest');
  passed++;
  console.log('[PASS] Per-asset licenses; uncertainty explicit; whitelist exact.');
  passed++;

  // TEST 4: laterality — explicit + mirror geometry (§10, §15, §44).
  console.log('\n--- TEST 4: Laterality + mirror check ---');
  for (const base of BATCH_BASES) {
    const leftId = `mesh.${base}.left.v1`;
    const rightId = `mesh.${base}.right.v1`;
    const left = manifest.assets[leftId];
    const right = manifest.assets[rightId];
    assert(left && right, `${base}: bilateral manifest entries present`);
    passed++;
    assert(left.centroid_mm[0] < 0 && right.centroid_mm[0] > 0, `${base}: mirror signs (L=${left.centroid_mm[0]}, R=${right.centroid_mm[0]} — a swap would fail here)`);
    passed++;
    for (let d = 0; d < 3; d++) {
      const denom = Math.max(Math.abs(left.dimensions_mm[d]), Math.abs(right.dimensions_mm[d]), 1e-9);
      assert(Math.abs(left.dimensions_mm[d] - right.dimensions_mm[d]) / denom < 0.1, `${base}: mirror dimension similarity axis ${d}`);
      passed++;
    }
  }
  console.log('[PASS] Bilateral pairs present; left/right mirror signs hold (swap-proof).');
  passed++;

  // TEST 5: coordinate space (§14, §44) + scale sanity (§16, documented).
  console.log('\n--- TEST 5: Coordinate space + scale sanity ---');
  const parentBounds: Record<string, { min: number[]; max: number[] }> = {};
  for (const side of ['left', 'right']) {
    const parent = manifest.assets[`mesh.cortex.${side}.v1`];
    parentBounds[side] = {
      min: [parent.centroid_mm[0] - parent.dimensions_mm[0] / 2, parent.centroid_mm[1] - parent.dimensions_mm[1] / 2, parent.centroid_mm[2] - parent.dimensions_mm[2] / 2],
      max: [parent.centroid_mm[0] + parent.dimensions_mm[0] / 2, parent.centroid_mm[1] + parent.dimensions_mm[1] / 2, parent.centroid_mm[2] + parent.dimensions_mm[2] / 2]
    };
  }
  for (const base of BATCH_BASES) {
    for (const side of ['left', 'right']) {
      const entry = manifest.assets[`mesh.${base}.${side}.v1`];
      assert(/canonical_atlas_ras/.test(entry.coordinate_space), `${entry.asset_id}: canonical space declared`);
      passed++;
      assert(entry.dimensions_mm.every((d: number) => d > 0 && d <= 500), `${entry.asset_id}: sanity dims (0,500]mm (sanity, not biology)`);
      passed++;
      // Data-derived containment: gyral piece fits inside its hemisphere composite.
      const childMin = [entry.centroid_mm[0] - entry.dimensions_mm[0] / 2, entry.centroid_mm[1] - entry.dimensions_mm[1] / 2, entry.centroid_mm[2] - entry.dimensions_mm[2] / 2];
      const childMax = [entry.centroid_mm[0] + entry.dimensions_mm[0] / 2, entry.centroid_mm[1] + entry.dimensions_mm[1] / 2, entry.centroid_mm[2] + entry.dimensions_mm[2] / 2];
      const parent = parentBounds[side];
      const inside = childMin.every((v, i) => v >= parent.min[i] - 1) && childMax.every((v, i) => v <= parent.max[i] + 1);
      assert(inside, `${entry.asset_id}: centroid/bounds inside parent ${side} composite (data-derived containment)`);
      passed++;
    }
  }
  console.log('[PASS] Canonical space declared; sanity dims; child-in-parent containment.');
  passed++;

  // TEST 6: source + derived hashes (§19, §44).
  console.log('\n--- TEST 6: Hash chains ---');
  for (const base of BATCH_BASES) {
    for (const side of ['left', 'right']) {
      const assetId = `mesh.${base}.${side}.v1`;
      const ingest = readJson(`assets/raw/${assetId}/ingestion.json`);
      const fmaFile = fs.readdirSync(path.join(PROJECT_ROOT, 'assets/raw', assetId)).find((f) => f.endsWith('.stl'))!;
      assert(sha256File(`assets/raw/${assetId}/${fmaFile}`) === ingest.original_hash, `${assetId}: staged bytes match recorded source hash`);
      passed++;
      const entry = manifest.assets[assetId];
      const canonicalRel = entry.canonical_glb_path as string;
      assert(sha256File(canonicalRel) === entry.resulting_sha256_hash, `${assetId}: canonical GLB matches manifest hash`);
      passed++;
      assert(entry.derived_from?.input_sha256 === ingest.original_hash, `${assetId}: derivation input links source hash`);
      passed++;
    }
  }
  console.log('[PASS] Source bytes, canonical bytes, and derivation links hash-verified.');
  passed++;

  // TEST 7: geometry validity — real canonical GLBs (§13, §44).
  console.log('\n--- TEST 7: Geometry validity ---');
  for (const base of BATCH_BASES) {
    for (const side of ['left', 'right']) {
      const assetId = `mesh.${base}.${side}.v1`;
      const canonicalRel = manifest.assets[assetId].canonical_glb_path as string;
      const bytes = fs.readFileSync(path.join(PROJECT_ROOT, canonicalRel));
      const { geometry } = parseGLB(bytes);
      const pos = geometry.positions as Float32Array;
      assert(pos.length > 0 && pos.length % 3 === 0, `${assetId}: nonzero position buffer`);
      passed++;
      let finite = true;
      for (let i = 0; i < pos.length; i += 3) {
        if (!Number.isFinite(pos[i]) || !Number.isFinite(pos[i + 1]) || !Number.isFinite(pos[i + 2])) {
          finite = false;
          break;
        }
      }
      assert(finite, `${assetId}: all vertices finite`);
      passed++;
      const tris = geometry.indices ? geometry.indices.length / 3 : pos.length / 9;
      assert(tris > 0, `${assetId}: nonzero triangles (${tris})`);
      passed++;
    }
  }
  console.log('[PASS] All 16 canonical geometries finite with nonzero triangles.');
  passed++;

  // TEST 8: manifest consistency (§30, §31, §44).
  console.log('\n--- TEST 8: Manifest consistency ---');
  for (const assetId of Object.keys(manifest.assets)) {
    const entry = manifest.assets[assetId];
    assert(fs.existsSync(path.join(PROJECT_ROOT, 'assets/raw', assetId, 'ingestion.json')), `${assetId}: raw ingestion record present`);
    passed++;
    for (const lod of ['lod0', 'lod1', 'lod2', 'lod3']) {
      assert(entry.lod_files?.[lod] && fs.existsSync(path.join(PROJECT_ROOT, entry.lod_files[lod].path)), `${assetId}: ${lod} file present`);
      passed++;
      assert(entry.runtime_files?.[lod] && fs.existsSync(path.join(PROJECT_ROOT, entry.runtime_files[lod].path)), `${assetId}: runtime ${lod} present`);
      passed++;
    }
    assert(entry.validation_status === 'CLEARED', `${assetId}: validation CLEARED`);
    passed++;
  }
  assert(new Set(manifest.production_whitelist).size === manifest.production_whitelist.length, 'whitelist unique');
  passed++;
  assert(manifest.production_whitelist.every((id: string) => manifest.assets[id]), 'whitelist resolves to manifest entries');
  passed++;
  console.log('[PASS] Manifest authoritative: files present, CLEARED, whitelist exact.');
  passed++;

  // TEST 9: hierarchy consistency (§5, §11, §12, §44).
  console.log('\n--- TEST 9: Hierarchy consistency ---');
  const hierarchy = readJson('data/anatomical_hierarchy.json');
  const nodeIds = hierarchy.nodes.map((n: any) => n.id);
  assert(new Set(nodeIds).size === nodeIds.length, 'hierarchy node IDs unique');
  passed++;
  for (const node of hierarchy.nodes) {
    for (const childId of node.children || []) {
      assert(nodeIds.includes(childId), `hierarchy child resolves: ${childId}`);
      passed++;
    }
    if (node.geometry_state === 'AVAILABLE') {
      assert(node.asset_id && manifest.assets[node.asset_id], `AVAILABLE node has manifest asset: ${node.id}`);
      passed++;
      assert(node.structure_record && fs.existsSync(path.join(PROJECT_ROOT, node.structure_record)), `AVAILABLE node has structure record: ${node.id}`);
      passed++;
    } else {
      assert(!node.asset_id, `DOCUMENTED node claims no geometry: ${node.id}`);
      passed++;
    }
  }
  const batchParentIds = new Set<string>();
  for (const f of structureFiles) {
    if (f.startsWith('cortex_') || f.startsWith('hippocampus_')) continue;
    const r = readJson(`data/structures/${f}`);
    assert(r.hierarchy?.parent_id && nodeIds.includes(r.hierarchy.parent_id), `${r.id}: parent resolves in hierarchy`);
    passed++;
    batchParentIds.add(r.hierarchy.parent_id);
    assert(r.topography?.relationships?.some((rel: any) => rel.relationship_type === 'part_of' && rel.target_entity_id === r.hierarchy.parent_id), `${r.id}: part_of relationship to parent`);
    passed++;
    assert(!/functional|network|disorder|dsm|rdoc/i.test(JSON.stringify({ f: r.functional_neuroanatomy, p: r.psychiatric_relevance })), `${r.id}: no functional/psychiatric content in batch records`);
    passed++;
  }
  console.log('[PASS] Hierarchy resolves; AVAILABLE/DOCUMENTED honest; part_of linked.');
  passed++;

  // TEST 10: asset loading — real batch GLBs through AssetManager (§44).
  console.log('\n--- TEST 10: Asset loading ---');
  for (const assetId of ['mesh.precentral_gyrus.left.v1', 'mesh.cingulate_gyrus.right.v1']) {
    const mgr = new AssetManager();
    await mgr.loadManifest('assets/manifests/assets.manifest.json');
    const loadedAsset = await mgr.loadAsset(assetId, 'lod0');
    assert(loadedAsset.triangleCount > 0, `${assetId}: loads with nonzero triangles (${loadedAsset.triangleCount})`);
    passed++;
    mgr.dispose();
  }
  console.log('[PASS] Batch assets load lazily with real geometry.');
  passed++;

  // TEST 11: LOD relationships (§20, §21, §44).
  console.log('\n--- TEST 11: LOD relationships ---');
  for (const base of BATCH_BASES) {
    for (const side of ['left', 'right']) {
      const entry = manifest.assets[`mesh.${base}.${side}.v1`];
      const tris = ['lod0', 'lod1', 'lod2', 'lod3'].map((lod) => entry.lod_files[lod].triangles);
      assert(tris.every((t: number) => t > 0), `${entry.asset_id}: all LODs nonzero`);
      passed++;
      assert(tris[0] >= tris[1] && tris[1] >= tris[2] && tris[2] >= tris[3], `${entry.asset_id}: LOD triangle monotonicity (identity-preserving simplification)`);
      passed++;
    }
  }
  console.log('[PASS] LOD0–3 present, nonzero, monotonically simplified.');
  passed++;

  // TEST 12: clipping + selection + focus + isolation + bookmarks (§41, §42, §44).
  console.log('\n--- TEST 12: System integration ---');
  const mgr3 = new AssetManager();
  await mgr3.loadManifest('assets/manifests/assets.manifest.json');
  const entityMgr = new AnatomicalEntityManager();
  const assembly = new AnatomicalAssemblyManager();
  const materialMgr = new MaterialManager();
  const selectionMgr = new SelectionManager(entityMgr, materialMgr);
  const visibilityMgr = new VisibilityManager(entityMgr, materialMgr);
  const cameraMgr = new CameraManager(800, 600);
  const planeSet = new SectionPlaneSet();
  const adapter = new ClippingAdapter();
  adapter.bind(planeSet);

  const manifestEntry = manifest.assets['mesh.precentral_gyrus.left.v1'];
  const record: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.left.frontal_lobe.precentral_gyrus',
    assetId: 'mesh.precentral_gyrus.left.v1',
    name: 'Precentral gyrus (Left)',
    officialLatin: 'Gyrus precentralis',
    laterality: 'left',
    canonicalCentroidMm: manifestEntry.centroid_mm,
    dimensionsMm: manifestEntry.dimensions_mm,
    volumeCm3: 12.5,
    topologyClass: manifestEntry.topology_class,
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'FMA72662',
    groups: ['division.cerebrum', 'hemisphere.left', 'lobe.frontal']
  };
  const loaded = await mgr3.loadAsset(record.assetId, 'lod0');
  const material = materialMgr.registerEntityMaterial(record.entityId);
  loaded.mesh.material = material;
  entityMgr.registerEntity(record, loaded.mesh);
  assembly.registerEntity(record, loaded.mesh);
  adapter.registerMaterial(record.entityId, material);

  planeSet.setConstant('plane.sagittal', record.canonicalCentroidMm[0]);
  planeSet.setEnabled('plane.sagittal', true);
  assert(adapter.getActivePlaneCount() === 1, 'batch mesh carries clipping plane');
  passed++;
  assembly.selectEntity(record.entityId);
  selectionMgr.select(record.entityId);
  assert(selectionMgr.getSelectedEntityId() === record.entityId, 'batch entity selectable');
  passed++;
  cameraMgr.focusBoundingBox(assembly.getEntityBoundingBox(record.entityId), 0);
  assert(cameraMgr.getTarget().length() > 0, 'batch entity focusable');
  passed++;
  visibilityMgr.isolate(record.entityId);
  assert(visibilityMgr.isIsolated(record.entityId) === true, 'batch entity isolatable');
  passed++;
  visibilityMgr.restoreAll();
  const bm = createBookmark({
    id: 'bookmark.phase5.1',
    label: 'Phase 5 batch check',
    planes: planeSet.serialize(),
    presentation: { version: 1, sectionModeEnabled: true, activePlaneId: 'plane.sagittal', gizmoVisible: false, cutEdgeVisible: true, interiorMode: 'TRUE_CAP_WHERE_VALID', labelsEnabled: true, orientationVisible: true, readoutVisible: true, crosshairVisible: false, visualMode: 'NORMAL_SECTION', capsVisible: true, edgesVisible: true },
    camera: null,
    selectedEntityId: record.entityId,
    isolatedEntityId: null,
    hiddenEntityIds: [],
    labelsEnabled: true
  });
  assert(bm !== null && deserializeBookmark(serializeBookmark(bm!))?.selectedEntityId === record.entityId, 'batch entity bookmark round-trips');
  passed++;
  adapter.dispose();
  planeSet.dispose();
  assembly.dispose();
  materialMgr.dispose();
  mgr3.dispose();
  console.log('[PASS] Clipping, selection, focus, isolation, bookmarks on batch geometry.');
  passed++;

  // TEST 13: legacy assets untouched (§37, §38).
  console.log('\n--- TEST 13: Legacy safety ---');
  for (const legacyId of ['mesh.hippocampus.left.v1', 'mesh.hippocampus.right.v1', 'mesh.cortex.left.v1', 'mesh.cortex.right.v1']) {
    assert(manifest.assets[legacyId], `legacy asset retained: ${legacyId}`);
    passed++;
    assert(manifest.assets[legacyId].validation_status === 'CLEARED', `legacy stays CLEARED: ${legacyId}`);
    passed++;
  }
  const legacyRecord = readJson('data/structures/hippocampus_left.json');
  assert(legacyRecord.id === 'brain.telencephalon.left.limbic.hippocampus', 'legacy hippocampus record identity intact');
  passed++;
  console.log('[PASS] Existing hippocampus/cortex preserved; no silent overwrite.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 5.0 EXPANSION TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 5.0 expansion test execution failed:\n', err);
  process.exit(1);
});
