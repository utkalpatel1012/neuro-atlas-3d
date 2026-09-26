/**
 * 3D Neuroanatomy Atlas: Presentation, Viewport Presets & Runtime Visual Transformation Schema
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandates:
 * 1. Layer peeling and explosion vectors are RUNTIME PRESENTATION TRANSFORMS,
 *    NEVER intrinsic anatomical metadata properties.
 * 2. Canonical anatomical geometry is NEVER modified by presentation effects.
 * 3. Transparency is explicitly termed 'alpha-hashed / stochastic screen-door transparency',
 *    NOT 'true Order-Independent Transparency'.
 */

export type VisualizationMode =
  | 'OPAQUE'     // Solid PBR organic materials with standard depth writing
  | 'GHOSTED'    // Superficial structures rendered via blue-noise alpha-hashed transparency
  | 'X_RAY'      // Highlighting internal nuclei via rim-emissive silhouette shaders
  | 'SLICE'      // Active 3-axis sectional clipping planes with stencil-buffer caps
  | 'EXPLODED';  // Runtime centroid-offset transforms applied for deconstruction review

export type SemanticVisibilityGroup =
  | 'surface_meninges'
  | 'cortex_neocortex'
  | 'cortex_allocortex'
  | 'white_matter_projection'
  | 'white_matter_association'
  | 'white_matter_commissural'
  | 'ventricular_system'
  | 'deep_gray_basal_ganglia'
  | 'diencephalon_thalamic'
  | 'limbic_circuitry'
  | 'brainstem'
  | 'cerebellum'
  | 'cranial_nerves'
  | 'cerebral_arteries'
  | 'cerebral_veins';

export interface GroupOpacityOverride {
  group: SemanticVisibilityGroup;
  opacity: number; // 0.0 to 1.0
  use_alpha_hash: boolean;
}

export interface VisibilityPreset {
  preset_id: string; // e.g., 'preset.peel.stage_4_basal_ganglia'
  preset_name: string; // e.g., 'Basal Ganglia & Ventricular View'
  description: string;
  peel_order_index: number; // 0 to 7 (for progressive slider control)
  active_visible_groups: SemanticVisibilityGroup[];
  hidden_groups: SemanticVisibilityGroup[];
  translucent_groups: GroupOpacityOverride[];
  isolated_structure_ids?: string[];
}

/**
 * Explosion Profile: Defines how a structure moves during deconstruction view.
 * Calculated dynamically at runtime; never baked into geometry.
 */
export interface ExplosionProfile {
  structure_id: string;
  anchor_point_world: [number, number, number];
  unit_displacement_vector: [number, number, number]; // Normalized direction vector
  max_displacement_mm: number;
  displacement_priority_tier: number; // Low priority moves first
  collision_avoidance_radius_mm: number;
}
