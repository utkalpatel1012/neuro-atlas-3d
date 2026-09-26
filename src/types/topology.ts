/**
 * 3D Neuroanatomy Atlas: Topology Classification & QA Profiles
 * Standard: AAS-2026-NEURO-V1 (Phase 1.0.1 Hardening)
 * 
 * Establishes an explicit taxonomy of anatomical 3D representations,
 * removing the false assumption that all neuroanatomy is watertight.
 */

export type TopologyClass =
  | 'SOLID'                  // Closed 3D volumetric structure (e.g. subcortical nucleus, ventricular cast)
  | 'CLOSED_SURFACE'         // 2-manifold closed outer surface: ONE continuous shell (e.g. FreeSurfer pial hemisphere)
  | 'MULTI_SHELL_COMPOSITE'  // Concatenation of N>=2 individually-closed shells; edge checks pass per shell
                             // but the asset is NOT one continuous surface (e.g. multi-component cortical assembly).
                             // Shell count is measured by connected-component analysis, never assumed.
  | 'OPEN_SURFACE'           // 2-manifold surface with legitimate open boundaries (e.g. cortical patch, hemisected brain)
  | 'SHEET'                  // Thin 2D membranous partition (e.g. septum pellucidum, tentorium cerebelli)
  | 'TUBE'                   // Tubular manifold with open end-orifices (e.g. cerebral aqueduct, blood vessel segments)
  | 'CENTERLINE'             // 1D curve / polyline network (e.g. vessel tree centerline, cranial nerve core)
  | 'TRACT_STREAMLINE'       // 1D streamline curve bundle (e.g. DTI tractography)
  | 'SURFACE_PARCELLATION'   // Vertex label mapping or boundary patches on an underlying cortical surface
  | 'VOXEL_DERIVED_SURFACE'  // Marching cubes boundary surface with stepped voxel topology
  | 'POINT_TARGET';          // 0D stereotaxic point coordinate (e.g. DBS lead target, TMS cortical target)

export type GeometricQAStatus =
  | 'GEOMETRY_VALIDATED'     // Technically valid per topology profile
  | 'GEOMETRY_DEFECTIVE';    // Topological or geometric defect detected

export type AnatomicalQAStatus =
  | 'ANATOMY_VALIDATED'           // Verified to represent the claimed anatomical structure
  | 'ANATOMICAL_MAPPING_PENDING'  // Mapping/subfield resolution incomplete or pending verification
  | 'ANATOMY_REJECTED';           // Morphological or landmark discrepancy

export interface AssetQAProfile {
  profile_id: string;
  topology_class: TopologyClass;
  requires_watertight: boolean;
  allows_boundary_edges: boolean;
  requires_triangles: boolean;
  max_non_manifold_edges: number;
  max_zero_area_faces: number;
  max_duplicate_faces: number;
  max_aspect_ratio: number;
  max_hausdorff_deviation_mm?: number;
  volume_tolerance_percent?: number;
  description: string;
}

export const STANDARD_QA_PROFILES: Record<string, AssetQAProfile> = {
  'solid-subcortical-nucleus': {
    profile_id: 'solid-subcortical-nucleus',
    topology_class: 'SOLID',
    requires_watertight: true,
    allows_boundary_edges: false,
    requires_triangles: true,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: 25.0,
    max_hausdorff_deviation_mm: 1.5,
    volume_tolerance_percent: 5.0,
    description: 'Enforces closed watertight 2-manifold topology for subcortical nuclei and organ cores'
  },
  'closed-pial-surface': {
    profile_id: 'closed-pial-surface',
    topology_class: 'CLOSED_SURFACE',
    requires_watertight: true,
    allows_boundary_edges: false,
    requires_triangles: true,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: 30.0,
    max_hausdorff_deviation_mm: 1.0,
    description: 'ONE continuous closed cortical outer boundary with zero boundary open edges. Must have connectedShellCount === 1; multi-shell concatenations must use composite-cortical-assembly instead.'
  },
  'composite-cortical-assembly': {
    profile_id: 'composite-cortical-assembly',
    topology_class: 'MULTI_SHELL_COMPOSITE',
    requires_watertight: true,
    allows_boundary_edges: false,
    requires_triangles: true,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: 30.0,
    max_hausdorff_deviation_mm: 1.0,
    description: 'Concatenated closed component shells (e.g. multi-gyrus cortical assembly). Edge-based checks pass per shell; they CANNOT prove a single continuous surface. connectedShellCount must be measured and reported; CLOSED_SURFACE claims are prohibited for this class.'
  },
  'open-cortical-sheet': {
    profile_id: 'open-cortical-sheet',
    topology_class: 'OPEN_SURFACE',
    requires_watertight: false,
    allows_boundary_edges: true,
    requires_triangles: true,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: 35.0,
    max_hausdorff_deviation_mm: 1.2,
    description: 'Open cortical patches or hemisected surfaces where boundary edges are anatomically legitimate'
  },
  'membranous-sheet': {
    profile_id: 'membranous-sheet',
    topology_class: 'SHEET',
    requires_watertight: false,
    allows_boundary_edges: true,
    requires_triangles: true,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: 40.0,
    description: 'Thin anatomical membranes (septum pellucidum, dural folds)'
  },
  'vascular-tube': {
    profile_id: 'vascular-tube',
    topology_class: 'TUBE',
    requires_watertight: false,
    allows_boundary_edges: true,
    requires_triangles: true,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: 50.0,
    description: 'Lumen surfaces with inlet and outlet boundary rings'
  },
  'tract-streamlines': {
    profile_id: 'tract-streamlines',
    topology_class: 'TRACT_STREAMLINE',
    requires_watertight: false,
    allows_boundary_edges: true,
    requires_triangles: false,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: Infinity,
    description: '1D streamline bundles; triangle-based manifold checks do not apply'
  },
  'surface-parcellation': {
    profile_id: 'surface-parcellation',
    topology_class: 'SURFACE_PARCELLATION',
    requires_watertight: false,
    allows_boundary_edges: true,
    requires_triangles: true,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: 35.0,
    description: 'Cortical parcel vertex label maps and boundary curves'
  },
  'stereotaxic-point-target': {
    profile_id: 'stereotaxic-point-target',
    topology_class: 'POINT_TARGET',
    requires_watertight: false,
    allows_boundary_edges: false,
    requires_triangles: false,
    max_non_manifold_edges: 0,
    max_zero_area_faces: 0,
    max_duplicate_faces: 0,
    max_aspect_ratio: 0,
    description: '0D point targets (DBS coordinates, TMS stimulation loci)'
  }
};
