/**
 * 3D Neuroanatomy Atlas: Coordinate System & Laterality Validator
 * Standard: AAS-2026-NEURO-V1 (Phase 1.0.1 Hardening)
 * 
 * Verifies that anatomical laterality and spatial coordinates are proven through
 * a 4-stage validation chain rather than relying solely on arbitrary centroid sign:
 * 
 * 1. SOURCE COORDINATE DEFINITION (Orientation, units, origin)
 * 2. VERIFIED TRANSFORMATION (Bijective mapping, metric preservation)
 * 3. CANONICAL COORDINATE FRAME (RAS: +X Right, +Y Superior, +Z Anterior)
 * 4. LATERALITY & SYMMETRY CHECK (Left, Right, Bilateral, Midline)
 */

import { SourceCoordinateAdapter, validateAdapter, transformPoint } from './coordinate_adapter';
import { BoundingVolume } from './glb_utils';

export type AnatomicalLateralityDeclaration = 'left' | 'right' | 'bilateral' | 'midline';

export interface CoordinateValidationResult {
  passed: boolean;
  stages: {
    source_definition_verified: boolean;
    transformation_verified: boolean;
    canonical_frame_verified: boolean;
    laterality_verified: boolean;
  };
  metrics: {
    centroid: [number, number, number];
    dimensions: [number, number, number];
    x_range: [number, number];
    metric_preservation_error_mm: number;
    declared_laterality: AnatomicalLateralityDeclaration;
  };
  diagnostics: string[];
}

/**
 * Validates coordinate transformation, metric preservation, and anatomical laterality.
 */
export function validateCoordinatesAndLaterality(params: {
  rawBounds: BoundingVolume;
  canonicalBounds: BoundingVolume;
  adapter: SourceCoordinateAdapter;
  declaredLaterality: AnatomicalLateralityDeclaration;
  midlineToleranceMm?: number;
}): CoordinateValidationResult {
  const diagnostics: string[] = [];
  const midlineTolerance = params.midlineToleranceMm ?? 1.5;

  // --------------------------------------------------------------------------
  // Stage 1: Source Coordinate Definition Verification
  // --------------------------------------------------------------------------
  const adapterValidation = validateAdapter(params.adapter);
  if (!adapterValidation.valid) {
    diagnostics.push(`Stage 1 Failure: Invalid SourceCoordinateAdapter: ${adapterValidation.errors.join('; ')}`);
  }
  const stage1Pass = adapterValidation.valid;
  if (stage1Pass) {
    diagnostics.push(`Stage 1 Pass: Source coordinate definition verified (${params.adapter.source_coordinate_system}, orientation: ${params.adapter.source_orientation}, units: ${params.adapter.source_units})`);
  }

  // --------------------------------------------------------------------------
  // Stage 2: Verified Transformation & Metric Preservation
  // --------------------------------------------------------------------------
  // Check that transformation preserves bounding box dimensions within scale factor
  const rawDims = [...params.rawBounds.dimensions].sort((a, b) => a - b);
  const canonicalDims = [...params.canonicalBounds.dimensions].sort((a, b) => a - b);
  const scale = params.adapter.scale;

  let maxDimDelta = 0;
  for (let i = 0; i < 3; i++) {
    const delta = Math.abs(rawDims[i] * scale - canonicalDims[i]);
    if (delta > maxDimDelta) maxDimDelta = delta;
  }

  // Also verify that transforming the raw center matches the canonical center
  const transformedRawCenter = transformPoint(params.rawBounds.center, params.adapter);
  const centerDelta = Math.sqrt(
    Math.pow(transformedRawCenter[0] - params.canonicalBounds.center[0], 2) +
    Math.pow(transformedRawCenter[1] - params.canonicalBounds.center[1], 2) +
    Math.pow(transformedRawCenter[2] - params.canonicalBounds.center[2], 2)
  );

  const stage2Pass = maxDimDelta < 0.01 && centerDelta < 0.05;
  if (!stage2Pass) {
    diagnostics.push(`Stage 2 Failure: Metric distortion detected. Max dimension delta: ${maxDimDelta.toFixed(4)} mm, center delta: ${centerDelta.toFixed(4)} mm`);
  } else {
    diagnostics.push(`Stage 2 Pass: Transformation is isometric and metric-preserving (dim delta: ${maxDimDelta.toFixed(4)} mm, center delta: ${centerDelta.toFixed(4)} mm)`);
  }

  // --------------------------------------------------------------------------
  // Stage 3: Canonical Coordinate Frame Verification
  // --------------------------------------------------------------------------
  // Verify units are millimeters (dimensions should be macroscopic human scale, 2 mm - 250 mm)
  const [dx, dy, dz] = params.canonicalBounds.dimensions;
  const reasonableBrainScale = dx >= 2.0 && dx <= 250.0 && dy >= 2.0 && dy <= 250.0 && dz >= 2.0 && dz <= 250.0;
  const stage3Pass = reasonableBrainScale && params.adapter.target_canonical_system === 'THREEJS_RAS_CANONICAL';

  if (!stage3Pass) {
    diagnostics.push(`Stage 3 Failure: Dimensions outside adult human brain range (${dx.toFixed(1)} x ${dy.toFixed(1)} x ${dz.toFixed(1)} mm)`);
  } else {
    diagnostics.push(`Stage 3 Pass: Canonical Three.js RAS frame verified at 1:1 millimeter scale`);
  }

  // --------------------------------------------------------------------------
  // Stage 4: Laterality & Symmetry Check
  // --------------------------------------------------------------------------
  const [minX, ,] = params.canonicalBounds.min;
  const [maxX, ,] = params.canonicalBounds.max;
  const [centerX, centerY, centerZ] = params.canonicalBounds.center;

  let stage4Pass = false;

  switch (params.declaredLaterality) {
    case 'left':
      // In standard RAS: +X is Patient Right, -X is Patient Left
      // Left structure must have Centroid X < 0 AND predominantly negative X extents
      const leftCentroidValid = centerX < 0;
      const leftExtentValid = maxX <= midlineTolerance; // Allow small margin for medial structures touching midline
      stage4Pass = leftCentroidValid && leftExtentValid;
      if (!stage4Pass) {
        diagnostics.push(`Stage 4 Failure: Declared LEFT structure has centroid X = ${centerX.toFixed(2)} mm (must be < 0) or crosses midline (maxX = ${maxX.toFixed(2)} mm > tolerance ${midlineTolerance} mm)`);
      } else {
        diagnostics.push(`Stage 4 Pass: Confirmed LEFT laterality in RAS (Centroid X = ${centerX.toFixed(2)} mm < 0, maxX = ${maxX.toFixed(2)} mm)`);
      }
      break;

    case 'right':
      // In standard RAS: Right structure must have Centroid X > 0 AND minX >= -midlineTolerance
      const rightCentroidValid = centerX > 0;
      const rightExtentValid = minX >= -midlineTolerance;
      stage4Pass = rightCentroidValid && rightExtentValid;
      if (!stage4Pass) {
        diagnostics.push(`Stage 4 Failure: Declared RIGHT structure has centroid X = ${centerX.toFixed(2)} mm (must be > 0) or crosses midline (minX = ${minX.toFixed(2)} mm < -tolerance)`);
      } else {
        diagnostics.push(`Stage 4 Pass: Confirmed RIGHT laterality in RAS (Centroid X = ${centerX.toFixed(2)} mm > 0, minX = ${minX.toFixed(2)} mm)`);
      }
      break;

    case 'midline':
      // Midline structures (e.g. cerebellar vermis, 3rd ventricle, corpus callosum body):
      // Must straddle the sagittal midline (minX < 0 and maxX > 0) and have |centroid X| < midlineTolerance
      const straddlesMidline = minX < 0 && maxX > 0;
      const centerNearMidline = Math.abs(centerX) <= midlineTolerance;
      stage4Pass = straddlesMidline && centerNearMidline;
      if (!stage4Pass) {
        diagnostics.push(`Stage 4 Failure: Midline structure must straddle X=0 (minX=${minX.toFixed(2)}, maxX=${maxX.toFixed(2)}) and have |centerX| <= ${midlineTolerance} mm (got ${centerX.toFixed(2)} mm)`);
      } else {
        diagnostics.push(`Stage 4 Pass: Confirmed MIDLINE structure symmetry (Centroid X = ${centerX.toFixed(2)} mm, spans ${minX.toFixed(2)} to ${maxX.toFixed(2)} mm)`);
      }
      break;

    case 'bilateral':
      // Bilateral structures encompass both hemispheres (e.g. bilateral cortex,
      // whole ventricular system). The former gate demanded >10 mm of extent on
      // each side, which is anatomically wrong for small paired midline
      // structures: the mammillary bodies are a genuinely bilateral source
      // distribution (BodyParts3D FMA74877, laterality=bilateral) whose two
      // bodies sit only a few mm either side of X=0 (measured -4.57..+3.25 mm).
      // A fixed 10 mm floor therefore rejected a correct bilateral asset.
      //
      // Scope of this gate, stated honestly: it verifies laterality
      // CONSISTENCY with the declared asset id — geometry on both sides of the
      // midline plus a midline-centred bounding box. It does NOT prove the mesh
      // is a paired organ: a midline commissure that spans both hemispheres would
      // also satisfy it, and distinguishing the two needs component segmentation
      // that does not exist here. This is the same class of limitation as
      // ANATOMY_VALIDATED meaning scale/laterality plausibility only (see
      // KNOWN_ANATOMICAL_LIMITATIONS.md). A one-sided structure still fails here,
      // on the span clause.
      //
      // Note: centerX is the bounding-box centre from the parsed bounds, not a
      // vertex centroid — hence "bounds centre" in the diagnostics.
      const spansBothHemispheres = minX < -midlineTolerance && maxX > midlineTolerance;
      const bilateralCentreOnMidline = Math.abs(centerX) <= midlineTolerance;
      stage4Pass = spansBothHemispheres && bilateralCentreOnMidline;
      if (!stage4Pass) {
        diagnostics.push(`Stage 4 Failure: Declared BILATERAL structure must have geometry on both sides of the midline (X range [${minX.toFixed(2)}, ${maxX.toFixed(2)}] vs tolerance ±${midlineTolerance} mm) and a midline-centred bounding box (got ${centerX.toFixed(2)} mm)`);
      } else {
        diagnostics.push(`Stage 4 Pass: Laterality consistent with BILATERAL declaration — geometry both sides of midline, bounds centre on midline (X range [${minX.toFixed(2)}, ${maxX.toFixed(2)}], centre X = ${centerX.toFixed(2)} mm). Consistency only; not proof of a paired organ.`);
      }
      break;
  }

  const allPassed = stage1Pass && stage2Pass && stage3Pass && stage4Pass;

  return {
    passed: allPassed,
    stages: {
      source_definition_verified: stage1Pass,
      transformation_verified: stage2Pass,
      canonical_frame_verified: stage3Pass,
      laterality_verified: stage4Pass
    },
    metrics: {
      centroid: [centerX, centerY, centerZ],
      dimensions: [dx, dy, dz],
      x_range: [minX, maxX],
      metric_preservation_error_mm: maxDimDelta,
      declared_laterality: params.declaredLaterality
    },
    diagnostics
  };
}
