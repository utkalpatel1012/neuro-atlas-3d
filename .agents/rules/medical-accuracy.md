---
trigger: always_on
description: Enforces medical accuracy, zero AI-hallucinated anatomy, licensing compliance, and WebGL/WebGPU performance standards for the 3D Neuroanatomy Atlas.
---

# Medical & Technical Accuracy Directives (Phase 0.1 & Phase 0.1.1 Remediated)

1. **Zero Hallucination Policy**: Never fabricate anatomical geometry, gyral patterns, structural boundaries, or neural connections. All structures must align with Terminologia Anatomica 2 (TA2/TNA) and Foundational Model of Anatomy (FMA).
2. **Epistemic Rigor**: Association is not causation. Mechanistic hypotheses (e.g., neurogenesis, Grace model) must be explicitly classified as theoretical hypotheses, not established clinical consensus. GRADE framework is restricted to clinical domains.
3. **Ontological Separation**: Physical anatomical organs are strictly separated from atlas parcellations (Brodmann, HCP MMP), functional networks (DMN, Salience), and clinical treatments (ECT, TMS, DBS) via the 8-type `NeuroEntity` discriminated union.
4. **Coordinate Integrity**: Raw mesh coordinates are never assumed to be MNI152. Registered coordinates cannot exist without an explicit target frame and registration metadata.
5. **Asset-Level Provenance & Quarantine**: Track licenses at the individual asset level in `assets.manifest.json`. Strictly quarantine CC-BY-NC-SA research datasets from production bundles. Treat HCP commercial redistribution as `LEGAL_REVIEW_REQUIRED`. Never fabricate fake SHA-256 hashes or placeholder git commits.
6. **Empirical Performance Budgets**: Comply with device-class budgets in `PERFORMANCE_BUDGETS.md`. Maximum 110 MB GPU VRAM on base iPad to prevent Jetsam process termination.
7. **Runtime Presentation Independence**: Peeling, transparency, and explosion vectors are runtime presentation transforms that never alter canonical resting geometry.
8. **Invariant & Identity Compliance**: Adhere strictly to [`ARCHITECTURAL_INVARIANTS.md`](../../ARCHITECTURAL_INVARIANTS.md) and [`ENTITY_IDENTITY_AND_REFERENCING.md`](../../ENTITY_IDENTITY_AND_REFERENCING.md). (Phase 3.2: dead machine-local `file:///` links replaced with relative links.)
