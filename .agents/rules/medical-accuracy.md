---
trigger: always_on
description: Enforces medical accuracy, zero AI-hallucinated anatomy, licensing compliance, and WebGL/WebGPU performance standards for the 3D Neuroanatomy Atlas.
---

# Medical & Technical Accuracy Directives

1. **Zero Hallucination Policy**: Never fabricate anatomical geometry, gyral patterns, structural boundaries, or neural connections. All structures must align with Terminologia Anatomica 2 (TA2/TNA) and validated scientific atlases.
2. **Scientific Authority Hierarchy**: Snell's Clinical Neuroanatomy (8th Ed.), Duvernoy, Kandel, and Human Connectome Project (Glasser 2016) are the primary structural authorities. DSM-5-TR and Stahl's Essential Psychopharmacology govern all psychiatric clinical correlations.
3. **Architecture Boundary**: Keep anatomical data (TypeScript/Zod JSON) strictly separate from 3D presentation code (Three.js/TSL) and UI (React 19).
4. **Performance Standards**: Maintain 60 FPS on desktop and iPad Pro. Use Meshopt compression and KTX2 Basis Universal textures. Zero allocations and zero React state updates in 3D animation loops.
5. **Licensing Compliance**: Derivative 3D assets from Z-Anatomy remain under CC-BY-SA 4.0 with attribution. Keep NC-encumbered datasets out of redistributable binaries.
