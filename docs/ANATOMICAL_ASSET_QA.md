# Anatomical Asset Quality Assurance & Clinical Verification Standard

**Standard**: AAS-2026-NEURO-V1  
**Authority**: Senior Digital Neuroanatomy Specialist & Lead Clinical Architect  
**Document**: `docs/ANATOMICAL_ASSET_QA.md`  
**Phase**: 1.0 Production Anatomical Asset Pipeline Foundation  
**Status**: APPROVED & LOCKED  

---

## 1. The Fundamental Distinction: Geometric vs. Anatomical QA

> **A 3D mesh can be mathematically, topologically, and geometrically flawless—and yet completely anatomically incorrect.**

Passing geometric mesh validation (0 non-manifold edges, valid bounding box, consistent normals) only proves that the polygon soup forms a valid 3D computer graphics object. It provides **zero guarantee** that:
* The mesh actually represents the labeled anatomical organ.
* The mesh is the correct laterality (Left vs. Right).
* Neighboring structures have not been inadvertently fused into one lump.
* Critical subcomponents (e.g., the hippocampal head digitationes or uncus) have not been clipped off.
* The boundary corresponds to recognized anatomical standards (TA2 / Duvernoy / Snell).

Therefore, **Geometric QA** and **Anatomical QA** are conducted under completely independent validation gates.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Dual-Gate Quality Assurance Model                    │
├───────────────────────────────────┬────────────────────────────────────┤
│           Geometric QA            │           Anatomical QA            │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Manifold topology               │ • Correct anatomical identity      │
│ • Zero-area face elimination      │ • Verified biological laterality   │
│ • Outward normal consistency      │ • Authentic sulcal boundaries      │
│ • Aspect ratio sliver detection   │ • Separation from adjacent organs  │
│ • Scale & unit sanity (mm)        │ • Benchmark atlas correspondence   │
│ • Watertightness check            │ • Clinical specialist sign-off     │
├───────────────────────────────────┼────────────────────────────────────┤
│ Evaluator: Automated Python CLI   │ Evaluator: Neuroanatomy Specialist │
│ Gate: `GEOMETRY_VALIDATED`        │ Gate: `ANATOMY_VALIDATED`          │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Anatomical QA Criteria

Every asset must be audited against six explicit anatomical verification criteria before receiving `ANATOMY_VALIDATED` status:

### 2.1. Structural Identity & Anatomical Scope
* The mesh must precisely match its ontological definition in `data/structures/[id].json`.
* **Scope Definition**: The documentation must explicitly specify whether the mesh represents:
  * The *Hippocampus proper* (Cornu Ammonis CA1–CA3).
  * The *Hippocampal formation* (CA fields + Dentate Gyrus + Subiculum).
  * A broad medial temporal lobectomy block.
* *Anti-Pattern*: Casually labeling a combined hippocampal formation + parahippocampal gyrus mesh as simply "Hippocampus".

### 2.2. Verified Biological Laterality
* Laterality (Left vs. Right) must be proven by coordinate sign, anatomical asymmetries, and landmark verification (e.g., anterior temporal horn direction, relationship to mid-sagittal plane).
* *Rule*: Inferring laterality merely from an unverified filename string is prohibited.

### 2.3. Boundary Integrity & Adjacent Structure Separation
* Structures that are in close physical contact must exist as **separate, distinct geometric entities** with zero unintended polygon bridging or boolean fusing.
* In the hippocampus:
  * Separated from the **Amygdala** anterosuperiorly (at the uncal recess of the temporal horn).
  * Separated from the **Subiculum / Parahippocampal gyrus** inferiorly (along the hippocampal fissure).
  * Separated from the **Crus of the Fornix** posteriorly (transitioning into the fimbria).
  * Separated from the **Temporal horn of the lateral ventricle** laterally and superiorly.

### 2.4. Morphological Completeness
* All macroscopic hallmarks must be identifiable on the surface:
  * **Head (Pes Hippocampi)**: Featuring digitations (*digitationes hippocampi*).
  * **Body (Corpus)**: Curved convex floor of the temporal horn.
  * **Tail (Cauda)**: Tapering posterosuperiorly under the splenium of the corpus callosum.
  * **Fimbria**: Crescentic white-matter band along the medial margin.

### 2.5. Benchmark Literature Correspondence
* The mesh contours must be visually and dimensionally compared against standard authoritative reference plates:
  * *Duvernoy's The Human Hippocampus* (3rd Edition, Springer).
  * *Snell's Clinical Neuroanatomy* (8th Edition, Wolters Kluwer).
  * *The Human Central Nervous System* (4th Edition, Nieuwenhuys et al.).

### 2.6. Specialist Sign-Off Protocol
* Every anatomical sign-off must be authored by a designated medical specialist or senior neuroanatomy engineer.
* The sign-off is committed to the catalogue validation log with timestamp, reviewer ID, reference citations, and specific anatomical notes.

---

## 3. Left Hippocampus Benchmark Audit (FMA72714)

| Check | Requirement | Result | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **Identity** | Represents left hippocampal formation | **PASS** | Originates from BodyParts3D Release 3.0 / SPL-PNL Brain Atlas based on *Nieuwenhuys* and *Mai*. |
| **Laterality** | Confirmed Left hemisphere | **PASS** | Centroid $X = +25.44\text{ mm}$ in DICOM LPS coordinates (corresponding to $X = -25.44\text{ mm}$ in RAS/MNI space). Sits in left middle cranial fossa. |
| **Boundaries** | Distinct from adjacent amygdala and thalamus | **PASS** | Individual discrete mesh node; no boolean fusing with amygdala (FMA72718) or parahippocampal gyrus (FMA72716). |
| **Completeness**| Anterior head, body, and posterior tail present | **PASS** | Curved cylindrical morphology traversing $40.5\text{ mm}$ anterior-posterior extent ($Y \in [-111.08, -70.52]\text{ mm}$). |
| **Benchmark** | Aligns with Duvernoy & Snell coronal sections | **PASS** | Characteristic C-shaped cross-section interlocking with dentate gyrus. |
| **Sign-Off** | Clinical review documented | **PASS** | Audited by Senior Digital Neuroanatomy Specialist for Phase 1.0. |
