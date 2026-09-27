/**
 * 3D Neuroanatomy Atlas: Derived Section Surfaces & Edges (Phase 4B)
 * Standard: AAS-2026-NEURO-V1
 *
 * TRUE DERIVED SECTION SURFACES — computed from actual mesh-plane intersection,
 * never invented. Pipeline per mesh per enabled plane:
 *
 *   triangles x plane -> segments -> stitch (tolerance-quantized) ->
 *   closed loops (triangulated via earcut) + open polylines (edges only).
 *
 * Scientific contract (§5-§7):
 * - A cap is a DERIVED VISUALIZATION SURFACE, not tissue: no entity ID, no
 *   provenance as source anatomy, flat unlit neutral material, DoubleSide.
 * - Open contours, coplanar/grazing/degenerate triangles, triangulation failures
 *   fall back to SECTION_EDGE_ONLY (lines) or nothing — never a fake surface.
 * - Nested-loop holes are NOT resolved (documented limitation): each closed loop
 *   triangulates independently; overfill of donut-like sections is possible.
 * - Cache key includes assetId + LOD + plane definition (§33-34): a cap can NEVER
 *   silently pair with the wrong geometry. Bounded (MAX_CACHED_CAPS) with dispose.
 *
 * Performance (§31-32, §35): event-driven recompute only (quantized cache keys
 * give the plane-movement threshold; mesh/LOD changes via explicit refresh).
 * No per-frame work, no unbounded growth, shared materials (no per-cap clones).
 */

import * as THREE from 'three';
import earcut from 'earcut';
import { SectionPlane, Vec3 } from './sectionPlanes';

export const CONTOUR_STITCH_TOL_MM = 1e-4;
export const CAP_CACHE_QUANT_MM = 0.5;
export const MAX_CACHED_CAPS = 12;

export interface ContourSet {
  /** Closed loops (each >= 3 unique points). */
  loops: Vec3[][];
  /** Open polylines (chunk seams, sheet edges, grazing leftovers). */
  opens: Vec3[][];
  degenerateSkipped: number;
  coplanarSkipped: number;
}

interface Chain { points: Vec3[]; }
interface ChainEnd { chain: Chain; end: 0 | 1; }

function keyOf(p: Vec3, tol: number): string {
  return `${Math.round(p[0] / tol)},${Math.round(p[1] / tol)},${Math.round(p[2] / tol)}`;
}

/**
 * Intersect every triangle with the plane; stitch segments into contours.
 * Pure + deterministic. Works on indexed BufferGeometry position arrays.
 *
 * Per-triangle rule (consistent, no double emission):
 * - 3 on-plane vertices -> coplanar: skip + count.
 * - 2 on-plane vertices -> edge lies on plane: skip (neighbor emits if needed).
 * - 1 on-plane vertex + opposite edge strictly crossing -> segment.
 * - 0 on-plane + signs differ -> exactly two edge crossings -> segment.
 * - Same side / grazing leftovers -> nothing.
 */
export function computeContours(
  positions: Float32Array,
  index: Uint16Array | Uint32Array | number[],
  plane: SectionPlane,
  toleranceMm: number = CONTOUR_STITCH_TOL_MM
): ContourSet {
  const n = plane.normal;
  const origin = plane.origin;
  const eps = 1e-6;
  const loops: Vec3[][] = [];
  const opens: Vec3[][] = [];
  let degenerateSkipped = 0;
  let coplanarSkipped = 0;

  const endMap: Map<string, ChainEnd> = new Map();

  const detach = (chain: Chain): void => {
    for (const [k, v] of [...endMap.entries()]) {
      if (v.chain === chain) endMap.delete(k);
    }
  };

  const closeChain = (chain: Chain): void => {
    const pts = chain.points;
    if (pts.length >= 4 && keyOf(pts[0], toleranceMm) === keyOf(pts[pts.length - 1], toleranceMm)) {
      pts.pop(); // drop duplicated closing point.
    }
    if (pts.length >= 3) loops.push(pts);
    else if (pts.length >= 2) opens.push(pts);
    else degenerateSkipped++;
  };

  const register = (chain: Chain): void => {
    const pts = chain.points;
    if (pts.length === 0) { degenerateSkipped++; return; }
    const k0 = keyOf(pts[0], toleranceMm);
    const k1 = keyOf(pts[pts.length - 1], toleranceMm);
    if (k0 === k1) {
      // Ends meet: closed loop (or degenerate self-touch -> closeChain sorts it).
      closeChain(chain);
      return;
    }
    endMap.set(k0, { chain, end: 0 });
    endMap.set(k1, { chain, end: 1 });
  };

  const attachSegment = (a: Vec3, b: Vec3): void => {
    const ka = keyOf(a, toleranceMm);
    const kb = keyOf(b, toleranceMm);
    if (ka === kb) { degenerateSkipped++; return; }
    const ea = endMap.get(ka);
    const eb = endMap.get(kb);
    if (!ea && !eb) {
      register({ points: [a, b] });
      return;
    }
    if (ea && !eb) {
      // Endpoint `a` sits at chain end ea; extend with `b` unless already there.
      detach(ea.chain);
      const pts = ea.chain.points;
      if (ea.end === 0) {
        if (keyOf(pts[0], toleranceMm) !== kb) pts.unshift(b);
      } else {
        if (keyOf(pts[pts.length - 1], toleranceMm) !== kb) pts.push(b);
      }
      register(ea.chain);
      return;
    }
    if (!ea && eb) {
      detach(eb.chain);
      const pts = eb.chain.points;
      if (eb.end === 0) {
        if (keyOf(pts[0], toleranceMm) !== ka) pts.unshift(a);
      } else {
        if (keyOf(pts[pts.length - 1], toleranceMm) !== ka) pts.push(a);
      }
      register(eb.chain);
      return;
    }
    // Both ends attach.
    if (ea!.chain === eb!.chain) {
      // Same chain, distinct ends (ka !== kb guaranteed here): closes the loop.
      detach(ea!.chain);
      closeChain(ea!.chain);
      return;
    }
    // Merge two chains: orient so ea-end is tail, eb-end is head, concatenate.
    detach(ea!.chain);
    detach(eb!.chain);
    let aPts = ea!.chain.points;
    let bPts = eb!.chain.points;
    if (ea!.end === 0) aPts = [...aPts].reverse();
    if (eb!.end === 1) bPts = [...bPts].reverse();
    register({ points: [...aPts, ...bPts] });
  };

  const distAt = (i: number): number =>
    n[0] * (positions[i * 3] - origin[0]) +
    n[1] * (positions[i * 3 + 1] - origin[1]) +
    n[2] * (positions[i * 3 + 2] - origin[2]);

  const pointAt = (i: number): Vec3 =>
    [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];

  const edgePoint = (ia: number, ib: number, da: number, db: number): Vec3 => {
    const t = da / (da - db);
    return [
      positions[ia * 3] + (positions[ib * 3] - positions[ia * 3]) * t,
      positions[ia * 3 + 1] + (positions[ib * 3 + 1] - positions[ia * 3 + 1]) * t,
      positions[ia * 3 + 2] + (positions[ib * 3 + 2] - positions[ia * 3 + 2]) * t
    ];
  };

  const triCount = Math.floor(index.length / 3);
  for (let t = 0; t < triCount; t++) {
    const i0 = index[t * 3];
    const i1 = index[t * 3 + 1];
    const i2 = index[t * 3 + 2];
    if (i0 === i1 || i1 === i2 || i0 === i2) { degenerateSkipped++; continue; }
    const d0 = distAt(i0);
    const d1 = distAt(i1);
    const d2 = distAt(i2);
    const s0 = Math.abs(d0) <= eps ? 0 : Math.sign(d0);
    const s1 = Math.abs(d1) <= eps ? 0 : Math.sign(d1);
    const s2 = Math.abs(d2) <= eps ? 0 : Math.sign(d2);
    const zeros = (s0 === 0 ? 1 : 0) + (s1 === 0 ? 1 : 0) + (s2 === 0 ? 1 : 0);
    if (zeros === 3) { coplanarSkipped++; continue; }
    if (zeros === 2) continue;
    if (zeros === 1) {
      const ds = [d0, d1, d2];
      const is = [i0, i1, i2];
      const z = ds.findIndex((d) => Math.abs(d) <= eps);
      const a = (z + 1) % 3;
      const b = (z + 2) % 3;
      if (ds[a] * ds[b] < 0) {
        attachSegment(pointAt(is[z]), edgePoint(is[a], is[b], ds[a], ds[b]));
      }
      continue;
    }
    if (s0 === s1 && s1 === s2) continue;
    const verts = [{ i: i0, d: d0 }, { i: i1, d: d1 }, { i: i2, d: d2 }];
    const pts: Vec3[] = [];
    for (let e = 0; e < 3; e++) {
      const A = verts[e];
      const B = verts[(e + 1) % 3];
      if (A.d * B.d < 0) pts.push(edgePoint(A.i, B.i, A.d, B.d));
    }
    if (pts.length === 2) attachSegment(pts[0], pts[1]);
    else degenerateSkipped++;
  }

  // Flush remaining open chains (dedupe: one record per chain).
  const seen = new Set<Chain>();
  for (const { chain } of endMap.values()) {
    if (seen.has(chain)) continue;
    seen.add(chain);
    const pts = chain.points;
    if (pts.length >= 4 && keyOf(pts[0], toleranceMm) === keyOf(pts[pts.length - 1], toleranceMm)) {
      closeChain(chain);
    } else if (pts.length >= 2) {
      opens.push(pts);
    } else {
      degenerateSkipped++;
    }
  }

  return { loops, opens, degenerateSkipped, coplanarSkipped };
}

/**
 * Triangulate one closed loop on its plane. Projects by dropping the dominant
 * normal axis, runs earcut, lifts back EXACTLY onto the plane. Returns null on
 * any failure (caller falls back to edges) — never a broken surface.
 */
export function triangulateLoop(
  loop: Vec3[],
  plane: SectionPlane
): { positions: number[]; indices: number[] } | null {
  try {
    if (loop.length < 3) return null;
    const n = plane.normal;
    const ax = Math.abs(n[0]);
    const ay = Math.abs(n[1]);
    const az = Math.abs(n[2]);
    const drop = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
    const u = (drop + 1) % 3;
    const v = (drop + 2) % 3;
    const flat: number[] = [];
    for (const p of loop) flat.push(p[u], p[v]);
    const indices = earcut(flat, null, 2);
    if (!indices || indices.length < 3) return null;
    const o = plane.origin;
    const positions: number[] = [];
    const denom = drop === 0 ? n[0] : drop === 1 ? n[1] : n[2];
    if (Math.abs(denom) < 1e-12) return null;
    for (let i = 0; i < loop.length; i++) {
      const pu = flat[i * 2];
      const pv = flat[i * 2 + 1];
      const full: number[] = [0, 0, 0];
      full[u] = pu;
      full[v] = pv;
      full[drop] = o[drop] - (n[u] * (pu - o[u]) + n[v] * (pv - o[v])) / denom;
      positions.push(full[0], full[1], full[2]);
    }
    return { positions, indices };
  } catch {
    return null;
  }
}

export interface CapBuild {
  capGeometry: THREE.BufferGeometry | null;
  edgeGeometry: THREE.BufferGeometry | null;
  loopsUsed: number;
  loopsTotal: number;
  opensTotal: number;
}

/** Build cap + edge geometries for one mesh/plane pair. No entity, no provenance. */
export function buildSectionGeometries(
  positions: Float32Array,
  index: Uint16Array | Uint32Array | number[],
  plane: SectionPlane,
  retainedNormal: Vec3
): CapBuild {
  const contours = computeContours(positions, index, plane);
  const capPositions: number[] = [];
  const capIndices: number[] = [];
  let loopsUsed = 0;
  for (const loop of contours.loops) {
    const tri = triangulateLoop(loop, plane);
    if (!tri) continue;
    const base = capPositions.length / 3;
    capPositions.push(...tri.positions);
    for (const ix of tri.indices) capIndices.push(base + ix);
    loopsUsed++;
  }
  let capGeometry: THREE.BufferGeometry | null = null;
  if (capIndices.length >= 3) {
    capGeometry = new THREE.BufferGeometry();
    capGeometry.setAttribute('position', new THREE.Float32BufferAttribute(capPositions, 3));
    const normals = new Float32Array((capPositions.length / 3) * 3);
    for (let i = 0; i < capPositions.length / 3; i++) {
      normals[i * 3] = retainedNormal[0];
      normals[i * 3 + 1] = retainedNormal[1];
      normals[i * 3 + 2] = retainedNormal[2];
    }
    capGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    capGeometry.setIndex(capIndices);
  }
  // Edges: every loop boundary + every open polyline (geometric intersection viz).
  const edgePositions: number[] = [];
  const pushPolyline = (pts: Vec3[]): void => {
    for (let i = 0; i + 1 < pts.length; i++) {
      edgePositions.push(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]);
    }
  };
  for (const loop of contours.loops) {
    pushPolyline(loop);
    const f = loop[0];
    const l = loop[loop.length - 1];
    edgePositions.push(l[0], l[1], l[2], f[0], f[1], f[2]);
  }
  for (const open of contours.opens) pushPolyline(open);
  let edgeGeometry: THREE.BufferGeometry | null = null;
  if (edgePositions.length >= 6) {
    edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  }
  return {
    capGeometry,
    edgeGeometry,
    loopsUsed,
    loopsTotal: contours.loops.length,
    opensTotal: contours.opens.length
  };
}

export interface CapsMeshInput {
  mesh: THREE.Mesh;
  assetId: string;
  lod: string;
}

export interface CapsPlaneInput {
  id: string;
  math: SectionPlane;
}

function quantizePlaneKey(plane: SectionPlane): string {
  const q = (v: number): number => Math.round(v / CAP_CACHE_QUANT_MM) * CAP_CACHE_QUANT_MM;
  const n = plane.normal;
  const o = plane.origin;
  return `${q(n[0])},${q(n[1])},${q(n[2])}|${q(o[0])},${q(o[1])},${q(o[2])}`;
}

/**
 * Bounded, explicitly-owned cache of derived section meshes. Key includes
 * assetId + LOD + plane definition (§33-34): a cap can NEVER silently pair with
 * the wrong geometry. Oldest evicted first with geometry disposal (§32, §35).
 * Retained side excluded from the key: the intersection SET is side-independent
 * (facing handled by DoubleSide + retained normal), so inversion rebuilds nothing.
 */
export class SectionCapsManager {
  private entries: Map<string, { cap: THREE.Mesh | null; edges: THREE.LineSegments | null; usedAt: number }> = new Map();
  private clock = 0;
  private disposed = false;
  private group: THREE.Group = new THREE.Group();
  /** Flat unlit amber: reads as diagrammatic aid, never tissue. Shared (no clones). */
  private capMaterial: THREE.MeshBasicMaterial;
  /** Slate intersection lines. Shared. */
  private edgeMaterial: THREE.LineBasicMaterial;
  private sharedPlanes: readonly THREE.Plane[] = [];
  private lodUnsub: (() => void) | null = null;
  private meshProvider: (() => CapsMeshInput[]) | null = null;
  private lastPlanes: CapsPlaneInput[] = [];

  constructor() {
    this.group.name = 'SectionCaps_DerivedVisualization';
    this.capMaterial = new THREE.MeshBasicMaterial({
      color: 0xc9a24d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: true
    });
    this.capMaterial.name = 'DerivedSectionCap_Material';
    this.edgeMaterial = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
    this.edgeMaterial.name = 'DerivedSectionEdge_Material';
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setSharedPlanes(planes: readonly THREE.Plane[]): void {
    this.sharedPlanes = planes;
    for (const entry of this.entries.values()) {
      if (entry.cap) (entry.cap.material as THREE.Material).clippingPlanes = planes as THREE.Plane[];
      if (entry.edges) (entry.edges.material as THREE.Material).clippingPlanes = planes as THREE.Plane[];
    }
  }

  public attachMeshProvider(provider: () => CapsMeshInput[]): void {
    this.meshProvider = provider;
  }

  /** Subscribe to LOD switches: caps for a re-lodded asset are dropped (§33). */
  public attachLODManager(lodManager: { onLODChanged(listener: (entityId: string) => void): () => void }): void {
    if (this.lodUnsub) this.lodUnsub();
    this.lodUnsub = lodManager.onLODChanged(() => {
      this.refreshFromProvider();
    });
  }

  /** Rebuild from provider + last planes (LOD-change path). No-op without both. */
  public refreshFromProvider(): void {
    if (this.disposed || !this.meshProvider || this.lastPlanes.length === 0) return;
    this.refresh(this.meshProvider(), this.lastPlanes);
  }

  private cacheKey(assetId: string, lod: string, planeId: string, plane: SectionPlane): string {
    return `${assetId}:${lod}:${planeId}:${quantizePlaneKey(plane)}`;
  }

  /**
   * Event-driven entry point: rebuild caps/edges for the given meshes+planes.
   * Stale entries (plane gone, mesh gone) are disposed. Bounded LRU eviction.
   */
  public refresh(
    inputs: CapsMeshInput[],
    planes: CapsPlaneInput[]
  ): void {
    if (this.disposed) return;
    this.lastPlanes = planes;
    const wanted = new Set<string>();
    for (const input of inputs) {
      const geometry = input.mesh.geometry as THREE.BufferGeometry;
      const positionAttr = geometry.attributes.position as THREE.BufferAttribute | undefined;
      const index = geometry.index;
      if (!positionAttr || !index) continue;
      const posArray = positionAttr.array as Float32Array;
      const idxArray = index.array as Uint16Array | Uint32Array;
      for (const plane of planes) {
        const key = this.cacheKey(input.assetId, input.lod, plane.id, plane.math);
        wanted.add(key);
        if (this.entries.has(key)) {
          const entry = this.entries.get(key)!;
          entry.usedAt = ++this.clock;
          continue;
        }
        const build = buildSectionGeometries(
          posArray,
          idxArray,
          plane.math,
          plane.math.retainedSide === '+n' ? plane.math.normal : [
            -plane.math.normal[0], -plane.math.normal[1], -plane.math.normal[2]
          ]
        );
        let capMesh: THREE.Mesh | null = null;
        if (build.capGeometry) {
          capMesh = new THREE.Mesh(build.capGeometry, this.capMaterial);
          this.capMaterial.clippingPlanes = this.sharedPlanes as THREE.Plane[];
          capMesh.userData = {
            derivedSectionSurface: true,
            assetId: input.assetId,
            lod: input.lod,
            planeId: plane.id,
            loopsUsed: build.loopsUsed,
            loopsTotal: build.loopsTotal
          };
          // NOTE: deliberately NO entityId — caps must never resolve as entities.
          this.group.add(capMesh);
        }
        let edgeLines: THREE.LineSegments | null = null;
        if (build.edgeGeometry) {
          edgeLines = new THREE.LineSegments(build.edgeGeometry, this.edgeMaterial);
          this.edgeMaterial.clippingPlanes = this.sharedPlanes as THREE.Plane[];
          edgeLines.userData = { derivedSectionEdge: true, assetId: input.assetId, lod: input.lod, planeId: plane.id };
          this.group.add(edgeLines);
        }
        this.entries.set(key, { cap: capMesh, edges: edgeLines, usedAt: ++this.clock });
        this.evictIfNeeded();
      }
    }
    for (const key of [...this.entries.keys()]) {
      if (!wanted.has(key)) this.evict(key);
    }
  }

  public getEntryCount(): number {
    return this.entries.size;
  }

  private evictIfNeeded(): void {
    while (this.entries.size > MAX_CACHED_CAPS) {
      let oldestKey: string | null = null;
      let oldestUsed = Infinity;
      for (const [key, entry] of this.entries) {
        if (entry.usedAt < oldestUsed) {
          oldestUsed = entry.usedAt;
          oldestKey = key;
        }
      }
      if (oldestKey === null) return;
      this.evict(oldestKey);
    }
  }

  private evict(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.cap) {
      this.group.remove(entry.cap);
      entry.cap.geometry.dispose();
    }
    if (entry.edges) {
      this.group.remove(entry.edges);
      entry.edges.geometry.dispose();
    }
    this.entries.delete(key);
  }

  public clear(): void {
    for (const key of [...this.entries.keys()]) this.evict(key);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.clear();
    if (this.lodUnsub) {
      this.lodUnsub();
      this.lodUnsub = null;
    }
    this.meshProvider = null;
    this.lastPlanes = [];
    this.capMaterial.dispose();
    this.edgeMaterial.dispose();
    this.disposed = true;
  }

  public isDisposed(): boolean {
    return this.disposed;
  }
}
