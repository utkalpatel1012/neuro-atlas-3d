/**
 * 3D Neuroanatomy Atlas: MRI Slice Sampling (Phase 4C §21–§23)
 * Standard: AAS-2026-NEURO-V1
 *
 * CPU slice-extraction foundation. The SAME canonical section plane that
 * drives mesh clipping (§20) drives slice sampling via the verified
 * MRI-world→canonical transform — planes are converted, never modified.
 *
 * Event-driven only (§23): plane movement updates sampling parameters;
 * volumes are never resampled wholesale per slider tick. No GPU, no DOM here.
 * Intensities are data values; anatomical labels are NEVER inferred (§32).
 */

export interface VoxelAccessor {
  dims: [number, number, number];
  /** Raw voxel value or NULL outside the grid (background, not an error). */
  get(i: number, j: number, k: number): number | null;
}

export type SliceAxis = 'sagittal' | 'coronal' | 'axial';

export interface ResampledSlice {
  /** Row-major grayscale source values (unwindowed — presentation applies later). */
  values: Float32Array;
  width: number;
  height: number;
  /** In-plane axes in VOXEL space (for orientation metadata, not anatomy). */
  axisU: [number, number, number];
  axisV: [number, number, number];
  /** Voxel-space origin of pixel (0,0). */
  originVoxel: [number, number, number];
  mmPerPixel: number;
}

/** Trilinear sample at continuous voxel coordinates; NULL when fully outside. */
export function sampleTrilinear(volume: VoxelAccessor, x: number, y: number, z: number): number | null {
  if (![x, y, z].every(Number.isFinite)) return null;
  const [nx, ny, nz] = volume.dims;
  if (x < -1 || y < -1 || z < -1 || x > nx || y > ny || z > nz) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  let acc = 0;
  let weight = 0;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const v = volume.get(x0 + dx, y0 + dy, z0 + dz);
        if (v === null || !Number.isFinite(v)) continue;
        const w = (dx === 0 ? 1 - fx : fx) * (dy === 0 ? 1 - fy : fy) * (dz === 0 ? 1 - fz : fz);
        acc += v * w;
        weight += w;
      }
    }
  }
  if (weight <= 1e-12) return null;
  return acc / weight;
}

function orthonormalBasis(n: [number, number, number]): { u: [number, number, number]; v: [number, number, number] } | null {
  const len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
  if (!Number.isFinite(len) || len < 1e-12) return null;
  const nn: [number, number, number] = [n[0] / len, n[1] / len, n[2] / len];
  // Pick a helper axis least aligned with n (never degenerate).
  const ax = Math.abs(nn[0]);
  const ay = Math.abs(nn[1]);
  const helper: [number, number, number] = ax <= ay && ax <= Math.abs(nn[2]) ? [1, 0, 0] : ay <= Math.abs(nn[2]) ? [0, 1, 0] : [0, 0, 1];
  const u: [number, number, number] = [
    nn[1] * helper[2] - nn[2] * helper[1],
    nn[2] * helper[0] - nn[0] * helper[2],
    nn[0] * helper[1] - nn[1] * helper[0]
  ];
  const ulen = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
  if (!Number.isFinite(ulen) || ulen < 1e-12) return null;
  const uu: [number, number, number] = [u[0] / ulen, u[1] / ulen, u[2] / ulen];
  const v: [number, number, number] = [
    nn[1] * uu[2] - nn[2] * uu[1],
    nn[2] * uu[0] - nn[0] * uu[2],
    nn[0] * uu[1] - nn[1] * uu[0]
  ];
  return { u: uu, v };
}

/**
 * Resample an arbitrary voxel-space plane onto a W×H grid (§21 + §22 in one
 * robust path: axis planes are exact special cases of the same sampler).
 * Spacing is isotropic mm-per-pixel; out-of-volume pixels are NaN (background).
 */
export function resamplePlaneSlice(
  volume: VoxelAccessor,
  voxelNormal: [number, number, number],
  voxelPoint: [number, number, number],
  width: number,
  height: number,
  mmPerPixel: number,
  voxelSpacingMm: [number, number, number]
): ResampledSlice | null {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null;
  if (width * height > 2048 * 2048) return null; // bounded allocation (§24).
  if (!(mmPerPixel > 0) || !voxelSpacingMm.every((s) => s > 0 && Number.isFinite(s))) return null;
  const basis = orthonormalBasis(voxelNormal);
  if (!basis) return null;
  const values = new Float32Array(width * height);
  const stepU = mmPerPixel / voxelSpacingMm[0];
  const stepV = mmPerPixel / voxelSpacingMm[1];
  void stepU;
  void stepV;
  // Sample in voxel-index units: convert mm steps per axis by that axis spacing.
  // (Anisotropic-safe: each basis component scaled by its axis spacing.)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const duMm = (col - (width - 1) / 2) * mmPerPixel;
      const dvMm = (row - (height - 1) / 2) * mmPerPixel;
      const px =
        voxelPoint[0] + (basis.u[0] * duMm) / voxelSpacingMm[0] + (basis.v[0] * dvMm) / voxelSpacingMm[0];
      const py =
        voxelPoint[1] + (basis.u[1] * duMm) / voxelSpacingMm[1] + (basis.v[1] * dvMm) / voxelSpacingMm[1];
      const pz =
        voxelPoint[2] + (basis.u[2] * duMm) / voxelSpacingMm[2] + (basis.v[2] * dvMm) / voxelSpacingMm[2];
      const s = sampleTrilinear(volume, px, py, pz);
      values[row * width + col] = s === null ? NaN : s;
    }
  }
  return {
    values,
    width,
    height,
    axisU: basis.u,
    axisV: basis.v,
    originVoxel: voxelPoint,
    mmPerPixel
  };
}

/**
 * Axis-slice parameters for a canonical standard plane mapped to voxel space
 * (§21 milestone: ONE canonical plane → ONE correct slice). Returns the voxel
 * axis index + fractional index, or NULL when the plane misses the volume
 * (neutral empty state, never an error).
 */
export function axisSliceIndex(
  kind: SliceAxis,
  voxelNormal: [number, number, number],
  voxelPoint: [number, number, number],
  dims: [number, number, number],
  tolerance = 1e-6
): { axis: 0 | 1 | 2; indexFloat: number; inRange: boolean } | null {
  const ax = Math.abs(voxelNormal[0]);
  const ay = Math.abs(voxelNormal[1]);
  const az = Math.abs(voxelNormal[2]);
  let axis: 0 | 1 | 2;
  if (kind === 'sagittal') axis = 0;
  else if (kind === 'coronal') axis = 2;
  else axis = 1;
  // The mapped normal must stay axis-aligned within tolerance; otherwise this
  // is an oblique plane in voxel space → use resamplePlaneSlice instead.
  const dominant = axis === 0 ? ax : axis === 1 ? ay : az;
  if (dominant < 1 - tolerance) return null;
  const indexFloat = voxelPoint[axis];
  return { axis, indexFloat, inRange: indexFloat >= -0.5 && indexFloat <= dims[axis] - 0.5 };
}

/** Nearest-index extraction along one axis (exact path for axis slices). */
export function extractAxisSlice(
  volume: VoxelAccessor,
  axis: 0 | 1 | 2,
  index: number
): { values: Float32Array; width: number; height: number } | null {
  const [nx, ny, nz] = volume.dims;
  const idx = Math.round(index);
  if (axis === 0) {
    if (idx < 0 || idx >= nx) return null;
    const values = new Float32Array(ny * nz);
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        values[k * ny + j] = volume.get(idx, j, k) ?? NaN;
      }
    }
    return { values, width: ny, height: nz };
  }
  if (axis === 1) {
    if (idx < 0 || idx >= ny) return null;
    const values = new Float32Array(nx * nz);
    for (let k = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++) {
        values[k * nx + i] = volume.get(i, idx, k) ?? NaN;
      }
    }
    return { values, width: nx, height: nz };
  }
  if (idx < 0 || idx >= nz) return null;
  const values = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      values[j * nx + i] = volume.get(i, j, idx) ?? NaN;
    }
  }
  return { values, width: nx, height: nz };
}
