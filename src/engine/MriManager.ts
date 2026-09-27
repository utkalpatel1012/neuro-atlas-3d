/**
 * 3D Neuroanatomy Atlas: MRI Runtime Manager (Phase 4C §23–§31, §35, §37–§39)
 * Standard: AAS-2026-NEURO-V1
 *
 * Owns MRI display state, lazy volume data (ONE resident volume max), bounded
 * slice cache, and the slice visualization group. Mesh clipping is untouched:
 * the SAME canonical plane drives both views (§20, §30).
 *
 * Failure-safe (§39): without a validated volume → no MRI view; without a
 * verified transform/license → no overlay. Reasons are neutral status strings
 * for the UI, never errors thrown at the user for empty states.
 */

import * as THREE from 'three';
import { SectionPlaneSet } from './SectionPlaneSet';
import { PlaneKind } from './sectionPlanes';
import { parseNiftiHeader, NiftiHeaderInfo } from './niftiHeader';
import {
  MriVolumeId,
  MriVolumeRecord,
  MriDisplayState,
  MriDisplayMode,
  defaultMriDisplayState,
  deserializeMriDisplay,
  canonicalPlaneToVoxel,
  canDisplayVolume,
  canOverlayWithMesh,
  applyWindowLevel,
  computeMriMemoryBudget,
  MriMemoryBudget
} from './mriVolume';
import {
  VoxelAccessor,
  resamplePlaneSlice,
  axisSliceIndex,
  extractAxisSlice,
  ResampledSlice
} from './mriSlice';

export interface MriSliceMesh {
  mesh: THREE.Mesh;
  texture: THREE.DataTexture;
  width: number;
  height: number;
}

interface CachedVolume {
  record: MriVolumeRecord;
  accessor: VoxelAccessor;
  header: NiftiHeaderInfo;
  byteLength: number;
}

interface CachedSlice {
  key: string;
  slice: ResampledSlice;
  volumeId: MriVolumeId;
}

const SLICE_CACHE_MAX = 3;
const PLANE_QUANT_MM = 0.5;

function quantize(v: number): number {
  return Math.round(v / PLANE_QUANT_MM) * PLANE_QUANT_MM;
}

export class MriManager {
  private registry: Map<MriVolumeId, MriVolumeRecord> = new Map();
  private display: MriDisplayState = defaultMriDisplayState();
  private volume: CachedVolume | null = null;
  private slices: Map<string, CachedSlice> = new Map();
  private sliceGroup: THREE.Group = new THREE.Group();
  private sliceMesh: MriSliceMesh | null = null;
  private sliceMaterial: THREE.MeshBasicMaterial;
  private planeUnsub: (() => void) | null = null;
  private planeSet: SectionPlaneSet | null = null;
  private disposed = false;
  private disabledReason = 'MRI display inactive.';
  private modeApplier: ((mode: MriDisplayMode) => void) | null = null;

  constructor() {
    this.sliceGroup.name = 'MriSlice_DerivedVisualization';
    this.sliceGroup.visible = false;
    // Neutral grayscale: reads as reference imagery, never tissue-colored.
    this.sliceMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    this.sliceMaterial.name = 'MriSlice_Material';
  }

  // -- Registry -----------------------------------------------------------

  public registerVolume(record: MriVolumeRecord): void {
    this.registry.set(record.volumeId, record);
  }

  public getVolumeRecord(volumeId: MriVolumeId): MriVolumeRecord | undefined {
    return this.registry.get(volumeId);
  }

  public getRegisteredVolumeIds(): MriVolumeId[] {
    return [...this.registry.keys()];
  }

  // -- Display state (§28–§31, §35 serializable) ----------------------------

  public getDisplay(): MriDisplayState {
    return { ...this.display };
  }

  public setDisplayVolume(volumeId: MriVolumeId | null): boolean {
    if (volumeId !== null && !this.registry.has(volumeId)) return false;
    if (this.display.volumeId !== volumeId) {
      this.display.volumeId = volumeId;
      if (this.volume && this.volume.record.volumeId !== volumeId) this.unloadVolumeData();
    }
    return true;
  }

  public setVisible(visible: boolean): void {
    this.display.visible = visible;
    this.refresh();
  }

  public setMode(mode: MriDisplayMode): boolean {
    const modes: MriDisplayMode[] = ['MESH_ONLY', 'MRI_ONLY', 'SPLIT', 'OVERLAY'];
    if (!modes.includes(mode)) return false;
    this.display.mode = mode;
    this.refresh();
    return true;
  }

  public setWindow(width: number, center: number): boolean {
    if (!Number.isFinite(width) || !Number.isFinite(center) || width < 0) return false;
    this.display.windowWidth = width;
    this.display.windowCenter = center;
    this.refreshTextureOnly();
    return true;
  }

  public setOpacity(opacity: number): boolean {
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) return false;
    this.display.opacity = opacity;
    this.sliceMaterial.opacity = opacity;
    return true;
  }

  public setPlaneId(planeId: string | null): void {
    this.display.planeId = planeId;
    this.refresh();
  }

  public restoreDisplay(state: MriDisplayState): boolean {
    const parsed = deserializeMriDisplay(state);
    if (!parsed) return false;
    if (parsed.volumeId !== null && !this.registry.has(parsed.volumeId)) return false;
    this.display = parsed;
    this.sliceMaterial.opacity = parsed.opacity;
    this.refresh();
    return true;
  }

  public reset(): void {
    const volumeId = this.display.volumeId;
    this.display = { ...defaultMriDisplayState(), volumeId };
    this.sliceMaterial.opacity = 1;
    this.refresh();
  }

  public getDisabledReason(): string {
    return this.disabledReason;
  }

  /**
   * Phase 4C §30: mesh/MRI mode visibility hook (owned by the application;
   * the manager never touches mesh visibility itself). Invoked on refresh.
   */
  public setModeApplier(applier: ((mode: MriDisplayMode) => void) | null): void {
    this.modeApplier = applier;
  }

  public getGroup(): THREE.Group {
    return this.sliceGroup;
  }

  // -- Volume data (lazy, ONE resident max, explicit ownership §24) ---------

  /**
   * Ingest decoded bytes (caller fetches; gunzip handled here). Validates the
   * header against the registered record geometry — mismatch REJECTS (§38).
   * Loading NEVER enables overlay by itself (gating decides).
   */
  public ingestVolumeBytes(volumeId: MriVolumeId, bytes: Uint8Array): { ok: boolean; reason: string } {
    const record = this.registry.get(volumeId);
    if (!record) return { ok: false, reason: `Unknown MRI volume '${volumeId}'.` };
    if (!record.geometry) return { ok: false, reason: 'Volume has no validated geometry: NO MRI VIEW.' };
    let payload = bytes;
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      return { ok: false, reason: 'Gzip payloads require a DecompressionStream-capable context; supply raw .nii bytes.' };
    }
    const header = parseNiftiHeader(payload);
    if (!header) return { ok: false, reason: 'Unsupported or corrupt NIfTI header: NO MRI VIEW.' };
    const g = record.geometry;
    if (
      header.dims[0] !== g.dims[0] || header.dims[1] !== g.dims[1] || header.dims[2] !== g.dims[2] ||
      header.bytesPerVoxel !== g.bytesPerVoxel
    ) {
      return { ok: false, reason: 'Volume bytes do not match registered geometry: rejected, never shown approximately.' };
    }
    const accessor = decodeVoxels(payload, header);
    if (!accessor) return { ok: false, reason: 'Unsupported voxel datatype for runtime sampling.' };
    if (this.volume && this.volume.record.volumeId !== volumeId) this.unloadVolumeData();
    this.volume = { record, accessor, header, byteLength: payload.length };
    this.slices.clear();
    this.refresh();
    return { ok: true, reason: 'Volume data resident (display still gated by registration/license).' };
  }

  public unloadVolumeData(): void {
    this.volume = null;
    this.slices.clear();
    this.clearSliceMesh();
  }

  public isVolumeResident(volumeId: MriVolumeId): boolean {
    return this.volume?.record.volumeId === volumeId;
  }

  public getMemoryBudget(): MriMemoryBudget | null {
    if (!this.volume) return null;
    const { dims } = this.volume.accessor;
    return computeMriMemoryBudget(dims, this.volume.header.bytesPerVoxel, 1, 'R8-uint8', 1);
  }

  // -- Plane linkage (§20): same logical plane drives mesh + MRI -----------

  public bindPlaneSet(planeSet: SectionPlaneSet): void {
    this.unbindPlaneSet();
    this.planeSet = planeSet;
    this.planeUnsub = planeSet.onChange(() => this.refresh());
    this.refresh();
  }

  public unbindPlaneSet(): void {
    if (this.planeUnsub) {
      this.planeUnsub();
      this.planeUnsub = null;
    }
    this.planeSet = null;
  }

  private activePlaneId(): string | null {
    if (this.display.planeId) return this.display.planeId;
    if (!this.planeSet) return null;
    const enabled = this.planeSet.getEnabledPlanes();
    if (enabled.length === 0) return null;
    return enabled[0].id;
  }

  /** Event-driven entry point: plane/display/volume changes — never per frame. */
  public refresh(): void {
    if (this.disposed) return;
    if (this.modeApplier) {
      try {
        this.modeApplier(this.display.mode);
      } catch {
        // Visibility hook failure must never break slice gating.
      }
    }
    if (!this.display.visible || this.display.mode === 'MESH_ONLY' || !this.display.volumeId) {
      this.disabledReason = 'MRI display inactive.';
      this.sliceGroup.visible = false;
      this.clearSliceMesh();
      return;
    }
    const record = this.registry.get(this.display.volumeId);
    if (!record) {
      this.disabledReason = 'MRI volume unknown.';
      this.sliceGroup.visible = false;
      this.clearSliceMesh();
      return;
    }
    if (!this.volume || this.volume.record.volumeId !== record.volumeId) {
      this.disabledReason = 'MRI volume selected but data not loaded (lazy load required): NO MRI VIEW.';
      this.sliceGroup.visible = false;
      this.clearSliceMesh();
      return;
    }
    const needsOverlay = this.display.mode === 'OVERLAY' || this.display.mode === 'SPLIT';
    const gate = needsOverlay ? canOverlayWithMesh(record) : canDisplayVolume(record);
    if (!gate.ok) {
      this.disabledReason = gate.reason;
      this.sliceGroup.visible = false;
      this.clearSliceMesh();
      return;
    }
    const planeId = this.activePlaneId();
    if (!planeId || !this.planeSet) {
      this.disabledReason = 'No active canonical section plane: MRI slice follows the mesh section plane.';
      this.sliceGroup.visible = false;
      this.clearSliceMesh();
      return;
    }
    const plane = this.planeSet.getPlane(planeId);
    if (!plane || !plane.enabled) {
      this.disabledReason = 'Active section plane is disabled: enable a plane to place the MRI slice.';
      this.sliceGroup.visible = false;
      this.clearSliceMesh();
      return;
    }
    const mapped = canonicalPlaneToVoxel(record, plane.math.normal, plane.math.origin);
    if (!mapped) {
      this.disabledReason = 'Plane conversion failed: MRI overlay disabled (never approximate).';
      this.sliceGroup.visible = false;
      this.clearSliceMesh();
      return;
    }
    const slice = this.getOrBuildSlice(record, plane.kind, planeId, mapped.voxelNormal, mapped.voxelPoint);
    if (!slice) {
      this.disabledReason = 'No validated voxel data intersects this plane.';
      this.sliceGroup.visible = false;
      this.clearSliceMesh();
      return;
    }
    this.disabledReason = '';
    this.showSlice(slice, plane.math.normal, plane.math.origin, plane.kind);
  }

  private sliceKey(volumeId: MriVolumeId, planeId: string, normal: [number, number, number], point: [number, number, number]): string {
    return `${volumeId}:${planeId}:${quantize(normal[0])},${quantize(normal[1])},${quantize(normal[2])}|${quantize(point[0])},${quantize(point[1])},${quantize(point[2])}`;
  }

  private getOrBuildSlice(
    record: MriVolumeRecord,
    kind: PlaneKind,
    planeId: string,
    voxelNormal: [number, number, number],
    voxelPoint: [number, number, number]
  ): ResampledSlice | null {
    if (!this.volume) return null;
    const key = this.sliceKey(record.volumeId, planeId, voxelNormal, voxelPoint);
    const cached = this.slices.get(key);
    if (cached) return cached.slice;
    const accessor = this.volume.accessor;
    const spacing = record.geometry!.spacingMm;
    let slice: ResampledSlice | null = null;
    if (kind === 'sagittal' || kind === 'coronal' || kind === 'axial') {
      const axisKind = kind as 'sagittal' | 'coronal' | 'axial';
      const params = axisSliceIndex(axisKind, voxelNormal, voxelPoint, accessor.dims);
      if (params && params.inRange) {
        const axis = params.axis;
        const exact = extractAxisSlice(accessor, axis, params.indexFloat);
        if (exact) {
          slice = {
            values: exact.values,
            width: exact.width,
            height: exact.height,
            axisU: axis === 0 ? [0, 1, 0] : [1, 0, 0],
            axisV: [0, 0, 1],
            originVoxel: voxelPoint,
            mmPerPixel: axis === 0 ? spacing[1] : spacing[0]
          };
        }
      }
    }
    if (!slice) {
      // Oblique or off-grid: general resampling on a bounded grid (§22).
      const [nx, ny, nz] = accessor.dims;
      const outW = Math.max(nx, ny);
      const outH = nz;
      slice = resamplePlaneSlice(accessor, voxelNormal, voxelPoint, outW, outH, Math.min(...spacing), spacing);
    }
    if (!slice) return null;
    this.slices.set(key, { key, slice, volumeId: record.volumeId });
    while (this.slices.size > SLICE_CACHE_MAX) {
      const oldest = this.slices.keys().next().value as string;
      this.slices.delete(oldest);
    }
    return slice;
  }

  private showSlice(
    slice: ResampledSlice,
    canonicalNormal: [number, number, number],
    canonicalPoint: [number, number, number],
    kind: PlaneKind
  ): void {
    const ww = this.display.windowWidth > 0 ? this.display.windowWidth : autoWindow(slice.values);
    const wc = this.display.windowWidth > 0 ? this.display.windowCenter : autoCenter(slice.values);
    const pixels = new Uint8Array(slice.width * slice.height);
    for (let i = 0; i < pixels.length; i++) {
      const v = slice.values[i];
      pixels[i] = Number.isNaN(v) ? 0 : Math.round(applyWindowLevel(v, ww, wc) * 255);
    }
    const texture = new THREE.DataTexture(pixels, slice.width, slice.height, THREE.RedFormat, THREE.UnsignedByteType);
    texture.needsUpdate = true;
    this.clearSliceMesh();
    const geometry = new THREE.PlaneGeometry(slice.width * slice.mmPerPixel, slice.height * slice.mmPerPixel);
    this.sliceMaterial.opacity = this.display.mode === 'OVERLAY' ? Math.min(1, this.display.opacity) : 1;
    this.sliceMaterial.transparent = this.display.mode === 'OVERLAY';
    const mesh = new THREE.Mesh(geometry, this.sliceMaterial);
    // Orient: plane normal → +Z of PlaneGeometry via quaternion; position at
    // the canonical plane point. Visualization placement, not anatomy.
    const normal = new THREE.Vector3(canonicalNormal[0], canonicalNormal[1], canonicalNormal[2]).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.position.set(canonicalPoint[0], canonicalPoint[1], canonicalPoint[2]);
    mesh.userData = { mriSlice: true, planeKind: kind, derivedVisualization: true };
    this.sliceGroup.add(mesh);
    this.sliceMesh = { mesh, texture, width: slice.width, height: slice.height };
    // Bind texture through a per-slice material clone? No clones (§35-style):
    // single shared material; map assignment is the only mutation.
    this.sliceMaterial.map = texture;
    this.sliceMaterial.needsUpdate = true;
    this.sliceGroup.visible = true;
  }

  /** Re-applies window/level to the current slice without resampling (§29). */
  private refreshTextureOnly(): void {
    if (!this.sliceMesh) {
      this.refresh();
      return;
    }
    this.sliceMesh.texture.dispose();
    const mesh = this.sliceMesh.mesh;
    this.sliceGroup.remove(mesh);
    (mesh.geometry as THREE.BufferGeometry).dispose();
    this.sliceMesh = null;
    this.sliceMaterial.map = null;
    this.refresh();
  }

  private clearSliceMesh(): void {
    if (this.sliceMesh) {
      this.sliceGroup.remove(this.sliceMesh.mesh);
      (this.sliceMesh.mesh.geometry as THREE.BufferGeometry).dispose();
      this.sliceMesh.texture.dispose();
      this.sliceMesh = null;
    }
    this.sliceMaterial.map = null;
  }

  /** Provenance summary for the UI panel (§37) — statuses, never a badge. */
  public getProvenanceSummary(volumeId: MriVolumeId): Record<string, string> | null {
    const record = this.registry.get(volumeId);
    if (!record) return null;
    return {
      Dataset: `${record.dataset} (${record.version})`,
      Modality: record.modality,
      'Voxel dimensions': record.geometry ? `${record.geometry.dims.join(' × ')} @ ${record.geometry.spacingMm.join(' × ')} mm` : 'NOT VALIDATED',
      'World coordinate system': record.geometry ? record.geometry.worldCoordinateSystem : 'UNKNOWN',
      'Registration status': record.registration.status,
      'Canonical-transform status': record.registration.status === 'COMPUTATIONALLY_REGISTERED' ? 'present (verified record)' : 'absent — overlay disabled',
      'License status': `${record.license.status}${record.license.attributionRequired ? ' (attribution required)' : ''}`,
      'Runtime data': this.isVolumeResident(volumeId) ? 'resident (explicitly managed)' : 'not loaded (lazy only)'
    };
  }

  public dispose(): void {
    this.unbindPlaneSet();
    this.unloadVolumeData();
    this.registry.clear();
    this.modeApplier = null;
    this.sliceMaterial.dispose();
    this.disposed = true;
  }

  public isDisposed(): boolean {
    return this.disposed;
  }
}

function autoWindow(values: Float32Array): number {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i += 7) {
    const v = values[i];
    if (Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 1;
  return max - min;
}

function autoCenter(values: Float32Array): number {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i += 7) {
    const v = values[i];
    if (Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  return (min + max) / 2;
}

/** Decode voxel payload into float values (runtime sampling input). */
function decodeVoxels(payload: Uint8Array, header: NiftiHeaderInfo): VoxelAccessor | null {
  const [nx, ny, nz] = header.dims;
  const count = nx * ny * nz;
  const offset = Math.floor(header.voxOffset);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const get = (i: number, j: number, k: number): number | null => {
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return null;
    const idx = (k * ny + j) * nx + i;
    try {
      switch (header.datatype) {
        case 'uint8': return view.getUint8(offset + idx);
        case 'int8': return view.getInt8(offset + idx);
        case 'uint16': return view.getUint16(offset + idx * 2, true);
        case 'int16': return view.getInt16(offset + idx * 2, true);
        case 'uint32': return view.getUint32(offset + idx * 4, true);
        case 'int32': return view.getInt32(offset + idx * 4, true);
        case 'float32': return view.getFloat32(offset + idx * 4, true);
        case 'float64': return view.getFloat64(offset + idx * 8, true);
        default: return null;
      }
    } catch {
      return null;
    }
  };
  // Bounds-check the payload once (corrupt/truncated volume rejected §38).
  const needed = offset + count * header.bytesPerVoxel;
  if (payload.length < needed) return null;
  return { dims: header.dims, get };
}
