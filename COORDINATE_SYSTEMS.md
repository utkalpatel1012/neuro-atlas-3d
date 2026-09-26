# Coordinate Systems & Spatial Transformation Architecture

**Document Version**: 1.0.0  
**Authority**: Senior Visualization Engineer & Computational Neuroanatomy Specialist  
**Standard**: AAS-2026-NEURO-V1  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. Core Architectural Mandate

> **Meshes and spatial coordinates from disparate scientific and anatomical sources are NEVER assumed to be in standard MNI space.**
> 
> Treating artistic or unaligned anatomical meshes as inherently being in MNI152 space produces false stereotaxic coordinates, invalidates clinical TMS/DBS target alignments, and corrupts scientific credibility. Every spatial coordinate, bounding volume, and mesh origin must explicitly declare its coordinate frame, registration method, transformation provenance, and uncertainty metric.

---

## 2. Standard Reference Coordinate Frames

The atlas supports eight distinct spatial coordinate systems, each serving a specific neurobiological or computational role:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Coordinate Space Taxonomy                       │
├───────────────────────────────────┬────────────────────────────────────┤
│         3D Graphics Spaces        │      Standard Stereotaxic Spaces   │
│  1. `native_mesh`                 │  3. `mni152_nonlinear_2009c_asym`  │
│  2. `blender_world`               │  4. `talairach_tournoux`           │
├───────────────────────────────────┼────────────────────────────────────┤
│         Surface Mesh Spaces       │         Clinical Surgical Spaces   │
│  5. `hcp_fslr_32k`                │  7. `ac_pc_surgical` (DBS)         │
│  6. `freesurfer_fsaverage`        │  8. `eeg_10_20_scalp` (TMS)        │
└───────────────────────────────────┴────────────────────────────────────┘
```

### A. 3D Graphics & Engine Spaces
1. **`native_mesh`**:
   * *Definition*: The raw, unaligned vertex positions defined in the source 3D asset file before any world transformations.
   * *Units*: Variable (millimeters, Blender units, or normalized bounds).
   * *Orientation*: Arbitrary, dependent on source export settings.
2. **`blender_world`**:
   * *Definition*: Standardized 3D graphics coordinate frame in Blender 4.x and Three.js runtime.
   * *Axis Convention*: **Right-Handed, +Y Up, +Z Forward, +X Right**.
   * *Units*: Millimeters ($1.0 \text{ unit} = 1.0 \text{ mm}$).
   * *Origin*: Geometric center of the cranium / mid-commissural point approximation.

### B. Standard Stereotaxic Reference Spaces
3. **`mni152_nonlinear_2009c_asym` (ICBM 152 2009c Nonlinear Asymmetric)**:
   * *Definition*: The universal gold standard reference space for computational human neuroimaging and MRI registration (Fonov et al., *NeuroImage* 2009).
   * *Axis Convention*: **RAS (Right-Anterior-Superior)**:
     * $+X$: Right hemisphere
     * $+Y$: Anterior (Rostral)
     * $+Z$: Superior (Dorsal)
   * *Origin*: Anterior Commissure (AC).
   * *Significance*: Ground truth for subcortical nuclei boundaries, voxel coordinates, and stereotaxic meta-analyses.
4. **`talairach_tournoux`**:
   * *Definition*: Classical stereotaxic coordinate frame based on post-mortem dissection of a single 60-year-old female brain (Talairach & Tournoux, 1988).
   * *Conversion*: Requires non-linear transformation to MNI152 (e.g., Lancaster transform / `tal2icbm`). Never directly superimposed on MNI volumes.

### C. Cortical Surface Metric Spaces
5. **`hcp_fslr_32k`**:
   * *Definition*: Standardized surface mesh space developed by the Human Connectome Project (Van Essen et al., *NeuroImage* 2012).
   * *Resolution*: Exactly **32,492 vertices and 64,980 triangles per hemisphere** (~2 mm average vertex spacing).
   * *Significance*: Canonical substrate for Glasser MMP 1.0 multimodal parcellation maps and myelin ratio overlays.
6. **`freesurfer_fsaverage`**:
   * *Definition*: Spherical surface coordinate system aligned by cortical sulcal curvature patterns (Dale, Fischl, & Sereno, 1999).
   * *Registration*: Curvature-driven spherical registration via Multimodal Surface Matching (MSM).

### D. Clinical & Interventional Spaces
7. **`ac_pc_surgical` (DBS Stereotaxic Space)**:
   * *Definition*: Patient-specific Cartesian coordinate system defined by the Anterior Commissure (AC), Posterior Commissure (PC), and a mid-sagittal point.
   * *Application*: Stereotaxic frame targeting for Deep Brain Stimulation (e.g., Subthalamic Nucleus coordinates: $X = \pm 11-12\text{ mm}$, $Y = -2 \text{ to } -3\text{ mm}$, $Z = -4 \text{ to } -5\text{ mm}$ relative to mid-AC-PC point).
8. **`eeg_10_20_scalp` (TMS Navigation Space)**:
   * *Definition*: International 10-20 electroencephalographic scalp coordinate system parameterized by nasion, inion, and preauricular landmarks.
   * *Application*: Transcranial Magnetic Stimulation coil positioning (e.g., Beam F3 method for Left DLPFC).

---

## 3. Transformation & Registration Pipeline

```
[Raw Source Geometry (Z-Anatomy / BodyParts3D)]
                    │
                    ▼  (Step 1: Metric Verification)
[Scale Normalized to True Anatomic Scale (mm)]
                    │
                    ▼  (Step 2: Rigid Body 6-DOF Alignment)
[AC-PC Mid-Commissural Alignment in Blender]
                    │
                    ▼  (Step 3: Landmark-Based Co-Registration)
[Initial Alignment to MNI152 ICBM 2009c Template]
                    │
                    ▼  (Step 4: Non-Linear Diffeomorphic Optimization / ANTs SyN)
[Registered Anatomic Mesh with Target Registration Error (TRE) < 1.5mm]
```

### Supported Registration Methods & Provenance Tracking
Every transformed mesh or coordinate in `src/types/coordinates.ts` stores explicit registration metadata:

| Method ID | Mathematical Basis | Typical Accuracy (TRE) | Application in Atlas |
| :--- | :--- | :--- | :--- |
| `unregistered_raw` | None | N/A (unverified) | Raw ingested meshes pending alignment |
| `manual_anatomical_landmarks` | Point-to-point AC-PC, frontal pole, occipital pole matching | $\approx 2.5 - 4.0\text{ mm}$ | Initial coarse positioning |
| `rigid_body_6dof` | 3 translations + 3 rotations (Euler/quaternion) | $\approx 2.0 - 3.5\text{ mm}$ | Global cranium alignment |
| `affine_linear_12dof` | Translation, rotation, scaling, and shearing | $\approx 1.5 - 2.5\text{ mm}$ | Whole-brain linear template fit |
| `nonlinear_diffeomorphic_syn` | Symmetric Normalization (ANTs SyN vector field) | $< 1.2\text{ mm}$ | High-precision deep nuclei alignment |
| `surface_spherical_registration` | Sulcal depth and curvature driven spherical morphing | $< 1.0\text{ mm}$ vertex | Mapping HCP parcels to cortex |

---

## 4. Registration Uncertainty & Clinical Bounds

1. **Target Registration Error (TRE)**:
   * Every registered structure centroid records its estimated registration uncertainty in millimeters (`registration_uncertainty_mm`).
   * Large cortical gyri may tolerate $\pm 2.0\text{ mm}$ boundary uncertainty; small diencephalic targets (e.g., Subthalamic Nucleus, Habenula, Red Nucleus) require uncertainty bounds $< 1.0\text{ mm}$ before being designated for clinical teaching.

2. **Dice Similarity Coefficient (DSC)**:
   * When registering volumetric or polygonal representations of deep gray matter nuclei against standard MNI masks, the overlap is quantified via the Dice Similarity Coefficient:
     $$\text{DSC} = \frac{2 |V_{\text{source}} \cap V_{\text{target}}|}{|V_{\text{source}}| + |V_{\text{target}}|}$$
   * A minimum threshold of $\text{DSC} \ge 0.75$ is required for a nucleus to transition to `METADATA_VALIDATED` status.

3. **Disclaimer for Clinical Neuromodulation**:
   * Scalp coordinates (10-20) and stereotaxic coordinates (AC-PC / MNI) displayed in this atlas represent **normative population averages**.
   * They must **never** be used as primary stereotaxic target coordinates for neurosurgical stereotaxy or robotic TMS navigation in individual patients without patient-specific MRI/CT neuronavigation registration.
