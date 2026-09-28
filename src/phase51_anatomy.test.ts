/**
 * 3D Neuroanatomy Atlas: Phase 5.1 Deep Gray + Limbic Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Covers §56 against REAL batch outputs: source identity, unique IDs,
 * laterality, provenance, license, transforms, topology, LOD, manifest,
 * hierarchy, loading, clipping, selection, isolation, focus, bookmarks.
 * Anatomy-only: any functional/psychiatric content in batch records FAILS.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
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

const BATCH: Array<{ base: string; laterality: string; fma: string }> = [
  { base: 'thalamus', laterality: 'left', fma: 'FMA258716' },
  { base: 'thalamus', laterality: 'right', fma: 'FMA258714' },
  { base: 'caudate_nucleus', laterality: 'left', fma: 'FMA72827' },
  { base: 'caudate_nucleus', laterality: 'right', fma: 'FMA72826' },
  { base: 'putamen', laterality: 'left', fma: 'FMA72829' },
  { base: 'putamen', laterality: 'right', fma: 'FMA72828' },
  { base: 'globus_pallidus', laterality: 'left', fma: 'FMA72831' },
  { base: 'globus_pallidus', laterality: 'right', fma: 'FMA72830' },
  { base: 'amygdala', laterality: 'left', fma: 'FMA72833' },
  { base: 'amygdala', laterality: 'right', fma: 'FMA72832' },
  { base: 'mammillary_body', laterality: 'bilateral', fma: 'FMA74877' }
];

const assetIdOf = (b: { base: string; laterality: string }): string => `mesh.${b.base}.${b.laterality}.v1`;

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 5.1 DEEP GRAY + LIMBIC TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  const manifest = readJson('assets/manifests/assets.manifest.json');
  // Global count advanced 31 → 36 in Phase 5.2 (5 posterior/ventricular
  // assets appended, same provenance chain). This suite's own load-bearing
  // assertions — the 11 deep/limbic assets, their hashes, hierarchy and
  // topology — are unchanged below.
  assert(Object.keys(manifest.assets).length === 36, `manifest holds 36 assets, got ${Object.keys(manifest.assets).length}`);
  passed++;

  // TEST 1: source identity + unique IDs (§56).
  console.log('--- TEST 1: Source identity + unique IDs ---');
  const seenStructures = new Set<string>();
  const seenAssets = new Set<string>();
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(rec.ontology?.fma_id === `FMA:${b.fma.replace(/^FMA/, '')}`, `${b.base}.${b.laterality}: FMA distribution identity exact`);
    passed++;
    assert(!seenStructures.has(rec.id) && !seenAssets.has(rec.asset_id), `${rec.id}: IDs unique`);
    passed++;
    seenStructures.add(rec.id);
    seenAssets.add(rec.asset_id);
    assert(rec.asset_id === assetIdOf(b), `${rec.id}: asset linkage exact`);
    passed++;
    assert(/UNVERIFIED/.test(rec.ontology?.ta2_id || '') && /UNVERIFIED/.test(rec.ontology?.uberon_id || ''), `${rec.id}: TA2/UBERON UNVERIFIED`);
    passed++;
  }
  console.log('[PASS] Distribution-identity exact; IDs unique; ontology honest.');
  passed++;

  // TEST 2: laterality — explicit + mirror geometry (§20 + §56).
  console.log('\n--- TEST 2: Laterality ---');
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(['left', 'right', 'bilateral'].includes(rec.laterality), `${rec.id}: explicit laterality`);
    passed++;
    const entry = manifest.assets[rec.asset_id];
    if (b.laterality === 'left') assert(entry.centroid_mm[0] < 0, `${rec.id}: canonical LEFT sign`);
    else if (b.laterality === 'right') assert(entry.centroid_mm[0] > 0, `${rec.id}: canonical RIGHT sign`);
    else assert(Math.abs(entry.centroid_mm[0]) < 10, `${rec.id}: bilateral spans midline`);
    passed++;
  }
  // Mirror pairs share near-identical scale (data-derived swap check).
  for (const base of ['thalamus', 'caudate_nucleus', 'putamen', 'globus_pallidus', 'amygdala']) {
    const l = manifest.assets[`mesh.${base}.left.v1`];
    const r = manifest.assets[`mesh.${base}.right.v1`];
    for (let d = 0; d < 3; d++) {
      const denom = Math.max(Math.abs(l.dimensions_mm[d]), Math.abs(r.dimensions_mm[d]), 1e-9);
      assert(Math.abs(l.dimensions_mm[d] - r.dimensions_mm[d]) / denom < 0.35, `${base}: mirror scale similarity axis ${d}`);
      passed++;
    }
  }
  console.log('[PASS] Laterality explicit; mirror signs hold; swap-proof.');
  passed++;

  // TEST 3: provenance + license (§56, no prohibited terms).
  console.log('\n--- TEST 3: Provenance + license ---');
  for (const b of BATCH) {
    const assetId = assetIdOf(b);
    const ingest = readJson(`assets/raw/${assetId}/ingestion.json`);
    for (const field of ['source_dataset', 'source_dataset_version', 'source_asset_id', 'source_url', 'source_license', 'attribution', 'original_hash']) {
      assert(typeof ingest[field] === 'string' && ingest[field].length > 0, `${assetId}: ingestion field '${field}'`);
      passed++;
    }
    assert(!/dual compliance/i.test(JSON.stringify(ingest)), `${assetId}: no banned term in ingestion record`);
    passed++;
    const entry = manifest.assets[assetId];
    assert(/LEGAL_REVIEW_REQUIRED/.test(entry.legal_review_notes || ''), `${assetId}: legal uncertainty explicit`);
    passed++;
    assert(entry.project_distribution_policy === 'CC-BY-SA-4.0', `${assetId}: distribution explicit`);
    passed++;
    assert(entry.derived_from == null, `${assetId}: fresh download has no in-repo derivation (honest lineage)`);
    passed++;
  }
  console.log('[PASS] Provenance complete; licensing exact; lineage honest.');
  passed++;

  // TEST 4: coordinate transforms (§19 + §56).
  console.log('\n--- TEST 4: Coordinate handling ---');
  for (const b of BATCH) {
    const entry = manifest.assets[assetIdOf(b)];
    assert(/canonical_atlas_ras/.test(entry.coordinate_space), `${b.base}: canonical space declared`);
    passed++;
    assert(entry.dimensions_mm.every((d: number) => d > 0 && d <= 500), `${b.base}: sanity dims`);
    passed++;
  }
  console.log('[PASS] Canonical convention unchanged; no silent frames.');
  passed++;

  // TEST 5: topology reflects measurement (§15 + §56).
  console.log('\n--- TEST 5: Topology ---');
  for (const b of BATCH) {
    const entry = manifest.assets[assetIdOf(b)];
    assert(['CLOSED_SURFACE', 'SOLID', 'MULTI_SHELL_COMPOSITE'].includes(entry.topology_class), `${b.base}: honest topology class (${entry.topology_class})`);
    passed++;
    assert(entry.geometric_qa_status === 'GEOMETRY_VALIDATED', `${b.base}: geometry validated`);
    passed++;
  }
  console.log('[PASS] Topology measured, never assumed closed.');
  passed++;

  // TEST 6: LOD relationships (§21 + §56; default ratios recorded).
  console.log('\n--- TEST 6: LOD ---');
  for (const b of BATCH) {
    const entry = manifest.assets[assetIdOf(b)];
    const tris = ['lod0', 'lod1', 'lod2', 'lod3'].map((lod) => entry.lod_files[lod].triangles);
    assert(tris.every((t: number) => t > 0), `${b.base}: all LODs nonzero`);
    passed++;
    assert(tris[0] >= tris[1] && tris[1] >= tris[2] && tris[2] >= tris[3], `${b.base}: monotonic simplification`);
    passed++;
    for (const lod of ['lod0', 'lod1', 'lod2', 'lod3']) {
      assert(fs.existsSync(path.join(PROJECT_ROOT, entry.runtime_files[lod].path)), `${b.base}: runtime ${lod} present`);
      passed++;
    }
  }
  console.log('[PASS] LOD0–3 present, monotonic, runtime shipped (default ratios apply; recorded).');
  passed++;

  // TEST 7: manifest + hierarchy (§56).
  console.log('\n--- TEST 7: Manifest + hierarchy ---');
  const hierarchy = readJson('data/anatomical_hierarchy.json');
  const nodeIds = hierarchy.nodes.map((n: any) => n.id);
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(nodeIds.includes(rec.id), `${rec.id}: hierarchy node present`);
    passed++;
    const node = hierarchy.nodes.find((n: any) => n.id === rec.id);
    assert(node.geometry_state === 'AVAILABLE' && node.asset_id === rec.asset_id, `${rec.id}: AVAILABLE with asset link`);
    passed++;
    assert(nodeIds.includes(rec.hierarchy.parent_id), `${rec.id}: parent resolves`);
    passed++;
  }
  for (const docId of ['brain.basal_ganglia.accumbens', 'brain.diencephalon.hypothalamus']) {
    const node = hierarchy.nodes.find((n: any) => n.id === docId);
    assert(node && node.geometry_state === 'DOCUMENTED' && !node.asset_id, `${docId}: DOCUMENTED without geometry`);
    passed++;
  }
  console.log('[PASS] Hierarchy resolves; DOCUMENTED stays geometry-free.');
  passed++;

  // TEST 8: loading — real batch GLBs (§56).
  console.log('\n--- TEST 8: Loading ---');
  for (const assetId of ['mesh.thalamus.left.v1', 'mesh.amygdala.right.v1', 'mesh.mammillary_body.bilateral.v1']) {
    const mgr = new AssetManager();
    await mgr.loadManifest('assets/manifests/assets.manifest.json');
    const loaded = await mgr.loadAsset(assetId, 'lod0');
    assert(loaded.triangleCount > 0, `${assetId}: loads (${loaded.triangleCount} tris)`);
    passed++;
    mgr.dispose();
  }
  console.log('[PASS] Deep assets load lazily with real geometry.');
  passed++;

  // TEST 9: clipping + presentation + selection + isolation + focus + bookmarks (§54, §56).
  console.log('\n--- TEST 9: System integration ---');
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
  const entry = manifest.assets['mesh.thalamus.left.v1'];
  const record: AnatomicalEntityRecord = {
    entityId: 'brain.diencephalon.left.thalamus',
    assetId: 'mesh.thalamus.left.v1',
    name: 'Thalamus (Left)',
    officialLatin: 'Thalamus',
    laterality: 'left',
    canonicalCentroidMm: entry.centroid_mm,
    dimensionsMm: entry.dimensions_mm,
    volumeCm3: 8,
    topologyClass: entry.topology_class,
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'FMA258716',
    groups: ['division.diencephalon', 'hemisphere.left', 'region.thalamus']
  };
  const loaded = await mgr3.loadAsset(record.assetId, 'lod0');
  const material = materialMgr.registerEntityMaterial(record.entityId);
  loaded.mesh.material = material;
  entityMgr.registerEntity(record, loaded.mesh);
  assembly.registerEntity(record, loaded.mesh);
  adapter.registerMaterial(record.entityId, material);
  for (const kind of ['sagittal', 'coronal', 'axial'] as const) {
    planeSet.setEnabled(`plane.${kind}`, false);
  }
  planeSet.setConstant('plane.sagittal', record.canonicalCentroidMm[0]);
  planeSet.setEnabled('plane.sagittal', true);
  assert(adapter.getActivePlaneCount() === 1, 'thalamus carries sagittal clip');
  passed++;
  planeSet.setEnabled('plane.sagittal', false);
  planeSet.setConstant('plane.coronal', record.canonicalCentroidMm[2]);
  planeSet.setEnabled('plane.coronal', true);
  assert(adapter.getActivePlaneCount() === 1, 'thalamus carries coronal clip');
  passed++;
  planeSet.setEnabled('plane.coronal', false);
  planeSet.setConstant('plane.axial', record.canonicalCentroidMm[1]);
  planeSet.setEnabled('plane.axial', true);
  assert(adapter.getActivePlaneCount() === 1, 'thalamus carries axial clip');
  passed++;
  assembly.selectEntity(record.entityId);
  selectionMgr.select(record.entityId);
  assert(selectionMgr.getSelectedEntityId() === record.entityId, 'thalamus selectable');
  passed++;
  cameraMgr.focusBoundingBox(assembly.getEntityBoundingBox(record.entityId), 0);
  visibilityMgr.isolate(record.entityId);
  assert(visibilityMgr.isIsolated(record.entityId) === true, 'thalamus isolatable');
  passed++;
  visibilityMgr.restoreAll();
  const bm = createBookmark({
    id: 'bookmark.phase51.1',
    label: 'Phase 5.1 check',
    planes: planeSet.serialize(),
    presentation: { version: 1, sectionModeEnabled: true, activePlaneId: 'plane.axial', gizmoVisible: false, cutEdgeVisible: true, interiorMode: 'TRUE_CAP_WHERE_VALID', labelsEnabled: true, orientationVisible: true, readoutVisible: true, crosshairVisible: false, visualMode: 'NORMAL_SECTION', capsVisible: true, edgesVisible: true },
    camera: null,
    selectedEntityId: record.entityId,
    isolatedEntityId: null,
    hiddenEntityIds: [],
    labelsEnabled: true
  });
  assert(bm !== null && deserializeBookmark(serializeBookmark(bm!))?.selectedEntityId === record.entityId, 'thalamus bookmark round-trips');
  passed++;
  adapter.dispose();
  planeSet.dispose();
  assembly.dispose();
  materialMgr.dispose();
  mgr3.dispose();
  console.log('[PASS] Sagittal/coronal/axial clipping, selection, focus, isolation, bookmarks.');
  passed++;

  // TEST 10: septum rejection honored + hippocampus comparison (§9, §14).
  console.log('\n--- TEST 10: Rejection + no-replacement ---');
  assert(!manifest.assets['mesh.septum_pellucidum.midline.v1'], 'rejected septum absent from manifest');
  passed++;
  assert(!fs.existsSync(path.join(PROJECT_ROOT, 'data/structures/septum_pellucidum_midline.json')), 'rejected septum has no structure record');
  passed++;
  const qa = readJson('data/phase51_batch_qa.json');
  const septum = qa.verdicts.find((v: any) => v.assetId === 'mesh.septum_pellucidum.midline.v1');
  assert(septum && septum.state === 'REJECTED' && /non-manifold/.test(septum.reason), 'septum rejection recorded with reason');
  passed++;
  assert(manifest.assets['mesh.hippocampus.left.v1'] && manifest.assets['mesh.hippocampus.right.v1'], 'existing hippocampi retained (no replacement)');
  passed++;
  const hpc = readJson('data/structures/hippocampus_left.json');
  assert(hpc.asset_id === 'mesh.hippocampus.left.v1', 'hippocampus record still points at the original asset');
  passed++;
  console.log('[PASS] Rejection honored; hippocampus untouched.');
  passed++;

  // TEST 11: anatomy-only records (§2 — no psychiatric claims).
  console.log('\n--- TEST 11: Anatomy-first ---');
  for (const b of BATCH) {
    const r = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(r.functional_neuroanatomy === undefined && r.psychiatric_relevance === undefined, `${r.id}: no functional/psychiatric sections`);
    passed++;
    assert(!/dsm|rdoc|receptor|dopamine|serotonin|dbs|rtms|depression|schizophrenia/i.test(JSON.stringify(r)), `${r.id}: no psychiatric vocabulary`);
    passed++;
  }
  console.log('[PASS] Substrate only; knowledge layers deferred.');
  passed++;

  // TEST 12: hash chains (§56).
  console.log('\n--- TEST 12: Hash chains ---');
  for (const b of BATCH) {
    const assetId = assetIdOf(b);
    const ingest = readJson(`assets/raw/${assetId}/ingestion.json`);
    const fmaFile = fs.readdirSync(path.join(PROJECT_ROOT, 'assets/raw', assetId)).find((f) => f.endsWith('.stl'))!;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/raw', assetId, fmaFile))).digest('hex');
    assert(hash === ingest.original_hash, `${assetId}: staged bytes match recorded source hash`);
    passed++;
    const entry = manifest.assets[assetId];
    const canonicalRel = entry.canonical_glb_path as string;
    const chash = crypto.createHash('sha256').update(fs.readFileSync(path.join(PROJECT_ROOT, canonicalRel))).digest('hex');
    assert(chash === entry.resulting_sha256_hash, `${assetId}: canonical GLB matches manifest hash`);
    passed++;
  }
  console.log('[PASS] Source and canonical hashes verified.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 5.1 ANATOMY TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 5.1 anatomy test execution failed:\n', err);
  process.exit(1);
});
