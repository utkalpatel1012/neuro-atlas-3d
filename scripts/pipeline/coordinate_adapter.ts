/**
 * 3D Neuroanatomy Atlas: Source Coordinate Adapter Architecture
 * Standard: AAS-2026-NEURO-V1 (Phase 1.0.1 Hardening)
 * 
 * Provides an explicit, reproducible transformation abstraction from any
 * source coordinate system (DICOM LPS, MNI152, FreeSurfer) to canonical
 * Right-Handed RAS Three.js space (+X Right, +Y Superior, +Z Anterior).
 */

export type SourceAxisKey = 'x' | '-x' | 'y' | '-y' | 'z' | '-z';

export interface AxisMapping {
  // Target canonical axis mapped from source axis
  x: SourceAxisKey; // Canonical +X (Right) mapped from
  y: SourceAxisKey; // Canonical +Y (Superior) mapped from
  z: SourceAxisKey; // Canonical +Z (Anterior) mapped from
}

export interface SourceCoordinateAdapter {
  adapter_id: string;
  source_coordinate_system: string;
  source_orientation: string; // e.g. 'LPS', 'RAS', 'LPI', 'RAI'
  source_units: 'mm' | 'm' | 'cm';
  source_origin: string;      // e.g. 'WHOLE_BODY_ABSOLUTE_TABLE_ORIGIN', 'AC_PC_COMMISSURAL', 'MNI_ANTERIOR_COMMISSURE'
  target_canonical_system: 'THREEJS_RAS_CANONICAL';
  target_orientation: 'RAS';  // +X Right, +Y Superior, +Z Anterior
  target_units: 'mm';
  axis_mapping: AxisMapping;
  translation_mm: [number, number, number]; // [tx, ty, tz] in target space after axis mapping
  scale: number;              // Unit scale factor to millimeters
  registration_metadata: {
    registration_method: string;
    reference_landmarks?: Record<string, [number, number, number]>;
    transformation_matrix_4x4?: number[][];
    notes?: string;
  };
  transformation_version: string;
}

/**
 * Validates that an adapter defines a valid orthogonal bijective basis.
 */
export function validateAdapter(adapter: SourceCoordinateAdapter): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const axesUsed = [
    adapter.axis_mapping.x.replace('-', ''),
    adapter.axis_mapping.y.replace('-', ''),
    adapter.axis_mapping.z.replace('-', '')
  ];

  const uniqueAxes = new Set(axesUsed);
  if (uniqueAxes.size !== 3 || !uniqueAxes.has('x') || !uniqueAxes.has('y') || !uniqueAxes.has('z')) {
    errors.push(`Invalid axis mapping: target axes must map uniquely to {x, y, z}. Found: ${axesUsed.join(', ')}`);
  }

  if (adapter.scale <= 0 || !isFinite(adapter.scale)) {
    errors.push(`Invalid scale factor: ${adapter.scale}. Must be positive non-zero.`);
  }

  if (adapter.target_canonical_system !== 'THREEJS_RAS_CANONICAL' || adapter.target_orientation !== 'RAS') {
    errors.push(`Target canonical system must be THREEJS_RAS_CANONICAL with RAS orientation.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Transforms a single 3D coordinate from source to canonical RAS space.
 */
export function transformPoint(
  point: [number, number, number],
  adapter: SourceCoordinateAdapter
): [number, number, number] {
  const [sx, sy, sz] = point;
  const scale = adapter.scale;

  function evalAxis(key: SourceAxisKey): number {
    switch (key) {
      case 'x': return sx * scale;
      case '-x': return -sx * scale;
      case 'y': return sy * scale;
      case '-y': return -sy * scale;
      case 'z': return sz * scale;
      case '-z': return -sz * scale;
    }
  }

  const mappedX = evalAxis(adapter.axis_mapping.x);
  const mappedY = evalAxis(adapter.axis_mapping.y);
  const mappedZ = evalAxis(adapter.axis_mapping.z);

  return [
    mappedX + adapter.translation_mm[0],
    mappedY + adapter.translation_mm[1],
    mappedZ + adapter.translation_mm[2]
  ];
}

/**
 * Transforms an array of vertex coordinates in place or into a new Float32Array.
 */
export function transformPositions(
  positions: Float32Array,
  adapter: SourceCoordinateAdapter
): Float32Array {
  const out = new Float32Array(positions.length);
  const numVerts = positions.length / 3;

  for (let i = 0; i < numVerts; i++) {
    const sx = positions[i * 3];
    const sy = positions[i * 3 + 1];
    const sz = positions[i * 3 + 2];

    const [tx, ty, tz] = transformPoint([sx, sy, sz], adapter);
    out[i * 3] = tx;
    out[i * 3 + 1] = ty;
    out[i * 3 + 2] = tz;
  }

  return out;
}

// ============================================================================
// Authoritative Pre-configured Source Coordinate Adapters
// ============================================================================

/**
 * BodyParts3D Whole-Body DICOM LPS to NeuroAtlas3D Canonical Three.js RAS
 * 
 * Source Orientation: LPS (+X Left, +Y Posterior, +Z Superior, origin at scan table)
 * Target Orientation: RAS (+X Right, +Y Superior, +Z Anterior, origin at AC-PC)
 * 
 * Transformation Equations:
 *   X_ras = -X_lps                    (Right = -Left)
 *   Y_ras =  Z_lps - 1561.7 mm        (Superior = Superior, centered vertically at AC-PC)
 *   Z_ras =  Y_lps + 70.1 mm          (Anterior = Anterior, centered AP at AC)
 */
export const BODYPARTS3D_LPS_TO_RAS_ADAPTER: SourceCoordinateAdapter = {
  adapter_id: 'adapter.bodyparts3d.lps_whole_body_to_ras',
  source_coordinate_system: 'DICOM_LPS_WHOLE_BODY',
  source_orientation: 'LPS',
  source_units: 'mm',
  source_origin: 'WHOLE_BODY_ABSOLUTE_TABLE_ORIGIN',
  target_canonical_system: 'THREEJS_RAS_CANONICAL',
  target_orientation: 'RAS',
  target_units: 'mm',
  axis_mapping: {
    x: '-x', // Invert X: Left (+) becomes Right (-)
    y: 'z',  // Source Z (Superior) becomes Canonical Y (Superior)
    z: 'y'   // Source Y (Posterior/Anterior) becomes Canonical Z (Anterior)
  },
  translation_mm: [0.0, -1561.7, 70.1],
  scale: 1.0,
  registration_metadata: {
    registration_method: 'stereotaxic_acpc_origin_centering',
    reference_landmarks: {
      ac_pc_midpoint_source_lps: [0.0, -70.1, 1561.7]
    },
    transformation_matrix_4x4: [
      [-1.0,  0.0,  0.0,      0.0],
      [ 0.0,  0.0,  1.0, -1561.70],
      [ 0.0,  1.0,  0.0,    70.10],
      [ 0.0,  0.0,  0.0,      1.0]
    ],
    notes: 'Transforms whole-body LPS coordinates to standard Three.js RAS coordinates centered at AC-PC'
  },
  transformation_version: '1.0.0'
};

/**
 * Standard Identity Adapter for geometries already in canonical RAS millimeters.
 */
export const IDENTITY_RAS_ADAPTER: SourceCoordinateAdapter = {
  adapter_id: 'adapter.identity.ras_to_ras',
  source_coordinate_system: 'CANONICAL_RAS_MM',
  source_orientation: 'RAS',
  source_units: 'mm',
  source_origin: 'AC_PC_COMMISSURAL',
  target_canonical_system: 'THREEJS_RAS_CANONICAL',
  target_orientation: 'RAS',
  target_units: 'mm',
  axis_mapping: { x: 'x', y: 'y', z: 'z' },
  translation_mm: [0.0, 0.0, 0.0],
  scale: 1.0,
  registration_metadata: {
    registration_method: 'identity'
  },
  transformation_version: '1.0.0'
};

/**
 * MNI152 Linear/Nonlinear (ICBM 2009c) to Canonical RAS Adapter
 */
export const MNI152_NONLINEAR_TO_RAS_ADAPTER: SourceCoordinateAdapter = {
  adapter_id: 'adapter.mni152.nonlinear_2009c_to_ras',
  source_coordinate_system: 'MNI152_NONLINEAR_2009C_ASYM',
  source_orientation: 'RAS',
  source_units: 'mm',
  source_origin: 'MNI_ANTERIOR_COMMISSURE',
  target_canonical_system: 'THREEJS_RAS_CANONICAL',
  target_orientation: 'RAS',
  target_units: 'mm',
  axis_mapping: { x: 'x', y: 'y', z: 'z' },
  translation_mm: [0.0, 0.0, 0.0],
  scale: 1.0,
  registration_metadata: {
    registration_method: 'mni152_native_alignment'
  },
  transformation_version: '1.0.0'
};

/**
 * FreeSurfer Surface RAS to Canonical Three.js RAS Adapter
 */
export const FREESURFER_SURFACE_RAS_ADAPTER: SourceCoordinateAdapter = {
  adapter_id: 'adapter.freesurfer.surface_ras_to_canonical',
  source_coordinate_system: 'FREESURFER_SURFACE_RAS',
  source_orientation: 'RAS',
  source_units: 'mm',
  source_origin: 'CORONAL_AXIAL_SAGITTAL_ISOCENTER',
  target_canonical_system: 'THREEJS_RAS_CANONICAL',
  target_orientation: 'RAS',
  target_units: 'mm',
  axis_mapping: { x: 'x', y: 'y', z: 'z' },
  translation_mm: [0.0, 0.0, 0.0],
  scale: 1.0,
  registration_metadata: {
    registration_method: 'freesurfer_talairach_xfm'
  },
  transformation_version: '1.0.0'
};

export const ADAPTER_REGISTRY: Record<string, SourceCoordinateAdapter> = {
  [BODYPARTS3D_LPS_TO_RAS_ADAPTER.adapter_id]: BODYPARTS3D_LPS_TO_RAS_ADAPTER,
  [IDENTITY_RAS_ADAPTER.adapter_id]: IDENTITY_RAS_ADAPTER,
  [MNI152_NONLINEAR_TO_RAS_ADAPTER.adapter_id]: MNI152_NONLINEAR_TO_RAS_ADAPTER,
  [FREESURFER_SURFACE_RAS_ADAPTER.adapter_id]: FREESURFER_SURFACE_RAS_ADAPTER
};

export function getAdapter(adapterId: string): SourceCoordinateAdapter | undefined {
  return ADAPTER_REGISTRY[adapterId];
}

