/**
 * 3D Neuroanatomy Atlas: Phase 7 Cortical Parcellation Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Phase 7 outcome is DOCUMENTED DEFERRAL (docs/PHASE_7_ANATOMICAL_SCOPE.md):
 * data model + separation enforcement + deferral record. NO geometry.
 *
 * Covers the deferral against REAL repo state: registry populated with honest
 * statuses (HCP LEGAL_REVIEW_REQUIRED unversioned, Brodmann SOURCE_UNVERIFIED);
 * zero parcel geometry anywhere in assets/ or data/; mapping gate closed
 * (isMappingAllowed() === false, render guard throws); HCP gate intact (no
 * HCP bytes, no terms acceptance claimed); physical-cortex vs parcel type
 * separation (non-interchangeable both directions, compile- and run-time);
 * deferral record complete with per-atlas unblock conditions; no new
 * structures shipped (manifest/structure counts untouched).
 *
 * Hard stops enforced: unverified-parcel-source, hcp-gate-breach,
 * unregistered-parcel-mapping, license-uncertain-ingestion.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  VERIFIED_PARCEL_MAPPINGS,
  isMappingAllowed,
  assertMappingAllowed,
  guardParcelRender,
  ParcelMappingBlockedError,
} from './parcellation/mappingGate';
import {
  ParcelRecord,
  MappingState,
  isParcelRecord,
  isAnatomicalStructureRecord,
} from './types/parcellation';

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

function readText(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
}

/** Recursively list all files under a repo-relative directory. */
function walkFiles(relDir: string): string[] {
  const out: string[] = [];
  const abs = path.join(PROJECT_ROOT, relDir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(relDir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(rel));
    else out.push(rel);
  }
  return out;
}

/** Compile-time separation probes: narrow discriminants, never widened. */
function acceptAnatomicalOnly(entity: { entity_type: 'anatomical_structure' }): string {
  return entity.entity_type;
}
function acceptParcelDiscriminantOnly(parcel: { entity_type: 'cortical_parcel' }): string {
  return parcel.entity_type;
}
function acceptParcelOnly(parcel: ParcelRecord): string {
  return parcel.id;
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 7 PARCELLATION (DOCUMENTED DEFERRAL) SUITE');
  console.log('================================================================\n');
  let passed = 0;

  const registry = readJson('data/parcellation/atlas_registry.json');
  const deferral = readJson('data/parcellation/deferral_record.json');

  // ---------------------------------------------------------------- TEST 1
  console.log('--- TEST 1: Registry populated with honest statuses ---');
  assert(Array.isArray(registry.atlases) && registry.atlases.length === 2, 'registry holds exactly the two in-scope atlases');
  passed++;
  const hcp = registry.atlases.find((a: any) => a.atlas === 'HCP_MMP1');
  const ba = registry.atlases.find((a: any) => a.atlas === 'Brodmann');
  assert(hcp !== undefined && ba !== undefined, 'HCP_MMP1 + Brodmann entries present');
  passed++;

  // HCP: bibliographic identity only (Glasser 2016, 180/hemisphere), no version.
  assert(hcp.bibliographic_identity?.citation === 'Glasser et al., Nature 2016', 'HCP bibliographic citation is Glasser 2016');
  passed++;
  assert(hcp.bibliographic_identity?.areas_per_hemisphere === 180, 'HCP bibliographic parcel count is 180/hemisphere (identity, not geometry)');
  passed++;
  assert(hcp.dataset_acquired === false, 'HCP dataset not acquired');
  passed++;
  assert(hcp.atlas_version === null, 'HCP version unpinned (no dataset acquired)');
  passed++;
  assert(hcp.status === 'LEGAL_REVIEW_REQUIRED', 'HCP status is LEGAL_REVIEW_REQUIRED');
  passed++;
  assert(hcp.mapping_state === 'MAPPING_PENDING', 'HCP mapping state is MAPPING_PENDING');
  passed++;
  assert(hcp.terms_accepted === false && hcp.terms_acceptance_record === null, 'no HCP terms acceptance claimed or recorded');
  passed++;

  // Brodmann: classical BA 1-52, no verified source release.
  assert(/BA 1.?52|BA 1-52/.test(ba.bibliographic_identity?.areas ?? ''), 'Brodmann identity is classical BA 1-52');
  passed++;
  assert(ba.dataset_acquired === false && ba.atlas_version === null, 'Brodmann version unpinned (no verified source release)');
  passed++;
  assert(ba.status === 'SOURCE_UNVERIFIED', 'Brodmann status is SOURCE_UNVERIFIED');
  passed++;
  assert(ba.mapping_state === 'MAPPING_PENDING', 'Brodmann mapping state is MAPPING_PENDING');
  passed++;

  for (const entry of registry.atlases) {
    assert(entry.geometry_bytes_in_repo === 'NONE', `${entry.atlas}: geometry_bytes_in_repo is NONE`);
    passed++;
    assert(Array.isArray(entry.unblock_conditions) && entry.unblock_conditions.length > 0, `${entry.atlas}: exact unblock conditions recorded`);
    passed++;
    for (const cond of entry.unblock_conditions) {
      assert(typeof cond === 'string' && cond.trim() !== '', `${entry.atlas}: unblock condition is non-empty text`);
      passed++;
    }
  }
  console.log('[PASS] Registry honest: HCP LEGAL_REVIEW_REQUIRED unversioned; Brodmann SOURCE_UNVERIFIED; both MAPPING_PENDING.');
  passed++;

  // ---------------------------------------------------------------- TEST 2
  console.log('\n--- TEST 2: Zero parcel geometry anywhere in repo ---');
  const parcellationFiles = walkFiles('data/parcellation').map((f) => path.basename(f)).sort();
  assert(JSON.stringify(parcellationFiles) === JSON.stringify(['atlas_registry.json', 'deferral_record.json']), `data/parcellation holds only registry + deferral record, got [${parcellationFiles}]`);
  passed++;

  // No parcel-mesh filenames (HCP/Brodmann/parcel/fs_LR/dlabel/GIfTI) under assets/ or data/.
  // NOTE: the directory name `parcellation/` itself contains "parcel", so the
  // pattern applies to basenames only, and the two Phase 7 record files
  // (bibliographic identity + deferral, scan-asserted payload-free below)
  // are allowlisted by exact path.
  const PARCEL_FILENAME_RE = /parcel|hcp|mmp|brodmann|fs_?lr|32k|dlabel|\.gii|\.dscalar|\.label\.gii/i;
  const RECORD_ALLOWLIST = new Set([
    'data/parcellation/atlas_registry.json',
    'data/parcellation/deferral_record.json',
  ]);
  const scanned = [...walkFiles('assets'), ...walkFiles('data')];
  assert(scanned.length > 0, 'geometry scan actually walked assets/ + data/');
  passed++;
  for (const f of scanned) {
    const normalized = f.split(path.sep).join('/');
    if (RECORD_ALLOWLIST.has(normalized)) continue;
    assert(!PARCEL_FILENAME_RE.test(path.basename(f)), `no parcel mesh bytes by filename: ${f}`);
    passed++;
  }

  // No per-vertex parcel payload keys inside any data/ or assets/ JSON.
  // NOTE: scalar QA counts such as `"triangles": 1736` are legitimate
  // pre-existing LOD metadata, not geometry — only parcel-specific mesh
  // markers (32k vertex-index arrays, parcel shader attributes, HCP
  // dlabel/fs_LR/GIfTI references) count as parcel geometry.
  const GEOMETRY_KEY_RE = /vertex_indices_32k|a_ParcelId|dlabel|fs_LR|\.gii|parcel_mesh|parcel_vertices/i;
  for (const f of scanned.filter((x) => x.endsWith('.json'))) {
    const text = fs.readFileSync(path.join(PROJECT_ROOT, f), 'utf8');
    assert(!GEOMETRY_KEY_RE.test(text), `no parcel geometry payload in ${f}`);
    passed++;
  }
  // Nothing ships as mapped: the verified state string appears nowhere in data/parcellation.
  for (const f of ['data/parcellation/atlas_registry.json', 'data/parcellation/deferral_record.json']) {
    assert(!readText(f).includes('MAPPED_VERIFIED'), `${f}: no MAPPED_VERIFIED claim`);
    passed++;
  }
  console.log(`[PASS] Zero parcel geometry: ${scanned.length} files under assets/ + data/ scanned, none parcel-related.`);
  passed++;

  // ---------------------------------------------------------------- TEST 3
  console.log('\n--- TEST 3: Mapping gate closed ---');
  assert(VERIFIED_PARCEL_MAPPINGS.length === 0, 'zero verified mapping records registered');
  passed++;
  assert(isMappingAllowed() === false, 'isMappingAllowed() === false');
  passed++;
  let threw = false;
  try {
    assertMappingAllowed('HCP_MMP1');
  } catch (err) {
    threw = err instanceof ParcelMappingBlockedError;
  }
  assert(threw, 'assertMappingAllowed(HCP_MMP1) throws ParcelMappingBlockedError');
  passed++;
  threw = false;
  try {
    assertMappingAllowed('Brodmann');
  } catch (err) {
    threw = err instanceof ParcelMappingBlockedError;
  }
  assert(threw, 'assertMappingAllowed(Brodmann) throws ParcelMappingBlockedError');
  passed++;
  threw = false;
  try {
    guardParcelRender('HCP_MMP1');
  } catch (err) {
    threw = err instanceof ParcelMappingBlockedError;
  }
  assert(threw, 'guardParcelRender(HCP_MMP1) throws (future render paths blocked)');
  passed++;
  console.log('[PASS] Mapping gate closed: no verified records, gate false, guards throw.');
  passed++;

  // ---------------------------------------------------------------- TEST 4
  console.log('\n--- TEST 4: HCP gate intact ---');
  assert(hcp.governing_terms === 'HCP Open Access Data Use Terms', 'HCP governing terms named, not accepted');
  passed++;
  assert(deferral.phase === '7' && deferral.mapping_gate === 'CLOSED', 'deferral records the gate CLOSED for Phase 7');
  passed++;
  assert(deferral.verified_mapping_records === 0, 'deferral records zero verified mappings');
  passed++;
  const stops: string[] = deferral.hard_stops_observed ?? [];
  for (const stop of ['No parcel geometry ingested', 'No parcel mapping claimed', 'No HCP terms accepted or circumvented', 'No Brodmann source invented']) {
    assert(stops.includes(stop), `hard stop observed and recorded: "${stop}"`);
    passed++;
  }
  console.log('[PASS] HCP gate intact: terms named but unaccepted, gate CLOSED, hard stops recorded.');
  passed++;

  // ---------------------------------------------------------------- TEST 5
  console.log('\n--- TEST 5: Physical-cortex vs parcel type separation ---');
  const pendingParcel: ParcelRecord = {
    entity_type: 'cortical_parcel',
    id: 'parcel.hcp_mmp1.UNMAPPED',
    atlas: 'HCP_MMP1',
    atlas_version: null,
    license_posture: 'LEGAL_REVIEW_REQUIRED',
    mapping_state: 'MAPPING_PENDING',
    geometry_bytes: 'NONE',
  };
  const mappingStates: MappingState[] = ['MAPPING_PENDING', 'MAPPED_VERIFIED'];
  assert(mappingStates.length === 2 && pendingParcel.mapping_state === 'MAPPING_PENDING', 'MappingState union is exactly the two allowed states; record ships pending');
  passed++;

  // Runtime: guards discriminate both directions.
  assert(isParcelRecord(pendingParcel) === true, 'parcel record recognized as parcel');
  passed++;
  const anatomicalLike = { entity_type: 'anatomical_structure' };
  assert(isParcelRecord(anatomicalLike) === false, 'anatomical entity rejected as parcel');
  passed++;
  assert(isAnatomicalStructureRecord(anatomicalLike) === true, 'anatomical entity recognized as anatomical');
  passed++;
  assert(isAnatomicalStructureRecord(pendingParcel) === false, 'parcel rejected as anatomical entity');
  passed++;

  // Compile-time: non-interchangeable both directions (type errors asserted).
  const echoAnatomical = acceptAnatomicalOnly({ entity_type: 'anatomical_structure' as const });
  assert(echoAnatomical === 'anatomical_structure', 'anatomical discriminant passes the anatomical-only probe');
  passed++;
  const echoParcel = acceptParcelDiscriminantOnly(pendingParcel);
  assert(echoParcel === 'cortical_parcel', 'parcel passes the parcel-only probe');
  passed++;
  const echoParcelId = acceptParcelOnly(pendingParcel);
  assert(echoParcelId === pendingParcel.id, 'parcel passes the ParcelRecord probe');
  passed++;
  // @ts-expect-error — a parcel must NOT pass where an anatomical entity is expected.
  acceptAnatomicalOnly(pendingParcel);
  // @ts-expect-error — an anatomical entity must NOT pass where a parcel is expected.
  acceptParcelDiscriminantOnly(anatomicalLike);
  console.log('[PASS] Type separation holds: distinct discriminants, rejected both ways at compile- and run-time.');
  passed++;

  // ---------------------------------------------------------------- TEST 6
  console.log('\n--- TEST 6: Deferral record complete with unblock conditions ---');
  assert(deferral.outcome === 'DOCUMENTED_DEFERRAL', 'deferral outcome is DOCUMENTED_DEFERRAL');
  passed++;
  assert(deferral.scope_reference === 'docs/PHASE_7_ANATOMICAL_SCOPE.md', 'deferral references the authorizing scope doc');
  passed++;
  assert(Array.isArray(deferral.deferrals) && deferral.deferrals.length === 2, 'deferral covers both atlases');
  passed++;
  const hcpDef = deferral.deferrals.find((d: any) => d.atlas === 'HCP_MMP1');
  const baDef = deferral.deferrals.find((d: any) => d.atlas === 'Brodmann');
  assert(hcpDef?.rendering_state === 'MAPPING_PENDING' && baDef?.rendering_state === 'MAPPING_PENDING', 'per-atlas rendering is MAPPING_PENDING');
  passed++;
  const hcpUnblocks: string = hcpDef.unblocks.join(' | ');
  assert(/legal review/i.test(hcpUnblocks) && /exact.*version/i.test(hcpUnblocks) && /terms acceptance record/i.test(hcpUnblocks), 'HCP unblocks: legal review + exact version + terms acceptance record');
  passed++;
  const baUnblocks: string = baDef.unblocks.join(' ');
  assert(/verified source/i.test(baUnblocks) && /license/i.test(baUnblocks), 'Brodmann unblocks: verified source/license triple');
  passed++;
  const shared: string = (deferral.shared_unblock_conditions ?? []).join(' ');
  assert(/registration method/i.test(shared) && /QA/i.test(shared), 'shared unblocks: validated registration method + QA');
  passed++;
  // Registry <-> deferral consistency: same atlases, same pending states.
  for (const entry of registry.atlases) {
    const match = deferral.deferrals.find((d: any) => d.atlas === entry.atlas);
    assert(match !== undefined && match.rendering_state === entry.mapping_state, `registry/deferral agree on ${entry.atlas} (${entry.mapping_state})`);
    passed++;
  }
  console.log('[PASS] Deferral complete: per-atlas reasons + unblocks, shared registration/QA condition, registry-consistent.');
  passed++;

  // ---------------------------------------------------------------- TEST 7
  console.log('\n--- TEST 7: No new structures (counts untouched) ---');
  const structureFiles = fs.readdirSync(path.join(PROJECT_ROOT, 'data/structures')).filter((f) => f.endsWith('.json'));
  assert(structureFiles.length === 63, `63 structure records untouched, got ${structureFiles.length}`);
  passed++;
  const manifest = readJson('assets/manifests/assets.manifest.json');
  assert(Object.keys(manifest.assets).length === 63, `manifest still holds 63 assets, got ${Object.keys(manifest.assets).length}`);
  passed++;
  console.log('[PASS] No new structures: 63 structure records, 63 manifest assets.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 7 PARCELLATION TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 7 parcellation test execution failed:\n', err);
  process.exit(1);
});
