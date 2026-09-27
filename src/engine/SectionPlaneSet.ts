/**
 * 3D Neuroanatomy Atlas: Section Plane State Store (Phase 4A)
 * Standard: AAS-2026-NEURO-V1
 *
 * APPLICATION STATE — lives outside the renderer (§23). The renderer adapter
 * (ClippingAdapter) reads this store; renderer recreation re-reads it, so GPU
 * state loss can never lose anatomical plane state.
 *
 * No geometry, no materials, no DOM, no GPU here. Pure records + version counter.
 * Listeners are explicit subscribe/unsubscribe with dispose cleanup (§21).
 */

import {
  PlaneKind,
  PlaneRecord,
  SectionPlane,
  StandardPlaneKind,
  makePlane,
  invertPlane,
  movePlane,
  standardAxisIndex,
  Vec3
} from './sectionPlanes';

export type PlaneChangeListener = (version: number) => void;

export interface SerializedPlaneSet {
  version: 1;
  planes: Array<{
    id: string;
    kind: PlaneKind;
    normal: Vec3;
    origin: Vec3;
    retainedSide: '+n' | '-n';
    originProvenance: string;
    enabled: boolean;
  }>;
}

function defaultMathFor(kind: PlaneKind): SectionPlane {
  // Neutral defaults at canonical origin, disabled. NOT anatomy-derived.
  const math = makePlane([1, 0, 0], [0, 0, 0], '+n', 'Phase 4A neutral default (canonical origin, not anatomy)');
  if (!math) throw new Error('Default plane construction failed');
  if (kind === 'coronal') {
    const m = makePlane([0, 0, 1], [0, 0, 0], '+n', 'Phase 4A neutral default (canonical origin, not anatomy)');
    if (!m) throw new Error('Default plane construction failed');
    return m;
  }
  if (kind === 'axial') {
    const m = makePlane([0, 1, 0], [0, 0, 0], '+n', 'Phase 4A neutral default (canonical origin, not anatomy)');
    if (!m) throw new Error('Default plane construction failed');
    return m;
  }
  return math;
}

export class SectionPlaneSet {
  private planes: Map<string, PlaneRecord> = new Map();
  private listeners: Set<PlaneChangeListener> = new Set();
  private version = 0;
  private disposed = false;

  constructor() {
    this.reset();
  }

  /** Monotonic version; adapter syncs only when this changes (never per frame). */
  public getVersion(): number {
    return this.version;
  }

  public getPlane(id: string): PlaneRecord | undefined {
    return this.planes.get(id);
  }

  public getPlanes(): PlaneRecord[] {
    return [...this.planes.values()];
  }

  /** Only enabled planes, in stable insertion order (deterministic GPU order). */
  public getEnabledPlanes(): PlaneRecord[] {
    return [...this.planes.values()].filter((p) => p.enabled);
  }

  public onChange(listener: PlaneChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private bump(): void {
    this.version++;
    for (const listener of [...this.listeners]) {
      listener(this.version);
    }
  }

  private static idFor(kind: PlaneKind, id?: string): string {
    if (id) return id;
    if (kind === 'oblique') return `plane.oblique.${Date.now()}`;
    return `plane.${kind}`;
  }

  public addStandardPlane(kind: StandardPlaneKind, constantMm: number, retainedSide: '+n' | '-n' = '+n'): PlaneRecord | null {
    if (!Number.isFinite(constantMm)) return null;
    const base = defaultMathFor(kind);
    const axis = standardAxisIndex(kind);
    const origin: Vec3 = [base.origin[0], base.origin[1], base.origin[2]];
    origin[axis] = constantMm;
    const math = movePlane(base, origin, `Phase 4A standard ${kind} at canonical constant ${constantMm} mm`);
    if (!math) return null;
    // Exact normal per kind (movePlane preserves base normal, which is correct).
    math.retainedSide = retainedSide;
    const record: PlaneRecord = { id: SectionPlaneSet.idFor(kind), kind, math, enabled: false };
    this.planes.set(record.id, record);
    this.bump();
    return record;
  }

  public addObliquePlane(normal: Vec3, origin: Vec3, retainedSide: '+n' | '-n' = '+n', id?: string): PlaneRecord | null {
    const math = makePlane(normal, origin, retainedSide, 'Phase 4A user-defined oblique plane (explicit numbers)');
    if (!math) return null;
    const record: PlaneRecord = { id: SectionPlaneSet.idFor('oblique', id), kind: 'oblique', math, enabled: false };
    this.planes.set(record.id, record);
    this.bump();
    return record;
  }

  public setEnabled(id: string, enabled: boolean): boolean {
    const record = this.planes.get(id);
    if (!record || record.enabled === enabled) return false;
    record.enabled = enabled;
    this.bump();
    return true;
  }

  /** Move a standard plane along its axis (constant in canonical mm). */
  public setConstant(id: string, constantMm: number): boolean {
    const record = this.planes.get(id);
    if (!record || (record.kind !== 'sagittal' && record.kind !== 'coronal' && record.kind !== 'axial')) return false;
    if (!Number.isFinite(constantMm)) return false;
    const axis = standardAxisIndex(record.kind);
    const origin: Vec3 = [record.math.origin[0], record.math.origin[1], record.math.origin[2]];
    origin[axis] = constantMm;
    const moved = movePlane(record.math, origin, `Phase 4A ${record.kind} moved to canonical constant ${constantMm} mm`);
    if (!moved) return false;
    record.math = moved;
    this.bump();
    return true;
  }

  /** Move an oblique plane to a new origin (normal preserved). */
  public setObliqueOrigin(id: string, origin: Vec3): boolean {
    const record = this.planes.get(id);
    if (!record || record.kind !== 'oblique') return false;
    const moved = movePlane(record.math, origin, 'Phase 4A oblique plane origin moved (explicit numbers)');
    if (!moved) return false;
    record.math = moved;
    this.bump();
    return true;
  }

  /** Replace an oblique plane normal (auto-normalized; zero rejected). */
  public setObliqueNormal(id: string, normal: Vec3): boolean {
    const record = this.planes.get(id);
    if (!record || record.kind !== 'oblique') return false;
    const math = makePlane(normal, record.math.origin, record.math.retainedSide, record.math.originProvenance);
    if (!math) return false;
    record.math = math;
    this.bump();
    return true;
  }

  public invert(id: string): boolean {
    const record = this.planes.get(id);
    if (!record) return false;
    record.math = invertPlane(record.math);
    this.bump();
    return true;
  }

  public removePlane(id: string): boolean {
    const removed = this.planes.delete(id);
    if (removed) this.bump();
    return removed;
  }

  /** Restore neutral defaults (three standard planes at origin, all disabled). */
  public reset(): void {
    this.planes.clear();
    for (const kind of ['sagittal', 'coronal', 'axial'] as StandardPlaneKind[]) {
      this.planes.set(`plane.${kind}`, { id: `plane.${kind}`, kind, math: defaultMathFor(kind), enabled: false });
    }
    this.bump();
  }

  public serialize(): SerializedPlaneSet {
    return {
      version: 1,
      planes: [...this.planes.values()].map((p) => ({
        id: p.id,
        kind: p.kind,
        normal: [p.math.normal[0], p.math.normal[1], p.math.normal[2]],
        origin: [p.math.origin[0], p.math.origin[1], p.math.origin[2]],
        retainedSide: p.math.retainedSide,
        originProvenance: p.math.originProvenance,
        enabled: p.enabled
      }))
    };
  }

  public deserialize(data: SerializedPlaneSet): boolean {
    if (!data || data.version !== 1 || !Array.isArray(data.planes)) return false;
    const next = new Map<string, PlaneRecord>();
    for (const p of data.planes) {
      if (typeof p.id !== 'string' || (p.kind !== 'sagittal' && p.kind !== 'coronal' && p.kind !== 'axial' && p.kind !== 'oblique')) return false;
      const math = makePlane(p.normal, p.origin, p.retainedSide, p.originProvenance);
      if (!math) return false;
      next.set(p.id, { id: p.id, kind: p.kind, math, enabled: p.enabled === true });
    }
    this.planes = next;
    this.bump();
    return true;
  }

  public dispose(): void {
    this.listeners.clear();
    this.planes.clear();
    this.disposed = true;
  }

  public isDisposed(): boolean {
    return this.disposed;
  }
}
