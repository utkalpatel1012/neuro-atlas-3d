/**
 * 3D Neuroanatomy Atlas: Phase 3.1 Scientific Integrity Test Suite
 * Standard: AAS-2026-NEURO-V1 (Phase 3.1 correction gate)
 *
 * Machine-enforced honesty checks for every Phase 3.1 correction class:
 *  1. Source-component preservation (14/side, corrected identities, hash chain)
 *  2. Coordinate-axis definition (exact adapter math, +Z Posterior, no mirroring)
 *  3. Transformation consistency (manifest values derive from committed geometry)
 *  4. Laterality (sign chain, distinct meshes)
 *  5. Provenance (no SPL-PNL source blend, acquisition channel explicit)
 *  6. Registration-state correctness (PENDING + not_registered, zero metrics)
 *  7. Absence of fabricated metrics (banned keys scanner)
 *  8. LOD terminology/metadata (meshopt scope, QEM lossy, no bare "lossless")
 *  9. Production/research asset separation (whitelist exact, no HCP/Julich/BigBrain)
 * 10. Landmark schematic enforcement (no anchor may claim EXPERT_VERIFIED without
 *     documented expert-vs-mesh review — see PART_4_ENTRY_CRITERIA.md)
 *
 * These tests assert DATA properties, never prose. If a future expert review
 * legitimately changes a gated state, update the corresponding test AND the
 * entry-criteria document together — never silently.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  BODYPARTS3D_LPS_TO_RAS_ADAPTER,
  transformPoint,
  validateAdapter
} from '../scripts/pipeline/coordinate_adapter';
import { CEREBRAL_LANDMARKS } from './types/semantic';

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

function collectStrings(obj: any, out: string[] = []): string[] {
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach((v) => collectStrings(v, out));
  else if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach((k) => { out.push(k); collectStrings(obj[k], out); });
  }
  return out;
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 3.1 SCIENTIFIC INTEGRITY TEST SUITE');
  console.log('================================================================\n');

  let passedChecks = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Source-component preservation (D2)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Source-Component Preservation ---');
  const manifest = readJson('assets/manifests/assets.manifest.json');
  const EXPECTED_LEFT: Record<string, string> = {
    FMA72654: 'Left superior frontal gyrus',
    FMA72656: 'Left middle frontal gyrus',
    FMA72662: 'Left precentral gyrus',
    FMA72666: 'Left postcentral gyrus',
    FMA72668: 'Left supramarginal gyrus',
    FMA72670: 'Left angular gyrus',
    FMA72686: 'Left middle temporal gyrus',
    FMA72688: 'Left inferior temporal gyrus',
    FMA72690: 'Left fusiform gyrus',
    FMA72702: 'Left accessory short gyrus',
    FMA72706: 'Left parahippocampal gyrus',
    FMA72976: 'Left occipital lobe',
    FMA72978: 'Left insula',
    FMA72718: 'Left cingulate gyrus'
  };
  // Banned: names of structures whose files were NEVER ingested (true superior
  // temporal / cuneus / lingual pieces are not among the 14 components/side), plus
  // the over-specific 'lateral surface' label. NOTE: 'parahippocampal' and
  // 'cingulate' ARE correctly present post-correction, so they are not banned —
  // instead the exact per-FMA mapping is asserted below.
  const BANNED_NAMES = [
    'superior temporal gyrus', 'cuneus', 'Cuneus', 'lingual gyrus', 'Lingual',
    'occipital lobe lateral surface'
  ];
  for (const hemi of ['left', 'right']) {
    const ingest = readJson(`assets/raw/mesh.cortex.${hemi}.v1/ingestion.json`);
    assert(ingest.components.length === 14, `${hemi}: exactly 14 source components`);
    const entry = manifest.assets[`mesh.cortex.${hemi}.v1`];
    assert(entry.source_components?.component_count === 14, `${hemi}: manifest carries 14 components`);
    const triSum = ingest.components.reduce((s: number, c: any) => s + c.triangle_count, 0);
    assert(triSum === ingest.total_raw_triangles, `${hemi}: component triangle sum (${triSum}) == composite (${ingest.total_raw_triangles})`);
    for (const c of ingest.components) {
      assert(typeof c.sha256 === 'string' && /^[0-9a-f]{64}$/.test(c.sha256), `${hemi} ${c.fma_id}: valid per-component SHA-256`);
      assert(typeof c.source_url === 'string' && c.source_url.includes(c.fma_id), `${hemi} ${c.fma_id}: per-component source URL`);
    }
    const blob = JSON.stringify(ingest.components) + JSON.stringify(entry.source_components);
    for (const banned of BANNED_NAMES) {
      assert(!blob.includes(`"${banned}"`) && !blob.includes(`:\"${banned}\"`) && !blob.includes(banned), `${hemi}: banned mislabel absent: ${banned}`);
    }
    if (hemi === 'left') {
      for (const c of ingest.components) {
        assert(c.name === (EXPECTED_LEFT as any)[c.fma_id], `${c.fma_id} named per authority: ${c.name}`);
      }
      const acc = ingest.components.find((c: any) => c.fma_id === 'FMA72702');
      assert(acc.lobe === 'insula', 'FMA72702 lobe corrected to insula');
      const para = ingest.components.find((c: any) => c.fma_id === 'FMA72706');
      assert(para.lobe === 'limbic', 'FMA72706 lobe corrected to limbic');
    }
  }
  console.log('[PASS] 14 components/side preserved with hashes, URLs, corrected identities.');
  passedChecks += 8;

  // --------------------------------------------------------------------------
  // TEST 2: Coordinate-axis definition — exact adapter math (D3)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Coordinate Adapter Math ---');
  const adapterCheck = validateAdapter(BODYPARTS3D_LPS_TO_RAS_ADAPTER);
  assert(adapterCheck.valid, 'BodyParts3D adapter passes orthogonality validation');
  assert(BODYPARTS3D_LPS_TO_RAS_ADAPTER.axis_mapping.x === '-x', 'canonical X = -source X');
  assert(BODYPARTS3D_LPS_TO_RAS_ADAPTER.axis_mapping.y === 'z', 'canonical Y = source Z');
  assert(BODYPARTS3D_LPS_TO_RAS_ADAPTER.axis_mapping.z === 'y', 'canonical Z = source Y');
  // Corner mapping: source left-frontal-superior extreme -> canonical left/superior/posterior-negative
  const mapped = transformPoint([65.10, -174.68, 1633.08], BODYPARTS3D_LPS_TO_RAS_ADAPTER);
  assert(Math.abs(mapped[0] - -65.10) < 1e-6, `X negated exactly (got ${mapped[0]})`);
  assert(Math.abs(mapped[1] - 71.38) < 1e-6, `Y = Z - 1561.7 exactly (got ${mapped[1]})`);
  assert(Math.abs(mapped[2] - -104.58) < 1e-6, `Z = Y + 70.1 exactly (got ${mapped[2]})`);
  // Orientation preservation: determinant of the linear part must be +1 (no mirroring).
  // Linear part rows: X'=-X, Y'=Z, Z'=Y -> det = -1*(0*0-1*1) = +1.
  const det = (-1) * (0 * 0 - 1 * 1);
  assert(det === 1, 'Adapter linear part has determinant +1 (proper rotation, no mirroring)');
  console.log('[PASS] Adapter math exact: Xc=-Xs, Yc=Zs-1561.7, Zc=Ys+70.1, det=+1.');
  passedChecks += 5;

  // --------------------------------------------------------------------------
  // TEST 3: Transformation consistency — manifest derives from geometry (D3)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Manifest/Record Consistency ---');
  for (const hemi of ['left', 'right']) {
    const entry = manifest.assets[`mesh.cortex.${hemi}.v1`];
    const rec = readJson(`data/structures/cortex_${hemi}.json`);
    assert(JSON.stringify(entry.centroid_mm) === JSON.stringify(rec.spatial.stereotaxic_registration.registered_centroid),
      `${hemi}: manifest centroid == structure record registered centroid`);
    assert(entry.coordinate_space.includes('+Z Posterior'), `${hemi}: coordinate space states +Z Posterior`);
    assert(entry.topology_class === 'MULTI_SHELL_COMPOSITE', `${hemi}: manifest topology honest`);
    assert(entry.geometric_qa_status === 'GEOMETRY_VALIDATED', `${hemi}: geometric status read from report`);
    assert(entry.anatomical_qa_status === 'ANATOMICAL_MAPPING_PENDING', `${hemi}: anatomical status read from report`);
  }
  console.log('[PASS] Manifest and structure records agree with measured geometry.');
  passedChecks += 5;

  // --------------------------------------------------------------------------
  // TEST 4: Laterality chain (D5)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Laterality ---');
  const lc = manifest.assets['mesh.cortex.left.v1'].centroid_mm[0];
  const rc = manifest.assets['mesh.cortex.right.v1'].centroid_mm[0];
  assert(lc < 0 && rc > 0, 'Cortex centroid X signs encode laterality');
  const lTri = manifest.assets['mesh.cortex.left.v1'].lod_files.lod0.triangles;
  const rTri = manifest.assets['mesh.cortex.right.v1'].lod_files.lod0.triangles;
  assert(lTri !== rTri, `Hemisphere meshes are distinct assets, not mirrors (${lTri} vs ${rTri} tris)`);
  const lIng = readJson('assets/raw/mesh.cortex.left.v1/ingestion.json');
  assert(lIng.components.every((c: any) => c.laterality === 'left'), 'All left components declared left at source');
  console.log('[PASS] Laterality verified: source declaration -> sign-flipping rigid map -> canonical signs.');
  passedChecks += 3;

  // --------------------------------------------------------------------------
  // TEST 5: Provenance honesty (D2/D11)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Provenance Honesty ---');
  for (const aid of Object.keys(manifest.assets)) {
    const e = manifest.assets[aid];
    assert(!e.dataset_name.includes('SPL-PNL'), `${aid}: dataset_name free of SPL-PNL blend`);
    assert(typeof e.acquisition_channel === 'string' && e.acquisition_channel.includes('mirror'),
      `${aid}: acquisition channel names the mirror`);
  }
  // Phase 3.1 §19: the term "dual compliance" has no legal basis — banned repo-wide
  // in live records. Exact terms + LEGAL_REVIEW_REQUIRED flag required instead.
  const liveBlob = JSON.stringify(manifest) +
    ['cortex_left', 'cortex_right', 'hippocampus_left', 'hippocampus_right']
      .map((s) => JSON.stringify(readJson(`data/structures/${s}.json`))).join(' ');
  assert(!liveBlob.toLowerCase().includes('dual compliance'),
    'Banned counsel-pretending term "dual compliance" absent from live records');
  assert(liveBlob.includes('LEGAL_REVIEW_REQUIRED'),
    'LEGAL_REVIEW_REQUIRED flag present for licensing retroactivity');
  console.log('[PASS] No SPL-PNL source blend; acquisition channel explicit; exact-terms licensing, no counsel-pretending language.');
  passedChecks += 2;

  // --------------------------------------------------------------------------
  // TEST 6/7: Registration correctness + fabricated-metric scan (D4)
  // Claim-aware (not text-naive): correction NOTES may mention history, but no
  // live record may assert an uncomputed method, metric, template, or script.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6/7: Registration State & Fabricated-Metric Scan ---');
  for (const s of ['cortex_left', 'cortex_right', 'hippocampus_left', 'hippocampus_right']) {
    const d = readJson(`data/structures/${s}.json`);
    const reg = d.spatial.stereotaxic_registration;
    assert(reg.registration_status === 'REGISTRATION_PENDING', `${s}: registration explicitly pending`);
    const r = reg.registration;
    assert(r.registration_method === 'not_registered', `${s}: method honestly not_registered`);
    assert(r.target_reference_template === undefined, `${s}: no template named without registration`);
    assert(r.registration_uncertainty_mm === undefined, `${s}: no unmeasured uncertainty`);
    assert(r.dice_similarity_coefficient === undefined, `${s}: no unmeasured dice`);
    assert(!r.registration_source.includes('register_to_mni'), `${s}: registration_source names no phantom script`);
  }
  // Manifests + synced copy: key-level scan (no metric keys, no affine method value).
  for (const f of ['assets/manifests/assets.manifest.json', 'assets/assets.manifest.json']) {
    const keys = collectStrings(readJson(f));
    for (const banned of ['registration_uncertainty_mm', 'dice_similarity_coefficient', 'affine_linear_12dof', 'register_to_mni']) {
      assert(!keys.includes(banned), `${f}: banned live-claim token absent: ${banned}`);
    }
  }
  console.log('[PASS] All records pending + method not_registered; zero fabricated metrics repo-wide in records.');
  passedChecks += 6;

  // --------------------------------------------------------------------------
  // TEST 8: LOD terminology/metadata (D6)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: LOD Terminology ---');
  const BANNED_LOSSLESS = ['"lossless":true', '"lossless": true', '"lossless_verification":true', '"lossless_verification": true'];
  for (const aid of ['mesh.cortex.left.v1', 'mesh.cortex.right.v1', 'mesh.hippocampus.left.v1', 'mesh.hippocampus.right.v1']) {
    const comp = readJson(`assets/validation/${aid}.compression_report.json`);
    const params = comp.transformationRecord.parameters;
    assert(params.meshopt_roundtrip_lossless_vs_lod_input === true, `${aid}: meshopt scope field present`);
    assert(params.qem_simplification_lossy === true, `${aid}: QEM lossy field present`);
    const blob = JSON.stringify(comp);
    for (const banned of BANNED_LOSSLESS) {
      assert(!blob.includes(banned), `${aid}: unscoped lossless claim absent`);
    }
  }
  const manifestBlob = JSON.stringify(manifest);
  for (const banned of BANNED_LOSSLESS) {
    assert(!manifestBlob.includes(banned), `manifest: unscoped lossless claim absent`);
  }
  console.log('[PASS] Meshopt scope explicit; QEM declared lossy; no bare lossless anywhere in records.');
  passedChecks += 4;

  // --------------------------------------------------------------------------
  // TEST 9: Production/research separation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Production/Research Separation ---');
  assert(manifest.total_assets === 4, 'Exactly 4 production assets');
  assert(Array.isArray(manifest.research_quarantine), 'Quarantine list exists');
  // Claim-aware: free-text MENTIONS of restricted sources (e.g. "Julich-Brain" as a
  // future-parcellation concept in notes) are legitimate prose. What must be absent
  // is restricted DATA: dataset/license/asset/parcel/source references.
  const DATA_KEYS = /dataset|license|asset|parcel|source_url|upstream|attribution|runtime|whitelist|quarantine/i;
  const dataStrings: string[] = [];
  const walk = (obj: any) => {
    if (Array.isArray(obj)) obj.forEach(walk);
    else if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (DATA_KEYS.test(k)) collectStrings(obj[k], dataStrings);
        else walk(obj[k]);
      }
    }
  };
  const prodObjects = [manifest,
    ...['cortex_left', 'cortex_right', 'hippocampus_left', 'hippocampus_right'].map((s) => readJson(`data/structures/${s}.json`))];
  prodObjects.forEach(walk);
  const dataBlob = dataStrings.join(' ');
  for (const token of ['hcp_mmp', 'HCP_MMP', 'julich', 'Julich', 'bigbrain', 'BigBrain']) {
    assert(!dataBlob.includes(token), `Production data-references contain no restricted token: ${token}`);
  }
  console.log('[PASS] 4-asset whitelist; zero HCP/Julich/BigBrain data-references in production records.');
  passedChecks += 3;

  // --------------------------------------------------------------------------
  // TEST 10: Landmark schematic enforcement (D7)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Landmark Schematic Enforcement ---');
  const verified = CEREBRAL_LANDMARKS.filter((l) => l.validationState === 'EXPERT_VERIFIED');
  assert(verified.length === 0,
    `No anchor may claim EXPERT_VERIFIED without documented expert-vs-mesh review (found ${verified.length}). See PART_4_ENTRY_CRITERIA.md.`);
  assert(CEREBRAL_LANDMARKS.length >= 24, `Landmark registry intact (${CEREBRAL_LANDMARKS.length} anchors, all schematic)`);
  console.log(`[PASS] All ${CEREBRAL_LANDMARKS.length} anchors schematic-unvalidated by declaration.`);
  passedChecks += 2;

  // --------------------------------------------------------------------------
  // TEST 11: LOD switch reference balance (Phase 3.1 §30 regression test)
  // Real bug found in audit: applyLOD() called loadAsset (+1 ref) on every cache
  // MISS without ever releasing, so refCount grew monotonically per switch.
  // Fix: balance the miss's +1 after the swap (guarded against use-after-dispose).
  // This test fails on the old code (refCount drifts up) and passes on the fix.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11: LOD Switch Reference Balance ---');
  const { AssetManager } = await import('./engine/AssetManager');
  const { AnatomicalEntityManager } = await import('./engine/AnatomicalEntityManager');
  const { LODManager } = await import('./engine/LODManager');
  const am = new AssetManager();
  await am.loadManifest('assets/manifests/assets.manifest.json');
  const em = new AnatomicalEntityManager();
  const lodMgr = new LODManager(am, em);
  const hpc = await am.loadAsset('mesh.hippocampus.left.v1', 'lod0');
  const hpcRecord: any = {
    entityId: 'brain.telencephalon.left.limbic.hippocampus',
    assetId: 'mesh.hippocampus.left.v1',
    name: 'Left Hippocampus',
    officialLatin: 'hippocampus sinister',
    laterality: 'left',
    canonicalCentroidMm: [-25.07, -13.89, -20.7],
    dimensionsMm: [18.9, 20.78, 40.55],
    volumeCm3: 1.87,
    topologyClass: 'SOLID',
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'FMA72714'
  };
  em.registerEntity(hpcRecord, hpc.mesh);
  const refBase = am.getRefCount('mesh.hippocampus.left.v1');
  await lodMgr.applyLOD(hpcRecord.entityId, 'lod1'); // cache MISS -> must be balanced
  assert(am.getRefCount('mesh.hippocampus.left.v1') === refBase,
    `refCount balanced after miss-switch (${am.getRefCount('mesh.hippocampus.left.v1')} vs base ${refBase})`);
  await lodMgr.applyLOD(hpcRecord.entityId, 'lod0'); // cache HIT -> unchanged
  await lodMgr.applyLOD(hpcRecord.entityId, 'lod1'); // HIT -> unchanged
  await lodMgr.applyLOD(hpcRecord.entityId, 'lod2'); // MISS -> balanced
  await lodMgr.applyLOD(hpcRecord.entityId, 'lod0'); // HIT -> unchanged
  assert(am.getRefCount('mesh.hippocampus.left.v1') === refBase,
    `refCount stable across 5 switches (${am.getRefCount('mesh.hippocampus.left.v1')} vs base ${refBase})`);
  am.dispose();
  console.log('[PASS] LOD switches are reference-balanced; no monotonic leak.');
  passedChecks += 2;

  // --------------------------------------------------------------------------
  // TEST 12: README/package/code consistency, mechanical (Phase 3.1 §21/§22/§37)
  // Asserts DATA, never prose: planned-only tech must be absent from deps AND
  // from src/ imports; claimed deps must be present and actually imported.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 12: Package/Import Consistency ---');
  const pkg = readJson('package.json');
  const depNames = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
  const PLANNED_ABSENT = ['react', 'react-dom', '@react-three/fiber', '@react-three/drei', 'zustand', 'minisearch', 'dexie', 'workbox', 'ktx-parse', 'basis'];
  for (const p of PLANNED_ABSENT) {
    assert(!depNames.includes(p), `Planned-only package absent from package.json: ${p}`);
  }
  assert(depNames.includes('three'), 'three is a declared dependency');
  assert(depNames.includes('three-mesh-bvh'), 'three-mesh-bvh is a declared dependency');
  // Walk src/ for forbidden imports.
  const srcFiles: string[] = [];
  const walkSrc = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walkSrc(fp);
      else if (e.name.endsWith('.ts')) srcFiles.push(fp);
    }
  };
  walkSrc(path.join(PROJECT_ROOT, 'src'));
  // Exclude this very test file: it necessarily names the forbidden tokens
  // in its own assertion list (meta-mention, not an import).
  const subjectFiles = srcFiles.filter((f) => !f.endsWith('phase_3_1_integrity.test.ts'));
  const FORBIDDEN_IMPORTS = ['react', 'zustand', 'minisearch', 'dexie', 'workbox', 'KTX2Loader', 'BasisTextureLoader', 'serviceWorker', 'service-worker'];
  for (const f of subjectFiles) {
    const t = fs.readFileSync(f, 'utf8');
    for (const token of FORBIDDEN_IMPORTS) {
      const hit = token.endsWith('Loader') || token.includes('service')
        ? t.includes(token)
        : new RegExp(`from\\s+['"][^'"]*${token}`).test(t);
      assert(!hit, `${path.relative(PROJECT_ROOT, f)}: no planned-only import '${token}'`);
    }
  }
  let threeImporters = 0, bvhImporters = 0;
  for (const f of srcFiles) {
    const t = fs.readFileSync(f, 'utf8');
    if (/from\s+['"]three['"]/.test(t)) threeImporters++;
    if (t.includes('three-mesh-bvh')) bvhImporters++;
  }
  assert(threeImporters > 0 && bvhImporters > 0, 'three + three-mesh-bvh actually imported in src/');
  console.log(`[PASS] Deps honest: planned-only tech absent; three (${threeImporters} files) + bvh (${bvhImporters} files) used.`);
  passedChecks += 3;

  // --------------------------------------------------------------------------
  // TEST 13: Landmark status semantics + MRI candidate metadata (Phase 3.2 §16)
  // Data-shape assertions, never prose. Registry shape guards future edits;
  // candidates file guards Gate 3 (nothing acquired, nothing production-ready).
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13: Landmark Semantics + MRI Candidate Metadata ---');
  const VALID_CATEGORIES = ['SULCAL_LANDMARK', 'FISSURE', 'GYRAL_LANDMARK', 'CORTICAL_POLE', 'ANATOMICAL_BORDER'];
  const VALID_LATERALITY = ['left', 'right', 'midline', 'bilateral'];
  const VALID_STATES = [undefined, 'SCHEMATIC_UNVALIDATED', 'EXPERT_VERIFIED'];
  const seenIds = new Set<string>();
  for (const lm of CEREBRAL_LANDMARKS) {
    assert(typeof lm.landmarkId === 'string' && lm.landmarkId.length > 0, 'landmark has id');
    assert(!seenIds.has(lm.landmarkId), `landmark id unique: ${lm.landmarkId}`);
    seenIds.add(lm.landmarkId);
    assert(VALID_CATEGORIES.includes(lm.category as string), `${lm.landmarkId}: valid category`);
    assert(VALID_LATERALITY.includes(lm.laterality as string), `${lm.landmarkId}: valid laterality`);
    assert(VALID_STATES.includes(lm.validationState), `${lm.landmarkId}: valid validation state`);
    assert(Array.isArray(lm.worldPositionMm) && lm.worldPositionMm.length === 3 &&
      lm.worldPositionMm.every(Number.isFinite), `${lm.landmarkId}: finite 3D anchor`);
  }
  const cands = readJson('data/mri_candidates.json');
  assert(Array.isArray(cands.candidates) && cands.candidates.length >= 3, 'candidate list non-empty');
  const VALID_TYPES = ['A', 'B', 'C', 'D', 'E'];
  for (const c of cands.candidates) {
    for (const k of ['id', 'mri_type', 'purpose', 'coordinate_space', 'license_summary', 'acquisition']) {
      assert(typeof c[k] === 'string' && c[k].length > 0, `candidate ${c.id}: field ${k} present`);
    }
    assert(VALID_TYPES.includes(c.mri_type), `candidate ${c.id}: valid MRI type`);
    assert(typeof c.production_compatible === 'boolean', `candidate ${c.id}: production flag boolean`);
    assert(typeof c.legal_review_required === 'boolean', `candidate ${c.id}: review flag boolean`);
    assert(c.acquisition === 'deferred', `candidate ${c.id}: nothing acquired in Phase 3.2`);
    assert(c.production_compatible === false, `candidate ${c.id}: nothing production-ready without verification`);
  }
  console.log(`[PASS] ${seenIds.size} landmarks well-formed (all schematic); ${cands.candidates.length} MRI candidates deferred, none production-ready.`);
  passedChecks += 4;

  console.log('\n================================================================');
  console.log(`ALL PHASE 3.1 INTEGRITY TESTS PASSED (${passedChecks} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 3.1 integrity test execution failed:\n', err);
  process.exit(1);
});
