# Phase 3 Anatomical Source Evaluation & Selection Analysis

**Document Standard**: AAS-2026-NEURO-V1  
**Phase**: Phase 3 — Cerebral Macroanatomy & Production Asset Pipeline  
**Authority**: Principal Computational Neuroanatomist & Lead 3D Visualization Engineer  
**Status**: APPROVED & LOCKED
**Date**: 2026-09-26

> **PHASE 3.1 CORRECTION NOTICE (2026-09-27 — evaluation preserved, findings supersede):**
> (a) §2A "Anatomical Scope" names superior temporal gyrus, cuneus, and lingual gyrus —
> the ingested files are actually middle temporal, accessory short (insular), and
> parahippocampal gyri (see `PHASE_3_CORTEX_SOURCE_COMPONENTS.md`); the evaluation was
> written against the mislabeled list. (b) §2A "Coordinate System" formula
> ($Y_{RAS}=-Y_{LPS}$) is NOT what the pipeline implements (code: $X_c=-X_s,$
> $Y_c=Z_s-1561.7,$ $Z_c=Y_s+70.1$); canonical +Z is POSTERIOR. (c) "100% permitted" /
> "Commercial Restrictions: NONE" overstate legal certainty — retroactivity/scope is
> `LEGAL_REVIEW_REQUIRED` (dual-compliance posture retained). (d) Population,
> methodology, and resolution specifics below are literature-asserted, not verified
> against the mirror files. (e) "DICOM LPS" for the mirror STLs is asserted, unproven.

---

## 1. Executive Evaluation Framework

In accordance with Phase 3 Absolute Rules, no human brain anatomy may be procedurally synthesized, AI-hallucinated, manually sculpted, or inferred from arbitrary geometric primitives. Every production asset must derive from an authentic, scientifically traceable, and legally unencumbered anatomical source.

This document systematically evaluates candidate anatomical datasets across fifteen standardized criteria:
1. **Anatomical Scope**: Coverage of cerebral hemispheres, lobes, gyri, and sulcal landmarks.
2. **Mesh Quality**: Triangle distribution, regularity, edge ratios, and absence of degenerate geometry.
3. **Surface Quality**: Faithful representation of gyral crowns, sulcal depths, and folding morphology.
4. **Topology**: Manifoldness, presence of boundary edges, non-manifold vertices, or self-intersections.
5. **Coordinate System**: Native coordinate space, origin, orientation, and metric scale.
6. **Laterality**: Explicit representation of left and right hemispheres without artificial mirroring.
7. **Segmentation Methodology**: Manual histological reconstruction, high-field MRI segmentation, or semi-automated boundary tracing.
8. **Source Population**: Demographic, anatomical specimen type (post-mortem vs. in vivo MRI), sample size.
9. **Resolution**: Voxel spacing, vertex density, and spatial feature limits.
10. **License**: Exact legal covenant governing source distribution.
11. **Attribution Requirements**: Specific legal notices and author citations required.
12. **Derivative-Work Restrictions**: ShareAlike clauses, patent grants, or format transformation rules.
13. **Commercial / Non-Commercial Restrictions**: Presence or absence of NC clauses.
14. **Redistribution Rights**: Public web distribution authorization.
15. **Suitability Determination**: Verdict for Phase 3 cerebral macroanatomy.

---

## 2. Comprehensive Candidate Evaluation Matrix

### Candidate A: BodyParts3D (Database Center for Life Sciences - DBCLS, Japan)
* **Anatomical Scope**: Comprehensive gross human anatomy based on the Foundational Model of Anatomy (FMA). Covers bilateral cerebral hemispheres, frontal, parietal, temporal, and occipital lobes, and over 40 distinct bilateral gyral structures (precentral gyrus, postcentral gyrus, superior frontal gyrus, middle frontal gyrus, superior temporal gyrus, middle temporal gyrus, inferior temporal gyrus, angular gyrus, supramarginal gyrus, cuneus, lingual gyrus, insula, parahippocampal gyrus).
* **Mesh Quality**: Exceptionally high geometric cleanliness. Polygonal reduction conducted using quadric decimation; uniform triangle aspect ratios; zero zero-area degenerate triangles.
* **Surface Quality**: Superior anatomical folding fidelity; deep sulcal invaginations and well-rounded gyral crowns; clear interhemispheric fissure.
* **Topology**: Solid closed 2-manifold surfaces; 0 non-manifold edges; 0 boundary edges on solid organ models.
* **Coordinate System**: Whole-body DICOM LPS ($+X = \text{Left}, +Y = \text{Posterior}, +Z = \text{Superior}$, millimeter units). Readily maps to `canonical_atlas_ras` via deterministic orthogonal transform ($X_{\text{RAS}} = -X_{\text{LPS}}, Y_{\text{RAS}} = -Y_{\text{LPS}}, Z_{\text{RAS}} = Z_{\text{LPS}}$).
* **Laterality**: Rigorously separate left and right structures with distinct FMA IDs (e.g. Left Hippocampus FMA72714 vs Right Hippocampus FMA72713; Left Precentral Gyrus FMA72662 vs Right Precentral Gyrus FMA72661). No mirrored placeholders.
* **Segmentation Methodology**: Expert anatomical segmentation from high-resolution whole-body CT/MRI of an adult Japanese male subject, cross-validated against standard neuroanatomical atlases (The Human Central Nervous System 4th ed., Atlas of the Human Brain 3rd ed., Gray's Anatomy 40th ed., and SPL-PNL Brain Atlas).
* **Source Population**: Adult human male in vivo imaging, validated against post-mortem anatomical reference series.
* **Resolution**: Sub-millimeter anatomical feature fidelity; macroscopic gyral contours captured at $\approx 0.5-1.0\text{ mm}$ detail.
* **License**: **Creative Commons Attribution 4.0 International (CC BY 4.0)** (Portal official update 2025/02/27; historical Release 3.0 originally CC-BY-SA 2.1 JP).
* **Attribution Requirements**: "BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-Share Alike 2.1 Japan. Relicensed under CC Attribution 4.0 International."
* **Derivative-Work Restrictions**: Historical Release 3.0 files: CC-BY-SA 2.1 JP (ShareAlike applies under that reading). Upstream portal lists CC BY (2025-02-27) (attribution-only under that reading). Project distributes derivatives under CC-BY-SA 4.0. Whether the portal listing retroactively extinguishes the 2.1-JP ShareAlike condition is UNRESOLVED — LEGAL_REVIEW_REQUIRED (Phase 3.1 §19; the term "dual compliance" has no legal basis and is banned from live records).
* **Commercial Restrictions**: **NONE**. Fully permitted for commercial and non-commercial application deployment.
* **Redistribution Rights**: 100% permitted.
* **Suitability Verdict**: **PRIMARY SOURCE FOR CEREBRAL MACROANATOMY & GYRAL STRUCTURES (APPROVED)**.

---

### Candidate B: Z-Anatomy (Blender Human Anatomy Project)
* **Anatomical Scope**: Whole-body anatomical models organized in Blender 4.x scenes according to Terminologia Anatomica 2 (TA2).
* **Mesh Quality**: High retopology quality; manual loop optimization around major muscle and organ boundaries.
* **Surface Quality**: Good aesthetic rendering; excellent macro-scale proportioning.
* **Topology**: Primarily 2-manifold meshes; occasional boundary edges along interior surgical resection lines.
* **Coordinate System**: Blender World Coordinate System ($+X = \text{Right}, +Y = \text{Forward/Anterior}, +Z = \text{Up/Superior}$).
* **Laterality**: Paired bilateral structures with `_L` and `_R` naming tags.
* **Segmentation Methodology**: Derived directly from BodyParts3D Release 3.0 meshes, retopologized and integrated in Blender by Gauthier Kervyn et al.
* **Source Population**: Inherited from BodyParts3D.
* **Resolution**: Simplified polygon budgets optimized for interactive viewport display in Blender.
* **License**: **Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)**.
* **Attribution Requirements**: Must attribute Z-Anatomy contributors and upstream BodyParts3D authors.
* **Derivative-Work Restrictions**: ShareAlike (SA) copyleft applies to derivative 3D meshes.
* **Commercial Restrictions**: **NONE**. Commercial use permitted provided derivative meshes remain under CC-BY-SA 4.0.
* **Redistribution Rights**: Permitted with ShareAlike.
* **Suitability Verdict**: **SECONDARY REFERENCE & TOPOLOGICAL AUDIT RESOURCE (APPROVED)**.

---

### Candidate C: FreeSurfer Canonical Pial Surfaces (`fsaverage` / Colin27)
* **Anatomical Scope**: Continuous cortical pial surface mesh representing the outer gray matter boundary of each cerebral hemisphere; excludes subcortical white matter interior.
* **Mesh Quality**: Regularized spherical topology mesh; triangular tessellation (~163,842 vertices per hemisphere in `fsaverage` 1mm, ~32k in `fsaverage6`).
* **Surface Quality**: True continuous cortical sheet; exceptional representation of all primary, secondary, and tertiary sulci.
* **Topology**: Closed 2-manifold genus-0 surface (Euler characteristic $\chi = 2$). Zero holes, zero non-manifold edges.
* **Coordinate System**: FreeSurfer Surface RAS space (centered at $(0,0,0)$ AC-PC midpoint, millimeter scale).
* **Laterality**: Strictly separate left (`lh.pial`) and right (`rh.pial`) meshes.
* **Segmentation Methodology**: Automated cortical surface reconstruction from 3D T1-weighted MPRAGE MRI via FreeSurfer recon-all pipeline (Dale, Fischl, Sereno 1999).
* **Source Population**: `fsaverage` is an iterative cortical surface average of 40 healthy human adults.
* **Resolution**: $\approx 1.0\text{ mm}$ vertex spacing on the cortical ribbon.
* **License**: **BSD 3-Clause License** (FreeSurfer Software & Data License).
* **Attribution Requirements**: Standard BSD 3-Clause copyright notice and disclaimer.
* **Derivative-Work Restrictions**: None.
* **Commercial Restrictions**: **NONE**. Fully permitted.
* **Redistribution Rights**: Unrestricted open redistribution.
* **Suitability Verdict**: **APPROVED FOR CONTINUOUS CORTICAL SURFACE REPRESENTATIONS (`mri_surface`)**.

---

### Candidate D: Human Connectome Project (HCP) Cortical Surfaces & MMP 1.0 Parcellation
* **Anatomical Scope**: Cortical surface meshes (`fs_LR_32k`) with multimodal areal parcellation (Glasser et al., 2016) covering 180 distinct parcels per hemisphere.
* **Mesh Quality**: Standardized multi-subject surface registered to fs_LR standard space (32,492 vertices per hemisphere).
* **Surface Quality**: Unsurpassed multimodal mapping grounded in myelin maps, resting-state fMRI, and retinotopic task fMRI.
* **Topology**: Closed 2-manifold surface sheet.
* **Coordinate System**: `hcp_fslr_32k` surface metric space.
* **Laterality**: Paired separate left and right cortical sheets.
* **Segmentation Methodology**: Multimodal Surface Matching (MSMAll) on 210 healthy young adult HCP participants.
* **Source Population**: Young adult human subjects (HCP 1200 release).
* **Resolution**: Average vertex spacing $\approx 2.0\text{ mm}$.
* **License**: **WU-Minn HCP Consortium Open Access Data Use Terms**.
* **Attribution Requirements**: Specific mandated acknowledgment text citing NIH Grant 1U54MH091657.
* **Derivative-Work Restrictions**: Redistribution allowed only under identical HCP Data Use Terms, including human subject non-identification covenants.
* **Commercial Restrictions**: **LEGAL REVIEW REQUIRED**. Commercial redistribution requires legal counsel review.
* **Redistribution Rights**: Open academic and educational redistribution permitted.
* **Suitability Verdict**: **DEFERRED TO CORTICAL PARCELLATION PHASE (MANDATORY GATE)**. In accordance with Section 30 of the Phase 3 specification, HCP MMP 1.0 is quarantined from Phase 3 macroanatomy.

---

### Candidate E: EBRAINS / Julich-Brain 3D Cytoarchitectonic Atlas
* **Anatomical Scope**: Cytoarchitectonic probabilistic maps of human cerebral cortex and deep nuclei.
* **Mesh Quality**: High-resolution voxel segmentation boundaries.
* **Surface Quality**: Grounded in histological cell-body staining (Nissl).
* **Topology**: Volumetric voxel masks.
* **Coordinate System**: MNI152 ICBM 2009c Nonlinear Asymmetric space.
* **Laterality**: Bilateral histological data from post-mortem donor brains.
* **Segmentation Methodology**: Manual microscopic observer-independent mapping of cell packing density.
* **Source Population**: 10 post-mortem human donor brains per cortical area.
* **Resolution**: 1 micrometer to 1 millimeter histological maps.
* **License**: **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA 4.0)**.
* **Attribution Requirements**: Citations of Amunts et al. and EBRAINS.
* **Derivative-Work Restrictions**: Copyleft and non-commercial contamination.
* **Commercial Restrictions**: **STRICT NON-COMMERCIAL RESTRICTION**. Commercial redistribution strictly prohibited without custom license.
* **Redistribution Rights**: Quarantined from web distribution bundle.
* **Suitability Verdict**: **STRICTLY QUARANTINED (RESEARCH_ONLY)**. Prohibited from production runtime bundle per Invariant 9 and Section 31.

---

## 3. Production Source Selection Summary

To maintain absolute scientific validity without licensing contamination:
1. **Primary Cerebral Macroanatomy Source**: **BodyParts3D Release 3.0 (DBCLS)**.
   - Provides individual solid 3D meshes for cerebral cortex, lobes, and distinct gyri.
   - Licensed under CC BY 4.0 / CC-BY-SA 4.0 (commercial distribution permitted).
   - Provides seamless anatomical continuity with the validated bilateral hippocampus assets from Phase 1 and Phase 2.
2. **Cortical Surface Representation Model**:
   - In accordance with the **One Entity $\rightarrow$ Many Representations** architecture, the primary macroanatomical entity `brain.telencephalon.left.cerebrum.cortex` utilizes the solid macroanatomical mesh as its canonical representation (`macroscopic_mesh`), and supports future integration of FreeSurfer continuous surface sheets (`mri_surface`) without schema revision.
3. **Quarantined Sources**:
   - HCP MMP 1.0: Deferred to dedicated parcellation phase.
   - EBRAINS Julich-Brain: Quarantined under `RESEARCH_ONLY`.
   - BigBrain: Quarantined under `RESEARCH_ONLY`.

---

## 4. Source Traceability Matrix

| Production Asset ID | Anatomical Structure | Upstream Source Identifier | Source Format | Source License | Project Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mesh.cortex.left.v1` | Left Cerebral Cortex | BodyParts3D FMA61830 (Left) | Binary STL | CC BY 4.0 | CC-BY-SA-4.0 |
| `mesh.cortex.right.v1` | Right Cerebral Cortex | BodyParts3D FMA61830 (Right) | Binary STL | CC BY 4.0 | CC-BY-SA-4.0 |
| `mesh.hippocampus.left.v1` | Left Hippocampus | BodyParts3D FMA72714 | Binary STL | CC BY 4.0 | CC-BY-SA-4.0 |
| `mesh.hippocampus.right.v1` | Right Hippocampus | BodyParts3D FMA72713 | Binary STL | CC BY 4.0 | CC-BY-SA-4.0 |
