---
name: anatomical-accuracy-review
description: Pre-commit and pre-release review protocol to audit anatomical models, metadata records, psychiatric correlations, and glTF assets against ANATOMICAL_ACCURACY_STANDARD.md.
---

# Anatomical Accuracy Review Skill

## Purpose
Enforces a rigorous quality-control gate for all pull requests, code changes, metadata additions, and 3D asset updates to ensure 100% compliance with `ANATOMICAL_ACCURACY_STANDARD.md`.

## Systematic Audit Checklist

### 1. Structural Provenance & Nomenclature
- [ ] Structure ID conforms to `brain.<division>.<hemisphere>.<subsystem>.<structure>.<subpart>`.
- [ ] Official Latin name and English name match **Terminologia Anatomica 2 (TA2)**.
- [ ] Valid **Foundational Model of Anatomy (FMA)** and **UBERON** IDs are present.
- [ ] Bounding box and centroid coordinates are defined and within valid cranial limits.

### 2. Neuroanatomical Boundaries & Relations
- [ ] Boundaries (superior, inferior, anterior, posterior, medial, lateral) are documented.
- [ ] Adjacent anatomical structures are correctly cross-referenced.
- [ ] Afferent and efferent connections are backed by peer-reviewed literature or Snell's Clinical Neuroanatomy.
- [ ] Arterial supply and venous drainage branches are identified.

### 3. Psychiatric & Clinical Grounding
- [ ] DSM-5-TR psychiatric disorders linked to this structure specify exact pathophysiological mechanisms.
- [ ] Functional constructs are categorized under the NIMH RDoC matrix.
- [ ] Psychopharmacological receptor distributions are specified (e.g., 5-HT2A, D2, GABA-A).
- [ ] Distinction between established clinical consensus and research hypotheses is explicitly labeled.
- [ ] At least two authoritative primary references (with PMID or DOI) are included.

### 4. 3D Model & Technical Performance
- [ ] Model passes `gltf-validator` with 0 errors and 0 warnings.
- [ ] Pivot point is centered on anatomical center of mass.
- [ ] Mesh is manifold, with no inverted normals or degenerate faces.
- [ ] Decimated geometry retains anatomical landmarks (sulcal contours, nuclear boundaries).
- [ ] File is compressed with Meshopt (`gltfpack -cc -kn -tc`).
