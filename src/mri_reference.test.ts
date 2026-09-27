/**
 * 3D Neuroanatomy Atlas: Phase 4C MRI Reference Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Synthetic mathematical volumes ONLY for unit tests (§41) — never presented
 * as human/clinical/reference MRI. Real-file values below (Colin27 dims,
 * sform rows) are documented measurement vectors from the 2026-09-27 header
 * inspection, used as parse expectations — not as bundled data.
 */

import * as THREE from 'three';
import { parseNiftiHeader } from './engine/niftiHeader';
import {
  mat4Identity,
  mat4Multiply,
  mat4Inverse,
  mat4ApplyPoint,
  mat4Determinant,
  mat4Handedness,
  mat4Translation,
  isValidMatrix,
  canonicalPlaneToVoxel,
  roundTripErrorMm,
  canDisplayVolume,
  canOverlayWithMesh,
  canEnterProduction,
  computeMriMemoryBudget,
  applyWindowLevel,
  defaultMriDisplayState,
  deserializeMriDisplay,
  createColin27_1998Record,
  MriVolumeRecord
} from './engine/mriVolume';
import {
  sampleTrilinear,
  resamplePlaneSlice,
  axisSliceIndex,
  extractAxisSlice,
  VoxelAccessor
} from './engine/mriSlice';
import { MriManager } from './engine/MriManager';
import { SectionPlaneSet } from './engine/SectionPlaneSet';
import {
  createBookmark,
  serializeBookmark,
  deserializeBookmark
} from './engine/sectionBookmarks';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

/** Build a synthetic little-endian NIfTI-1 single-file header. */
function syntheticHeader(opts: {
  dims?: [number, number, number];
  datatype?: number;
  spacing?: [number, number, number];
  qform?: number;
  sform?: number;
  srow?: number[][];
  magic?: string;
}): Uint8Array {
  const bytes = new Uint8Array(348);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, 348, true);
  const dims = opts.dims ?? [4, 4, 4];
  view.setInt16(40, 3, true);
  view.setInt16(42, dims[0], true);
  view.setInt16(44, dims[1], true);
  view.setInt16(46, dims[2], true);
  view.setInt16(70, opts.datatype ?? 16, true);
  const spacing = opts.spacing ?? [1, 1, 1];
  view.setFloat32(76, 1, true); // pixdim[0] (qfac sign)
  view.setFloat32(80, spacing[0], true);
  view.setFloat32(84, spacing[1], true);
  view.setFloat32(88, spacing[2], true);
  view.setFloat32(108, 352, true); // vox_offset
  view.setInt16(252, opts.qform ?? 0, true);
  view.setInt16(254, opts.sform ?? 1, true);
  const srow = opts.srow ?? [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) view.setFloat32(280 + i * 16 + j * 4, srow[i][j], true);
  }
  const magic = opts.magic ?? 'n+1';
  for (let i = 0; i < 4; i++) bytes[344 + i] = magic.charCodeAt(i) || 0;
  return bytes;
}

/** Synthetic test volume: value = i + 10*j + 100*k (positional encoding). */
function syntheticVolume(nx: number, ny: number, nz: number): VoxelAccessor {
  return {
    dims: [nx, ny, nz],
    get: (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? null : i + 10 * j + 100 * k)
  };
}

/** Synthetic NIfTI volume BYTES for ingest tests (int16 payload). */
function syntheticNiftiBytes(nx: number, ny: number, nz: number): Uint8Array {
  const header = syntheticHeader({ dims: [nx, ny, nz], datatype: 4, spacing: [1, 1, 1] });
  const count = nx * ny * nz;
  const out = new Uint8Array(352 + count * 2);
  out.set(header, 0);
  const view = new DataView(out.buffer);
  for (let n = 0; n < count; n++) view.setInt16(352 + n * 2, n % 32767, true);
  return out;
}

function registeredCopy(base: MriVolumeRecord, matrix: number[]): MriVolumeRecord {
  // 4C.1 gate: SPLIT/OVERLAY visibility requires REGISTRATION_VALIDATED plus
  // a valid matrix — a merely-COMPUTED record must stay hidden (asserted in
  // TEST 4 of the 4D suite). This synthetic record therefore carries both.
  return {
    ...base,
    volumeId: 'volume.mri.synthetic.v1',
    registration: {
      status: 'COMPUTATIONALLY_REGISTERED',
      inputSpace: 'mri_world',
      outputSpace: 'canonical',
      transformType: 'rigid_6dof',
      matrix: [...matrix],
      matrixConvention: 'row-major-4x4-input-to-output',
      software: 'synthetic-test-harness (NOT a real registration)',
      toolVersion: 'test-0',
      treMm: null,
      uncertaintyMm: null,
      validationMethod: 'synthetic round-trip (test only)',
      expertReview: 'EXPERT_REVIEW_PENDING'
    },
    validationStates: [...base.validationStates, 'REGISTERED_TO_CANONICAL', 'REGISTRATION_VALIDATED'],
    geometry: base.geometry ? {
      ...base.geometry,
      dims: [8, 8, 8] as [number, number, number],
      datatype: 'int16',
      bytesPerVoxel: 2,
      voxelToWorld: [...mat4Identity()]
    } : null
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 4C MRI REFERENCE TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  // TEST 1: NIfTI metadata parsing (§40) + real-file vectors.
  console.log('--- TEST 1: NIfTI header parsing ---');
  const valid = parseNiftiHeader(syntheticHeader({}));
  assert(valid !== null && valid.dims.join(',') === '4,4,4', 'valid header parses');
  passed++;
  assert(valid!.transformSource === 'sform', 'sform authoritative when present');
  passed++;
  // Real Colin27 vectors (measured 2026-09-27): dims + sform rows.
  const colinHeader = syntheticHeader({
    dims: [181, 217, 181],
    datatype: 16,
    spacing: [1, 1, 1],
    qform: 0,
    sform: 1,
    srow: [[1, 0, 0, -90], [0, 1, 0, -126], [0, 0, 1, -72]]
  });
  const colinParsed = parseNiftiHeader(colinHeader);
  assert(colinParsed !== null, 'Colin27-geometry header parses');
  passed++;
  assert(colinParsed!.voxelToWorld[3] === -90 && colinParsed!.voxelToWorld[7] === -126 && colinParsed!.voxelToWorld[11] === -72, 'measured sform offsets preserved exactly');
  passed++;
  assert(colinParsed!.qformCode === 0 && colinParsed!.transformSource === 'sform', 'qform-absent → sform decision documented');
  passed++;
  // Rejections (§38): bad magic, ndim, dims, datatype, spacing, no transform.
  assert(parseNiftiHeader(syntheticHeader({ magic: 'ni1\0' })) === null, '.hdr/.img magic rejected');
  passed++;
  assert(parseNiftiHeader(syntheticHeader({ datatype: 32 })) === null, 'unsupported datatype rejected');
  passed++;
  assert(parseNiftiHeader(syntheticHeader({ spacing: [0, 1, 1] })) === null, 'zero spacing rejected');
  passed++;
  assert(parseNiftiHeader(syntheticHeader({ spacing: [1, 1, Infinity] })) === null, 'non-finite spacing rejected');
  passed++;
  assert(parseNiftiHeader(syntheticHeader({ qform: 0, sform: 0 })) === null, 'absent qform+sform rejected (never assumed)');
  passed++;
  assert(parseNiftiHeader(new Uint8Array(100)) === null, 'truncated header rejected');
  passed++;
  console.log('[PASS] Header parsing + real-file vectors + invalid rejection.');
  passed++;

  // TEST 2: matrix math (§17): determinant, handedness, units/translation, inverse.
  console.log('\n--- TEST 2: Matrix validation ---');
  const ident = mat4Identity();
  assert(mat4Determinant(ident) === 1, 'identity determinant is 1');
  passed++;
  assert(mat4Handedness(ident) === 1, 'identity is right-handed');
  passed++;
  const mirror = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];
  assert(mat4Handedness(mirror) === -1, 'mirrored matrix detected (handedness flip)');
  passed++;
  assert(JSON.stringify(mat4Translation([1, 0, 0, -90, 0, 1, 0, -126, 0, 0, 1, -72, 0, 0, 0, 1])) === JSON.stringify([-90, -126, -72]), 'translation column explicit (mm offsets)');
  passed++;
  assert(mat4Inverse(new Array(16).fill(0)) === null, 'singular matrix rejected');
  passed++;
  assert(mat4Inverse([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 2] as unknown as number[]) === null, 'non-16-length rejected');
  passed++;
  const nanMat = [...ident];
  nanMat[3] = NaN;
  assert(isValidMatrix(nanMat) === false && mat4Inverse(nanMat) === null, 'NaN rejected');
  passed++;
  const infMat = [...ident];
  infMat[0] = Infinity;
  assert(mat4Inverse(infMat) === null, 'Infinity rejected');
  passed++;
  const t: number[] = [1, 0, 0, 5, 0, 1, 0, -3, 0, 0, 1, 2, 0, 0, 0, 1];
  const p = mat4ApplyPoint(t, [1, 1, 1]);
  assert(p !== null && p[0] === 6 && p[1] === -2 && p[2] === 3, 'translation applies to points');
  passed++;
  assert(mat4Multiply(t, mat4Inverse(t)!) !== null, 'inverse composes');
  passed++;
  console.log('[PASS] Determinant, handedness, translation, inverse rejection.');
  passed++;

  // TEST 3: round-trip (§16) with measured error.
  console.log('\n--- TEST 3: Transform round-trip ---');
  const angle = Math.PI / 6;
  const rigid: number[] = [
    Math.cos(angle), -Math.sin(angle), 0, 10,
    Math.sin(angle), Math.cos(angle), 0, -4,
    0, 0, 1, 7,
    0, 0, 0, 1
  ];
  const err = roundTripErrorMm(rigid, [[0, 0, 0], [181, 217, 181], [-90, -126, -72], [45.5, 3.25, -11]]);
  assert(err !== null && err < 1e-9, `round-trip error measured tiny (got ${err})`);
  passed++;
  assert(roundTripErrorMm(new Array(16).fill(0), [[0, 0, 0]]) === null, 'singular round-trip → NULL, not a value');
  passed++;
  console.log('[PASS] Round-trip error measured (no clinical threshold claimed).');
  passed++;

  // TEST 4: canonical-plane conversion (§20) + gating (§39).
  console.log('\n--- TEST 4: Canonical plane → voxel + registration gating ---');
  const colin = createColin27_1998Record();
  assert(colin.registration.status === 'REGISTRATION_PENDING', 'Colin27 record ships PENDING (nothing computed)');
  passed++;
  assert(colin.registration.treMm === null && colin.registration.uncertaintyMm === null, 'no invented metrics (NULL)');
  passed++;
  assert(canonicalPlaneToVoxel(colin, [1, 0, 0], [0, 0, 0]) === null, 'unregistered record converts to NULL → overlay disabled');
  passed++;
  const reg = registeredCopy(colin, mat4Identity());
  const mapped = canonicalPlaneToVoxel(reg, [1, 0, 0], [2, 0, 0]);
  assert(mapped !== null, 'registered identity maps the plane');
  passed++;
  assert(Math.abs(mapped!.voxelNormal[0] - 1) < 1e-9 && Math.abs(mapped!.voxelPoint[0] - 2) < 1e-9, 'identity preserves coordinates');
  passed++;
  // Canonical plane NEVER modified: output is a new voxel-space plane.
  const before: [number, number, number] = [2, 0, 0];
  canonicalPlaneToVoxel(reg, [1, 0, 0], before);
  assert(before[0] === 2, 'input plane point unmutated');
  passed++;
  console.log('[PASS] Conversion requires registration; canonical plane never modified.');
  passed++;

  // TEST 5: gating matrix (§5, §19, §38, §39).
  console.log('\n--- TEST 5: Failure-safe gating ---');
  assert(canDisplayVolume(colin).ok === true, 'Colin27 displayable (geometry + world transform validated)');
  passed++;
  assert(canOverlayWithMesh(colin).ok === false, 'PENDING registration blocks overlay');
  passed++;
  assert(/NO MRI\/MESH OVERLAY/.test(canOverlayWithMesh(colin).reason), 'overlay refusal uses the mandated language');
  passed++;
  assert(canEnterProduction(colin).ok === true, 'verified attribution-only license permits production reference use');
  passed++;
  const quarantined: MriVolumeRecord = { ...colin, quarantined: true };
  assert(canDisplayVolume(quarantined).ok === false && canEnterProduction(quarantined).ok === false, 'quarantine bars display + production');
  passed++;
  const legalPending: MriVolumeRecord = { ...colin, license: { status: 'LEGAL_REVIEW_REQUIRED', summary: 'unverified', attributionRequired: true, productionAllowed: false } };
  assert(canOverlayWithMesh(legalPending).ok === false && canEnterProduction(legalPending).ok === false, 'uncertain license blocks overlay + production');
  passed++;
  const noGeom: MriVolumeRecord = { ...colin, geometry: null };
  assert(canDisplayVolume(noGeom).ok === false, 'missing volume → NO MRI VIEW');
  passed++;
  console.log('[PASS] NO TRANSFORM→NO OVERLAY; NO LICENSE→NO PRODUCTION; NO VOLUME→NO VIEW.');
  passed++;

  // TEST 6: slice mapping — sagittal/coronal/axial (§21) on synthetics.
  console.log('\n--- TEST 6: Axis slice mapping ---');
  const vol = syntheticVolume(8, 6, 5);
  const sag = axisSliceIndex('sagittal', [1, 0, 0], [3, 0, 0], [8, 6, 5]);
  assert(sag !== null && sag.axis === 0 && sag.inRange, 'sagittal maps to voxel axis 0');
  passed++;
  const cor = axisSliceIndex('coronal', [0, 0, 1], [0, 0, 2], [8, 6, 5]);
  assert(cor !== null && cor.axis === 2, 'coronal maps to voxel axis 2 (NOT Y)');
  passed++;
  const axi = axisSliceIndex('axial', [0, 1, 0], [0, 4, 0], [8, 6, 5]);
  assert(axi !== null && axi.axis === 1, 'axial maps to voxel axis 1 (NOT Z)');
  passed++;
  const miss = axisSliceIndex('sagittal', [1, 0, 0], [99, 0, 0], [8, 6, 5]);
  assert(miss !== null && miss.inRange === false, 'plane missing the volume is out-of-range (neutral, not error)');
  passed++;
  const oblique = axisSliceIndex('sagittal', [0.7071, 0.7071, 0], [3, 3, 0], [8, 6, 5]);
  assert(oblique === null, 'oblique-in-voxel-space defers to the general resampler');
  passed++;
  const exSag = extractAxisSlice(vol, 0, 3);
  assert(exSag !== null && exSag.width === 6 && exSag.height === 5, 'sagittal slice geometry correct');
  passed++;
  assert(exSag!.values[0] === 3 + 10 * 0 + 100 * 0, 'sagittal values exact (i=3 plane)');
  passed++;
  const exCor = extractAxisSlice(vol, 2, 2);
  assert(exCor !== null && exCor!.values[1 * 8 + 5] === 5 + 10 * 1 + 100 * 2, 'coronal values exact');
  passed++;
  const exAxi = extractAxisSlice(vol, 1, 4);
  assert(exAxi !== null && exAxi!.values[2 * 8 + 7] === 7 + 10 * 4 + 100 * 2, 'axial values exact');
  passed++;
  assert(extractAxisSlice(vol, 0, 99) === null, 'out-of-range extraction → NULL');
  passed++;
  console.log('[PASS] Sagittal/coronal/axial mapping exact on synthetics.');
  passed++;

  // TEST 7: oblique resampling (§22) + trilinear correctness.
  console.log('\n--- TEST 7: Oblique resampling ---');
  assert(sampleTrilinear(vol, 3, 0, 0) === 3, 'integer lattice exact');
  passed++;
  assert(Math.abs(sampleTrilinear(vol, 0.5, 0, 0)! - 0.5) < 1e-9, 'trilinear interpolates');
  passed++;
  assert(sampleTrilinear(vol, 500, 500, 500) === null, 'far outside → NULL background');
  passed++;
  const obl = resamplePlaneSlice(vol, [0.5773, 0.5773, 0.5773], [4, 3, 2], 8, 8, 1, [1, 1, 1]);
  assert(obl !== null && obl.width === 8 && obl.height === 8, 'oblique resamples on a bounded grid');
  passed++;
  const center = obl!.values[4 * 8 + 4];
  assert(Number.isFinite(center), 'oblique center samples real data');
  passed++;
  assert(resamplePlaneSlice(vol, [0, 0, 0], [4, 3, 2], 8, 8, 1, [1, 1, 1]) === null, 'degenerate normal rejected');
  passed++;
  assert(resamplePlaneSlice(vol, [1, 0, 0], [4, 3, 2], 4096, 4096, 1, [1, 1, 1]) === null, 'oversize grid rejected (bounded allocation)');
  passed++;
  console.log('[PASS] Oblique path robust; degenerate/oversize rejected.');
  passed++;

  // TEST 8: window/level (§29) is presentation-only.
  console.log('\n--- TEST 8: Window/level ---');
  assert(applyWindowLevel(50, 100, 50) === 0.5, 'center maps to 0.5');
  passed++;
  assert(applyWindowLevel(0, 100, 50) === 0 && applyWindowLevel(100, 100, 50) === 1, 'window edges clamp');
  passed++;
  assert(applyWindowLevel(5, 0, 5) === 1 && applyWindowLevel(4, 0, 5) === 0, 'zero-width degrades safely');
  passed++;
  assert(applyWindowLevel(NaN, 100, 50) === 0, 'non-finite input safe');
  passed++;
  console.log('[PASS] Presentation mapping; source untouched by construction.');
  passed++;

  // TEST 9: memory budget (§25) with Colin27 measured numbers.
  console.log('\n--- TEST 9: Memory accounting ---');
  const budget = computeMriMemoryBudget([181, 217, 181], 4, 1, 'R8-uint8', 1);
  assert(budget !== null, 'budget computes');
  passed++;
  assert(budget!.voxelCount === 181 * 217 * 181, `voxel count exact (${budget!.voxelCount})`);
  passed++;
  assert(budget!.uncompressedBytes === 181 * 217 * 181 * 4, 'uncompressed bytes exact (MEASURED class)');
  passed++;
  assert(budget!.uncompressedClass === 'MEASURED' && budget!.sliceTextureClass === 'ESTIMATED' && budget!.deviceMeasurement === 'UNKNOWN', 'measured/estimated/unknown distinguished');
  passed++;
  assert(budget!.sliceTextureBytesEstimate === 217 * 181 * 1 * 1, 'slice estimate uses the largest cross-section');
  passed++;
  assert(computeMriMemoryBudget([0, 1, 1], 4, 1, 'R8', 1) === null, 'degenerate dims rejected');
  passed++;
  console.log('[PASS] honest accounting; no VRAM claims.');
  passed++;

  // TEST 10: MriManager state machine (headless, synthetic data).
  console.log('\n--- TEST 10: Manager gating + lifecycle ---');
  const manager = new MriManager();
  const planes = new SectionPlaneSet();
  manager.registerVolume(colin);
  manager.bindPlaneSet(planes);
  assert(manager.setDisplayVolume('volume.mri.missing.v1') === false, 'unknown volume rejected');
  passed++;
  assert(manager.setDisplayVolume('volume.mri.colin27_1998.v1') === true, 'registered volume selectable');
  passed++;
  manager.setMode('SPLIT');
  manager.setVisible(true);
  assert(manager.getGroup().visible === false, 'no resident data → hidden with reason');
  passed++;
  assert(/not loaded/.test(manager.getDisabledReason()), 'neutral lazy-load reason');
  passed++;
  assert(manager.ingestVolumeBytes('volume.mri.colin27_1998.v1', new Uint8Array(64)).ok === false, 'corrupt bytes rejected');
  passed++;
  // Synthetic registered volume end-to-end (test-only registration).
  const synthReg = registeredCopy(colin, mat4Identity());
  manager.registerVolume(synthReg);
  const synthBytes = syntheticNiftiBytes(8, 8, 8);
  const ingest = manager.ingestVolumeBytes('volume.mri.synthetic.v1', synthBytes);
  assert(ingest.ok === true, `synthetic volume ingests (${ingest.reason})`);
  passed++;
  manager.setDisplayVolume('volume.mri.synthetic.v1');
  planes.setConstant('plane.sagittal', 4);
  planes.setEnabled('plane.sagittal', true);
  manager.setVisible(true);
  manager.setMode('SPLIT');
  assert(manager.getGroup().visible === true, 'registered volume + enabled plane → slice visible');
  passed++;
  assert(manager.getDisabledReason() === '', 'no disabled reason when active');
  passed++;
  const budgetLive = manager.getMemoryBudget();
  assert(budgetLive !== null && budgetLive.voxelCount === 512, 'live memory budget from resident data');
  passed++;
  // 4C.1 at manager level: computed-but-UNVALIDATED stays hidden with data resident.
  const unvalidatedReg: MriVolumeRecord = {
    ...synthReg,
    volumeId: 'volume.mri.synthetic_unval.v1',
    validationStates: synthReg.validationStates.filter((s) => s !== 'REGISTRATION_VALIDATED')
  };
  manager.registerVolume(unvalidatedReg);
  assert(manager.ingestVolumeBytes('volume.mri.synthetic_unval.v1', synthBytes).ok === true, 'unvalidated twin ingests (data valid, claim invalid)');
  passed++;
  manager.setDisplayVolume('volume.mri.synthetic_unval.v1');
  manager.setMode('SPLIT');
  manager.setVisible(true);
  assert(manager.getGroup().visible === false, 'computed-without-validated stays hidden (4C.1)');
  passed++;
  assert(/not validated/.test(manager.getDisabledReason()), 'refusal names the missing validation');
  passed++;
  // PENDING overlay refusal on the real record path (data-gating precedes
  // registration-gating: Colin27 bytes are correctly NOT resident in tests).
  manager.setDisplayVolume('volume.mri.colin27_1998.v1');
  manager.setMode('OVERLAY');
  assert(manager.getGroup().visible === false, 'unregistered + unloaded overlay stays hidden');
  passed++;
  assert(/not loaded/.test(manager.getDisabledReason()), 'lazy-load reason precedes overlay gate (pure overlay refusal covered in TEST 5)');
  passed++;
  const prov = manager.getProvenanceSummary('volume.mri.colin27_1998.v1');
  assert(prov !== null && prov['Registration status'] === 'REGISTRATION_PENDING', 'provenance states honest statuses');
  passed++;
  assert(!/validated/i.test(prov!['Canonical-transform status']) || /absent/.test(prov!['Canonical-transform status']), 'no oversimplified validated badge');
  passed++;
  manager.dispose();
  assert(manager.isDisposed() === true, 'manager disposes');
  passed++;
  planes.dispose();
  console.log('[PASS] Gating, lifecycle, provenance; no silent misregistration.');
  passed++;

  // TEST 11: display + bookmark serialization (§21, §35).
  console.log('\n--- TEST 11: MRI state serialization ---');
  const disp = { ...defaultMriDisplayState(), volumeId: 'volume.mri.colin27_1998.v1', visible: true, mode: 'SPLIT' as const, windowWidth: 400, windowCenter: 200, opacity: 0.8, planeId: 'plane.sagittal' };
  assert(deserializeMriDisplay({ ...disp }) !== null, 'display state round-trips');
  passed++;
  assert(deserializeMriDisplay({ ...disp, mode: 'DIAGNOSTIC' } as never) === null, 'invalid mode rejected');
  passed++;
  assert(deserializeMriDisplay({ ...disp, opacity: 2 }) === null, 'out-of-range opacity rejected');
  passed++;
  const bmPlanes = new SectionPlaneSet();
  const bm = createBookmark({
    id: 'bookmark.mri.1',
    label: 'MRI test',
    planes: bmPlanes.serialize(),
    presentation: { version: 1, sectionModeEnabled: true, activePlaneId: 'plane.sagittal', gizmoVisible: false, cutEdgeVisible: true, interiorMode: 'TRUE_CAP_WHERE_VALID', labelsEnabled: true, orientationVisible: true, readoutVisible: true, crosshairVisible: false, visualMode: 'NORMAL_SECTION', capsVisible: true, edgesVisible: true },
    camera: null,
    selectedEntityId: null,
    isolatedEntityId: null,
    hiddenEntityIds: [],
    labelsEnabled: true,
    mri: { volumeId: 'volume.mri.colin27_1998.v1', visible: true, mode: 'SPLIT', windowWidth: 400, windowCenter: 200, opacity: 0.8, planeId: 'plane.sagittal' }
  });
  assert(bm !== null, 'bookmark with MRI fields created');
  passed++;
  const bmJson = serializeBookmark(bm!);
  assert(!/DataTexture|Object3D|Float32Array/.test(bmJson), 'bookmark holds no GPU/volume objects');
  passed++;
  const bm2 = deserializeBookmark(bmJson);
  assert(bm2 !== null && bm2.mri?.volumeId === 'volume.mri.colin27_1998.v1' && bm2.mri.mode === 'SPLIT', 'MRI bookmark fields survive round-trip');
  passed++;
  const legacy = createBookmark({
    id: 'bookmark.legacy.1', label: 'legacy', planes: bmPlanes.serialize(),
    presentation: bm!.presentation, camera: null, selectedEntityId: null,
    isolatedEntityId: null, hiddenEntityIds: [], labelsEnabled: true
  });
  assert(legacy !== null && deserializeBookmark(serializeBookmark(legacy!))?.mri === null, 'pre-4C bookmarks without MRI still valid');
  passed++;
  assert(createBookmark({ id: 'x', label: 'x', planes: bmPlanes.serialize(), presentation: bm!.presentation, camera: null, selectedEntityId: null, isolatedEntityId: null, hiddenEntityIds: [], labelsEnabled: true, mri: { volumeId: null, visible: true, mode: 'OVERLAY' as const, windowWidth: NaN, windowCenter: 0, opacity: 1, planeId: null } }) === null, 'non-finite MRI bookmark rejected');
  passed++;
  bmPlanes.dispose();
  console.log('[PASS] MRI display + bookmark serialization (logical only).');
  passed++;

  // TEST 12: no anatomical claims from intensities (§32).
  console.log('\n--- TEST 12: Intensity/label separation ---');
  const probe = syntheticVolume(4, 4, 4);
  const sliceVals = extractAxisSlice(probe, 0, 1);
  assert(sliceVals !== null, 'slice extracts');
  passed++;
  // Values are positional encodings — the pipeline carries no label channel.
  assert(typeof sliceVals!.values[0] === 'number', 'intensities are numbers, never labels');
  passed++;
  assert((sliceVals as unknown as Record<string, unknown>).labels === undefined, 'no label channel on slices');
  passed++;
  void THREE;
  console.log('[PASS] Intensities never become anatomical labels.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 4C MRI REFERENCE TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 4C MRI reference test execution failed:\n', err);
  process.exit(1);
});
