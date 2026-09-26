# Architectural Invariants: 12 Permanent Core Mandates

**Document Standard**: AAS-2026-NEURO-V1  
**Phase**: Phase 2.1.1 Final Architecture Consolidation & Part-3 Readiness Gate  
**Target Audience**: All AI Autonomous Agents, Lead Architects, Scientific Curators, and Graphics Engineers  
**Enforcement**: STRICT & UNCOMPROMISING  

---

## Preamble

Medical and neuroscientific digital applications frequently suffer catastrophic technical debt and scientific corruption when subtle ontological, physical, and legal distinctions are blurred for UI convenience. In our 3D interactive brain atlas, every software engineer, subagent, and automated pipeline must adhere strictly to these **Twelve Architectural Invariants**. Violating any invariant is treated as a critical regression and blocks merging and release.

---

### Invariant 1: Canonical Coordinates are `canonical_atlas_ras` and Strictly Internal
* **Principle**: The internal reference space of the 3D atlas engine is `canonical_atlas_ras` ($1\text{ unit} = 1.0\text{ mm}$; measured axes +X Right, +Y Superior, +Z POSTERIOR — NOT RAS order, NOT MNI; Phase 3.1 D3. The identifier is retained for stability and makes no anatomical claim).
* **Invariant Rule**: Canonical coordinates are an **internal engine coordinate space**. They are NOT automatically MNI152 coordinates. Centroid bilateral symmetry ($X \approx -25\text{ mm}$ vs $+26\text{ mm}$) does NOT prove MNI152 registration. Registration to stereotaxic templates requires empirical spatial normalization and must be marked `PENDING` (with NULL metrics) if not rigorously completed.

### Invariant 2: Anatomical Identity ≠ Mesh Asset File
* **Principle**: A biological anatomical organ (`brain.*`) is a permanent neuroanatomical concept grounded in Terminologia Anatomica 2 (TA2) and FMA. A 3D mesh (`mesh.*`) is a versioned geometric polygon approximation.
* **Invariant Rule**: An `AnatomicalStructure` entity can exist in the atlas catalogue and knowledge graph **before** any 3D geometry file is created, downloaded, or cleaned. The physical mesh file is linked strictly via an asset reference and tracked in `assets/assets.manifest.json`.

### Invariant 3: An Entity May Have Many Representations Over Time (One Entity $\rightarrow$ Many Representations)
* **Principle**: A biological structure can be visualized or analyzed through multiple physical and digital representations: macroscopic surface meshes, subfield parcellations, histological slice stacks, MRI volumetric segmentations, white matter tractography streamlines, or functional activation fields.
* **Invariant Rule**: Entities must maintain a `representations` collection. The engine and UI must select the active representation according to viewport mode, level-of-detail, and hardware capability without duplicating or fragmenting the core entity identity.

### Invariant 4: Structural Hierarchy and Functional Membership are Strictly Separate
* **Principle**: Embryological and anatomical containment (e.g., Cerebrum $\rightarrow$ Left Hemisphere $\rightarrow$ Temporal Lobe) describes physical tissue boundaries (`STRUCTURAL_CONTAINMENT`). Functional circuits, limbic systems, and distributed networks (e.g., Limbic System, Salience Network) describe functional association (`FUNCTIONAL_MEMBERSHIP`).
* **Invariant Rule**: Structural containers (`division.*`, `hemisphere.*`) and functional systems (`system.*`, `network.*`) must never be conflated as identical tree relationships. The system must support separate queries for structural ancestors vs functional groups.

### Invariant 5: Ingestion Validation Cannot Be Bypassed
* **Principle**: Raw external meshes (OBJ, STL, Blender) regularly possess non-manifold edges, self-intersections, inverted normals, degenerate faces, and arbitrary scales.
* **Invariant Rule**: No mesh can enter the runtime atlas without progressing through the deterministic automated pipeline: raw asset ingestion $\rightarrow$ geometric QA audit (Euler characteristic, boundary edges, watertight verification) $\rightarrow$ coordinate canonicalization $\rightarrow$ multi-LOD simplification $\rightarrow$ Meshopt runtime compression $\rightarrow$ cryptographic SHA-256 verification in `assets.manifest.json`.

### Invariant 6: Memory Ownership is Explicit, Layered, and Verifiable
* **Principle**: WebGL and WebGPU contexts leak GPU VRAM if geometries, materials, and textures are not explicitly unmounted, disposed, and garbage-collected.
* **Invariant Rule**: Memory ownership is partitioned into four explicit tiers:
  1. **Raw CPU Asset Data** (`AssetManager` cache)
  2. **Three.js Geometry / Material CPU Buffers** (`ResourceManager`)
  3. **GPU VRAM Buffer Allocations** (`RendererManager` / WebGPU / WebGL)
  4. **Active Scene Graph Nodes** (`SceneManager` & `AnatomicalEntityManager`)
  Every visual disposal must recursively unmount nodes, dispose materials and geometries (including BVH `disposeBoundsTree` where present), release GPU buffer bindings, and invalidate cache references. Reference-counted paths (LOD switches) must be balanced and regression-tested. KNOWN GAPS (Phase 3.1 §30, tracked in `KNOWN_ANATOMICAL_LIMITATIONS.md`, must be closed before they can back any "zero leak" claim): per-asset (not per-LOD) refcount granularity with bulk-dispose hazard; orphaned `ResourceManager`; no disposal on scene-remove/unregister paths; `entityRepresentations` map never cleared. "Zero memory leakage" must never be claimed until these close.

### Invariant 7: Mobile and Desktop Runtime Budgets are Non-Negotiable
* **Principle**: Interactive neuroanatomy must run smoothly across high-end desktop workstations and constrained mobile tablets/smartphones.
* **Invariant Rule**: Applications must adhere to strict performance envelopes:
  - **Desktop (Tier 1)**: $\le 500{,}000$ active triangles, $\le 200\text{ MB}$ GPU VRAM, 60 FPS target.
  - **Mobile / Fallback (Tier 3)**: $\le 100{,}000$ active triangles, $\le 60\text{ MB}$ GPU VRAM, 30 FPS floor.
  If frame time drops below threshold, the `PerformanceManager` and `LODManager` must automatically step down LOD levels and throttle dynamic shadows/effects.

### Invariant 8: WebGPU and WebGL Must Both Fail Gracefully
* **Principle**: Modern browsers may fail to initialize WebGPU due to missing driver support, disabled flags, or hardware blocklists. Furthermore, WebGPU devices can experience device loss (`GPUDevice.lost`).
* **Invariant Rule**: The engine must initialize WebGPU when available and transparently fall back to WebGL2 / WebGL1. On WebGPU device loss or WebGL context loss, the renderer must catch the event, emit diagnostics, prevent unhandled rejection, pause rendering, and attempt the documented recovery pathway. CURRENT STATE (Phase 3.1 §31–32): detection + pause/resume are real; full renderer recreation, resource rebinding, and session-state restore are PARTIAL/FUTURE — claimed nowhere as complete.

### Invariant 9: Upstream Source Licenses Must Be Separated from Derived Distribution Policy
* **Principle**: Upstream source repositories may carry distinct licensing terms (e.g. DBCLS BodyParts3D Release 3.0 originally CC-BY-SA 2.1 JP, later updated on portal to CC BY 4.0).
* **Invariant Rule**: Metadata and manifests must cleanly separate `upstream_license` (the exact upstream legal covenant) from `project_distribution_policy` (the project's chosen distribution license for derived assets, e.g. `CC-BY-SA-4.0`). Where retroactive relicensing ambiguities exist, they must be marked `LEGAL_REVIEW_REQUIRED`.

### Invariant 10: Registration to Stereotaxic Templates Must Be Explicitly Validated or Marked Pending
* **Principle**: Approximations and visual similarities must not be misrepresented as clinical or scientific co-registrations.
* **Invariant Rule**: When a registration is ACTUALLY COMPUTED, the record must include complete `RegistrationMetadata` (method, source script, target template, measured uncertainty in mm, measured Dice). When NO registration was computed — the normal case in this repo — the record MUST use method `not_registered`, status `REGISTRATION_PENDING`, and MUST NOT contain uncertainty/Dice/template values (Phase 3.1 §8: unmeasured metrics are fabrication, even if an older version of this invariant appeared to require the fields unconditionally).

### Invariant 11: Automated Test Success Does Not Equal Physical Device Validation
* **Principle**: Headless CI test environments (Node.js, tsx, jsdom) execute JavaScript and synthetic logic; they do not exercise physical GPU rasterizers, mobile thermal throttling, driver idiosyncrasies, or real touch interaction.
* **Invariant Rule**: Granular validation records must separate `stage: "DEVICE_VALIDATED"` with `device_validation_level: "AUTOMATED_TEST_VALIDATION"` from `"BROWSER_VALIDATION"` and `"PHYSICAL_DEVICE_VALIDATION"`. Unperformed physical device validations must be declared `DEVICE_VALIDATION_PENDING`.

### Invariant 12: Future Expansion Layers (Part 3) Must Conform to this Schema and May Not Introduce Ad-Hoc Fields
* **Principle**: As the atlas expands from the bilateral hippocampus to hundreds of brain structures, cortical parcellations, white-matter tracts, functional networks, and psychiatric modules in Part 3, data contracts must remain rigorous.
* **Invariant Rule**: All upcoming assets and entity definitions must conform strictly to the TypeScript interfaces in `src/types/` and `src/engine/types.ts`. Ad-hoc, unvalidated JSON fields are prohibited.

---

## Permanent Compliance Verification

Every CI workflow, automated test run, and pull request must execute `npm test`, verifying that:
1. `src/schema_validation.test.ts` passes with zero schema or invariant violations.
2. `src/architecture_consolidation.test.ts` passes all architectural contract and invariant tests.
3. `tsc --noEmit` compiles cleanly with strict type safety.
4. No fake cryptographic hashes or placeholder commit IDs exist in production JSON records.
