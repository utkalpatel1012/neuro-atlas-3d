/**
 * 3D Neuroanatomy Atlas: Standard Educational Section Presets (Phase 4B §22)
 * Standard: AAS-2026-NEURO-V1
 *
 * Presets specify PLANE COORDINATES AND NORMALS in canonical space only
 * (+X Right, +Y Superior, +Z Posterior, mm). Names do NOT imply clinically
 * meaningful registration. "Mid" is used only with an explicit numerical
 * definition below. No region inference, no MNI, no parcel content.
 */

import { SectionPlaneSet } from './SectionPlaneSet';
import { StandardPlaneKind, Vec3 } from './sectionPlanes';

export interface SectionPreset {
  id: string;
  label: string;
  kind: StandardPlaneKind;
  /** Canonical constant (X for sagittal, Z for coronal, Y for axial). */
  constantMm: number;
  retainedSide: '+n' | '-n';
  /** Explicit numerical definition (required for "Mid" names). */
  definition: string;
}

export const SECTION_PRESETS: SectionPreset[] = [
  {
    id: 'preset.mid_sagittal',
    label: 'MID-SAGITTAL',
    kind: 'sagittal',
    constantMm: 0,
    retainedSide: '+n',
    definition: 'Sagittal plane at canonical X = 0.0 mm (repo midline convention)'
  },
  {
    id: 'preset.left_parasagittal',
    label: 'LEFT-PARASAGITTAL',
    kind: 'sagittal',
    constantMm: -25,
    retainedSide: '+n',
    definition: 'Sagittal plane at canonical X = -25.0 mm (explicit number, not registration)'
  },
  {
    id: 'preset.right_parasagittal',
    label: 'RIGHT-PARASAGITTAL',
    kind: 'sagittal',
    constantMm: 25,
    retainedSide: '+n',
    definition: 'Sagittal plane at canonical X = +25.0 mm (explicit number, not registration)'
  },
  {
    id: 'preset.mid_coronal',
    label: 'MID-CORONAL',
    kind: 'coronal',
    constantMm: -20,
    retainedSide: '+n',
    definition: 'Coronal plane at canonical Z = -20.0 mm (explicit number near loaded block)'
  },
  {
    id: 'preset.posterior_coronal',
    label: 'POSTERIOR-CORONAL',
    kind: 'coronal',
    constantMm: 10,
    retainedSide: '+n',
    definition: 'Coronal plane at canonical Z = +10.0 mm (explicit number; may be empty)'
  },
  {
    id: 'preset.mid_axial',
    label: 'MID-AXIAL',
    kind: 'axial',
    constantMm: 0,
    retainedSide: '+n',
    definition: 'Axial plane at canonical Y = 0.0 mm (explicit canonical origin)'
  },
  {
    id: 'preset.superior_axial',
    label: 'SUPERIOR-AXIAL',
    kind: 'axial',
    constantMm: 30,
    retainedSide: '+n',
    definition: 'Axial plane at canonical Y = +30.0 mm (explicit number; may be empty)'
  }
];

export function getPreset(id: string): SectionPreset | undefined {
  return SECTION_PRESETS.find((p) => p.id === id);
}

/**
 * Apply a preset to the plane set: set the matching standard plane constant
 * and enable it (other planes untouched — multi-plane stays compositional).
 * Returns false for unknown ids or non-finite constants (never partial apply).
 */
export function applyPreset(planeSet: SectionPlaneSet, presetId: string): boolean {
  const preset = getPreset(presetId);
  if (!preset) return false;
  if (!Number.isFinite(preset.constantMm)) return false;
  const planeId = `plane.${preset.kind}`;
  const ok = planeSet.setConstant(planeId, preset.constantMm);
  if (!ok) return false;
  const record = planeSet.getPlane(planeId);
  if (!record) return false;
  // Align retained side with the preset definition.
  if (record.math.retainedSide !== preset.retainedSide) {
    planeSet.invert(planeId);
  }
  planeSet.setEnabled(planeId, true);
  return true;
}

/** Canonical origin of a preset (for crosshair/marker placement, not anatomy). */
export function presetOrigin(preset: SectionPreset): Vec3 {
  if (preset.kind === 'sagittal') return [preset.constantMm, 0, 0];
  if (preset.kind === 'coronal') return [0, 0, preset.constantMm];
  return [0, preset.constantMm, 0];
}
