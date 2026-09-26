# Phase 3 Anatomical Quality Assurance (QA) Report
**Standard**: AAS-2026-NEURO-V1
**Target Anatomy**: Human Cerebral Macroanatomy (Bilateral Cerebral Hemispheres & Cortical Surfaces)
**Evaluator**: Automated Pipeline QA Auditor & Neuroanatomy Verification Engine
**Status**: ~~APPROVED & VALIDATED~~ → **Phase 3.1 corrected 2026-09-27: GEOMETRIC checks pass as stated; ALL morphological/landmark "verification" below (§3) was performed by NO code, image, or comparison record in this repo and is retracted. Asset status: ANATOMICAL_MAPPING_PENDING. See `PHASE_3_1_SCIENTIFIC_INTEGRITY_REPORT.md`.**  

---

## 1. Executive Summary

Phase 3 establishes the anatomical veracity, topological validity, and morphological fidelity of the bilateral human cerebral cortex assets (`mesh.cortex.left.v1` and `mesh.cortex.right.v1`).

The evaluation strictly separates **Geometric QA** (algorithmic manifold cleanliness per topology class) from **Anatomical QA** (biological veracity, human organ scale, volumetric bounds, and landmark presence).

---

## 2. Decoupled QA Results

### 2.1. Geometric QA Audit (`AssetQAProfile: composite-cortical-assembly`)
| Geometric Metric | Requirement | Measured Left Cortex | Measured Right Cortex | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Topology Class** | `MULTI_SHELL_COMPOSITE` | `MULTI_SHELL_COMPOSITE` (16 shells) | `MULTI_SHELL_COMPOSITE` (16 shells) | **PASS** |
| **Non-Manifold Edges** | $\le 0$ | 0 | 0 | **PASS** |
| **Boundary (Open) Edges** | $\le 0$ (per-shell watertight) | 0 | 0 | **PASS** |
| **Duplicate Faces** | $\le 0$ | 0 | 0 | **PASS** |
| **Zero-Area Faces** | $\le 0$ | 0 | 0 | **PASS** |
| **Is Watertight (per-shell edge accounting)** | `true` | `true` | `true` | **PASS** |
| **Connected Shells (union-find, Phase 3.1)** | reported, ≥2 (composite) | 16 | 16 | **PASS (discloses NON-continuity)** |
| **Triangle Count** | $> 50,000$ | 198,230 | 198,310 | **PASS** |
| **Unique Vertices** | $> 25,000$ | 99,147 | 99,187 | **PASS** |

### 2.2. Anatomical QA Audit (scale/laterality plausibility ONLY — not morphological proof)
| Anatomical Metric | Reference band (plausibility, unjustified — see limitations) | Measured Left Cortex | Measured Right Cortex | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Cortical Volume** | $180 - 380\text{ cm}^3$ (Hemisphere) | **$260.21\text{ cm}^3$** | **$260.24\text{ cm}^3$** | **PLAUSIBLE** |
| **Total Bilateral Volume** | $450 - 650\text{ cm}^3$ | **$520.45\text{ cm}^3$** | **$520.45\text{ cm}^3$** | **PLAUSIBLE** |
| **Z-Extent (posterior-anterior under corrected axes)** | $150 - 185\text{ mm}$ | $170.23\text{ mm}$ | $170.23\text{ mm}$ | **PLAUSIBLE** |
| **Y-Extent (inferior-superior)** | $100 - 125\text{ mm}$ | $110.74\text{ mm}$ | $110.74\text{ mm}$ | **PLAUSIBLE** |
| **X-Extent (medial-lateral)** | $60 - 75\text{ mm}$ (Hemisphere) | $65.19\text{ mm}$ | $65.21\text{ mm}$ | **PLAUSIBLE** |
| **Laterality Assignment** | Correct hemisphere in canonical internal space | $X \le +0.10\text{ mm}$ (Left) | $X \ge +1.18\text{ mm}$ (Right) | **VERIFIED (chain, D5)** |
| **Midline gap** | inter-piece space, NOT a validated fissure | $1.08\text{ mm}$ gap between chunk sets | $1.08\text{ mm}$ gap between chunk sets | **MEASURED, NOT BIOLOGICAL** |

---

## 3. Morphological Landmark Verification — NOT PERFORMED (Phase 3.1 retraction)

> The text previously in this section claimed the mesh had been "verified against
> standard human neuroanatomical atlases (Duvernoy, Schmahmann, Ono)" with specific
> findings (hand knob, three temporal gyri, cuneus/lingual bounding calcarine, V1
> banks "verified"). NO such verification exists: no comparison code, image, overlay,
> or measurement record is present anywhere in this repo. Those paragraphs are
> retracted in full (preserved in git history only).
>
> Additional facts making the old claims impossible: the composite contains NO
> superior temporal gyrus, NO cuneus, and NO lingual gyrus as separate pieces
> (see `PHASE_3_CORTEX_SOURCE_COMPONENTS.md`); sulci exist only as gaps between
> chunk shells, never as modeled sulcal fundi; label anchors in `src/types/semantic.ts`
> are schematic and partly misplaced (see audit D7).
>
> What genuine morphological verification would require (Part 4 entry gate, NOT done):
> expert-vs-mesh landmark review with recorded overlays, per-component identity
> confirmation against the source atlas, sulcal-fundus tracing on a TRUE continuous
> pial surface (e.g. FreeSurfer `mri_surface` representation — not currently present).
> Until then: **sulcal/gyral localization = NOT CURRENTLY REPRESENTED.**

---

## 4. Decoupling Principles: Semantic Anatomy vs. Physical Geometry

A foundational error of early 3D anatomy tools is slicing physical meshes into discrete polygon chunks to represent "lobes". In real human neurobiology:
1. **No Physical Slices (aspiration vs current state)**: The living cerebral cortex is an unbroken, continuous sheet of 6-layered neocortex. OUR CURRENT ASSETS DO NOT ACHIEVE THIS — they are 16-shell concatenations whose chunk seams are NOT anatomical boundaries (Phase 3.1 D1). A true continuous sheet (`mri_surface`, e.g. FreeSurfer) is NOT CURRENTLY REPRESENTED.
2. **Semantic Delineation**: Lobes (Frontal, Parietal, Temporal, Occipital, Insula, Limbic) are ontological groupings in `src/types/semantic.ts` and `AnatomicalAssemblyManager.ts`. They define functional roles, landmark boundaries, and educational associations without fragmenting the physical surface mesh.
3. **Resolution Scope**: Ingested cortical meshes represent macroscopic multi-chunk assemblies (`MACROSCOPIC_HOMOGENEOUS_UNSEGMENTED` is a bookkeeping label, not a continuity claim). Cytoarchitectonic Brodmann areas and multi-modal HCP parcellations are deferred to subsequent vertex/texture mapping layers.
