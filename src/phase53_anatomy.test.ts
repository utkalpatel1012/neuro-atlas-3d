/**
 * 3D Neuroanatomy Atlas: Phase 5.3 White-Matter Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Covers the 5.3 batch (corpus callosum + paired anterior-limb capsule
 * segments + paired fornix segments + fornix/anterior/posterior commissures +
 * paired optic tracts = 10 RUNTIME_READY, 0 rejected) against REAL outputs:
 * identity, IDs, laterality vs measured geometry, white-matter-vs-network
 * separation, provenance, license, transforms, topology, LOD, manifest,
 * hierarchy, loading, clipping, selection, isolation, focus, bookmarks.
 * White-matter segments are SOLID substrate, never functional networks,
 * circuits, or tractography streamlines.
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

const BATCH: Array<{ base: string; laterality: string; fma: string; record: string }> = [
  { base: 'corpus_callosum', laterality: 'midline', fma: 'FMA86464', record: 'corpus_callosum_midline.json' },
  { base: 'internal_capsule_anterior_limb', laterality: 'right', fma: 'FMA72908', record: 'internal_capsule_anterior_limb_right.json' },
  { base: 'internal_capsule_anterior_limb', laterality: 'left', fma: 'FMA72909', record: 'internal_capsule_anterior_limb_left.json' },
  { base: 'fornix', laterality: 'right', fma: 'FMA72924', record: 'fornix_right.json' },
  { base: 'fornix', laterality: 'left', fma: 'FMA72925', record: 'fornix_left.json' },
  { base: 'fornix_commissure', laterality: 'midline', fma: 'FMA61970', record: 'fornix_commissure_midline.json' },
  { base: 'anterior_commissure', laterality: 'midline', fma: 'FMA61961', record: 'anterior_commissure_midline.json' },
  { base: 'posterior_commissure', laterality: 'midline', fma: 'FMA62072', record: 'posterior_commissure_midline.json' },
  { base: 'optic_tract', laterality: 'right', fma: 'FMA62382', record: 'optic_tract_right.json' },
  { base: 'optic_tract', laterality: 'left', fma: 'FMA67936', record: 'optic_tract_left.json' }
];

const assetIdOf = (b: { base: string; laterality: string }): string => `mesh.${b.base}.${b.laterality}.v1`;

// Knowledge-layer vocabulary that must never describe substrate anatomy. The
// Phase 5.3 registry hard stop is functional-conflation: WHITE_MATTER_STRUCTURE
// ≠ FUNCTIONAL_NETWORK ≠ PSYCHIATRIC_CIRCUIT. Explicit denial sentences inside
// the record's own guard fields are allowed; everything else is scanned.
const KNOWLEDGE_VOCAB = /dsm|rdoc|receptor|dopamine|serotonin|glutamate|gaba|dbs|rtms|tms|depression|schizophrenia|bipolar|antipsychotic|antidepressant|pharmacolog|functional|connectivity|network|circuit|tractography|streamline|resting.state|default.mode|neuromodulation/i;

function scannableRecordText(rec: any): string {
  const copy = { ...rec };
  delete copy.anatomy_only_scope;
  if (copy.topography?.relationships?.[0]?.notes) {
    copy.topography = {
      ...copy.topography,
      relationships: [{ ...copy.topography.relationships[0], notes: '' }]
    };
  }
  return JSON.stringify(copy);
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 5.3 WHITE-MATTER TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  const manifest = readJson('assets/manifests/assets.manifest.json');
  // Global count advanced 46 → 49 in Phase 5.4 (3 cranial-nerve assets
  // appended, same provenance chain). Phase 5.5: 49 → 63 (14
  // cortical-completion assets appended, same chain). This suite's own load-bearing
  // assertions — the 10 white-matter assets, their hashes, hierarchy and
  // topology — are unchanged below.
  assert(Object.keys(manifest.assets).length === 63, `manifest holds 63 assets, got ${Object.keys(manifest.assets).length}`);
  passed++;

  // TEST 1: identity + IDs + ontology honesty.
  console.log('--- TEST 1: Identity ---');
  const seen = new Set<string>();
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.record}`);
    assert(rec.ontology?.fma_id === `FMA:${b.fma.replace(/^FMA/, '')}`, `${b.record}: FMA exact`);
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
    const SCOPES: readonly string[] = REPRESENTATION_SCOPES;
    assert(SCOPES.includes(rec.representation_scope), `${rec.id}: representation_scope '${rec.representation_scope}' is a valid RepresentationScope`);
    passed++;
    if (rec.laterality === 'left' || rec.laterality === 'right') {
      assert(rec.representation_scope === 'paired_separate', `${rec.id}: paired lateralised segment is paired_separate, not ${rec.representation_scope}`);
      passed++;
    } else if (rec.laterality === 'midline') {
      assert(rec.representation_scope === 'single_midline_mesh', `${rec.id}: midline asset is single_midline_mesh, not ${rec.representation_scope}`);
      passed++;
    }
    assert(
      lateralityFromAssetId(rec.asset_id) === rec.laterality,
      `${rec.id}: laterality '${rec.laterality}' matches the asset-id segment of ${rec.asset_id}`
    );
    passed++;
  }
  console.log('[PASS] Distribution identity exact; unique; ontology honest.');
  passed++;

  // TEST 2: laterality vs measured canonical geometry (canonical +X is Right).
  console.log('\n--- TEST 2: Laterality vs measured geometry ---');
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.record}`);
    assert(rec.laterality === b.laterality, `${rec.id}: laterality ${b.laterality} explicit`);
    passed++;
    const entry = manifest.assets[rec.asset_id];
    const cx = entry.centroid_mm[0];
    if (b.laterality === 'midline') {
      assert(Math.abs(cx) < 10, `${rec.id}: midline centroid near X=0 (got ${cx})`);
      passed++;
    } else if (b.laterality === 'right') {
      assert(cx > 0, `${rec.id}: right segment sits at +X in canonical space (got ${cx})`);
      passed++;
    } else {
      assert(cx < 0, `${rec.id}: left segment sits at -X in canonical space (got ${cx})`);
      passed++;
    }
  }
  console.log('[PASS] Declared laterality matches measured canonical geometry.');
  passed++;

  // TEST 3: white-matter-vs-network separation (registry hard stop).
  console.log('\n--- TEST 3: White-matter separation ---');
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.record}`);
    assert(rec.subtype === 'white_matter_structure', `${rec.id}: subtype white_matter_structure (substrate, not network)`);
    passed++;
    assert(rec.representations?.[0]?.representation_type === 'macroscopic_mesh', `${rec.id}: representation is a solid mesh, not streamlines or a cast`);
    passed++;
    assert(rec.functional_neuroanatomy === undefined && rec.psychiatric_relevance === undefined, `${rec.id}: no functional/psychiatric sections`);
    passed++;
    assert(typeof rec.anatomy_only_scope === 'string' && /WHITE_MATTER_STRUCTURE/.test(rec.anatomy_only_scope), `${rec.id}: explicit anatomy-only guard present`);
    passed++;
    assert(!KNOWLEDGE_VOCAB.test(scannableRecordText(rec)), `${rec.id}: no knowledge-layer vocabulary outside the explicit denial`);
    passed++;
    assert(rec.expert_review_status === 'EXPERT_REVIEW_PENDING', `${rec.id}: no expert review claimed`);
    passed++;
  }
  console.log('[PASS] Substrate only: no network/circuit/RDoC/receptor/psychiatry claims.');
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
    assert(!/Relicensed under/.test(ingest.attribution ?? ''), `${assetId}: attribution asserts no relicensing as fact`);
    passed++;
    const entry = manifest.assets[assetId];
    assert(/LEGAL_REVIEW_REQUIRED/.test(entry.legal_review_notes || ''), `${assetId}: legal uncertainty explicit`);
    passed++;
    assert(entry.expert_review_status === 'EXPERT_REVIEW_PENDING', `${assetId}: manifest claims no expert review`);
    passed++;
    const fmaFile = fs.readdirSync(path.join(PROJECT_ROOT, 'assets/raw', assetId)).find((f) => f.endsWith('.stl'))!;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/raw', assetId, fmaFile))).digest('hex');
    assert(hash === ingest.original_hash, `${assetId}: staged bytes match`);
    passed++;
    const chash = crypto.createHash('sha256').update(fs.readFileSync(path.join(PROJECT_ROOT, entry.canonical_glb_path))).digest('hex');
    assert(chash === entry.resulting_sha256_hash, `${assetId}: canonical matches manifest`);
    passed++;
    const rec = readJson(`data/structures/${b.record}`);
    assert(rec.asset_provenance?.commercial_redistribution === 'LEGAL_REVIEW_REQUIRED', `${rec.id}: record commercial posture gated`);
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
    assert(entry.topology_class === 'SOLID', `${b.base}: honest SOLID topology (got ${entry.topology_class})`);
    passed++;
    const tris = ['lod0', 'lod1', 'lod2', 'lod3'].map((lod) => entry.lod_files[lod].triangles);
    assert(tris.every((t: number) => t > 0) && tris[0] >= tris[1] && tris[1] >= tris[2] && tris[2] >= tris[3], `${b.base}: LODs present and monotonic`);
    passed++;
    for (const lod of ['lod0', 'lod1', 'lod2', 'lod3']) {
      assert(fs.existsSync(path.join(PROJECT_ROOT, entry.runtime_files[lod].path)), `${b.base}: runtime ${lod} present`);
      passed++;
    }
  }
  console.log('[PASS] Canonical space; measured SOLID topology; LODs shipped.');
  passed++;

  // TEST 6: hierarchy honesty (AVAILABLE vs DOCUMENTED; nothing subdivided).
  console.log('\n--- TEST 6: Hierarchy ---');
  const hierarchy = readJson('data/anatomical_hierarchy.json');
  // Global hierarchy count advanced 85 → 107 in Phase 5.4 (2 branch + 3
  // AVAILABLE + 17 DOCUMENTED cranial-nerve/vasculature nodes appended; the
  // 10 white-matter AVAILABLE and 8 DOCUMENTED gap nodes below are unchanged).
  // Phase 5.5: 107 → 135 (14 AVAILABLE + 2 insular branches + 12 DOCUMENTED gaps).
  assert(hierarchy.nodes.length === 135, `hierarchy holds 135 nodes, got ${hierarchy.nodes.length}`);
  passed++;
  const nodeIds = hierarchy.nodes.map((n: any) => n.id);
  assert(nodeIds.includes('brain.white_matter'), 'white-matter branch present');
  passed++;
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.record}`);
    assert(nodeIds.includes(rec.id), `${rec.id}: hierarchy node present`);
    passed++;
    const node = hierarchy.nodes.find((n: any) => n.id === rec.id);
    assert(node.geometry_state === 'AVAILABLE' && node.asset_id === rec.asset_id, `${rec.id}: AVAILABLE with link`);
    passed++;
    assert(nodeIds.includes(rec.hierarchy.parent_id), `${rec.id}: parent resolves`);
    passed++;
  }
  // DOCUMENTED gaps stay DOCUMENTED: association tracts without source geometry.
  for (const docId of [
    'brain.white_matter.corona_radiata',
    'brain.white_matter.superior_longitudinal_fasciculus',
    'brain.white_matter.uncinate_fasciculus',
    'brain.white_matter.inferior_longitudinal_fasciculus',
    'brain.white_matter.cingulum',
    'brain.white_matter.internal_capsule',
    'brain.white_matter.fornix_whole',
    'brain.white_matter.optic_tract_whole'
  ]) {
    const node = hierarchy.nodes.find((n: any) => n.id === docId);
    assert(node, `${docId}: DOCUMENTED gap is reified as a hierarchy node`);
    passed++;
    assert(node.geometry_state === 'DOCUMENTED' && !node.asset_id && !node.structure_record, `${docId}: DOCUMENTED, carries no geometry or record`);
    passed++;
    const isChildOfSomeNode = hierarchy.nodes.some(
      (n: any) => Array.isArray(n.children) && n.children.includes(docId)
    );
    assert(isChildOfSomeNode, `${docId}: listed in a parent's children array (reachable, not orphaned)`);
    passed++;
  }
  // No fabricated subdivision: neither the corpus callosum nor the fornix may
  // appear split into regions/parts, and no capsule limb beyond the sourced
  // anterior limb may appear.
  const hierarchyText = fs.readFileSync(path.join(PROJECT_ROOT, 'data/anatomical_hierarchy.json'), 'utf8');
  for (const invented of ['genu', 'splenium', 'rostrum', 'truncus', 'fornix_body', 'fornix_column', 'fornix_crus', 'posterior_limb', 'retrolenticular', 'sublenticular']) {
    assert(!new RegExp(`"${invented}|\\.${invented}[_."]`).test(hierarchyText), `no fabricated '${invented}' subdivision node`);
    passed++;
  }
  const ccNodes = nodeIds.filter((id: string) => /corpus_callosum/.test(id));
  assert(ccNodes.length === 1, `corpus callosum is exactly one node (got ${ccNodes.length})`);
  passed++;
  console.log('[PASS] Hierarchy honest; commissures unsplit; gaps DOCUMENTED.');
  passed++;

  // TEST 7: verdicts + pins (10 RUNTIME_READY, 0 rejected, hash-gated).
  console.log('\n--- TEST 7: Batch verdicts + pinned hashes ---');
  const qa = readJson('data/phase53_batch_qa.json');
  const ready = qa.verdicts.filter((v: any) => v.state === 'RUNTIME_READY');
  assert(qa.verdicts.length === 10 && ready.length === 10, `10/10 RUNTIME_READY (got ${ready.length}/10)`);
  passed++;
  assert(qa.verdicts.every((v: any) => v.profileId === 'solid-subcortical-nucleus'), 'every 5.3 verdict uses the white-matter SOLID profile');
  passed++;
  for (const v of qa.verdicts) {
    assert(!/pial|composite-cortical|open-cortical|cavity|sheet|cast/i.test(v.profileId ?? ''), `${v.assetId}: no cortical/cavity profile name`);
    passed++;
    assert(v.measuredTriangles > 0 && v.measuredShells === 1 && v.measuredBoundaryEdges === 0, `${v.assetId}: measured single-shell watertight solid`);
    passed++;
    assert(manifest.production_whitelist.includes(v.assetId), `${v.assetId}: whitelisted`);
    passed++;
  }
  const pins = readJson('data/phase53_source_hashes.json');
  assert(Array.isArray(pins.sources) && pins.sources.length === 10, '10 pinned source hashes committed');
  passed++;
  for (const s of pins.sources) {
    const stl = path.join(PROJECT_ROOT, 'assets/raw', s.asset_id, `${s.fma_id}.stl`);
    assert(fs.existsSync(stl), `raw source present for ${s.fma_id}`);
    passed++;
    const bytes = fs.readFileSync(stl);
    assert(crypto.createHash('sha256').update(bytes).digest('hex') === s.sha256, `${s.fma_id} raw bytes match the committed pin`);
    passed++;
  }
  assert(/MIRROR_CONVERSION_UNVERIFIED/.test(pins.residual_risk), 'residual mirror-conversion risk recorded, not silently closed');
  passed++;
  const prepSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts/pipeline/prepare_tract_batch.ts'), 'utf8');
  assert(/SOURCE INTEGRITY FAILURE/.test(prepSrc) && /loadPinnedSourceHashes/.test(prepSrc), 'staging script rejects on pin mismatch rather than self-comparing');
  passed++;
  console.log('[PASS] Batch fully ready; pins gate every source; residual risk open.');
  passed++;

  // TEST 8: loading + clipping (sagittal/coronal/axial) + selection + isolation + focus + bookmarks.
  console.log('\n--- TEST 8: System integration ---');
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
  const entry = manifest.assets['mesh.corpus_callosum.midline.v1'];
  const record: AnatomicalEntityRecord = {
    entityId: 'brain.white_matter.corpus_callosum',
    assetId: 'mesh.corpus_callosum.midline.v1',
    name: 'Corpus callosum',
    officialLatin: 'Corpus callosum',
    laterality: 'midline',
    canonicalCentroidMm: entry.centroid_mm,
    dimensionsMm: entry.dimensions_mm,
    volumeCm3: 21,
    topologyClass: entry.topology_class,
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC_BY_SA_2_1_JP',
    sourceDefinition: 'FMA86464',
    groups: ['division.white_matter', 'region.commissures']
  };
  const loaded = await mgr3.loadAsset(record.assetId, 'lod0');
  assert(loaded.triangleCount > 0, `corpus callosum loads (${loaded.triangleCount} tris)`);
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
    assert(adapter.getActivePlaneCount() === 1, `corpus callosum carries ${kind} clip`);
    passed++;
  }
  assembly.selectEntity(record.entityId);
  selectionMgr.select(record.entityId);
  assert(selectionMgr.getSelectedEntityId() === record.entityId, 'corpus callosum selectable');
  passed++;
  cameraMgr.focusBoundingBox(assembly.getEntityBoundingBox(record.entityId), 0);
  visibilityMgr.isolate(record.entityId);
  assert(visibilityMgr.isIsolated(record.entityId) === true, 'corpus callosum isolatable');
  passed++;
  visibilityMgr.restoreAll();
  const bm = createBookmark({
    id: 'bookmark.phase53.1',
    label: 'Phase 5.3 check',
    planes: planeSet.serialize(),
    presentation: { version: 1, sectionModeEnabled: true, activePlaneId: 'plane.axial', gizmoVisible: false, cutEdgeVisible: true, interiorMode: 'TRUE_CAP_WHERE_VALID', labelsEnabled: true, orientationVisible: true, readoutVisible: true, crosshairVisible: false, visualMode: 'NORMAL_SECTION', capsVisible: true, edgesVisible: true },
    camera: null,
    selectedEntityId: record.entityId,
    isolatedEntityId: null,
    hiddenEntityIds: [],
    labelsEnabled: true
  });
  assert(bm !== null && deserializeBookmark(serializeBookmark(bm!))?.selectedEntityId === record.entityId, 'corpus callosum bookmark round-trips');
  passed++;
  adapter.dispose();
  planeSet.dispose();
  assembly.dispose();
  materialMgr.dispose();
  mgr3.dispose();
  console.log('[PASS] Loading, 3-plane clipping, selection, focus, isolation, bookmarks.');
  passed++;

  // TEST 9: Phase 5.2 invariant regression guards.
  console.log('\n--- TEST 9: Phase 5.2 invariants hold ---');
  const entries: any[] = Object.values(manifest.assets);
  const byDate: Record<string, number> = {};
  for (const e of entries) byDate[e.acquisition_date] = (byDate[e.acquisition_date] ?? 0) + 1;
  assert((byDate['2026-09-26'] ?? 0) === 31, `all 31 legacy assets retain 2026-09-26 (got ${byDate['2026-09-26'] ?? 0})`);
  passed++;
  assert((byDate['2026-09-27'] ?? 0) === 5, `all 5 Phase 5.2 assets retain 2026-09-27 (got ${byDate['2026-09-27'] ?? 0})`);
  passed++;
  // Phase 5.4 shares the genuine 2026-09-28 run date: 10 Phase 5.3 + 3 Phase
  // 5.4 assets. The per-phase attribution below is unchanged.
  assert((byDate['2026-09-28'] ?? 0) === 13, `exactly the 10 new 5.3 + 3 new 5.4 assets are dated 2026-09-28 (got ${byDate['2026-09-28'] ?? 0})`);
  passed++;
  const recordFiles = fs.readdirSync(path.join(PROJECT_ROOT, 'data/structures')).filter((f) => f.endsWith('.json'));
  // Global record count advanced 46 → 49 in Phase 5.4 (3 cranial-nerve
  // records appended under the same conservative posture). Phase 5.5:
  // 49 → 63 (14 cortical-completion records, same posture). The per-record
  // invariants below are unchanged.
  assert(recordFiles.length === 63, `all 63 structure records present (got ${recordFiles.length})`);
  passed++;
  for (const f of recordFiles) {
    const rec = readJson(`data/structures/${f}`);
    assert(rec.asset_provenance?.commercial_redistribution === 'LEGAL_REVIEW_REQUIRED', `${f}: record commercial_redistribution is LEGAL_REVIEW_REQUIRED`);
    passed++;
    assert(
      !/Relicensed under|relicensed to CC BY/.test(
        (rec.asset_provenance?.attribution_text_required ?? '') + (rec.asset_provenance?.upstream_license_history ?? '')
      ),
      `${f}: record asserts no relicensing as settled fact`
    );
    passed++;
    assert(
      (REPRESENTATION_SCOPES as readonly string[]).includes(rec.representation_scope),
      `${f}: representation_scope '${rec.representation_scope}' is a valid RepresentationScope`
    );
    passed++;
  }
  // 5.2 anatomy spot-checks: cerebellum stays tissue, third ventricle stays cavity.
  const cereb = readJson('data/structures/cerebellum_bilateral.json');
  assert(cereb.subtype !== 'ventricular_space' && cereb.cavity_note === undefined, 'cerebellum still tissue (5.2 invariant)');
  passed++;
  const tv = readJson('data/structures/third_ventricle_midline.json');
  assert(tv.subtype === 'ventricular_space' && /NOT neural tissue/.test(tv.cavity_note ?? ''), 'third ventricle still cavity (5.2 invariant)');
  passed++;
  // M3: laterality single source of truth still refuses to guess.
  assert(
    lateralityFromAssetId('mesh.foo.v1') === null &&
      lateralityFromAssetId('mesh.hippocampus.head.left.v1') === null,
    'M3: lateralityFromAssetId returns null for unrecognised ids instead of guessing'
  );
  passed++;
  // M5: the ontology union covers the subtype committed records actually use.
  const entitySrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/types/entity.ts'), 'utf8');
  assert(/'white_matter_structure'/.test(entitySrc), 'M5: AnatomicalStructureSubtype includes white_matter_structure');
  passed++;
  assert(/'macroscopic_mesh'/.test(entitySrc), 'M5: RepresentationType includes macroscopic_mesh');
  passed++;
  // N4: the anatomical category reaches the 5.3 batch ledger.
  const tractLedger = readJson('data/phase53_batch.json');
  for (const it of tractLedger.items) {
    assert(it.category === 'WHITE_MATTER', `N4: ledger carries WHITE_MATTER for ${it.assetId}`);
    passed++;
  }
  console.log('[PASS] Phase 5.2 invariants preserved; 5.3 ledger honest.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 5.3 ANATOMY TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 5.3 anatomy test execution failed:\n', err);
  process.exit(1);
});
