/**
 * 3D Neuroanatomy Atlas: MRI→Canonical Registration Pipeline (Phase 4D §5–§17)
 * Standard: AAS-2026-NEURO-V1
 *
 * Reproducible landmark-based RIGID 6-DOF estimation (Horn's quaternion
 * method) with independent validation. Affine/nonlinear are NOT implemented:
 * unjustified deformation between different-provenance representations is
 * prohibited without explicit validation (§5).
 *
 * Honesty architecture:
 * - Landmarks without provenance are REJECTED (§7); schematic atlas anchors
 *   are NEVER valid inputs (§6 — enforced by requiring explicit provenance
 *   records, which schematics cannot supply).
 * - Estimation landmarks ≠ validation landmarks; overlap is reported, and
 *   <3 independent validation landmarks yields LIMITED_VALIDATION (§12).
 * - Metrics are computed from the given inputs or NULL — never invented
 *   (§11, §13). Computational precision is never labeled biological accuracy.
 * - This module computes nothing on production data by itself: applying a
 *   result to a volume record is a separate, explicitly-versioned step (§16).
 */

import {
  isValidMatrix,
  mat4Determinant,
  mat4Handedness,
  mat4Inverse,
  mat4ApplyPoint
} from './mriVolume';

export type RegistrationLandmarkRole = 'registration' | 'validation';

export type LandmarkIdentification = 'manual_expert' | 'algorithmic_detected';

export interface RegistrationLandmark {
  /** Stable id, e.g. `rlm.colin27.ac`. */
  id: string;
  name: string;
  /** Space this coordinate lives in. Cross-space pairs share the same id stem. */
  sourceSpace: 'mri_world' | 'canonical';
  coordinates: [number, number, number];
  units: 'mm';
  provenance: {
    howIdentified: LandmarkIdentification;
    /** Method + source reference (operator, software+version, or citation). */
    method: string;
    sourceRef: string;
  };
  /** Genuinely estimated uncertainty or NULL (§13). */
  uncertaintyMm: number | null;
  role: RegistrationLandmarkRole;
}

export interface LandmarkPair {
  mriWorld: [number, number, number];
  canonical: [number, number, number];
}

export interface RigidFitResult {
  /** Row-major 4x4 MRI-world→canonical rigid matrix. */
  matrix: number[];
  /** Genuine fitting residual (RMS over ESTIMATION landmarks) — NOT TRE. */
  residualRmseMm: number;
  rotationDeterminant: number;
  handedness: 1 | -1;
  estimationLandmarkCount: number;
}

export interface RegistrationValidation {
  /** RMS over INDEPENDENT validation landmarks ( genuine TRE estimate). */
  treRmseMm: number | null;
  validationLandmarkCount: number;
  independentCount: number;
  limitedValidation: boolean;
  invertible: boolean;
  orientationConsistent: boolean;
}

export function validateLandmark(lm: RegistrationLandmark): { ok: boolean; reason: string } {
  if (!lm || typeof lm.id !== 'string' || lm.id.length === 0) return { ok: false, reason: 'Landmark without id rejected (§7).' };
  if (typeof lm.name !== 'string' || lm.name.length === 0) return { ok: false, reason: `Landmark '${lm.id}': name required.` };
  if (lm.sourceSpace !== 'mri_world' && lm.sourceSpace !== 'canonical') return { ok: false, reason: `Landmark '${lm.id}': source space required.` };
  if (!Array.isArray(lm.coordinates) || lm.coordinates.length !== 3 || !lm.coordinates.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return { ok: false, reason: `Landmark '${lm.id}': finite coordinates required.` };
  }
  if (lm.units !== 'mm') return { ok: false, reason: `Landmark '${lm.id}': units must be mm.` };
  if (!lm.provenance || (lm.provenance.howIdentified !== 'manual_expert' && lm.provenance.howIdentified !== 'algorithmic_detected')) {
    return { ok: false, reason: `Landmark '${lm.id}': identification method required.` };
  }
  if (typeof lm.provenance.method !== 'string' || lm.provenance.method.length === 0) {
    return { ok: false, reason: `Landmark '${lm.id}': method description required.` };
  }
  if (typeof lm.provenance.sourceRef !== 'string' || lm.provenance.sourceRef.length === 0) {
    return { ok: false, reason: `Landmark '${lm.id}': source reference required.` };
  }
  if (lm.uncertaintyMm !== null && (!Number.isFinite(lm.uncertaintyMm) || lm.uncertaintyMm < 0)) {
    return { ok: false, reason: `Landmark '${lm.id}': uncertainty must be NULL or a finite non-negative value.` };
  }
  if (lm.role !== 'registration' && lm.role !== 'validation') return { ok: false, reason: `Landmark '${lm.id}': role required.` };
  return { ok: true, reason: 'Landmark provenance complete.' };
}

/**
 * Pair estimation landmarks across spaces by id stem. Landmarks failing
 * validation are reported and EXCLUDED (never silently repaired).
 */
export function pairEstimationLandmarks(landmarks: RegistrationLandmark[]): {
  pairs: LandmarkPair[];
  excluded: string[];
} {
  const pairs: LandmarkPair[] = [];
  const excluded: string[] = [];
  const bySpace = new Map<string, { mri?: RegistrationLandmark; can?: RegistrationLandmark }>();
  for (const lm of landmarks) {
    if (lm.role !== 'registration') continue;
    const check = validateLandmark(lm);
    if (!check.ok) {
      excluded.push(`${lm.id ?? '?'}: ${check.reason}`);
      continue;
    }
    const stem = lm.id.replace(/\.(mri|can)$/, '');
    const entry = bySpace.get(stem) ?? {};
    if (lm.sourceSpace === 'mri_world') entry.mri = lm;
    else entry.can = lm;
    bySpace.set(stem, entry);
  }
  for (const [stem, entry] of bySpace) {
    if (entry.mri && entry.can) {
      pairs.push({ mriWorld: [...entry.mri.coordinates] as [number, number, number], canonical: [...entry.can.coordinates] as [number, number, number] });
    } else {
      excluded.push(`${stem}: unpaired across spaces (both mri_world and canonical required).`);
    }
  }
  return { pairs, excluded };
}

// -- Symmetric eigensolver (cyclic Jacobi) for Horn's method + degeneracy. -

/**
 * Eigenvalues (diagonal) + orthonormal eigenvectors (columns) of a symmetric
 * 4x4. Deterministic cyclic sweeps; no initial-vector or spectral-gap
 * ambiguity (unlike power iteration, which can lock onto a wrong extremum).
 */
function jacobiEigen4(input: number[][]): { values: number[]; vectors: number[][] } {
  const n = 4;
  const a = input.map((row) => row.slice());
  const v: number[][] = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    }
    if (!(off > 0) || off < 1e-24) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p][q];
        if (Math.abs(apq) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * apq);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { values: [a[0][0], a[1][1], a[2][2], a[3][3]], vectors: v };
}

function quaternionToMatrix(q0: number, q1: number, q2: number, q3: number): number[][] {
  return [
    [q0 * q0 + q1 * q1 - q2 * q2 - q3 * q3, 2 * (q1 * q2 - q0 * q3), 2 * (q1 * q3 + q0 * q2)],
    [2 * (q1 * q2 + q0 * q3), q0 * q0 - q1 * q1 + q2 * q2 - q3 * q3, 2 * (q2 * q3 - q0 * q1)],
    [2 * (q1 * q3 - q0 * q2), 2 * (q2 * q3 + q0 * q1), q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3]
  ];
}

/**
 * Estimate the rigid MRI-world→canonical transform from landmark pairs.
 * Returns NULL with an explicit reason for: <3 pairs, non-finite input,
 * degenerate (collinear/coplanar-insufficient) geometry, failed eigensolve,
 * or a non-rotation result (reflection/singular). residualRmseMm is the
 * FITTING residual — it must never be presented as TRE (§11 vs §13).
 */
export function estimateRigidTransform(pairs: LandmarkPair[]): { result: RigidFitResult } | { error: string } {
  if (!Array.isArray(pairs) || pairs.length < 3) {
    return { error: `Rigid estimation requires ≥3 landmark pairs (got ${Array.isArray(pairs) ? pairs.length : 'none'}).` };
  }
  for (const p of pairs) {
    if (![...p.mriWorld, ...p.canonical].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      return { error: 'Non-finite landmark coordinates rejected.' };
    }
  }
  const n = pairs.length;
  const cA: [number, number, number] = [0, 0, 0];
  const cB: [number, number, number] = [0, 0, 0];
  for (const p of pairs) {
    for (let d = 0; d < 3; d++) {
      cA[d] += p.mriWorld[d] / n;
      cB[d] += p.canonical[d] / n;
    }
  }
  // Covariance H (A→B) + degeneracy check via its symmetric spectrum.
  const H: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pairs) {
    const a = [p.mriWorld[0] - cA[0], p.mriWorld[1] - cA[1], p.mriWorld[2] - cA[2]];
    const b = [p.canonical[0] - cB[0], p.canonical[1] - cB[1], p.canonical[2] - cB[2]];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) H[r][c] += a[r] * b[c];
    }
  }
  // Degeneracy: eigenvalues of HᵀH; rank < 3 (collinear/coincident) rejected.
  const HtH: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += H[k][r] * H[k][c];
      HtH[r][c] = s;
    }
  }
  const trace = HtH[0][0] + HtH[1][1] + HtH[2][2];
  if (!Number.isFinite(trace) || trace < 1e-12) {
    return { error: 'Degenerate landmark configuration (coincident points): rotation undetermined.' };
  }
  const embedded = [
    [HtH[0][0], HtH[0][1], HtH[0][2], 0],
    [HtH[1][0], HtH[1][1], HtH[1][2], 0],
    [HtH[2][0], HtH[2][1], HtH[2][2], 0],
    [0, 0, 0, 0]
  ];
  const spectrum = jacobiEigen4(embedded).values;
  if (!spectrum.every(Number.isFinite)) {
    return { error: 'Degeneracy check failed (non-finite spectrum): no transform estimated.' };
  }
  // Rank of the cross-covariance: 3 non-collinear points span a plane
  // (rank 2) and STILL determine rotation; collinear/coincident (rank < 2)
  // leave rotation undetermined and are rejected.
  const rank = spectrum.filter((v) => v > 1e-9 * trace).length;
  if (rank < 2) {
    return { error: 'Degenerate landmark configuration (collinear or coincident points): rotation undetermined.' };
  }
  // Horn's 4x4 (Sxx..) from cross-covariance sums.
  let Sxx = 0;
  let Sxy = 0;
  let Sxz = 0;
  let Syx = 0;
  let Syy = 0;
  let Syz = 0;
  let Szx = 0;
  let Szy = 0;
  let Szz = 0;
  for (const p of pairs) {
    const a = [p.mriWorld[0] - cA[0], p.mriWorld[1] - cA[1], p.mriWorld[2] - cA[2]];
    const b = [p.canonical[0] - cB[0], p.canonical[1] - cB[1], p.canonical[2] - cB[2]];
    Sxx += a[0] * b[0];
    Sxy += a[0] * b[1];
    Sxz += a[0] * b[2];
    Syx += a[1] * b[0];
    Syy += a[1] * b[1];
    Syz += a[1] * b[2];
    Szx += a[2] * b[0];
    Szy += a[2] * b[1];
    Szz += a[2] * b[2];
  }
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]
  ];
  const horn = jacobiEigen4(N);
  if (!horn.values.every(Number.isFinite)) return { error: 'Rotation eigensolve failed: no transform estimated.' };
  let best = 0;
  for (let k = 1; k < 4; k++) {
    if (horn.values[k] > horn.values[best]) best = k;
  }
  const quat: [number, number, number, number] = [
    horn.vectors[0][best],
    horn.vectors[1][best],
    horn.vectors[2][best],
    horn.vectors[3][best]
  ];
  const qLen = Math.sqrt(quat[0] * quat[0] + quat[1] * quat[1] + quat[2] * quat[2] + quat[3] * quat[3]);
  if (!Number.isFinite(qLen) || qLen < 1e-12) return { error: 'Rotation eigensolve failed: no transform estimated.' };
  const R = quaternionToMatrix(quat[0] / qLen, quat[1] / qLen, quat[2] / qLen, quat[3] / qLen);
  // Post-hoc rotation proof (§9): orthonormal + det +1, else reject.
  const RtR: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += R[k][r] * R[k][c];
      RtR[r][c] = s;
    }
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const expected = r === c ? 1 : 0;
      if (!Number.isFinite(RtR[r][c]) || Math.abs(RtR[r][c] - expected) > 1e-6) {
        return { error: 'Estimated rotation failed orthonormality: rejected.' };
      }
    }
  }
  const det =
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
  if (!Number.isFinite(det) || Math.abs(det - 1) > 1e-6) {
    return { error: 'Estimated rotation is a reflection or singular: rejected unless explicitly justified (§9).' };
  }
  const t: [number, number, number] = [
    cB[0] - (R[0][0] * cA[0] + R[0][1] * cA[1] + R[0][2] * cA[2]),
    cB[1] - (R[1][0] * cA[0] + R[1][1] * cA[1] + R[1][2] * cA[2]),
    cB[2] - (R[2][0] * cA[0] + R[2][1] * cA[1] + R[2][2] * cA[2])
  ];
  const matrix = [
    R[0][0], R[0][1], R[0][2], t[0],
    R[1][0], R[1][1], R[1][2], t[1],
    R[2][0], R[2][1], R[2][2], t[2],
    0, 0, 0, 1
  ];
  let sse = 0;
  for (const p of pairs) {
    const mapped = mat4ApplyPoint(matrix, p.mriWorld);
    if (!mapped) return { error: 'Residual evaluation failed.' };
    sse += (mapped[0] - p.canonical[0]) ** 2 + (mapped[1] - p.canonical[1]) ** 2 + (mapped[2] - p.canonical[2]) ** 2;
  }
  const residualRmseMm = Math.sqrt(sse / n);
  if (!Number.isFinite(residualRmseMm)) return { error: 'Non-finite fitting residual.' };
  const handed = mat4Handedness(matrix);
  if (handed !== 1) return { error: 'Estimated transform mirrors space: rejected.' };
  return {
    result: {
      matrix,
      residualRmseMm,
      rotationDeterminant: det,
      handedness: handed,
      estimationLandmarkCount: n
    }
  };
}

/**
 * Independent validation (§11–§12): TRE over VALIDATION-role landmarks that
 * were NOT used for estimation. Overlap is counted and reported; <3
 * independent landmarks → LIMITED_VALIDATION (never a strong claim).
 */
export function validateRegistration(
  matrix: number[],
  landmarks: RegistrationLandmark[],
  estimationIds: string[]
): RegistrationValidation | { error: string } {
  if (!isValidMatrix(matrix)) return { error: 'Invalid matrix: cannot validate.' };
  const estimationSet = new Set(estimationIds);
  const validation: RegistrationLandmark[] = [];
  for (const lm of landmarks) {
    if (lm.role !== 'validation') continue;
    const check = validateLandmark(lm);
    if (!check.ok) return { error: `Validation landmark invalid: ${check.reason}` };
    validation.push(lm);
  }
  const independent = validation.filter((lm) => !estimationSet.has(lm.id) && !estimationSet.has(lm.id.replace(/\.(mri|can)$/, '')));
  // Pair validation landmarks across spaces by stem for TRE measurement.
  const byStem = new Map<string, { mri?: [number, number, number]; can?: [number, number, number] }>();
  for (const lm of independent) {
    const stem = lm.id.replace(/\.(mri|can)$/, '');
    const entry = byStem.get(stem) ?? {};
    if (lm.sourceSpace === 'mri_world') entry.mri = [...lm.coordinates] as [number, number, number];
    else entry.can = [...lm.coordinates] as [number, number, number];
    byStem.set(stem, entry);
  }
  const trePairs: Array<{ mri: [number, number, number]; can: [number, number, number] }> = [];
  for (const entry of byStem.values()) {
    if (entry.mri && entry.can) trePairs.push({ mri: entry.mri, can: entry.can });
  }
  let treRmseMm: number | null = null;
  if (trePairs.length > 0) {
    let sse = 0;
    for (const pair of trePairs) {
      const mapped = mat4ApplyPoint(matrix, pair.mri);
      if (!mapped) return { error: 'TRE evaluation failed (non-finite mapping).' };
      sse += (mapped[0] - pair.can[0]) ** 2 + (mapped[1] - pair.can[1]) ** 2 + (mapped[2] - pair.can[2]) ** 2;
    }
    treRmseMm = Math.sqrt(sse / trePairs.length);
    if (!Number.isFinite(treRmseMm)) return { error: 'Non-finite TRE.' };
  }
  const invertible = mat4Inverse(matrix) !== null;
  const det = mat4Determinant(matrix);
  const orientationConsistent = det !== null && det > 0 && mat4Handedness(matrix) === 1;
  return {
    treRmseMm,
    validationLandmarkCount: validation.length,
    independentCount: trePairs.length,
    limitedValidation: trePairs.length < 3,
    invertible,
    orientationConsistent
  };
}

/** Versioned registration identifier (§16): bump on algorithm/param change. */
export function registrationVersionId(dataset: string, version: number): string {
  const slug = dataset.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `registration.${slug}.to.canonical.v${version}`;
}
