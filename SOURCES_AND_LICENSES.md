# Anatomical Sources, Datasets & Licensing Specification

**Document Version**: 2.0.0 (Remediated in Phase 0.1)  
**Authority**: Lead Technical Architect & Digital Neuroanatomy Specialist  
**Standard**: AAS-2026-NEURO-V1  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. Executive Summary & Legal Architecture

This document governs the scientific datasets, 3D anatomical models, and intellectual property incorporated into the 3D Neuroanatomy Atlas.

### Strict Tri-Tier Licensing Policy
To ensure total academic transparency, protect human subject research covenants, and prevent copyright contamination:
1. **`PRODUCTION_ALLOWED`**: Assets verified to be free of non-commercial or proprietary use restrictions (e.g., Z-Anatomy CC-BY-SA 4.0, OpenNeuro CC0, FreeSurfer BSD).
2. **`RESEARCH_ONLY`**: Datasets with explicit Non-Commercial clauses (e.g., **EBRAINS Julich-Brain**, **BigBrain** under CC-BY-NC-SA 4.0). **These are strictly quarantined as academic validation benchmarks and are NEVER compiled into production client deliverables.**
3. **`LEGAL_REVIEW_REQUIRED`**: Datasets with complex research data-use agreements (e.g., **WU-Minn Human Connectome Project Open Access Data Use Terms**). Commercial redistribution of derivative applications is treated as requiring formal legal counsel clearance.

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
│       - Governed by HCP Open Access Data Use Agreement                 │
│       - Mandatory Subject Protection & Citation Covenants              │
│       - Commercial Redistribution Status: LEGAL_REVIEW_REQUIRED        │
├────────────────────────────────────────────────────────────────────────┤
│                 Scientific Reference & Validation Data                 │
│              EBRAINS Julich-Brain / BigBrain / Snell / DSM-5           │
│       - Tier: RESEARCH_ONLY (Quarantined from Production Bundles)      │
│       - Used strictly for boundary audits and cytoarchitectonic checks │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granular Resource Provenance & Legal Analysis

### A. Z-Anatomy & BodyParts3D
* **Project**: Z-Anatomy (`https://www.z-anatomy.com/`) & GitHub (`https://github.com/Z-Anatomy`)
* **Upstream Foundation**: BodyParts3D (Database Center for Life Sciences - DBCLS, Japan).
* **Licensing Breakdown**:
  * **Z-Anatomy Original Work & Retopology**: Licensed under **Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)**.
  * **BodyParts3D Components**: Originally released under **Creative Commons Attribution-ShareAlike 2.1 Japan (CC-BY-SA 2.1 JP)**.
  * **Compatibility**: Under CC-BY-SA 4.0 Section 3(b), derivative works that incorporate CC-BY-SA 2.1 Japan material may be distributed under CC-BY-SA 4.0 provided the attribution requirements of both original sources are honored.
* **Commercial Redistribution**: **PERMITTED**, with strict ShareAlike on derivative 3D assets.
* **Requirements**:
  1. *Attribution*: Full credit to Z-Anatomy and BodyParts3D contributors in the application `NOTICE.txt` and UI "About" panel.
  2. *ShareAlike*: All processed, decimated, or transformed meshes (`.glb`) derived from these sources must be made available under CC-BY-SA 4.0.
  3. *Codebase Isolation*: The web application engine (React, TypeScript, Three.js shaders) is separate intellectual property and is licensed under Apache-2.0 under the legal doctrine of "mere aggregation / collective work".
* **Operational Tier**: **`PRODUCTION_ALLOWED`**.

---

### B. Human Connectome Project (HCP) / Glasser Multi-Modal Parcellation (MMP 1.0)
* **Citation**: Glasser, M. F., Coalson, T. S., Robinson, E. C., et al. (2016). *A multi-modal parcellation of human cerebral cortex*. Nature, 536(7615), 171-178.
* **Data Agreement**: **WU-Minn HCP Consortium Open Access Data Use Terms** (`https://www.humanconnectome.org/study/hcp-young-adult/document/wu-minn-hcp-consortium-open-access-data-use-terms`).
* **Critical Legal Parsing**:
  * *Open Access Data Use*: Unrestricted for scientific, educational, and computational analysis.
  * *Redistribution Clause*: Redistribution of both original data and derived data is permitted **only under the identical HCP Data Use Terms**.
  * *Human Subject Protection Covenants*:
    1. The recipient agrees **not to attempt to establish the identity of, or contact**, any human subject from the HCP dataset.
    2. The recipient agrees not to link HCP data with any other dataset in a manner that could compromise subject anonymity.
  * *Institutional Compliance*: Users must comply with applicable rules and regulations, including institutional oversight where relevant.
  * *Mandatory Acknowledgment*: Any publication, presentation, or software derivative benefiting from HCP data must publish the exact mandated WU-Minn HCP acknowledgment text.
* **Commercial Redistribution Analysis**:
  * The HCP Open Access Terms do not contain an explicit "Non-Commercial" clause.
  * However, because redistribution must be conducted under the identical HCP Data Use Terms (including subject non-contact covenants), standard commercial redistribution in a closed-source or unencumbered product is **NOT automatically authorized without qualifications**.
* **Operational Tier**: **`LEGAL_REVIEW_REQUIRED`** for commercial software distribution; **`PRODUCTION_ALLOWED`** for open academic/educational distribution under identical terms.

---

### C. EBRAINS / Julich-Brain 3D Cytoarchitectonic Atlas
* **Citation**: Amunts, K., Mohlberg, H., Bludau, S., & Zilles, K. (2020). *Julich-Brain: A 3D probabilistic atlas of human brain’s cytoarchitecture*. Science, 369(6506), 988-992.
* **Licensing**: **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA 4.0)**.
* **Legal Analysis**:
  * The **Non-Commercial (NC)** restriction legally prohibits any commercial utilization, sale, monetization, or inclusion in commercial medical software without an explicit commercial license agreement from Forschungszentrum Jülich / EBRAINS.
  * Packaging Julich-Brain meshes inside a commercial web application would infect the entire distributable asset bundle with the NC copyleft clause.
* **Quarantine Enforcement**:
  * **DO NOT COMPILE JULICH-BRAIN MESHES INTO PRODUCTION WEB ASSETS.**
  * Julich-Brain cytoarchitectonic volumes and boundaries are utilized exclusively on the research workstation for auditing and verifying the accuracy of our open-access meshes.
* **Operational Tier**: **`RESEARCH_ONLY` (STRICTLY QUARANTINED)**.

---

### D. BigBrain Project
* **Citation**: Amunts, K., Lepage, C., Borgeat, L., et al. (2013). *BigBrain: An ultrahigh-resolution 3D human brain model*. Science, 340(6139), 1472-1475.
* **Licensing**: **CC-BY-NC-SA 4.0**.
* **Technical & Legal Status**:
  * 1 TB volume; impossible to package for client-side web without streaming servers.
  * NC license legally restricts public redistribution.
* **Operational Tier**: **`RESEARCH_ONLY` (STRICTLY QUARANTINED)**.

---

### E. OpenNeuro & FreeSurfer Standards
* **Source**: Stanford Center for Reproducible Neuroscience & Harvard Martinos Center.
* **Licensing**: **CC0 1.0 Universal (Public Domain Dedication)** and **BSD 3-Clause**.
* **Legal Analysis**: 100% royalty-free and completely unencumbered for both commercial and non-commercial redistribution.
* **Operational Tier**: **`PRODUCTION_ALLOWED`**.

---

## 3. Comprehensive Dataset Provenance Matrix

| Dataset / Source | Exact Version | Governing License | Production Eligibility | Commercial Redistribution | Mandatory Covenants / Actions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Z-Anatomy** | `v2024.1.0` | CC-BY-SA 4.0 | `PRODUCTION_ALLOWED` | `PERMITTED` (with SA) | Publish author attribution; redistribute derived 3D meshes under CC-BY-SA 4.0. |
| **BodyParts3D** | Release 4.0 | CC-BY-SA 2.1 JP | `PRODUCTION_ALLOWED` | `PERMITTED` (with SA) | Attribute DBCLS Japan; compatible with downstream CC-BY-SA 4.0. |
| **HCP Glasser MMP 1.0** | 1200 Subjects Release | HCP Data Use Terms | `LEGAL_REVIEW_REQUIRED` | `LEGAL_REVIEW_REQUIRED` | Must redistribute under identical terms; subject non-contact covenant; mandatory attribution. |
| **OpenNeuro Colin27 / MNI** | BIDS Release 2.0 | CC0 1.0 Universal | `PRODUCTION_ALLOWED` | `PERMITTED` | Fully unencumbered public domain dedication. |
| **FreeSurfer fsaverage** | v7.4.1 | BSD 3-Clause | `PRODUCTION_ALLOWED` | `PERMITTED` | Retain copyright notice and disclaimer in software notice. |
| **EBRAINS Julich-Brain** | v3.0.2 | CC-BY-NC-SA 4.0 | `RESEARCH_ONLY` | `PROHIBITED` | Barred from client bundles. Used strictly for offline validation. |
| **BigBrain** | 2015 20-micron release | CC-BY-NC-SA 4.0 | `RESEARCH_ONLY` | `PROHIBITED` | Barred from client bundles. Offline histological benchmark. |
| **Allen Human Brain Atlas** | AHBA Microarray v2 | Allen Terms of Use | `RESEARCH_ONLY` | `PROHIBITED` (without license) | Academic research and educational reference only. |
