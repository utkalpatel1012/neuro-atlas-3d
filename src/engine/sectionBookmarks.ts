/**
 * 3D Neuroanatomy Atlas: Section Bookmarks (Phase 4B §20-§21)
 * Standard: AAS-2026-NEURO-V1
 *
 * A bookmark reconstructs section state from LOGICAL state only:
 * plane definitions, enabled states, inversion (via retainedSide),
 * camera state, selected/isolated/visibility state, label state.
 * NEVER raw geometry, Three.js objects, GPU resources, materials, Object3D.
 */

import { SerializedPlaneSet } from './SectionPlaneSet';
import { SectionPresentationSnapshot } from './sectionPresentation';

export interface SectionBookmarkCamera {
  position: [number, number, number];
  target: [number, number, number];
}

export interface SectionBookmark {
  version: 1;
  id: string;
  label: string;
  planes: SerializedPlaneSet;
  presentation: SectionPresentationSnapshot;
  camera: SectionBookmarkCamera | null;
  selectedEntityId: string | null;
  isolatedEntityId: string | null;
  hiddenEntityIds: string[];
  labelsEnabled: boolean;
}

function isFiniteVec3(v: unknown): v is [number, number, number] {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    (v as unknown[]).every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

export function createBookmark(params: {
  id: string;
  label: string;
  planes: SerializedPlaneSet;
  presentation: SectionPresentationSnapshot;
  camera: SectionBookmarkCamera | null;
  selectedEntityId: string | null;
  isolatedEntityId: string | null;
  hiddenEntityIds: string[];
  labelsEnabled: boolean;
}): SectionBookmark | null {
  if (!params.id || !params.label) return null;
  if (!params.planes || params.planes.version !== 1 || !Array.isArray(params.planes.planes)) return null;
  if (!params.presentation || params.presentation.version !== 1) return null;
  if (params.camera !== null) {
    if (!isFiniteVec3(params.camera.position) || !isFiniteVec3(params.camera.target)) return null;
  }
  return {
    version: 1,
    id: params.id,
    label: params.label,
    planes: JSON.parse(JSON.stringify(params.planes)) as SerializedPlaneSet,
    presentation: { ...params.presentation },
    camera: params.camera ? { position: [...params.camera.position], target: [...params.camera.target] } : null,
    selectedEntityId: params.selectedEntityId,
    isolatedEntityId: params.isolatedEntityId,
    hiddenEntityIds: [...params.hiddenEntityIds],
    labelsEnabled: params.labelsEnabled
  };
}

/** Deterministic serialization (fixed field order via construction). */
export function serializeBookmark(bookmark: SectionBookmark): string {
  const ordered: SectionBookmark = {
    version: 1,
    id: bookmark.id,
    label: bookmark.label,
    planes: bookmark.planes,
    presentation: bookmark.presentation,
    camera: bookmark.camera,
    selectedEntityId: bookmark.selectedEntityId,
    isolatedEntityId: bookmark.isolatedEntityId,
    hiddenEntityIds: [...bookmark.hiddenEntityIds].sort(),
    labelsEnabled: bookmark.labelsEnabled
  };
  return JSON.stringify(ordered);
}

export function deserializeBookmark(json: string): SectionBookmark | null {
  try {
    const data = JSON.parse(json) as SectionBookmark;
    if (!data || data.version !== 1) return null;
    if (typeof data.id !== 'string' || typeof data.label !== 'string') return null;
    if (!data.planes || data.planes.version !== 1 || !Array.isArray(data.planes.planes)) return null;
    if (!data.presentation || data.presentation.version !== 1) return null;
    if (data.camera !== null) {
      if (!isFiniteVec3(data.camera.position) || !isFiniteVec3(data.camera.target)) return null;
    }
    if (!Array.isArray(data.hiddenEntityIds)) return null;
    return {
      version: 1,
      id: data.id,
      label: data.label,
      planes: data.planes,
      presentation: data.presentation,
      camera: data.camera,
      selectedEntityId: data.selectedEntityId ?? null,
      isolatedEntityId: data.isolatedEntityId ?? null,
      hiddenEntityIds: [...data.hiddenEntityIds],
      labelsEnabled: data.labelsEnabled === true
    };
  } catch {
    return null;
  }
}

export function bookmarksEqual(a: SectionBookmark, b: SectionBookmark): boolean {
  return serializeBookmark(a) === serializeBookmark(b);
}
