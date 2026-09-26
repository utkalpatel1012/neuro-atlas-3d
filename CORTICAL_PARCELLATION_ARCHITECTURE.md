# Cortical Parcellation Architecture & Surface Mapping Specification

**Document Version**: 1.0.0  
**Authority**: Senior Computational Neuroanatomy Specialist & 3D Web Graphics Engineer  
**Standard**: AAS-2026-NEURO-V1  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. Fundamental Principle: Anatomical Surface vs. Atlas Parcellation

> **An anatomical cortical surface (gyri and sulci) is a physical anatomical entity.**  
> **A cortical parcel (e.g., HCP Area 46, Brodmann Area 9) is an atlas-defined organizational partition.**
> 
> A Z-Anatomy cortical mesh is **NOT** automatically registered to Human Connectome Project (HCP) `fs_LR` space. Conflating the two or assuming that raw polygon meshes can simply be colored with HCP coordinates without a formal surface registration pipeline produces severe spatial error and false functional boundaries.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Cortical Separation Model                       │
├───────────────────────────────────┬────────────────────────────────────┤
│     Physical Anatomical Cortex    │     Atlas Parcellation Systems     │
│  • Primary Sulci & Gyri           │  • HCP MMP 1.0 (Glasser 2016)      │
│  • Frontal, Temporal, Parietal    │  • Brodmann Cytoarchitectonics     │
│  • Pial & White Matter Surfaces   │  • Schaefer Functional Networks    │
│  • Source: FreeSurfer / Z-Anat    │  • Substrate: `fs_LR_32k` GIfTI    │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Technical Challenge: Mapping HCP MMP 1.0 onto 3D Web Geometry

The Human Connectome Project Multi-Modal Parcellation (MMP 1.0; Glasser et al., *Nature* 2016) delineates **180 distinct areas per hemisphere** (360 total) based on cortical thickness, myelin maps, resting-state fMRI, and task activations across 449 subjects.

### The Standard Substrate: `fs_LR_32k`
* HCP MMP 1.0 is natively defined on the **`fs_LR_32k` surface mesh** (standardized to exactly **32,492 vertices per hemisphere**).
* Every vertex in `fs_LR_32k` has a deterministic scalar integer label ($0 \text{ to } 180$) identifying its parcel.

### Two Viable Architectural Strategies for the Web Atlas
We establish two distinct pathways for Phase 1/2 integration:

#### Strategy A: Direct Native `fs_LR_32k` Web Mesh (Recommended for Parcellation View)
* **Pipeline**:
  1. Ingest native HCP `fs_LR_32k` surface GIfTI files (`Q1-Q6_RelatedValidation210.CorticalAreas_all_VertColl.32k_fs_LR.dlabel.nii`).
  2. Convert directly to glTF 2.0 Binary using Python (`nibabel` + `trimesh`).
  3. Encode the parcel integer ID ($0 \text{ to } 180$) directly into a custom vertex attribute: `a_ParcelId` (as an 8-bit unsigned integer `UNSIGNED_BYTE`).
* **Advantages**:
  * **Zero boundary distortion**: 100% mathematical fidelity to Glasser et al. 2016.
  * **Single draw call**: Both hemispheres render in exactly **2 draw calls** total.
  * **Dynamic instant highlighting**: Parcel selection, hover, and coloring are handled purely in a TSL shader via a small 1D palette uniform buffer (180 `vec4` colors), with zero geometry splitting.

#### Strategy B: Non-Rigid Curvature Registration to Morphological Mesh (For Macroscopic View)
* When displaying macroscopic Z-Anatomy gyri with deep sculpted fissures:
  * We cannot use vertex-to-vertex index matching because the vertex counts and topologies differ.
  * **Methodology**: Apply **Multimodal Surface Matching (MSM)** or sulcal depth spherical registration to project the 360 parcel boundaries from `fs_LR_32k` onto the Z-Anatomy surface mesh.
  * **Baking into UV Texture Atlases**: Parcel IDs are baked into a high-resolution 16-bit integer texture atlas (`R16UI`), where the fragment shader samples the parcel ID from the mesh UV coordinates.

---

## 3. Shader Architecture: High-Performance Multi-Parcel Shading

To avoid creating 360 separate Three.js mesh instances (which would destroy CPU draw call budgets), parcellation rendering uses GPU attribute indexing:

```
[Vertex Shader (TSL)]
  Input: Attribute `a_ParcelId` (uint 0-180)
  Pass `v_ParcelId` to Fragment Shader
       │
       ▼
[Fragment Shader (TSL)]
  Read `v_ParcelId`
  Uniform Buffer: `uniform vec4 u_ParcelColorTable[181]`
  Uniform: `uniform uint u_HoveredParcelId`
  Uniform: `uniform uint u_SelectedParcelId`
       │
       ▼
  If (v_ParcelId == u_SelectedParcelId) -> Apply Gold Selection Outline
  Else If (v_ParcelId == u_HoveredParcelId) -> Apply Emissive Highlight
  Else -> Sample Base Palette Color
```

* **Memory Cost**: An 8-bit attribute on 64,984 vertices consumes only **64 KB of VRAM**.
* **Draw Calls**: **1 draw call per hemisphere**.
* **Hover / Select Latency**: Instantaneous ($0.0 \text{ ms}$ CPU overhead; updates a single uniform integer).
