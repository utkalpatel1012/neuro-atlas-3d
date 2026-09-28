/**
 * 3D Neuroanatomy Atlas: Phase 5.2 Posterior-Fossa/Ventricular Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Covers the 5.2 batch (cerebellum + 3rd/4th ventricles + aqueduct +
 * foramen = 5 RUNTIME_READY; pons/medulla REJECTED with reasons) against
 * REAL outputs: identity, IDs, laterality, provenance, license, transforms,
 * topology, LOD, manifest, hierarchy, loading, clipping, selection,
 * isolation, focus, bookmarks. Ventricles asserted as CAVITIES, never tissue.
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
import { REPRESENTATION_SCOPES } from './types/entity';
import { lateralityFromAssetId } from '../scripts/pipeline/asset_id_laterality';

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

const BATCH: Array<{ base: string; laterality: string; fma: string; cavity: boolean }> = [
  { base: 'cerebellum', laterality: 'bilateral', fma: 'FMA67944', cavity: false },
  { base: 'third_ventricle', laterality: 'midline', fma: 'FMA78454', cavity: true },
  { base: 'fourth_ventricle', laterality: 'midline', fma: 'FMA78469', cavity: true },
  { base: 'cerebral_aqueduct', laterality: 'midline', fma: 'FMA78467', cavity: true },
  { base: 'interventricular_foramen', laterality: 'midline', fma: 'FMA75351', cavity: true }
];

const assetIdOf = (b: { base: string; laterality: string }): string => `mesh.${b.base}.${b.laterality}.v1`;

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 5.2 POSTERIOR/VENTRICULAR TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  const manifest = readJson('assets/manifests/assets.manifest.json');
  assert(Object.keys(manifest.assets).length === 36, `manifest holds 36 assets, got ${Object.keys(manifest.assets).length}`);
  passed++;

  // TEST 1: identity + IDs + ontology honesty.
  console.log('--- TEST 1: Identity ---');
  const seen = new Set<string>();
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(rec.ontology?.fma_id === `FMA:${b.fma.replace(/^FMA/, '')}`, `${b.base}: FMA exact`);
    passed++;
    assert(!seen.has(rec.id), `${rec.id}: structure ID unique`);
    passed++;
    seen.add(rec.id);
    assert(rec.asset_id === assetIdOf(b), `${rec.id}: asset linkage exact`);
    passed++;
    assert(/UNVERIFIED/.test(rec.ontology?.ta2_id || '') && /UNVERIFIED/.test(rec.ontology?.uberon_id || ''), `${rec.id}: TA2/UBERON UNVERIFIED`);
    passed++;
    assert(!/dual compliance/i.test(JSON.stringify(rec)), `${rec.id}: no banned term`);
    passed++;
    // representation_scope must be a real RepresentationScope member and must
    // agree with declared laterality. 'midline_single' was emitted by the 5.0/5.1
    // writers but is valid in NEITHER src/types/entity.ts NOR the ingestion
    // contract, and it mislabels every fused bilateral mesh.
    const SCOPES: readonly string[] = REPRESENTATION_SCOPES;
    assert(SCOPES.includes(rec.representation_scope), `${rec.id}: representation_scope '${rec.representation_scope}' is a valid RepresentationScope`);
    passed++;
    if (rec.laterality === 'bilateral') {
      assert(rec.representation_scope === 'paired_combined', `${rec.id}: bilateral fused mesh is paired_combined, not ${rec.representation_scope}`);
      passed++;
    } else if (rec.laterality === 'midline') {
      assert(rec.representation_scope === 'single_midline_mesh', `${rec.id}: midline asset is single_midline_mesh, not ${rec.representation_scope}`);
      passed++;
    }
    // The asset id's laterality segment is the single source of truth shared by
    // the manifest QA, the pipeline QA and the structure record. A record that
    // disagrees with its own asset id is the exact defect Phase 5.2 corrected.
    assert(
      lateralityFromAssetId(rec.asset_id) === rec.laterality,
      `${rec.id}: laterality '${rec.laterality}' matches the asset-id segment of ${rec.asset_id}`
    );
    passed++;
  }

  // Repo-wide guard: no structure record may carry a representation_scope that is
  // not a real RepresentationScope. This covers the 5.0/5.1 records too — the
  // mammillary body shipped the invalid 'midline_single' value until Phase 5.2,
  // and a batch-local check would not have caught it.
  for (const file of fs.readdirSync(path.join(PROJECT_ROOT, 'data/structures'))) {
    if (!file.endsWith('.json')) continue;
    const r = readJson(`data/structures/${file}`);
    assert(
      (REPRESENTATION_SCOPES as readonly string[]).includes(r.representation_scope),
      `data/structures/${file}: representation_scope '${r.representation_scope}' is a valid RepresentationScope`
    );
    passed++;
  }
  console.log('[PASS] Distribution identity exact; unique; ontology honest.');
  passed++;

  // TEST 2: laterality (bilateral organs span midline; midline cavities centered).
  console.log('\n--- TEST 2: Laterality ---');
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(rec.laterality === b.laterality, `${rec.id}: laterality ${b.laterality} explicit`);
    passed++;
    const entry = manifest.assets[rec.asset_id];
    assert(Math.abs(entry.centroid_mm[0]) < 10, `${rec.id}: midline-spanning centroid (${entry.centroid_mm[0]})`);
    passed++;
  }
  console.log('[PASS] Bilateral/midline classification matches measured geometry.');
  passed++;

  // TEST 3: cavities distinguished from tissue (§27).
  console.log('\n--- TEST 3: Cavity distinction ---');
  for (const b of BATCH.filter((x) => x.cavity)) {
    const rec = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(rec.subtype === 'ventricular_space', `${rec.id}: subtype ventricular_space (not tissue)`);
    passed++;
    assert(typeof rec.cavity_note === 'string' && /NOT neural tissue/.test(rec.cavity_note), `${rec.id}: cavity note explicit`);
    passed++;
    assert(rec.representations?.[0]?.representation_type === 'cavity_cast', `${rec.id}: representation is a cast, not tissue mesh`);
    passed++;
  }
  const cereb = readJson('data/structures/cerebellum_bilateral.json');
  assert(cereb.subtype !== 'ventricular_space' && cereb.cavity_note === undefined, 'cerebellum is tissue (no cavity note)');
  passed++;
  console.log('[PASS] Spaces never described as neural tissue.');
  passed++;

  // TEST 4: provenance + license + hashes.
  console.log('\n--- TEST 4: Provenance + license + hashes ---');
  for (const b of BATCH) {
    const assetId = assetIdOf(b);
    const ingest = readJson(`assets/raw/${assetId}/ingestion.json`);
    assert(ingest.source_asset_id === b.fma && ingest.original_hash.length === 64, `${assetId}: source identity + hash recorded`);
    passed++;
    assert(!/dual compliance/i.test(JSON.stringify(ingest)), `${assetId}: no banned term in ingestion`);
    passed++;
    const entry = manifest.assets[assetId];
    assert(/LEGAL_REVIEW_REQUIRED/.test(entry.legal_review_notes || ''), `${assetId}: legal uncertainty explicit`);
    passed++;
    const fmaFile = fs.readdirSync(path.join(PROJECT_ROOT, 'assets/raw', assetId)).find((f) => f.endsWith('.stl'))!;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/raw', assetId, fmaFile))).digest('hex');
    assert(hash === ingest.original_hash, `${assetId}: staged bytes match`);
    passed++;
    const chash = crypto.createHash('sha256').update(fs.readFileSync(path.join(PROJECT_ROOT, entry.canonical_glb_path))).digest('hex');
    assert(chash === entry.resulting_sha256_hash, `${assetId}: canonical matches manifest`);
    passed++;
  }
  console.log('[PASS] Hash chains verified; licensing exact.');
  passed++;

  // TEST 5: coordinates + topology + LOD.
  console.log('\n--- TEST 5: Coordinates + topology + LOD ---');
  for (const b of BATCH) {
    const entry = manifest.assets[assetIdOf(b)];
    assert(/canonical_atlas_ras/.test(entry.coordinate_space), `${b.base}: canonical declared`);
    passed++;
    assert(['CLOSED_SURFACE', 'MULTI_SHELL_COMPOSITE'].includes(entry.topology_class), `${b.base}: honest topology (${entry.topology_class})`);
    passed++;
    const tris = ['lod0', 'lod1', 'lod2', 'lod3'].map((lod) => entry.lod_files[lod].triangles);
    assert(tris.every((t: number) => t > 0) && tris[0] >= tris[1] && tris[1] >= tris[2] && tris[2] >= tris[3], `${b.base}: LODs present and monotonic`);
    passed++;
    for (const lod of ['lod0', 'lod1', 'lod2', 'lod3']) {
      assert(fs.existsSync(path.join(PROJECT_ROOT, entry.runtime_files[lod].path)), `${b.base}: runtime ${lod} present`);
      passed++;
    }
  }
  console.log('[PASS] Canonical space; measured topology; LODs shipped.');
  passed++;

  // TEST 6: hierarchy (AVAILABLE vs DOCUMENTED; brainstem continuity).
  console.log('\n--- TEST 6: Hierarchy ---');
  const hierarchy = readJson('data/anatomical_hierarchy.json');
  const nodeIds = hierarchy.nodes.map((n: any) => n.id);
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(nodeIds.includes(rec.id), `${rec.id}: hierarchy node present`);
    passed++;
    const node = hierarchy.nodes.find((n: any) => n.id === rec.id);
    assert(node.geometry_state === 'AVAILABLE' && node.asset_id === rec.asset_id, `${rec.id}: AVAILABLE with link`);
    passed++;
    assert(nodeIds.includes(rec.hierarchy.parent_id), `${rec.id}: parent resolves`);
    passed++;
  }
  for (const docId of ['brain.brainstem.pons', 'brain.brainstem.medulla_oblongata', 'brain.brainstem.midbrain', 'brain.cerebellum.vermis']) {
    const node = hierarchy.nodes.find((n: any) => n.id === docId);
    assert(node && node.geometry_state === 'DOCUMENTED' && !node.asset_id, `${docId}: DOCUMENTED without geometry (continuity preserved, nothing split)`);
    passed++;
  }
  // Every gap the scope doc claims as DOCUMENTED must be REIFIED as a node —
  // claiming "DOCUMENTED" in prose without a hierarchy node is a silent
  // omission, which is the failure mode this assertion exists to prevent.
  for (const docId of [
    'brain.ventricular_system.lateral_ventricle',
    'brain.ventricular_system.foramen_luschka',
    'brain.ventricular_system.foramen_magendie',
    'brain.cerebellum.hemisphere',
    'brain.cerebellum.deep_nuclei',
    'brain.cerebellum.deep_nuclei.dentate_nucleus',
    'brain.cerebellum.deep_nuclei.fastigial_nucleus',
    'brain.cerebellum.deep_nuclei.emboliform_nucleus',
    'brain.cerebellum.deep_nuclei.globose_nucleus',
  ]) {
    const node = hierarchy.nodes.find((n: any) => n.id === docId);
    assert(node, `${docId}: DOCUMENTED gap is reified as a hierarchy node`);
    passed++;
    assert(node.geometry_state === 'DOCUMENTED' && !node.asset_id && !node.structure_record, `${docId}: DOCUMENTED, carries no geometry or record`);
    passed++;
    // Every node must be reachable: some parent's children array lists it.
    const isChildOfSomeNode = hierarchy.nodes.some(
      (n: any) => Array.isArray(n.children) && n.children.includes(docId)
    );
    assert(isChildOfSomeNode, `${docId}: listed in a parent's children array (reachable, not orphaned)`);
    passed++;
  }
  console.log('[PASS] Hierarchy honest; brainstem unsplit; rejected stay DOCUMENTED.');
  passed++;

  // TEST 7: loading + clipping (sagittal/coronal/axial) + selection + isolation + focus + bookmarks.
  console.log('\n--- TEST 7: System integration ---');
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
  const entry = manifest.assets['mesh.cerebellum.bilateral.v1'];
  const record: AnatomicalEntityRecord = {
    entityId: 'brain.cerebellum.cerebellum',
    assetId: 'mesh.cerebellum.bilateral.v1',
    name: 'Cerebellum',
    officialLatin: 'Cerebellum',
    laterality: 'bilateral',
    canonicalCentroidMm: entry.centroid_mm,
    dimensionsMm: entry.dimensions_mm,
    volumeCm3: 120,
    topologyClass: entry.topology_class,
    validationStatus: 'APPROVED',
      upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
      // Phase 5.2 provenance review: this fixture asserted 'CC BY 4.0', contradicting the
      // provenance record it is standing in for. Fixtures must not model a licence
      // conclusion the project records as UNRESOLVED.
      upstreamLicense: 'CC_BY_SA_2_1_JP',
    sourceDefinition: 'FMA67944',
    groups: ['division.cerebellum', 'region.cerebellum']
  };
  const loaded = await mgr3.loadAsset(record.assetId, 'lod0');
  assert(loaded.triangleCount > 0, `cerebellum loads (${loaded.triangleCount} tris)`);
  passed++;
  const material = materialMgr.registerEntityMaterial(record.entityId);
  loaded.mesh.material = material;
  entityMgr.registerEntity(record, loaded.mesh);
  assembly.registerEntity(record, loaded.mesh);
  adapter.registerMaterial(record.entityId, material);
  for (const kind of ['sagittal', 'coronal', 'axial'] as const) {
    for (const other of ['sagittal', 'coronal', 'axial'] as const) planeSet.setEnabled(`plane.${other}`, false);
    const axis = kind === 'sagittal' ? 0 : kind === 'coronal' ? 2 : 1;
    planeSet.setConstant(`plane.${kind}`, record.canonicalCentroidMm[axis]);
    planeSet.setEnabled(`plane.${kind}`, true);
    assert(adapter.getActivePlaneCount() === 1, `cerebellum carries ${kind} clip`);
    passed++;
  }
  assembly.selectEntity(record.entityId);
  selectionMgr.select(record.entityId);
  assert(selectionMgr.getSelectedEntityId() === record.entityId, 'cerebellum selectable');
  passed++;
  cameraMgr.focusBoundingBox(assembly.getEntityBoundingBox(record.entityId), 0);
  visibilityMgr.isolate(record.entityId);
  assert(visibilityMgr.isIsolated(record.entityId) === true, 'cerebellum isolatable');
  passed++;
  visibilityMgr.restoreAll();
  const bm = createBookmark({
    id: 'bookmark.phase52.1',
    label: 'Phase 5.2 check',
    planes: planeSet.serialize(),
    presentation: { version: 1, sectionModeEnabled: true, activePlaneId: 'plane.axial', gizmoVisible: false, cutEdgeVisible: true, interiorMode: 'TRUE_CAP_WHERE_VALID', labelsEnabled: true, orientationVisible: true, readoutVisible: true, crosshairVisible: false, visualMode: 'NORMAL_SECTION', capsVisible: true, edgesVisible: true },
    camera: null,
    selectedEntityId: record.entityId,
    isolatedEntityId: null,
    hiddenEntityIds: [],
    labelsEnabled: true
  });
  assert(bm !== null && deserializeBookmark(serializeBookmark(bm!))?.selectedEntityId === record.entityId, 'cerebellum bookmark round-trips');
  passed++;
  adapter.dispose();
  planeSet.dispose();
  assembly.dispose();
  materialMgr.dispose();
  mgr3.dispose();
  console.log('[PASS] Loading, 3-plane clipping, selection, focus, isolation, bookmarks.');
  passed++;

  // TEST 8: rejections honored (pons/medulla staged, never production).
  console.log('\n--- TEST 8: Rejections ---');
  for (const assetId of ['mesh.pons.bilateral.v1', 'mesh.medulla_oblongata.bilateral.v1']) {
    assert(!manifest.assets[assetId], `${assetId}: absent from manifest`);
    passed++;
    assert(!fs.existsSync(path.join(PROJECT_ROOT, 'data/structures', assetId.replace(/^mesh\./, '').replace(/\.v1$/, '') + '.json')), `${assetId}: no structure record`);
    passed++;
  }
  const qa = readJson('data/phase52_batch_qa.json');
  for (const assetId of ['mesh.pons.bilateral.v1', 'mesh.medulla_oblongata.bilateral.v1']) {
    const verdict = qa.verdicts.find((v: any) => v.assetId === assetId);
    assert(verdict && verdict.state === 'REJECTED' && /non-manifold/.test(verdict.reason), `${assetId}: rejection recorded with reason`);
    passed++;
  }
  console.log('[PASS] Defective sources rejected with reasons; never production.');
  passed++;

  // TEST 9: anatomy-only records (no psychiatric vocabulary).
  console.log('\n--- TEST 9: Anatomy-first ---');
  for (const b of BATCH) {
    const r = readJson(`data/structures/${b.base}_${b.laterality}.json`);
    assert(r.functional_neuroanatomy === undefined && r.psychiatric_relevance === undefined, `${r.id}: no functional/psychiatric sections`);
    passed++;
    assert(!/dsm|rdoc|receptor|dopamine|serotonin|dbs|rtms|depression|schizophrenia|network|circuit/i.test(JSON.stringify(r)), `${r.id}: no knowledge-layer vocabulary`);
    passed++;
  }
  console.log('[PASS] Substrate only.');
  passed++;

  // TEST 10: provenance-integrity regression guards for the Phase 5.2 review findings.
  // Each assertion below corresponds to a defect that reached a green build before
  // independent review caught it, so it is now enforced rather than assumed.
  console.log('\n--- TEST 10: Provenance integrity (review regressions) ---');

  // C1: acquisition_date must never be synthesised from a filesystem timestamp, and
  // already-published legacy provenance must survive a manifest rebuild unchanged.
  const manifestSrc = fs.readFileSync(
    path.join(PROJECT_ROOT, 'scripts/pipeline/update_manifest.ts'), 'utf8'
  );
  // Strip comments first: the repair's own explanatory comment legitimately names the
  // API it removed, and the guard must test executable code, not prose.
  const manifestCode = manifestSrc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert(
    !/\.birthtime|\.ctime|\.mtime/.test(manifestCode),
    'C1: update_manifest.ts must not derive provenance from filesystem timestamps'
  );
  passed++;
  assert(
    /PRIOR_ACQUISITION_DATES/.test(manifestSrc) && /NOT_RECORDED/.test(manifestSrc),
    'C1: acquisition_date preserves prior value, else explicit NOT_RECORDED (never invented)'
  );
  passed++;

  // C1 data state: every pre-Phase-5.2 asset keeps the acquisition date it was
  // published with. The 5 new 5.2 assets are the only 2026-09-27 entries.
  const manifestForProvenance = readJson('assets/manifests/assets.manifest.json');
  const entries: any[] = Object.values(manifestForProvenance.assets);
  const LEGACY_COUNT = 31;
  const byDate: Record<string, number> = {};
  for (const e of entries) byDate[e.acquisition_date] = (byDate[e.acquisition_date] ?? 0) + 1;
  assert(
    (byDate['2026-09-26'] ?? 0) === LEGACY_COUNT,
    `C1: all ${LEGACY_COUNT} legacy assets retain 2026-09-26 (got ${byDate['2026-09-26'] ?? 0})`
  );
  passed++;
  assert(
    (byDate['2026-09-27'] ?? 0) === 5,
    `C1: exactly the 5 new 5.2 assets are dated 2026-09-27 (got ${byDate['2026-09-27'] ?? 0})`
  );
  passed++;

  // C2: every Phase 5.2 source download is gated by a committed expected hash, and the
  // staged/ingested bytes actually match those pins.
  const pins = readJson('data/phase52_source_hashes.json');
  assert(Array.isArray(pins.sources) && pins.sources.length === 7, 'C2: 7 pinned source hashes committed');
  passed++;
  for (const s of pins.sources) {
    const stl = path.join(PROJECT_ROOT, 'assets/raw', s.asset_id, `${s.fma_id}.stl`);
    assert(fs.existsSync(stl), `C2: raw source present for ${s.fma_id}`);
    passed++;
    const bytes = fs.readFileSync(stl);
    assert(
      crypto.createHash('sha256').update(bytes).digest('hex') === s.sha256,
      `C2: ${s.fma_id} raw bytes match the committed pin`
    );
    passed++;
  }
  const prepSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts/pipeline/prepare_posterior_batch.ts'), 'utf8');
  assert(
    /SOURCE INTEGRITY FAILURE/.test(prepSrc) && /loadPinnedSourceHashes/.test(prepSrc),
    'C2: staging script rejects on pin mismatch rather than self-comparing'
  );
  passed++;
  assert(
    /MIRROR_CONVERSION_UNVERIFIED/.test(readJson('data/phase52_source_hashes.json').residual_risk),
    'C2: residual mirror-conversion risk is recorded, not silently closed'
  );
  passed++;

  // MAJOR-1: no shipped source may hardcode a resolved licence string. The UI must read
  // the upstream licence from the record, which records it as CC_BY_SA_2_1_JP.
  for (const rel of ['src/ui/HierarchyPanel.ts', 'src/main.ts']) {
    const src = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    assert(!/upstreamLicense:\s*'CC BY 4\.0'/.test(src), `MAJOR-1: ${rel} does not hardcode 'CC BY 4.0'`);
    passed++;
  }
  const hierarchySrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/ui/HierarchyPanel.ts'), 'utf8');
  assert(
    /upstreamLicense:\s*record\.asset_provenance\?\.upstream_license/.test(hierarchySrc),
    'MAJOR-1: UI licence is read from the provenance record'
  );
  passed++;

  // MAJOR-2: the required BodyParts3D / LSIDC attribution must actually be published.
  const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
  assert(/BodyParts3D/.test(indexHtml) && /Life Science Integrated Database Center/.test(indexHtml),
    'MAJOR-2: BodyParts3D / LSIDC attribution published in the application');
  passed++;
  assert(/LEGAL_REVIEW_REQUIRED/.test(indexHtml), 'MAJOR-2: licence status discloses LEGAL_REVIEW_REQUIRED');
  passed++;

  // MAJOR-3: no provenance text may assert relicensing as settled fact while the same
  // project records retroactivity as UNRESOLVED.
  for (const rel of [
    'scripts/pipeline/update_manifest.ts',
    'scripts/pipeline/prepare_posterior_batch.ts',
    'scripts/pipeline/ingest_asset.ts',
    'scripts/pipeline/ingest_cerebral_cortex.ts',
    'scripts/pipeline/prepare_deep_batch.ts'
  ]) {
    const src = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    // Comments are stripped for the same reason as C1: the repair notes quote the
    // removed wording on purpose, and only shipped string literals are at issue.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert(!/Relicensed under CC Attribution/.test(code),
      `MAJOR-3: ${rel} does not assert relicensing as fact`);
    passed++;
  }
  for (const e of entries) {
    assert(
      !/Relicensed under/.test(e.attribution_text_required ?? ''),
      `MAJOR-3: ${e.asset_id} manifest attribution does not assert relicensing`
    );
    passed++;
  }

  // M3: the laterality single source of truth must be used by both record writers, and
  // it must refuse to guess rather than defaulting an unrecognised id to a value.
  assert(
    lateralityFromAssetId('mesh.foo.v1') === null &&
      lateralityFromAssetId('mesh.hippocampus.head.left.v1') === null,
    'M3: lateralityFromAssetId returns null for unrecognised ids instead of guessing'
  );
  passed++;
  assert(
    lateralityFromAssetId('mesh.x.left.v1') === 'left' &&
      lateralityFromAssetId('mesh.x.midline.v1') === 'midline' &&
      lateralityFromAssetId('mesh.x.bilateral.v1') === 'bilateral',
    'M3: lateralityFromAssetId maps all declared forms'
  );
  passed++;
  for (const rel of ['scripts/pipeline/write_posterior_records.ts', 'scripts/pipeline/write_deep_records.ts']) {
    const src = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    assert(/lateralityFromAssetId/.test(src), `M3: ${rel} uses the laterality single source of truth`);
    passed++;
  }

  // M5: the ontology unions must cover the values committed records actually use.
  const entitySrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/types/entity.ts'), 'utf8');
  assert(/'ventricular_space'/.test(entitySrc), 'M5: AnatomicalStructureSubtype includes ventricular_space');
  passed++;
  assert(/'cavity_cast'/.test(entitySrc), 'M5: RepresentationType includes cavity_cast');
  passed++;

  console.log('[PASS] Provenance integrity guards hold (C1/C2/MAJOR-1/2/3/M3/M5).');
  passed++;

  // TEST 11: consistency of the licensing posture across EVERY layer that publishes it.
  // Round-2 review found the manifest said LEGAL_REVIEW_REQUIRED while all 36 shipped
  // structure records still said PERMITTED - the same self-contradiction, in a second
  // place. This asserts the layers agree and that the record layer is covered, which the
  // round-1 MAJOR-3 guard did not do (it only read the manifest and the scripts).
  console.log('\n--- TEST 11: Licensing posture consistency across layers ---');
  const recordFiles = fs.readdirSync(path.join(PROJECT_ROOT, 'data/structures'))
    .filter((f) => f.endsWith('.json'));
  assert(recordFiles.length === 36, `all 36 structure records present (got ${recordFiles.length})`);
  passed++;
  for (const f of recordFiles) {
    const rec = readJson(`data/structures/${f}`);
    assert(
      rec.asset_provenance?.commercial_redistribution === 'LEGAL_REVIEW_REQUIRED',
      `${f}: record commercial_redistribution is LEGAL_REVIEW_REQUIRED`
    );
    passed++;
    assert(
      !/Relicensed under|relicensed to CC BY/.test(
        (rec.asset_provenance?.attribution_text_required ?? '') +
        (rec.asset_provenance?.upstream_license_history ?? '')
      ),
      `${f}: record asserts no relicensing as settled fact`
    );
    passed++;
  }
  for (const e of entries) {
    assert(
      e.commercial_redistribution === 'LEGAL_REVIEW_REQUIRED',
      `${e.asset_id}: manifest commercial_redistribution is LEGAL_REVIEW_REQUIRED`
    );
    passed++;
    assert(
      /LEGAL_REVIEW_REQUIRED/.test(
        (e.legal_review_notes ?? '') + (e.restrictions_and_covenants ?? []).join(' ')
      ),
      `${e.asset_id}: manifest carries the explicit legal caveat`
    );
    passed++;
  }
  // The gating scripts must accept the conservative posture instead of demanding the
  // over-claiming one, which is what broke two project gates during round-2 repairs.
  for (const rel of ['scripts/audit_phase1.ts', 'scripts/validate_asset.ts']) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert(
      !/commercial_redistribution\s*===\s*'PERMITTED'/.test(code),
      `${rel} does not require commercial_redistribution === 'PERMITTED'`
    );
    passed++;
  }
  // Round-2 N4: the anatomical category must reach the batch ledger, otherwise the
  // category-aware QA profile selection silently falls back to cortical names.
  const posteriorLedger = readJson('data/phase52_batch.json');
  for (const it of posteriorLedger.items) {
    assert(
      typeof it.category === 'string' && it.category.length > 0,
      `N4: ledger carries anatomical category for ${it.assetId}`
    );
    passed++;
  }
  for (const it of posteriorLedger.items) {
    if (/VENTRICULAR|CAVITY/.test(String(it.category))) {
      // Proves the selection logic is reachable, without asserting a re-run happened.
      const qa = readJson('data/phase52_batch_qa.json');
      const v = qa.verdicts.find((x: any) => x.assetId === it.assetId);
      assert(v !== undefined, `N4: QA verdict exists for cavity asset ${it.assetId}`);
      passed++;
    }
  }
  // Round-2 F1/F4: absence claims must not overstate what the source lacks, and the
  // hierarchy must not re-assert a hemispheres/vermis split the data layer refuses.
  const hierarchyText = fs.readFileSync(path.join(PROJECT_ROOT, 'data/anatomical_hierarchy.json'), 'utf8');
  assert(
    !/hemispheres, vermis/.test(hierarchyText),
    'F4: hierarchy does not assert a cerebellum hemispheres/vermis split'
  );
  passed++;
  const scopeText = fs.readFileSync(path.join(PROJECT_ROOT, 'docs/PHASE_5_2_ANATOMICAL_SCOPE.md'), 'utf8');
  assert(
    /FMA78449/.test(scopeText) && /FMA78450/.test(scopeText),
    'MAJOR-5: scope doc records the lateral-ventricle segments as present but not imported'
  );
  passed++;
  assert(
    /FMA62008nsn/.test(scopeText),
    'F1: scope doc corrects the overstated hypothalamus absence claim'
  );
  passed++;
  console.log('[PASS] Licensing posture consistent across manifest, records and gates; category reaches ledger.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 5.2 ANATOMY TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 5.2 anatomy test execution failed:\n', err);
  process.exit(1);
});
