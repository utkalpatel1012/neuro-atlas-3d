# 3D Interactive Neuroanatomy Atlas for Psychiatry

An anatomically accurate, scientifically grounded 3D human brain atlas engineered specifically for the academic and clinical training of psychiatry residents, neuroscientists, and medical trainees.

---

## 📌 Project Overview

This repository houses the foundational architecture, neuroanatomical standards, data schemas, and technical blueprints for an interactive, browser-based 3D human brain atlas.

The ultimate objective is to bridge:
* **Macroscopic Cortical Topography**: Detailed cerebral gyri, sulci, fissures, and lobes.
* **Granular Subcortical Structures**: Basal ganglia (Caudate, Putamen, Globus Pallidus, Nucleus Accumbens), Diencephalon (Thalamus, STN, Epithalamus/Habenula).
* **Limbic Circuitry**: Hippocampus (CA1–CA3, Dentate Gyrus, Subiculum), Amygdala, Fornix, Mammillary bodies.
* **Brainstem & Cerebellum**: Midbrain, Pons, Medulla, deep cerebellar nuclei, and cranial nerves I–XII.
* **Ventricular System**: Watertight casts of lateral, third, and fourth ventricles with internal foramina.
* **White-Matter Pathways**: Projection, association, and commissural bundles.
* **Cerebral Vasculature**: Circle of Willis, major cerebral arteries (ACA, MCA, PCA), and vertebrobasilar branches.
* **Psychiatric Clinical Grounding**: DSM-5-TR diagnostic pathophysiology, NIMH Research Domain Criteria (RDoC) functional domains, psychopharmacology receptor profiles, neuromodulation targets (rTMS, DBS, ECT), and neurological lesion bedside tests.

---

## 🧭 Repository Structure & Documentation

* [`PROJECT_ARCHITECTURE.md`](./PROJECT_ARCHITECTURE.md): Complete architectural blueprint (Sections A through N) covering technical, 3D, data, knowledge, and AI architectures.
* [`ANATOMICAL_ACCURACY_STANDARD.md`](./ANATOMICAL_ACCURACY_STANDARD.md): Non-negotiable scientific policy, zero-hallucination mandate, and structural completeness checklists.
* [`SOURCES_AND_LICENSES.md`](./SOURCES_AND_LICENSES.md): Provenance and licensing evaluation (Z-Anatomy CC-BY-SA 4.0, HCP Open Access, FreeSurfer, EBRAINS Julich-Brain).
* [`TECH_STACK_DECISION.md`](./TECH_STACK_DECISION.md): Technical decisions and justifications (Three.js WebGPURenderer, React 19, glTF/GLB, Meshopt, KTX2, BatchedMesh, BVH raycasting).
* [`DEVELOPMENT_ROADMAP.md`](./DEVELOPMENT_ROADMAP.md): Detailed 8-phase execution plan.
* [`ANTIGRAVITY_RULES.md`](./ANTIGRAVITY_RULES.md): Persistent agent operational rules and quality gates.
* [`CHATGPT_CONSULTATION_PACK.md`](./CHATGPT_CONSULTATION_PACK.md): Structured dossier and ready-to-use prompt for consulting with ChatGPT or external peer reviewers.
* [`src/types/anatomy.ts`](./src/types/anatomy.ts): Strongly typed TypeScript schema defining anatomical structures, ontologies, and clinical metadata.
* [`data/structures/hippocampus_left.json`](./data/structures/hippocampus_left.json): Exemplar clinical dataset for the Left Hippocampus.
* [`.agents/skills/`](./.agents/skills/): Four specialized Antigravity agent skills for neuroanatomy research, Blender asset preparation, Three.js medical visualization, and accuracy reviews.

---

## 🛠️ Technology Stack Summary

* **Frontend**: React 19 + TypeScript (Strict Mode) + Vite
* **3D Engine**: Three.js (r172+) with `WebGPURenderer` (auto-fallback to `WebGLBackend`) & Three Shading Language (TSL)
* **3D Binding**: Hybrid React Three Fiber (R3F) + Imperative Three.js Core
* **3D Compression**: glTF 2.0 Binary (`.glb`) with **Meshopt (`EXT_meshopt_compression`)** & **KTX2 / Basis Universal (`KHR_texture_basisu`)**
* **Acceleration**: `three-mesh-bvh` (<0.1 ms raycast latency over 500,000+ polygons)
* **State & Search**: Zustand (spatial state) + MiniSearch (client-side fuzzy medical term search)
* **Persistence & PWA**: Dexie.js (IndexedDB) + Service Worker Cache API for 100% offline usage on iPadOS and desktop

---

## ⚖️ Scientific Provenance & Licensing

* **Macroscopic & Subcortical Geometry**: Sourced and optimized from **Z-Anatomy**, licensed under **Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)**.
* **Cortical Parcellation**: Sourced from the **Human Connectome Project (HCP) Glasser MMP 1.0** under **HCP Open Access Terms**.
* **Stereotaxic Space**: Registered in **MNI152 / ICBM 2009c Nonlinear Asymmetric** and **FreeSurfer fsaverage** space.
* **Application Source Code**: Licensed under **Apache-2.0**.
* **Medical Disclaimer**: This application is an educational and academic reference atlas for medical training and research, not a certified medical device for primary surgical planning or primary diagnostic decision-making.
