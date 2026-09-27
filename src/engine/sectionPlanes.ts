/**
 * 3D Neuroanatomy Atlas: Section-Plane Mathematics (Phase 3.2, Gate 2) +
 * Phase 4A plane model (state-adjacent pure functions; NO renderer here).
 *
 * PURE MATH MODEL ONLY — no renderer, no clipping, no MRI, no UI.
 * Implements docs/SECTION_PLANE_SPECIFICATION.md for unit testing of the
 * Phase 4 entry math. Canonical space: +X Right, +Y Superior, +Z POSTERIOR, mm.
 *
 * A plane is n.(p - p0) = 0 with normalized n. Retained half-space: d(p) >= -EPS.
 */

import * as THREE from 'three';

export type Vec3 = [number, number, number];

export const SECTION_EPS_MM = 1e-6;

export interface SectionPlane {
  /** Unit normal. */
  normal: Vec3;
  /** A point on the plane (canonical mm). */
  origin: Vec3;
  /** Which side is retained by the clipping predicate. */
  retainedSide: '+n' | '-n';
  /** Provenance of the origin (explicit number source). Never an unvalidated anchor. */
  originProvenance: string;
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function norm(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}

/** Normalize; returns null for zero/non-finite input (rejected, never defaulted). */
export function normalize(v: Vec3): Vec3 | null {
  if (!v.every(Number.isFinite)) return null;
  const n = norm(v);
  if (!(n > 0) || !Number.isFinite(n)) return null;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function isValidPoint(p: Vec3): boolean {
  return p.length === 3 && p.every(Number.isFinite);
}

/**
 * Construct a plane. Returns null when inputs are degenerate
 * (zero/non-finite normal, non-finite origin, missing provenance).
 */
export function makePlane(
  normal: Vec3,
  origin: Vec3,
  retainedSide: '+n' | '-n',
  originProvenance: string
): SectionPlane | null {
  const n = normalize(normal);
  if (!n || !isValidPoint(origin)) return null;
  if (retainedSide !== '+n' && retainedSide !== '-n') return null;
  if (!originProvenance || originProvenance.length === 0) return null;
  return { normal: n, origin: [origin[0], origin[1], origin[2]], retainedSide, originProvenance };
}

/** Signed distance d(p) = n.(p - p0). */
export function signedDistance(plane: SectionPlane, p: Vec3): number {
  return dot(plane.normal, [p[0] - plane.origin[0], p[1] - plane.origin[1], p[2] - plane.origin[2]]);
}

/** Clipping predicate: retain d(p) >= -EPS (flipped for '-n'). */
export function isRetained(plane: SectionPlane, p: Vec3, eps = SECTION_EPS_MM): boolean {
  const d = signedDistance(plane, p);
  return plane.retainedSide === '+n' ? d >= -eps : d <= eps;
}

export type StandardPlaneKind = 'sagittal' | 'coronal' | 'axial';

/**
 * Phase 4A plane model — application state shape (renderer-agnostic).
 * The RELATIONSHIP source-component -> composite -> runtime mesh is untouched:
 * clipping never creates entities, parcels, or landmarks.
 */
export type PlaneKind = StandardPlaneKind | 'oblique';

export interface PlaneRecord {
  /** Stable id (e.g. 'plane.sagittal'). Never an entity/parcel/landmark id. */
  id: string;
  kind: PlaneKind;
  /** Math model (normalized normal, origin, retained side, provenance). */
  math: SectionPlane;
  /** Whether this plane currently clips. */
  enabled: boolean;
}

/** Flip the retained half-space (pure). */
export function invertPlane(math: SectionPlane): SectionPlane {
  return {
    normal: [math.normal[0], math.normal[1], math.normal[2]],
    origin: [math.origin[0], math.origin[1], math.origin[2]],
    retainedSide: math.retainedSide === '+n' ? '-n' : '+n',
    originProvenance: math.originProvenance
  };
}

/** Move a plane to a new origin (pure). Provenance must describe the new origin. */
export function movePlane(math: SectionPlane, origin: Vec3, originProvenance: string): SectionPlane | null {
  if (!isValidPoint(origin)) return null;
  if (!originProvenance || originProvenance.length === 0) return null;
  return {
    normal: [math.normal[0], math.normal[1], math.normal[2]],
    origin: [origin[0], origin[1], origin[2]],
    retainedSide: math.retainedSide,
    originProvenance
  };
}

/**
 * Convert to THREE.Plane for GPU clipping.
 * three.js discards fragments where normal.dot(p) + constant < 0, i.e. it keeps
 * normal.p + constant >= 0. Our retained '+n' side is n.(p - p0) >= 0, so
 * constant = -n.p0. Retained '-n' negates both. Inversion == retainedSide flip.
 */
export function toThreePlane(math: SectionPlane): THREE.Plane {
  const s = math.retainedSide === '+n' ? 1 : -1;
  const n = new THREE.Vector3(
    s * math.normal[0],
    s * math.normal[1],
    s * math.normal[2]
  );
  const constant = -s * dot(math.normal, math.origin);
  return new THREE.Plane(n, constant);
}

/** Axis index for standard kinds in CANONICAL axes (sagittal->X, coronal->Z, axial->Y). */
export function standardAxisIndex(kind: StandardPlaneKind): 0 | 1 | 2 {
  switch (kind) {
    case 'sagittal': return 0;
    case 'coronal': return 2;
    case 'axial': return 1;
  }
}

/** Axis letter for canonical position display (e.g. "X = 12.4 mm"). No region labels. */
export function standardAxisLetter(kind: StandardPlaneKind): 'X' | 'Y' | 'Z' {
  switch (kind) {
    case 'sagittal': return 'X';
    case 'coronal': return 'Z';
    case 'axial': return 'Y';
  }
}

/**
 * Standard anatomical planes in CANONICAL axes (verified §6):
 * sagittal -> X constant; coronal -> Z constant (Z is Posterior here);
 * axial -> Y constant (Y is Superior here).
 */
export function standardPlane(
  kind: StandardPlaneKind,
  constantMm: number,
  retainedSide: '+n' | '-n',
  originProvenance: string
): SectionPlane | null {
  if (!Number.isFinite(constantMm)) return null;
  switch (kind) {
    case 'sagittal':
      return makePlane([1, 0, 0], [constantMm, 0, 0], retainedSide, originProvenance);
    case 'coronal':
      return makePlane([0, 0, 1], [0, 0, constantMm], retainedSide, originProvenance);
    case 'axial':
      return makePlane([0, 1, 0], [0, constantMm, 0], retainedSide, originProvenance);
    default:
      return null;
  }
}
