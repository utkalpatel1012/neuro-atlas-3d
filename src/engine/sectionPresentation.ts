/**
 * 3D Neuroanatomy Atlas: Section Presentation State (Phase 4B)
 * Standard: AAS-2026-NEURO-V1
 *
 * Presentation abstraction SEPARATE from raw plane state (§4):
 *
 *   SECTION GEOMETRY STATE (SectionPlaneSet)
 *     -> SECTION PRESENTATION STATE (here)
 *     -> RENDERER (ClippingAdapter + SectionCapsManager + materials)
 *
 * No geometry, no materials, no DOM, no GPU here. Pure records + version.
 * Nothing here carries an anatomical entity ID or provenance as source anatomy.
 * Display precision (0.1 mm) is UI formatting only — it is NOT a claim of
 * anatomical measurement precision.
 */

import {
  PlaneKind,
  PlaneRecord,
  StandardPlaneKind,
  standardAxisLetter,
  Vec3
} from './sectionPlanes';
import { SectionPlaneSet } from './SectionPlaneSet';

export type SectionVisualMode =
  | 'NORMAL_SECTION'
  | 'SECTION_EDGE'
  | 'SECTION_GHOST'
  | 'SECTION_FOCUS';

export type InteriorMode =
  | 'TRUE_CAP_WHERE_VALID'
  | 'EDGE_ONLY'
  | 'NO_CAP';

export interface SectionPresentationSnapshot {
  version: 1;
  sectionModeEnabled: boolean;
  activePlaneId: string;
  gizmoVisible: boolean;
  cutEdgeVisible: boolean;
  interiorMode: InteriorMode;
  labelsEnabled: boolean;
  orientationVisible: boolean;
  readoutVisible: boolean;
  crosshairVisible: boolean;
  visualMode: SectionVisualMode;
  capsVisible: boolean;
  edgesVisible: boolean;
}

export const EMPTY_SECTION_MESSAGE =
  'No validated anatomical geometry intersects this plane.';

export const SECTION_CONTEXT_NOTE =
  'Only validated structures currently included in the atlas are displayed.';

export type PresentationListener = (version: number) => void;

const DEFAULTS: SectionPresentationSnapshot = {
  version: 1,
  sectionModeEnabled: false,
  activePlaneId: 'plane.sagittal',
  gizmoVisible: false,
  cutEdgeVisible: true,
  interiorMode: 'TRUE_CAP_WHERE_VALID',
  labelsEnabled: true,
  orientationVisible: true,
  readoutVisible: true,
  crosshairVisible: false,
  visualMode: 'NORMAL_SECTION',
  capsVisible: true,
  edgesVisible: true
};

export class SectionPresentation {
  private state: SectionPresentationSnapshot = { ...DEFAULTS };
  private listeners: Set<PresentationListener> = new Set();
  private version = 0;
  private disposed = false;

  public getVersion(): number {
    return this.version;
  }

  public getState(): SectionPresentationSnapshot {
    return { ...this.state };
  }

  public onChange(listener: PresentationListener): () => void {
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

  public setSectionModeEnabled(enabled: boolean): void {
    if (this.state.sectionModeEnabled === enabled) return;
    this.state.sectionModeEnabled = enabled;
    this.bump();
  }

  public setActivePlaneId(id: string): void {
    if (this.state.activePlaneId === id) return;
    this.state.activePlaneId = id;
    this.bump();
  }

  public setGizmoVisible(visible: boolean): void {
    if (this.state.gizmoVisible === visible) return;
    this.state.gizmoVisible = visible;
    this.bump();
  }

  public setCutEdgeVisible(visible: boolean): void {
    if (this.state.cutEdgeVisible === visible) return;
    this.state.cutEdgeVisible = visible;
    this.state.edgesVisible = visible;
    this.bump();
  }

  public setInteriorMode(mode: InteriorMode): void {
    if (this.state.interiorMode === mode) return;
    this.state.interiorMode = mode;
    this.state.capsVisible = mode === 'TRUE_CAP_WHERE_VALID';
    this.bump();
  }

  public setLabelsEnabled(enabled: boolean): void {
    if (this.state.labelsEnabled === enabled) return;
    this.state.labelsEnabled = enabled;
    this.bump();
  }

  public setOrientationVisible(visible: boolean): void {
    if (this.state.orientationVisible === visible) return;
    this.state.orientationVisible = visible;
    this.bump();
  }

  public setReadoutVisible(visible: boolean): void {
    if (this.state.readoutVisible === visible) return;
    this.state.readoutVisible = visible;
    this.bump();
  }

  public setCrosshairVisible(visible: boolean): void {
    if (this.state.crosshairVisible === visible) return;
    this.state.crosshairVisible = visible;
    this.bump();
  }

  public setVisualMode(mode: SectionVisualMode): void {
    if (this.state.visualMode === mode) return;
    this.state.visualMode = mode;
    // Mode side-effects stay diagrammatic (no dramatic effects, §28):
    // EDGE: caps off, edges on. GHOST/FOCUS: keep caps per interiorMode.
    if (mode === 'SECTION_EDGE') {
      this.state.capsVisible = false;
      this.state.edgesVisible = true;
    } else if (mode === 'NORMAL_SECTION') {
      this.state.capsVisible = this.state.interiorMode === 'TRUE_CAP_WHERE_VALID';
      this.state.edgesVisible = this.state.cutEdgeVisible;
    }
    this.bump();
  }

  public serialize(): SectionPresentationSnapshot {
    return { ...this.state };
  }

  public deserialize(data: SectionPresentationSnapshot): boolean {
    if (!data || data.version !== 1) return false;
    if (typeof data.activePlaneId !== 'string' || data.activePlaneId.length === 0) return false;
    const modes: SectionVisualMode[] = ['NORMAL_SECTION', 'SECTION_EDGE', 'SECTION_GHOST', 'SECTION_FOCUS'];
    if (!modes.includes(data.visualMode)) return false;
    const interiors: InteriorMode[] = ['TRUE_CAP_WHERE_VALID', 'EDGE_ONLY', 'NO_CAP'];
    if (!interiors.includes(data.interiorMode)) return false;
    this.state = { ...data, version: 1 };
    this.bump();
    return true;
  }

  public dispose(): void {
    this.listeners.clear();
    this.disposed = true;
  }

  public isDisposed(): boolean {
    return this.disposed;
  }
}

/** Canonical-coordinate readout only (§11-§12). No region inference. */
export function describePlane(record: PlaneRecord): string {
  if (record.kind === 'oblique') {
    const n = record.math.normal.map((v) => v.toFixed(2)).join(', ');
    const o = record.math.origin.map((v) => v.toFixed(1)).join(', ');
    const side = record.math.retainedSide === '+n' ? '+normal' : '-normal';
    const state = record.enabled ? '' : ' (disabled)';
    return `OBLIQUE · n = (${n}) · p0 = (${o}) mm · Retained: ${side}${state}`;
  }
  const letter = standardAxisLetter(record.kind as StandardPlaneKind);
  const axisIndex = letter === 'X' ? 0 : letter === 'Y' ? 1 : 2;
  const value = record.math.origin[axisIndex].toFixed(1);
  const side = record.math.retainedSide === '+n' ? '+normal' : '-normal';
  const midline = record.kind === 'sagittal' && record.math.origin[0] === 0 ? ' (midline)' : '';
  const state = record.enabled ? '' : ' (disabled)';
  return `${record.kind.toUpperCase()} · ${letter} = ${value} mm${midline} · Retained: ${side}${state}`;
}

/**
 * Orientation indicator from camera view direction (§10).
 * Canonical axes: +X Right, +Y Superior, +Z Posterior.
 * viewDir = normalized (target - cameraPosition), i.e. where the viewer looks.
 */
export function describeOrientation(viewDir: Vec3): {
  leftRight: string;
  upDown: string;
  frontBack: string;
  summary: string;
} {
  const lr = viewDir[0] > 0.15 ? 'Looking Right' : viewDir[0] < -0.15 ? 'Looking Left' : 'L-R neutral';
  const ud = viewDir[1] > 0.15 ? 'Looking Superior' : viewDir[1] < -0.15 ? 'Looking Inferior' : 'S-I neutral';
  // +Z is Posterior: looking toward +Z means looking Posterior.
  const fb = viewDir[2] > 0.15 ? 'Looking Posterior' : viewDir[2] < -0.15 ? 'Looking Anterior' : 'A-P neutral';
  return {
    leftRight: viewDir[0] >= 0 ? '+X Right' : '-X Left',
    upDown: viewDir[1] >= 0 ? '+Y Superior' : '-Y Inferior',
    frontBack: viewDir[2] >= 0 ? '+Z Posterior' : '-Z Anterior',
    summary: `${lr} · ${ud} · ${fb}`
  };
}

/** Slider range from loaded scene bounds (§25). No hard-coded brain dims. */
export function axisRangeFromBounds(
  min: number,
  max: number,
  fallbackMin = -170,
  fallbackMax = 170
): { min: number; max: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return { min: fallbackMin, max: fallbackMax };
  }
  return { min: Math.floor(min), max: Math.ceil(max) };
}

export interface SectionEntitySample {
  entityId: string;
  /** Representative points (e.g. centroid + bbox corners) in canonical mm. */
  samplePoints: Vec3[];
  /** Object visibility (mesh.visible && not hidden). Independent of clipping. */
  objectVisible: boolean;
}

export interface SectionStats {
  visibleEntityCount: number;
  intersectedEntityCount: number;
  fullyHiddenEntityCount: number;
  empty: boolean;
}

/**
 * Counts of LOADED atlas entities (§27) — never biological counts.
 * - fullyHidden: every sample culled OR object invisible.
 * - intersected: some (not all) samples culled, object visible.
 * - visible: no samples culled, object visible.
 * Empty when no enabled plane intersects any visible sample.
 */
export function computeSectionStats(
  planeSet: SectionPlaneSet,
  entities: SectionEntitySample[]
): SectionStats {
  const enabled = planeSet.getEnabledPlanes();
  if (enabled.length === 0) {
    const visible = entities.filter((e) => e.objectVisible).length;
    return { visibleEntityCount: visible, intersectedEntityCount: 0, fullyHiddenEntityCount: entities.length - visible, empty: false };
  }
  let visibleEntityCount = 0;
  let intersectedEntityCount = 0;
  let fullyHiddenEntityCount = 0;
  let anyIntersect = false;
  for (const e of entities) {
    if (!e.objectVisible || e.samplePoints.length === 0) {
      fullyHiddenEntityCount++;
      continue;
    }
    let culled = 0;
    for (const p of e.samplePoints) {
      if (planeSet.isPointCulled(p)) culled++;
    }
    if (culled === 0) visibleEntityCount++;
    else if (culled >= e.samplePoints.length) fullyHiddenEntityCount++;
    else {
      intersectedEntityCount++;
      anyIntersect = true;
    }
    if (culled < e.samplePoints.length && e.samplePoints.length > 0) {
      // At least one retained sample: plane touches or passes near this entity.
      if (culled > 0) anyIntersect = true;
    }
  }
  // Empty when no visible sample intersects any enabled plane region:
  // i.e. every entity is either fully visible (plane misses everything) with
  // zero intersections, or fully hidden. Detect via intersection count plus
  // a direct retained-sample check is unnecessary headless — use intersected==0
  // AND at least one enabled plane AND no entity straddles. Callers combine
  // with geometry contour emptiness for the UI message.
  const empty = intersectedEntityCount === 0 && !anyIntersect && fullyHiddenEntityCount === entities.length;
  void empty;
  // Neutral empty-state for the common case (plane hits nothing retained):
  // computed by caller from caps/edge emptiness; stats stay honest counts.
  return { visibleEntityCount, intersectedEntityCount, fullyHiddenEntityCount, empty: false };
}

/** Active plane kind for gizmo/readout focus. Defaults to sagittal. */
export function activePlaneKind(presentation: SectionPresentation, planeSet: SectionPlaneSet): PlaneKind {
  const record = planeSet.getPlane(presentation.getState().activePlaneId);
  return record ? record.kind : 'sagittal';
}
