/**
 * 3D Neuroanatomy Atlas: Phase 5.5 Cortical-Completion Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Covers the 5.5 batch (inferior temporal, fusiform, parahippocampal,
 * superior temporal anterior/posterior, insula, occipital lobe — each R/L =
 * 14 RUNTIME_READY, 0 rejected) against REAL outputs: identity, IDs,
 * laterality vs measured geometry, cortical-vs-parcel separation,
 * continuity honesty, provenance, license, transforms, topology, LOD,
 * manifest, hierarchy, loading, clipping, selection, isolation, focus,
 * bookmarks. The 14 meshes are DISCONNECTED distribution segments: gaps are
 * never bridged, seams never smoothed, no joined pia ever implied (the
 * `false-continuity-claim` hard stop). They are surface-derived segments,
 * never atlas parcels: no parcel mapping was performed or claimed (the
 * `parcel-conflation` hard stop). BP48/49/50 were never attempted (the
 * `uncertain-source-identity` hard stop).
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

const BATCH: Array<{ base: string; laterality: string; fma: string; record: string; subtype: string }> = [
  { base: 'inferior_temporal_gyrus', laterality: 'right', fma: 'FMA72687', record: 'inferior_temporal_gyrus_right.json', subtype: 'cortical_gyrus' },
  { base: 'inferior_temporal_gyrus', laterality: 'left', fma: 'FMA72688', record: 'inferior_temporal_gyrus_left.json', subtype: 'cortical_gyrus' },
  { base: 'fusiform_gyrus', laterality: 'right', fma: 'FMA72689', record: 'fusiform_gyrus_right.json', subtype: 'cortical_gyrus' },
  { base: 'fusiform_gyrus', laterality: 'left', fma: 'FMA72690', record: 'fusiform_gyrus_left.json', subtype: 'cortical_gyrus' },
  { base: 'parahippocampal_gyrus', laterality: 'right', fma: 'FMA72705', record: 'parahippocampal_gyrus_right.json', subtype: 'cortical_gyrus' },
  { base: 'parahippocampal_gyrus', laterality: 'left', fma: 'FMA72706', record: 'parahippocampal_gyrus_left.json', subtype: 'cortical_gyrus' },
  { base: 'superior_temporal_gyrus_anterior', laterality: 'right', fma: 'FMA72800', record: 'superior_temporal_gyrus_anterior_right.json', subtype: 'cortical_gyrus' },
  { base: 'superior_temporal_gyrus_anterior', laterality: 'left', fma: 'FMA72801', record: 'superior_temporal_gyrus_anterior_left.json', subtype: 'cortical_gyrus' },
  { base: 'superior_temporal_gyrus_posterior', laterality: 'right', fma: 'FMA72804', record: 'superior_temporal_gyrus_posterior_right.json', subtype: 'cortical_gyrus' },
  { base: 'superior_temporal_gyrus_posterior', laterality: 'left', fma: 'FMA72805', record: 'superior_temporal_gyrus_posterior_left.json', subtype: 'cortical_gyrus' },
  { base: 'insula', laterality: 'right', fma: 'FMA72977', record: 'insula_right.json', subtype: 'cortical_structure' },
  { base: 'insula', laterality: 'left', fma: 'FMA72978', record: 'insula_left.json', subtype: 'cortical_structure' },
  { base: 'occipital_lobe', laterality: 'right', fma: 'FMA72975', record: 'occipital_lobe_right.json', subtype: 'cortical_structure' },
  { base: 'occipital_lobe', laterality: 'left', fma: 'FMA72976', record: 'occipital_lobe_left.json', subtype: 'cortical_structure' }
];

const assetIdOf = (b: { base: string; laterality: string }): string => `mesh.${b.base}.${b.laterality}.v1`;

// Atlas-parcel vocabulary that must never describe these surface-derived
// segments. The Phase 5.5 registry hard stop is parcel-conflation: these
// meshes carry NO parcellation mapping, so no parcel atlas, parcel code, or
// parcel-boundary term may appear. Explicit denial sentences inside the
// record's own guard fields are allowed; everything else is scanned.
const PARCEL_VOCAB = /brodmann|\bBA\s?\d{1,2}\b|hcp|mmp|glasser|julich|desikan|destrieux|schaefer|aal\d?|parcellation|atlas.parcel|\bparcel\b|cortical_parcel|associated_with_parcel|contains_parcel/i;

// Continuity-claim vocabulary that must never appear as a POSITIVE claim.
// Each mesh is one watertight shell (honest per-mesh CLOSED_SURFACE QA), but
// the 14 together form NO continuous surface: gaps are not bridged, seams
// not smoothed, joining not implied. Explicit denial sentences inside the
// record's own guard fields are allowed; everything else is scanned.
const CONTINUITY_VOCAB = /continuous.surface|continuous.pia|pial.continuity|single.continuous|joined|bridged|seamless|stitched|smoothed.seam|fused.together|merged.into.one|one.continuous.cortex/i;

// Knowledge-layer vocabulary that must never describe substrate anatomy.
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
  console.log('NEURO ATLAS 3D: PHASE 5.5 CORTICAL-COMPLETION TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  const manifest = readJson('assets/manifests/assets.manifest.json');
  // Global count 49 → 63 in Phase 5.5 (14 cortical-completion assets
  // appended, same BodyParts3D provenance chain).
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
    assert(rec.representation_scope === 'paired_separate', `${rec.id}: paired lateralised segment is paired_separate, not ${rec.representation_scope}`);
    passed++;
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
    if (b.laterality === 'right') {
      assert(cx > 0, `${rec.id}: right segment sits at +X in canonical space (got ${cx})`);
      passed++;
    } else {
      assert(cx < 0, `${rec.id}: left segment sits at -X in canonical space (got ${cx})`);
      passed++;
    }
  }
  console.log('[PASS] Declared laterality matches measured canonical geometry.');
  passed++;

  // TEST 3: cortical-vs-parcel separation (registry hard stop: parcel-conflation).
  console.log('\n--- TEST 3: Cortical-vs-parcel separation ---');
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.record}`);
    assert(rec.entity_type === 'anatomical_structure', `${rec.id}: entity is an anatomical structure, not a parcel`);
    passed++;
    assert(rec.subtype === b.subtype, `${rec.id}: subtype ${b.subtype} (reused union member, no union change)`);
    passed++;
    assert(rec.subtype !== 'cortical_parcel', `${rec.id}: never typed as a parcel`);
    passed++;
    assert(rec.representations?.[0]?.representation_type === 'macroscopic_mesh', `${rec.id}: representation is a surface-derived mesh, not a parcel map`);
    passed++;
    assert(!/cortical_parcel|surface_parcellation/.test(rec.representations?.[0]?.representation_type ?? ''), `${rec.id}: never a parcellation representation`);
    passed++;
    assert(rec.functional_neuroanatomy === undefined && rec.psychiatric_relevance === undefined, `${rec.id}: no functional/psychiatric sections`);
    passed++;
    assert(typeof rec.anatomy_only_scope === 'string' && /DISCONNECTED/.test(rec.anatomy_only_scope), `${rec.id}: explicit anatomy-only guard present`);
    passed++;
    assert(!PARCEL_VOCAB.test(scannableRecordText(rec)), `${rec.id}: no parcel vocabulary outside the explicit denial`);
    passed++;
    assert(!KNOWLEDGE_VOCAB.test(scannableRecordText(rec)), `${rec.id}: no knowledge vocabulary outside the explicit denial`);
    passed++;
    assert(rec.expert_review_status === 'EXPERT_REVIEW_PENDING', `${rec.id}: no expert review claimed`);
    passed++;
  }
  console.log('[PASS] Surface segments only: no parcel mapping, no parcel typing, no knowledge claims.');
  passed++;

  // TEST 4: continuity honesty (registry hard stop: false-continuity-claim).
  console.log('\n--- TEST 4: Continuity honesty ---');
  for (const b of BATCH) {
    const rec = readJson(`data/structures/${b.record}`);
    // The guard itself records the decision: disconnected, no joining.
    assert(/DISCONNECTED/.test(rec.anatomy_only_scope ?? ''), `${rec.id}: guard records disconnected status`);
    passed++;
    assert(/no.*continuous|not.*continuous|DISCONNECTED/i.test(rec.anatomy_only_scope ?? ''), `${rec.id}: guard denies a continuous-surface reading`);
    passed++;
    // Outside the guard, no positive continuity claim may appear.
    assert(!CONTINUITY_VOCAB.test(scannableRecordText(rec)), `${rec.id}: no continuity claim outside the explicit denial`);
    passed++;
    // No `continuous_with` relationship: containment only.
    for (const rel of rec.topography?.relationships ?? []) {
      assert(rel.relationship_type !== 'continuous_with', `${rec.id}: no continuous_with relationship`);
      passed++;
    }
  }
  // The continuity decision is recorded in docs, not implemented in geometry.
  const scopeText = fs.readFileSync(path.join(PROJECT_ROOT, 'docs/PHASE_5_5_ANATOMICAL_SCOPE.md'), 'utf8');
  assert(/continuity decision/i.test(scopeText) && /NOT presented as a continuous surface|not.*continuous/i.test(scopeText), 'scope doc records the continuity decision');
  passed++;
  const qaText = fs.readFileSync(path.join(PROJECT_ROOT, 'docs/PHASE_5_5_ASSET_QA.md'), 'utf8');
  assert(/DISCONNECTED|disconnected/i.test(qaText) && /continu/i.test(qaText), 'QA doc records the continuity decision per asset batch');
  passed++;
  console.log('[PASS] Disconnected segments honestly recorded; no bridging/smoothing/joining anywhere.');
  passed++;

  // TEST 5: provenance + license + hashes.
  console.log('\n--- TEST 5: Provenance + license + hashes ---');
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

  // TEST 6: coordinates + topology + LOD.
  console.log('\n--- TEST 6: Coordinates + topology + LOD ---');
  for (const b of BATCH) {
    const entry = manifest.assets[assetIdOf(b)];
    assert(/canonical_atlas_ras/.test(entry.coordinate_space), `${b.base}: canonical declared`);
    passed++;
    // Per-mesh honesty: every 5.5 source measured exactly one watertight
    // shell, so the runner selected the cortical closed-surface profile.
    // That classifies EACH mesh, never the 14 together (see TEST 4).
    assert(entry.topology_class === 'CLOSED_SURFACE', `${b.base}: honest per-mesh CLOSED_SURFACE topology (got ${entry.topology_class})`);
    passed++;
    const tris = ['lod0', 'lod1', 'lod2', 'lod3'].map((lod) => entry.lod_files[lod].triangles);
    assert(tris.every((t: number) => t > 0) && tris[0] >= tris[1] && tris[1] >= tris[2] && tris[2] >= tris[3], `${b.base}: LODs present and monotonic`);
    passed++;
    for (const lod of ['lod0', 'lod1', 'lod2', 'lod3']) {
      assert(fs.existsSync(path.join(PROJECT_ROOT, entry.runtime_files[lod].path)), `${b.base}: runtime ${lod} present`);
      passed++;
    }
  }
  console.log('[PASS] Canonical space; measured per-mesh topology; LODs shipped.');
  passed++;

  // TEST 7: hierarchy honesty (AVAILABLE vs DOCUMENTED; nothing fabricated).
  console.log('\n--- TEST 7: Hierarchy ---');
  const hierarchy = readJson('data/anatomical_hierarchy.json');
  assert(hierarchy.nodes.length === 135, `hierarchy holds 135 nodes, got ${hierarchy.nodes.length}`);
  passed++;
  const nodeIds = hierarchy.nodes.map((n: any) => n.id);
  assert(nodeIds.includes('brain.telencephalon.left.insular_lobe'), 'insular branch present');
  passed++;
  assert(nodeIds.includes('brain.telencephalon.left.occipital_lobe'), 'occipital branch present');
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
  // DOCUMENTED gaps stay DOCUMENTED: absent frontal/parietal gyri, cuneus,
  // lingual, sulci/fissures, whole-STG, and the BP-precuneus exclusion.
  for (const docId of [
    'brain.telencephalon.inferior_frontal_gyrus',
    'brain.telencephalon.orbitofrontal_gyri',
    'brain.telencephalon.medial_frontal_gyrus',
    'brain.telencephalon.superior_parietal_lobule',
    'brain.telencephalon.inferior_parietal_lobule_whole',
    'brain.telencephalon.cuneus',
    'brain.telencephalon.lingual_gyrus',
    'brain.telencephalon.major_sulci',
    'brain.telencephalon.superior_temporal_gyrus_whole',
    'brain.telencephalon.precuneus_bp',
    'brain.telencephalon.circular_sulcus_insulae',
    'brain.telencephalon.longitudinal_fissure'
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
  // No fabricated whole-STG synthesis: the whole gyrus stays DOCUMENTED while
  // exactly its two sourced parts are AVAILABLE per hemisphere.
  const stgNodes = nodeIds.filter((id: string) => /superior_temporal_gyrus/.test(id));
  assert(stgNodes.length === 5, `STG is exactly 4 AVAILABLE parts + 1 DOCUMENTED whole (got ${stgNodes.length})`);
  passed++;
  const stgWhole = hierarchy.nodes.find((n: any) => n.id === 'brain.telencephalon.superior_temporal_gyrus_whole');
  assert(stgWhole.geometry_state === 'DOCUMENTED' && !stgWhole.asset_id, 'whole STG stays DOCUMENTED (no mesh synthesized)');
  passed++;
  console.log('[PASS] Hierarchy honest; parts unsynthesized; gaps DOCUMENTED with reasons.');
  passed++;

  // TEST 8: verdicts + pins (14 RUNTIME_READY, 0 rejected, hash-gated).
  console.log('\n--- TEST 8: Batch verdicts + pinned hashes ---');
  const qa = readJson('data/phase55_batch_qa.json');
  const ready = qa.verdicts.filter((v: any) => v.state === 'RUNTIME_READY');
  assert(qa.verdicts.length === 14 && ready.length === 14, `14/14 RUNTIME_READY (got ${ready.length}/14)`);
  passed++;
  assert(qa.verdicts.filter((v: any) => v.state === 'REJECTED').length === 0, 'no silent rejections: every staged source shipped or would carry a reason');
  passed++;
  const CORTICAL_PROFILES = ['closed-pial-surface', 'composite-cortical-assembly', 'open-cortical-sheet'];
  for (const v of qa.verdicts) {
    assert(v.anatomicalCategory === 'CORTEX', `CORTEX ledger category for ${v.assetId} (got ${v.anatomicalCategory})`);
    passed++;
    assert(CORTICAL_PROFILES.includes(v.profileId), `${v.assetId}: cortical-appropriate profile reused (got ${v.profileId})`);
    passed++;
    assert(!/cavity|solid|streamline|tractography|vascular|tube|sheet-cast/i.test(v.profileId ?? ''), `${v.assetId}: no cavity/solid/streamline profile name forced`);
    passed++;
    assert(v.measuredTriangles > 0 && v.measuredShells === 1 && v.measuredBoundaryEdges === 0, `${v.assetId}: measured single-shell watertight segment`);
    passed++;
    assert(manifest.production_whitelist.includes(v.assetId), `${v.assetId}: whitelisted`);
    passed++;
  }
  const pins = readJson('data/phase55_source_hashes.json');
  assert(Array.isArray(pins.sources) && pins.sources.length === 14, '14 pinned source hashes committed');
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
  const prepSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts/pipeline/prepare_cortical55_batch.ts'), 'utf8');
  assert(/SOURCE INTEGRITY FAILURE/.test(prepSrc) && /loadPinnedSourceHashes/.test(prepSrc), 'staging script rejects on pin mismatch rather than self-comparing');
  passed++;
  console.log('[PASS] Batch fully ready; cortical profiles reused; pins gate every source; residual risk open.');
  passed++;

  // TEST 9: loading + clipping (sagittal/coronal/axial) + selection + isolation + focus + bookmarks.
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
  const entry = manifest.assets['mesh.insula.right.v1'];
  const record: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.right.insular_lobe.insula',
    assetId: 'mesh.insula.right.v1',
    name: 'Insula (right)',
    officialLatin: 'Insula',
    laterality: 'right',
    canonicalCentroidMm: entry.centroid_mm,
    dimensionsMm: entry.dimensions_mm,
    volumeCm3: 9.56,
    topologyClass: entry.topology_class,
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC_BY_SA_2_1_JP',
    sourceDefinition: 'FMA72977',
    groups: ['division.cerebrum', 'hemisphere.right', 'lobe.insular']
  };
  const loaded = await mgr3.loadAsset(record.assetId, 'lod0');
  assert(loaded.triangleCount > 0, `insula loads (${loaded.triangleCount} tris)`);
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
    assert(adapter.getActivePlaneCount() === 1, `insula carries ${kind} clip`);
    passed++;
  }
  assembly.selectEntity(record.entityId);
  selectionMgr.select(record.entityId);
  assert(selectionMgr.getSelectedEntityId() === record.entityId, 'insula selectable');
  passed++;
  cameraMgr.focusBoundingBox(assembly.getEntityBoundingBox(record.entityId), 0);
  visibilityMgr.isolate(record.entityId);
  assert(visibilityMgr.isIsolated(record.entityId) === true, 'insula isolatable');
  passed++;
  visibilityMgr.restoreAll();
  const bm = createBookmark({
    id: 'bookmark.phase55.1',
    label: 'Phase 5.5 check',
    planes: planeSet.serialize(),
    presentation: { version: 1, sectionModeEnabled: true, activePlaneId: 'plane.axial', gizmoVisible: false, cutEdgeVisible: true, interiorMode: 'TRUE_CAP_WHERE_VALID', labelsEnabled: true, orientationVisible: true, readoutVisible: true, crosshairVisible: false, visualMode: 'NORMAL_SECTION', capsVisible: true, edgesVisible: true },
    camera: null,
    selectedEntityId: record.entityId,
    isolatedEntityId: null,
    hiddenEntityIds: [],
    labelsEnabled: true
  });
  assert(bm !== null && deserializeBookmark(serializeBookmark(bm!))?.selectedEntityId === record.entityId, 'insula bookmark round-trips');
  passed++;
  adapter.dispose();
  planeSet.dispose();
  assembly.dispose();
  materialMgr.dispose();
  mgr3.dispose();
  console.log('[PASS] Loading, 3-plane clipping, selection, focus, isolation, bookmarks.');
  passed++;

  // TEST 10: Phase 5.4 invariant regression guards + 5.5 hard stops.
  console.log('\n--- TEST 10: Phase 5.4 invariants hold + 5.5 hard stops ---');
  const entries: any[] = Object.values(manifest.assets);
  const byDate: Record<string, number> = {};
  for (const e of entries) byDate[e.acquisition_date] = (byDate[e.acquisition_date] ?? 0) + 1;
  assert((byDate['2026-09-26'] ?? 0) === 31, `all 31 legacy assets retain 2026-09-26 (got ${byDate['2026-09-26'] ?? 0})`);
  passed++;
  assert((byDate['2026-09-27'] ?? 0) === 5, `all 5 Phase 5.2 assets retain 2026-09-27 (got ${byDate['2026-09-27'] ?? 0})`);
  passed++;
  assert((byDate['2026-09-28'] ?? 0) === 13, `only the 10 Phase 5.3 + 3 Phase 5.4 assets are dated 2026-09-28 (got ${byDate['2026-09-28'] ?? 0})`);
  passed++;
  assert((byDate['2026-09-29'] ?? 0) === 14, `only the 14 Phase 5.5 assets are dated 2026-09-29 (got ${byDate['2026-09-29'] ?? 0})`);
  passed++;
  const recordFiles = fs.readdirSync(path.join(PROJECT_ROOT, 'data/structures')).filter((f) => f.endsWith('.json'));
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
  // 5.4 anatomy spot-checks: optic nerve stays nerve, commissures stay white
  // matter, cerebellum stays tissue, third ventricle stays cavity.
  const on = readJson('data/structures/optic_nerve_right.json');
  assert(on.subtype === 'cranial_nerve', 'optic nerve still nerve (5.4 invariant)');
  passed++;
  const cc = readJson('data/structures/corpus_callosum_midline.json');
  assert(cc.subtype === 'white_matter_structure', 'corpus callosum still white matter (5.3 invariant)');
  passed++;
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
  // M5: the ontology union covers the subtypes committed records actually
  // use. `cortical_gyrus` and `cortical_structure` already existed in the
  // union and are preferred over any new member (no union change for 5.5).
  const entitySrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/types/entity.ts'), 'utf8');
  assert(/'cortical_gyrus'/.test(entitySrc), 'M5: AnatomicalStructureSubtype includes cortical_gyrus');
  passed++;
  assert(/'cortical_structure'/.test(entitySrc), 'M5: AnatomicalStructureSubtype includes cortical_structure');
  passed++;
  assert(/'macroscopic_mesh'/.test(entitySrc), 'M5: RepresentationType includes macroscopic_mesh');
  passed++;
  // N4: the anatomical category reaches the 5.5 batch ledger.
  const corticalLedger = readJson('data/phase55_batch.json');
  for (const it of corticalLedger.items) {
    assert(it.category === 'CORTEX', `N4: ledger carries CORTEX for ${it.assetId}`);
    passed++;
  }
  // Hard stops: BP identifiers never attempted; no parcel mapping onto 5.5
  // meshes; no continuity implementation in geometry tooling.
  const manifestText = fs.readFileSync(path.join(PROJECT_ROOT, 'assets/manifests/assets.manifest.json'), 'utf8');
  assert(!/BP48|BP49|BP50/.test(manifestText), 'BP identifiers never entered the manifest');
  passed++;
  const allRecordsText = recordFiles.map((f) => fs.readFileSync(path.join(PROJECT_ROOT, 'data/structures', f), 'utf8')).join(' ');
  assert(!/BP48|BP49|BP50/.test(allRecordsText), 'BP identifiers never entered any structure record');
  passed++;
  const hierarchyText55 = fs.readFileSync(path.join(PROJECT_ROOT, 'data/anatomical_hierarchy.json'), 'utf8');
  assert(!/"mesh\.[^"]*BP|BP48.*AVAILABLE|BP49.*AVAILABLE|BP50.*AVAILABLE/.test(hierarchyText55), 'no BP AVAILABLE node exists');
  passed++;
  const prep55 = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts/pipeline/prepare_cortical55_batch.ts'), 'utf8');
  assert(!/BP48|BP49|BP50/.test(prep55.replace(/BP48\/49\/50/g, '')), 'staging script attempts no BP source (exclusion note only)');
  passed++;
  console.log('[PASS] Phase 5.4 invariants preserved; 5.5 ledger honest; hard stops held.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 5.5 ANATOMY TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 5.5 anatomy test execution failed:\n', err);
  process.exit(1);
});
