/**
 * 3D Neuroanatomy Atlas: Section-Plane Mathematics (Phase 3.2, Gate 2)
 *
 * PURE MATH MODEL ONLY — no renderer, no clipping, no MRI, no UI.
 * Implements docs/SECTION_PLANE_SPECIFICATION.md for unit testing of the
 * Phase 4 entry math. Canonical space: +X Right, +Y Superior, +Z POSTERIOR, mm.
 *
 * A plane is n.(p - p0) = 0 with normalized n. Retained half-space: d(p) >= -EPS.
 */

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
