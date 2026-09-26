# Anatomical Sources, Datasets & Licensing Evaluation

**Document Version**: 1.0.0  
**Authority**: Senior Technical Architect & Digital Neuroanatomy Specialist  
**Project**: 3D Interactive Neuroanatomy Atlas for Psychiatry

---

## 1. Executive Summary

This document evaluates the world's leading open-access and scientific neuroanatomy resources for their geometric quality, structural granularity, licensing legality, and technical suitability for an interactive web-based 3D atlas.

To maintain both uncompromised scientific credibility and unrestricted academic redistribution, we adopt a **Dual-Pillar Provenance Strategy**:
1. **Macroscopic & Deep Morphological Geometry**: Sourced and optimized from **Z-Anatomy** (derived in part from BodyParts3D), released under **CC-BY-SA 4.0**. Provides cleanly segmented individual 3D meshes for cerebral gyri, basal ganglia, brainstem, cerebellum, ventricles, cranial nerves I–XII, and cerebral vasculature.
2. **Cortical Functional & Cytoarchitectonic Parcellations**: Sourced from the **Human Connectome Project (HCP) Glasser Multi-Modal Parcellation (MMP 1.0)** and **FreeSurfer fsaverage**, distributed under open academic terms.
3. **Cytoarchitectonic Benchmarking**: High-resolution datasets with strict Non-Commercial (NC) restrictions (e.g., **EBRAINS Julich-Brain**, **BigBrain**) are utilized strictly as scientific verification standards and reference benchmarks, ensuring that the redistributable application binary remains unencumbered by restrictive licenses.

---

## 2. Comprehensive Resource Evaluation Matrix

| Resource / Atlas | Primary Formats | Granularity & Quality | Discrete Structures? | License Type | Commercial Allowed? | Redistribution & Modification | Technical Difficulty | Recommended Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Z-Anatomy** | `.blend`, `.gltf`, `.obj` | High; comprehensive human nervous system based on TA2 | Yes (~500+ discrete brain parts) | **CC-BY-SA 4.0** | Yes (with SA) | Full rights with attribution & ShareAlike on 3D assets | **Low–Medium** | **Primary Geometry Source** (Macroscopic, subcortical, nerves, vessels) |
| **HCP / Glasser MMP 1.0** | GIfTI (`.surf.gii`), CIFTI (`.dlabel.nii`) | Gold standard; 180 multimodal cortical areas / hemisphere | Yes (vertex-mapped surface boundaries) | **HCP Open Access Terms** | Yes (with attribution) | Full rights for scientific/educational distribution | **Low** | **Primary Cortical Parcellation Source** |
| **OpenNeuro / fsaverage** | FreeSurfer pial/white, GIfTI | Stereotaxic standard (MNI152 / fsaverage) | Whole-cortex / standard parcellations | **CC0 / Public Domain / BSD** | Yes | Full unrestricted redistribution | **Low** | **Baseline Stereotaxic Coordinate Mesh** |
| **BodyParts3D (DBCLS Japan)** | `.obj`, `.stl` | High anatomical detail; CT/MRI scans | Yes (discrete anatomical IDs) | **CC-BY-SA 2.1 Japan** | Yes (with SA) | Derivative works allowed with attribution | **Medium** | Historical baseline for Z-Anatomy meshes |
| **EBRAINS / Julich-Brain** | NIfTI (`.nii.gz`), GIfTI | Microscopic cytoarchitectonic probabilistic maps (>250 areas) | Volumetric probability maps | **CC-BY-NC-SA 4.0** | **NO** (Strictly Non-Commercial) | Academic distribution only; cannot be in commercial products | **Medium–High** | **Scientific Accuracy Reference & Validation Benchmark** |
| **BigBrain Project** | High-res OBJ, MINC, NIfTI, DeepZoom | 20-micron isotropic histological cell-level reconstruction | Continuous cellular volume (>1TB) | **CC-BY-NC-SA 4.0** | **NO** (Strictly Non-Commercial) | Requires multiresolution tile server | **Very High** | **Microscopic Cellular Histology Reference** |
| **Allen Human Brain Atlas** | NIfTI, CSV, XML, Gigapixel slides | Molecular transcriptomics + MRI/histology | Microarray sample points co-registered | **Allen Institute Terms** | Research/Academic use only | Data mining allowed; non-commercial redistribution | **Medium** | **Receptor & Gene Expression Knowledge Source** |
| **AAL3 (Automated Anatomical Labeling)** | NIfTI (MNI volume) | 170 regions including subcortical & cerebellar subdivisions | Volumetric label map | **Free Academic Use** | Academic/Research | Derivatives require academic citation | **Medium** | Classical anatomical cross-referencing |
| **Brainnetome Atlas** | NIfTI, GIfTI surfaces | 246 subregions based on structural/functional connectivity | Volumetric & surface masks | **Free Academic Use** | **NO** (Without licensing) | Academic research redistribution | **Medium** | Connectivity & functional boundary reference |

---

## 3. Deep-Dive Resource Assessments

### 1. Z-Anatomy (`https://www.z-anatomy.com/`)
* **Anatomical Granularity**: Exceptional. Sourced and retopologized specifically inside Blender according to **Terminologia Anatomica 2 (TA2)**.
* **Coverage**:
  * Telencephalon: Discrete cortical gyri, basal ganglia (caudate, putamen, globus pallidus externa/interna, nucleus accumbens).
  * Diencephalon: Thalamus with major nuclear groupings, subthalamic nucleus, epithalamus (habenula, pineal).
  * Limbic: Hippocampal formation, amygdala, complete fornix, mammillary bodies.
  * Ventricles: Watertight casts of lateral ventricles, third ventricle with interthalamic adhesion cutout, cerebral aqueduct, fourth ventricle with foramina.
  * Brainstem: Midbrain (tectum, colliculi, tegmentum, red nucleus, substantia nigra), Pons, Medulla with pyramids and olives.
  * Cerebellum: Vermis, lateral hemispheres, deep cerebellar nuclei.
  * Cranial Nerves: Complete anatomical courses for CN I through CN XII.
  * Vasculature: Complete Circle of Willis, major cerebral branches (ACA, MCA, PCA), and vertebrobasilar arteries.
* **Licensing**: **CC-BY-SA 4.0 (Creative Commons Attribution-ShareAlike 4.0 International)**.
  * *Commercial Use*: Permitted.
  * *Derivative Works*: Permitted.
  * *ShareAlike Requirement*: Any modifications to the 3D meshes (e.g., decimation, retopology, glTF conversion) must be distributed under CC-BY-SA 4.0.
  * *Separation from Software Code*: The web application engine (React, TypeScript, Three.js shaders) is separate intellectual property and can be licensed under permissive open-source licenses (MIT/Apache 2.0) under the doctrine of "mere aggregation / collective work".
* **Suitability**: **PRIMARY 3D FOUNDATION FOR MACROSCOPIC & SUBCORTICAL MESHES**.

---

### 2. Human Connectome Project (HCP) / Glasser Multi-Modal Parcellation (MMP 1.0)
* **Citation**: Glasser, M. F., Coalson, T. S., Robinson, E. C., et al. (2016). *A multi-modal parcellation of human cerebral cortex*. Nature, 536(7615), 171-178.
* **Anatomical Granularity**: The undisputed gold standard for human in-vivo cortical parcellation. 180 distinct, sharp multimodal areas per hemisphere (360 total) based on cortical thickness, myelin content, task fMRI activations, and functional connectivity across 449 healthy adults.
* **Coordinate Space**: Standardized in `fs_LR_32k` (32,492 vertices per hemisphere; 64,984 total vertices for the entire cortical mantle).
* **Format**: GIfTI (`.surf.gii`) and CIFTI-2 (`.dlabel.nii`).
* **Licensing**: **HCP Open Access Data Use Terms**.
  * Free for scientific, educational, and academic research.
  * Distribution of derived surface parcellation geometries is explicitly permitted with attribution to the Human Connectome Project.
* **Technical Integration**: Exceptionally straightforward. GIfTI surface files convert directly to glTF 2.0 with region IDs encoded as vertex attributes (`a_RegionId`) or 1D texture lookups.
* **Suitability**: **PRIMARY FOUNDATION FOR CORTICAL PARCELLATION & FUNCTIONAL REGIONS**.

---

### 3. OpenNeuro & FreeSurfer `fsaverage` Standard
* **Organization**: Stanford Center for Reproducible Neuroscience & Harvard Martinos Center.
* **Anatomical Role**: The universal standard stereotaxic coordinate surface for computational neuroanatomy.
* **Licensing**: **CC0 (Public Domain Dedication) / Permissive BSD**.
  * 100% royalty-free, completely unencumbered for both commercial and academic distribution.
  * No ShareAlike restriction.
* **Suitability**: **BENCHMARK STEREOTAXIC REFERENCE COORDINATE FRAME (MNI152)**.

---

### 4. EBRAINS / Julich-Brain 3D Cytoarchitectonic Atlas
* **Citation**: Amunts, K., Mohlberg, H., Bludau, S., & Zilles, K. (2020). *Julich-Brain: A 3D probabilistic atlas of human brain’s cytoarchitecture*. Science, 369(6506), 988-992.
* **Anatomical Granularity**: Unmatched microscopic cytoarchitectonic accuracy. Based on microscopic observer-independent mapping of cell body distributions across serial histological sections of 10 post-mortem human brains.
* **Format**: Volumetric NIfTI (`.nii.gz`) probabilistic maps and GIfTI surfaces.
* **Licensing**: **CC-BY-NC-SA 4.0 (Creative Commons Attribution-NonCommercial-ShareAlike 4.0)**.
  * **Critical Limitation**: The **Non-Commercial (NC)** clause legally prevents inclusion in any commercial software, paid medical training platform, or commercial clinical tool without an explicit enterprise sublicense from EBRAINS / Forschungszentrum Jülich.
* **Strategic Role in this Project**:
  * **DO NOT BAKE JULICH-BRAIN MESHES DIRECTLY INTO REDISTRIBUTABLE ASSETS** if the project is ever to be commercially distributed or hosted without restriction.
  * **DO USE JULICH-BRAIN** as an academic verification benchmark to audit and validate structural boundaries of the Z-Anatomy and HCP models.

---

### 5. BigBrain Project
* **Citation**: Amunts, K., Lepage, C., Borgeat, L., et al. (2013). *BigBrain: An ultrahigh-resolution 3D human brain model*. Science, 340(6139), 1472-1475.
* **Anatomical Granularity**: 20-micrometer isotropic cellular resolution (~7,404 histological coronal sections).
* **Format**: Multi-terabyte volumetric dataset, chunked MINC, Neuroglancer octree format.
* **Licensing**: **CC-BY-NC-SA 4.0**.
* **Technical Integration**: Direct client-side WebGL rendering of the full volume is impossible due to massive file size (>1 TB). Requires external streaming infrastructure (Neuroglancer server).
* **Suitability**: Reference dataset for cellular laminae cross-sections and histological ground truth.

---

### 6. Allen Human Brain Atlas (AHBA)
* **Organization**: Allen Institute for Brain Science.
* **Anatomical Role**: Microarray spatial gene expression mapped to anatomical structures across multiple donor brains.
* **Licensing**: **Allen Institute Terms of Use** (Free for academic research, education, and scientific analysis; requires attribution).
* **Suitability**: Primary reference for receptor distribution mapping (e.g., 5-HT2A, D2, NMDA, GABA-A receptor densities in psychiatric circuits).

---

## 4. Legal & Licensing Synthesis

```
┌────────────────────────────────────────────────────────────────────────┐
│                        3D Neuroanatomy Atlas                           │
├───────────────────────────────────┬────────────────────────────────────┤
│      Application Source Code      │     3D Anatomical Geometry         │
│   (TypeScript, React, Shaders)    │  (Meshes, Normals, LODs, Glb)      │
│                                   │                                    │
│       License: Apache 2.0         │       License: CC-BY-SA 4.0        │
│   - Permissive open-source        │   - Derivative of Z-Anatomy        │
│   - Commercial friendly           │   - Must attribute Z-Anatomy &     │
│   - No copyleft contagion on code │     BodyParts3D contributors       │
│                                   │   - ShareAlike applies to meshes   │
├───────────────────────────────────┴────────────────────────────────────┤
│                     Cortical Parcellation Layer                        │
│          Human Connectome Project (HCP) Glasser MMP 1.0                │
│       - HCP Open Access Terms (Educational / Academic Redistribution)   │
├────────────────────────────────────────────────────────────────────────┤
│                 Scientific Reference & Validation Data                 │
│              EBRAINS Julich-Brain / BigBrain / Snell / DSM-5           │
│       - Kept in research documentation & validation checklists         │
│       - No NC-encumbered binary blobs bundled in distributable package │
└────────────────────────────────────────────────────────────────────────┘
```

### Attribution Requirements for Production Build
The application's "About & Provenance" panel and `NOTICE` file must display the following acknowledgments:
1. **Z-Anatomy**: "Macroscopic neuroanatomical geometries, subcortical nuclei, ventricular casts, and cranial nerves derived from the Z-Anatomy open atlas project (https://www.z-anatomy.com), licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)."
2. **BodyParts3D**: "Includes anatomical models derived from BodyParts3D, © The Database Center for Life Sciences (DBCLS), licensed under CC-BY-SA 2.1 Japan."
3. **Human Connectome Project**: "Cortical multimodal parcellations derived from the Human Connectome Project (HCP) 1200 Subjects Data Release and Glasser et al. (Nature 2016), supported by the National Institutes of Health (NIH)."
4. **Clinical References**: "Neuroanatomical classifications aligned with Terminologia Anatomica 2 (TA2/TNA) by FIPAT and Snell's Clinical Neuroanatomy (8th Ed.)."
