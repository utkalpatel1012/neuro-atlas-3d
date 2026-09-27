/**
 * 3D Neuroanatomy Atlas: Minimal NIfTI-1 Header Reader (Phase 4C §6, §9)
 * Standard: AAS-2026-NEURO-V1
 *
 * Reads the 348-byte NIfTI-1 single-file header ONLY (data loading is a
 * separate, explicitly-managed step). Little-endian; `.nii` magic `n+1`.
 * `.hdr/.img` pairs and big-endian files are REJECTED (unsupported format,
 * §38) — never silently misread.
 *
 * Authoritative-transform rule (§9): sform (code > 0) wins when present;
 * otherwise qform (code > 0) is derived; otherwise INVALID — no transform is
 * ever assumed from the filename, index order, or grid size.
 */

export type NiftiDataType = 'uint8' | 'int8' | 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32' | 'float64';

export interface NiftiHeaderInfo {
  dims: [number, number, number];
  datatype: NiftiDataType;
  bytesPerVoxel: number;
  /** Voxel spacing in mm (pixdim[1..3]). Must be finite and > 0. */
  spacingMm: [number, number, number];
  voxOffset: number;
  /** 4x4 row-major voxel→world matrix from the authoritative source. */
  voxelToWorld: number[];
  /** Which NIfTI field governed the matrix (documented decision, §9). */
  transformSource: 'sform' | 'qform';
  qformCode: number;
  sformCode: number;
  /** Rotation columns only (orientation metadata §10 — NO L/R/A/P/S/I labels). */
  rotationColumns: [[number, number, number], [number, number, number], [number, number, number]];
}

const DATATYPE_TABLE: Record<number, { type: NiftiDataType; bytes: number }> = {
  2: { type: 'uint8', bytes: 1 },
  4: { type: 'int16', bytes: 2 },
  8: { type: 'int32', bytes: 4 },
  16: { type: 'float32', bytes: 4 },
  64: { type: 'float64', bytes: 8 },
  256: { type: 'int8', bytes: 1 },
  512: { type: 'uint16', bytes: 2 },
  768: { type: 'uint32', bytes: 4 }
};

function isFiniteNumber(n: number): boolean {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Derive voxel→world from qform quaternion parameters (NIfTI-1 §2.5 method). */
function qformToMatrix(
  qb: number, qc: number, qd: number,
  qx: number, qy: number, qz: number,
  dx: number, dy: number, dz: number
): number[] | null {
  let a = 1 - (qb * qb + qc * qc + qd * qd);
  if (a < 1e-7) return null; // degenerate quaternion — reject, never default.
  a = Math.sqrt(a);
  const R: number[][] = [
    [a * a + qb * qb - qc * qc - qd * qd, 2 * (qb * qc - a * qd), 2 * (qb * qd + a * qc)],
    [2 * (qb * qc + a * qd), a * a + qc * qc - qb * qb - qd * qd, 2 * (qc * qd - a * qb)],
    [2 * (qb * qd - a * qc), 2 * (qc * qd + a * qb), a * a + qd * qd - qb * qb - qc * qc]
  ];
  return [
    R[0][0] * dx, R[0][1] * dy, R[0][2] * dz, qx,
    R[1][0] * dx, R[1][1] * dy, R[1][2] * dz, qy,
    R[2][0] * dx, R[2][1] * dy, R[2][2] * dz, qz,
    0, 0, 0, 1
  ];
}

export function parseNiftiHeader(bytes: Uint8Array): NiftiHeaderInfo | null {
  if (!bytes || bytes.length < 348) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getInt32(0, true) !== 348) return null; // not little-endian NIfTI-1.
  const magic = String.fromCharCode(bytes[344], bytes[345], bytes[346]);
  if (magic !== 'n+1') return null; // single-file .nii only.
  const ndim = view.getInt16(40, true);
  if (ndim !== 3) return null; // Phase 4C handles 3D volumes only.
  const dims: [number, number, number] = [view.getInt16(42, true), view.getInt16(44, true), view.getInt16(46, true)];
  if (!dims.every((d) => Number.isInteger(d) && d > 0 && d <= 1024)) return null;
  const dtEntry = DATATYPE_TABLE[view.getInt16(70, true)];
  if (!dtEntry) return null; // unsupported datatype — reject (§38).
  const spacing: [number, number, number] = [view.getFloat32(80, true), view.getFloat32(84, true), view.getFloat32(88, true)];
  if (!spacing.every((s) => isFiniteNumber(s) && s > 0 && s <= 100)) return null; // invalid voxel spacing (§38).
  const voxOffset = view.getFloat32(108, true);
  if (!isFiniteNumber(voxOffset) || voxOffset < 0) return null;
  const qformCode = view.getInt16(252, true);
  const sformCode = view.getInt16(254, true);

  let matrix: number[] | null = null;
  let source: 'sform' | 'qform' | null = null;
  if (sformCode > 0) {
    const rows = [0, 1, 2].map((i) => [0, 1, 2, 3].map((j) => view.getFloat32(280 + i * 16 + j * 4, true)));
    if (!rows.flat().every(isFiniteNumber)) return null;
    matrix = [...rows[0], ...rows[1], ...rows[2], 0, 0, 0, 1];
    source = 'sform';
  } else if (qformCode > 0) {
    const qb = view.getFloat32(256, true);
    const qc = view.getFloat32(260, true);
    const qd = view.getFloat32(264, true);
    const qx = view.getFloat32(268, true);
    const qy = view.getFloat32(272, true);
    const qz = view.getFloat32(276, true);
    if (![qb, qc, qd, qx, qy, qz].every(isFiniteNumber)) return null;
    const qfac = view.getFloat32(76, true) < 0 ? -1 : 1; // pixdim[0] sign.
    matrix = qformToMatrix(qb, qc, qd, qx, qy, qz, spacing[0], spacing[1], spacing[2] * qfac);
    if (!matrix) return null;
    source = 'qform';
  } else {
    return null; // qform 0 + sform 0: NO transform present — reject (§9, §38).
  }

  const rotationColumns: NiftiHeaderInfo['rotationColumns'] = [
    [matrix[0], matrix[4], matrix[8]],
    [matrix[1], matrix[5], matrix[9]],
    [matrix[2], matrix[6], matrix[10]]
  ];
  return {
    dims,
    datatype: dtEntry.type,
    bytesPerVoxel: dtEntry.bytes,
    spacingMm: spacing,
    voxOffset,
    voxelToWorld: matrix,
    transformSource: source,
    qformCode,
    sformCode,
    rotationColumns
  };
}

/** Expected uncompressed voxel payload bytes (MEASURED-class, from header). */
export function expectedVoxelBytes(info: NiftiHeaderInfo): number {
  return info.dims[0] * info.dims[1] * info.dims[2] * info.bytesPerVoxel;
}
