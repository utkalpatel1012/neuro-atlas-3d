/**
 * 3D Neuroanatomy Atlas: MRI Volume Model, Transforms & Gating (Phase 4C)
 * Standard: AAS-2026-NEURO-V1
 *
 * SECOND modality, distinct identity (§7): `volume.mri.<dataset>.<version>`
 * (never the mesh `assetId` namespace). Three explicit spaces (§8):
 *
 *   VOXEL INDEX (i,j,k integers) → MRI WORLD (mm, dataset-declared frame)
 *     → CANONICAL ATLAS (+X Right, +Y Superior, +Z Posterior, mm).
 *
 * Canonical space itself is UNCHANGED (§11). No GPU, no DOM here — pure
 * records, matrices, and predicates. Unmeasured metrics are NULL, never
 * invented (§14). Statuses are granular, never collapsed (§19).
 */

export type MriVolumeId = string; // `volume.mri.<dataset>.<version>`

export type MriSpace = 'voxel' | 'mri_world' | 'canonical';

export type MriLicenseStatus = 'VERIFIED' | 'LEGAL_REVIEW_REQUIRED' | 'QUARANTINED';

export type MriValidationState =
  | 'SOURCE_IDENTIFIED'
  | 'LICENSE_VERIFIED'
  | 'FORMAT_VALIDATED'
  | 'VOXEL_GEOMETRY_VALIDATED'
  | 'WORLD_TRANSFORM_VALIDATED'
  | 'REGISTERED_TO_CANONICAL'
  | 'REGISTRATION_VALIDATED'
  | 'RUNTIME_READY'
  | 'DEVICE_VALIDATED';

export type MriRegistrationStatus = 'REGISTRATION_PENDING' | 'COMPUTATIONALLY_REGISTERED';

export type MriTransformType = 'rigid_6dof' | 'affine_12dof' | 'nonlinear' | 'identity_documented';

export interface MriLicense {
  status: MriLicenseStatus;
  /** Short human reference (full snapshot lives in docs/MRI_SOURCE_SELECTION.md). */
  summary: string;
  attributionRequired: boolean;
  productionAllowed: boolean;
}

export interface MriVoxelGeometry {
  dims: [number, number, number];
  spacingMm: [number, number, number];
  datatype: string;
  bytesPerVoxel: number;
  /** Row-major 4x4 voxel→MRI-world matrix from the authoritative NIfTI source. */
  voxelToWorld: number[];
  transformSource: 'sform' | 'qform';
  worldCoordinateSystem: string; // e.g. 'talairach' — dataset-declared, never assumed MNI.
}

export interface MriRegistration {
  status: MriRegistrationStatus;
  /** Explicit direction (§13): inputSpace → outputSpace. */
  inputSpace: MriSpace;
  outputSpace: MriSpace;
  transformType: MriTransformType | null;
  /** Row-major 4x4 input→output matrix (present ONLY when status is registered). */
  matrix: number[] | null;
  matrixConvention: 'row-major-4x4-input-to-output';
  software: string | null;
  toolVersion: string | null;
  /** Genuinely measured values or NULL (§14). */
  treMm: number | null;
  uncertaintyMm: number | null;
  validationMethod: string | null;
  expertReview: 'EXPERT_REVIEW_PENDING' | 'EXPERT_VALIDATED';
}

export interface MriVolumeRecord {
  volumeId: MriVolumeId;
  dataset: string;
  version: string;
  sourceUrl: string;
  sha256: string | null;
  byteLength: number | null;
  license: MriLicense;
  modality: string;
  fieldStrength: string; // 'UNKNOWN' when the provider does not document it.
  geometry: MriVoxelGeometry | null;
  registration: MriRegistration;
  validationStates: MriValidationState[];
  quarantined: boolean;
}

export type MriDisplayMode = 'MESH_ONLY' | 'MRI_ONLY' | 'SPLIT' | 'OVERLAY';

export interface MriDisplayState {
  version: 1;
  volumeId: MriVolumeId | null;
  visible: boolean;
  mode: MriDisplayMode;
  /** Presentation ONLY (§29): source data never altered. */
  windowWidth: number;
  windowCenter: number;
  opacity: number;
  /** Canonical plane driving the slice (id reference, never an object). */
  planeId: string | null;
}

// ---------------------------------------------------------------------------
// 4x4 row-major matrix utilities (dependency-free; fully unit-tested).
// ---------------------------------------------------------------------------

export function mat4Identity(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function isValidMatrix(m: unknown): m is number[] {
  return Array.isArray(m) && m.length === 16 && m.every((v) => typeof v === 'number' && Number.isFinite(v));
}

export function mat4Multiply(a: number[], b: number[]): number[] | null {
  if (!isValidMatrix(a) || !isValidMatrix(b)) return null;
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[r * 4 + k] * b[k * 4 + c];
      out[r * 4 + c] = s;
    }
  }
  return out;
}

export function mat4Determinant(m: number[]): number | null {
  if (!isValidMatrix(m)) return null;
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}

/** Adjugate-based inverse. NULL for singular/non-finite input (§17, §38). */
export function mat4Inverse(m: number[]): number[] | null {
  if (!isValidMatrix(m)) return null;
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  det = 1 / det;
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * det,
    (a02 * b10 - a01 * b11 - a03 * b09) * det,
    (a31 * b05 - a32 * b04 + a33 * b03) * det,
    (a22 * b04 - a21 * b05 - a23 * b03) * det,
    (a12 * b08 - a10 * b11 - a13 * b07) * det,
    (a00 * b11 - a02 * b08 + a03 * b07) * det,
    (a32 * b02 - a30 * b05 - a33 * b01) * det,
    (a20 * b05 - a22 * b02 + a23 * b01) * det,
    (a10 * b10 - a11 * b08 + a13 * b06) * det,
    (a01 * b08 - a00 * b10 - a03 * b06) * det,
    (a30 * b04 - a31 * b02 + a33 * b00) * det,
    (a21 * b02 - a20 * b04 - a23 * b00) * det,
    (a11 * b07 - a10 * b09 - a12 * b06) * det,
    (a00 * b09 - a01 * b07 + a02 * b06) * det,
    (a31 * b01 - a30 * b03 - a32 * b00) * det,
    (a20 * b03 - a21 * b01 + a22 * b00) * det
  ];
}

export function mat4ApplyPoint(m: number[], p: [number, number, number]): [number, number, number] | null {
  if (!isValidMatrix(m)) return null;
  const [x, y, z] = p;
  const w = m[12] * x + m[13] * y + m[14] * z + m[15];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-12) return null;
  return [
    (m[0] * x + m[1] * y + m[2] * z + m[3]) / w,
    (m[4] * x + m[5] * y + m[6] * z + m[7]) / w,
    (m[8] * x + m[9] * y + m[10] * z + m[11]) / w
  ];
}

/** Sign of the rotation-part determinant: +1 right-handed, −1 mirrored (§17). */
export function mat4Handedness(m: number[]): 1 | -1 | null {
  if (!isValidMatrix(m)) return null;
  const det =
    m[0] * (m[5] * m[10] - m[6] * m[9]) -
    m[1] * (m[4] * m[10] - m[6] * m[8]) +
    m[2] * (m[4] * m[9] - m[5] * m[8]);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  return det > 0 ? 1 : -1;
}

/** Translation column (mm) — axis orientation and units stay explicit (§17). */
export function mat4Translation(m: number[]): [number, number, number] | null {
  if (!isValidMatrix(m)) return null;
  return [m[3], m[7], m[11]];
}

// ---------------------------------------------------------------------------
// Transform chain (§8, §11, §13, §20).
// ---------------------------------------------------------------------------

/**
 * Canonical plane → voxel-space plane for slice sampling.
 * REQUIRES a registered record (REGISTRATION_VALIDATED path): without a
 * verified MRI-world→canonical matrix this returns NULL and the caller must
 * disable MRI overlay (§39). The canonical plane itself is never modified.
 */
export function canonicalPlaneToVoxel(
  record: MriVolumeRecord,
  planeNormal: [number, number, number],
  planePoint: [number, number, number]
): { voxelNormal: [number, number, number]; voxelPoint: [number, number, number] } | null {
  if (!record.geometry || !isValidMatrix(record.geometry.voxelToWorld)) return null;
  const reg = record.registration;
  if (reg.status !== 'COMPUTATIONALLY_REGISTERED' || !isValidMatrix(reg.matrix)) return null;
  if (reg.inputSpace !== 'mri_world' || reg.outputSpace !== 'canonical') return null;
  // Canonical → MRI world uses the INVERSE registration (§13 direction explicit).
  const regInv = mat4Inverse(reg.matrix);
  if (!regInv) return null;
  const worldPoint = mat4ApplyPoint(regInv, planePoint);
  if (!worldPoint) return null;
  // Normals transform by the inverse-transpose of the linear part.
  const linInv = mat4Inverse([
    reg.matrix[0], reg.matrix[1], reg.matrix[2], 0,
    reg.matrix[4], reg.matrix[5], reg.matrix[6], 0,
    reg.matrix[8], reg.matrix[9], reg.matrix[10], 0,
    0, 0, 0, 1
  ]);
  if (!linInv) return null;
  // Inverse-transpose: transpose of linInv applied to the normal.
  const nx = linInv[0] * planeNormal[0] + linInv[4] * planeNormal[1] + linInv[8] * planeNormal[2];
  const ny = linInv[1] * planeNormal[0] + linInv[5] * planeNormal[1] + linInv[9] * planeNormal[2];
  const nz = linInv[2] * planeNormal[0] + linInv[6] * planeNormal[1] + linInv[10] * planeNormal[2];
  const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (!Number.isFinite(nLen) || nLen < 1e-12) return null;
  const worldNormal: [number, number, number] = [nx / nLen, ny / nLen, nz / nLen];
  // MRI world → voxel indices via inverse voxelToWorld.
  const voxInv = mat4Inverse(record.geometry.voxelToWorld);
  if (!voxInv) return null;
  const voxelPoint = mat4ApplyPoint(voxInv, worldPoint);
  if (!voxelPoint) return null;
  const lx = voxInv[0] * worldNormal[0] + voxInv[4] * worldNormal[1] + voxInv[8] * worldNormal[2];
  const ly = voxInv[1] * worldNormal[0] + voxInv[5] * worldNormal[1] + voxInv[9] * worldNormal[2];
  const lz = voxInv[2] * worldNormal[0] + voxInv[6] * worldNormal[1] + voxInv[10] * worldNormal[2];
  const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
  if (!Number.isFinite(lLen) || lLen < 1e-12) return null;
  return { voxelNormal: [lx / lLen, ly / lLen, lz / lLen], voxelPoint };
}

/** Round-trip error (mm) for an invertible matrix over sample points (§16). */
export function roundTripErrorMm(m: number[], points: Array<[number, number, number]>): number | null {
  const inv = mat4Inverse(m);
  if (!inv) return null;
  let maxErr = 0;
  for (const p of points) {
    const fwd = mat4ApplyPoint(m, p);
    if (!fwd) return null;
    const back = mat4ApplyPoint(inv, fwd);
    if (!back) return null;
    const err = Math.sqrt((back[0] - p[0]) ** 2 + (back[1] - p[1]) ** 2 + (back[2] - p[2]) ** 2);
    if (!Number.isFinite(err)) return null;
    maxErr = Math.max(maxErr, err);
  }
  return maxErr;
}

// ---------------------------------------------------------------------------
// Failure-safe gating (§38, §39).
// ---------------------------------------------------------------------------

export function hasValidationState(record: MriVolumeRecord, state: MriValidationState): boolean {
  return record.validationStates.includes(state);
}

/** A volume is displayable alone when geometry + world transform validate. */
export function canDisplayVolume(record: MriVolumeRecord): { ok: boolean; reason: string } {
  if (record.quarantined) return { ok: false, reason: 'Volume is quarantined (RESEARCH_ONLY): barred from production runtime.' };
  if (!record.geometry) return { ok: false, reason: 'No validated voxel geometry: NO MRI VIEW.' };
  if (!hasValidationState(record, 'VOXEL_GEOMETRY_VALIDATED')) return { ok: false, reason: 'Voxel geometry not validated: NO MRI VIEW.' };
  if (!hasValidationState(record, 'WORLD_TRANSFORM_VALIDATED')) return { ok: false, reason: 'MRI world transform not validated: NO MRI VIEW.' };
  return { ok: true, reason: 'Volume geometry and world transform validated.' };
}

/** Mesh/MRI overlay additionally requires verified registration + license (§39). */
export function canOverlayWithMesh(record: MriVolumeRecord): { ok: boolean; reason: string } {
  const display = canDisplayVolume(record);
  if (!display.ok) return display;
  if (record.license.status !== 'VERIFIED' || !record.license.productionAllowed) {
    return { ok: false, reason: 'No verified production license: NO PRODUCTION MRI.' };
  }
  if (!hasValidationState(record, 'REGISTERED_TO_CANONICAL')) {
    return { ok: false, reason: 'No verified MRI→canonical transform: NO MRI/MESH OVERLAY.' };
  }
  return { ok: true, reason: 'Overlay permitted: geometry, transform, registration, license verified.' };
}

/** ProductionBytes may ship only with a verified, non-quarantined license (§5). */
export function canEnterProduction(record: MriVolumeRecord): { ok: boolean; reason: string } {
  if (record.quarantined) return { ok: false, reason: 'Quarantined dataset: never in production bundles.' };
  if (record.license.status !== 'VERIFIED' || !record.license.productionAllowed) {
    return { ok: false, reason: 'LEGAL_REVIEW_REQUIRED: do not place into production assets.' };
  }
  return { ok: true, reason: 'License verified for production reference use with attribution.' };
}

// ---------------------------------------------------------------------------
// Memory accounting (§25): MEASURED vs ESTIMATED vs UNKNOWN.
// ---------------------------------------------------------------------------

export interface MriMemoryBudget {
  voxelCount: number;
  /** From header geometry — MEASURED. */
  uncompressedBytes: number;
  uncompressedClass: 'MEASURED';
  /** Formula estimate — ESTIMATED, never actual VRAM. */
  sliceTextureBytesEstimate: number;
  sliceTextureClass: 'ESTIMATED';
  residentSlices: number;
  textureFormat: string;
  deviceMeasurement: 'UNKNOWN';
}

export function computeMriMemoryBudget(
  dims: [number, number, number],
  bytesPerVoxel: number,
  residentSlices: number,
  textureFormat: string,
  textureBytesPerPixel: number
): MriMemoryBudget | null {
  if (!dims.every((d) => Number.isInteger(d) && d > 0)) return null;
  if (!(bytesPerVoxel > 0) || !(residentSlices > 0) || !(textureBytesPerPixel > 0)) return null;
  const voxelCount = dims[0] * dims[1] * dims[2];
  const maxSlice = Math.max(dims[0] * dims[1], dims[1] * dims[2], dims[0] * dims[2]);
  return {
    voxelCount,
    uncompressedBytes: voxelCount * bytesPerVoxel,
    uncompressedClass: 'MEASURED',
    sliceTextureBytesEstimate: maxSlice * textureBytesPerPixel * residentSlices,
    sliceTextureClass: 'ESTIMATED',
    residentSlices,
    textureFormat,
    deviceMeasurement: 'UNKNOWN'
  };
}

// ---------------------------------------------------------------------------
// Presentation + serialization (logical state only, §29, §35).
// ---------------------------------------------------------------------------

/** Grayscale window/level mapping (presentation; source data untouched). */
export function applyWindowLevel(value: number, windowWidth: number, windowCenter: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(windowWidth) || !Number.isFinite(windowCenter)) return 0;
  if (windowWidth <= 0) return value >= windowCenter ? 1 : 0;
  const lo = windowCenter - windowWidth / 2;
  const t = (value - lo) / windowWidth;
  return Math.min(1, Math.max(0, t));
}

export function defaultMriDisplayState(): MriDisplayState {
  return {
    version: 1,
    volumeId: null,
    visible: false,
    mode: 'MESH_ONLY',
    windowWidth: 0,
    windowCenter: 0,
    opacity: 1,
    planeId: null
  };
}

export function serializeMriDisplay(state: MriDisplayState): MriDisplayState {
  return { ...state, version: 1 };
}

export function deserializeMriDisplay(data: MriDisplayState): MriDisplayState | null {
  if (!data || data.version !== 1) return null;
  const modes: MriDisplayMode[] = ['MESH_ONLY', 'MRI_ONLY', 'SPLIT', 'OVERLAY'];
  if (!modes.includes(data.mode)) return null;
  if (data.volumeId !== null && typeof data.volumeId !== 'string') return null;
  if (!Number.isFinite(data.windowWidth) || !Number.isFinite(data.windowCenter)) return null;
  if (!Number.isFinite(data.opacity) || data.opacity < 0 || data.opacity > 1) return null;
  if (data.planeId !== null && typeof data.planeId !== 'string') return null;
  return {
    version: 1,
    volumeId: data.volumeId,
    visible: data.visible === true,
    mode: data.mode,
    windowWidth: data.windowWidth,
    windowCenter: data.windowCenter,
    opacity: data.opacity,
    planeId: data.planeId
  };
}

/**
 * Reference record for the Phase 4C selected volume (Colin27 1998 T1).
 * Geometry values are MEASURED from the file header (2026-09-27 session);
 * registration is REGISTRATION_PENDING (nothing computed). Mirrors
 * data/mri_volumes.json — the JSON file is the human-readable registry,
 * this factory is the runtime/test source (single source per value).
 */
export function createColin27_1998Record(): MriVolumeRecord {
  return {
    volumeId: 'volume.mri.colin27_1998.v1',
    dataset: 'Colin27 1998 original (Holmes et al. 1998)',
    version: '1998 original, file colin27_t1_tal_lin.nii',
    sourceUrl: 'http://packages.bic.mni.mcgill.ca/mni-models/colin27/mni_colin27_1998_nifti.zip',
    sha256: '81a80619f6714c8a101847ce51c47e8e87e06324bad4188200e6aeb127511ace',
    byteLength: 28436900,
    license: {
      status: 'VERIFIED',
      summary: 'Collins/MNI permissive (use/copy/modify/distribute, attribution via copyright notice).',
      attributionRequired: true,
      productionAllowed: true
    },
    modality: 'T1-weighted MRI average (27 scans, single individual)',
    fieldStrength: 'UNKNOWN',
    geometry: {
      dims: [181, 217, 181],
      spacingMm: [1.0, 1.0, 1.0],
      datatype: 'float32',
      bytesPerVoxel: 4,
      voxelToWorld: [1, 0, 0, -90, 0, 1, 0, -126, 0, 0, 1, -72, 0, 0, 0, 1],
      transformSource: 'sform',
      worldCoordinateSystem: 'talairach'
    },
    registration: {
      status: 'REGISTRATION_PENDING',
      inputSpace: 'mri_world',
      outputSpace: 'canonical',
      transformType: null,
      matrix: null,
      matrixConvention: 'row-major-4x4-input-to-output',
      software: null,
      toolVersion: null,
      treMm: null,
      uncertaintyMm: null,
      validationMethod: null,
      expertReview: 'EXPERT_REVIEW_PENDING'
    },
    validationStates: [
      'SOURCE_IDENTIFIED',
      'LICENSE_VERIFIED',
      'FORMAT_VALIDATED',
      'VOXEL_GEOMETRY_VALIDATED',
      'WORLD_TRANSFORM_VALIDATED'
    ],
    quarantined: false
  };
}
