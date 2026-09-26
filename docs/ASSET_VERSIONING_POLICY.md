# Asset Versioning & URI Namespace Architecture Policy

**Standard**: AAS-2026-NEURO-V1  
**Authority**: Lead Technical Architect & Digital Neuroanatomy Specialist  
**Document**: `docs/ASSET_VERSIONING_POLICY.md`  
**Phase**: 1.0.1 Final Asset Pipeline Hardening & Pre-Phase-2 Gate  
**Status**: APPROVED & LOCKED  

---

## 1. Executive Summary & Core Principle

In medical and psychiatric digital visualization, conflating semantic neuroanatomical concepts (e.g., "Left Hippocampus" as a limbic structure with clinical functions) with physical files (e.g., a specific decimated STL or GLB polygon mesh) introduces critical architectural debt and scientific inaccuracies.

This policy defines the **Five Disjoint URI Namespaces**, **Semantic Versioning for 3D Assets**, **Raw Asset Immutability**, and **Production Licensing Quarantine Rules**.

---

## 2. The Five Disjoint URI Namespaces

Every identifier across the atlas belongs to exactly ONE of five strictly disjoint URI schemes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FIVE DISJOINT NAMESPACES                        │
├─────────────────┬──────────────────────────────────────────────────────┤
│ URI Scheme      │ Purpose & Domain Scope                               │
├─────────────────┼──────────────────────────────────────────────────────┤
│ entity://       │ Semantic graph entities (structures, networks,       │
│                 │ tracts, cytoarchitectonic areas).                    │
│                 │ Example: entity://brain.telencephalon.left.limbic.   │
│                 │         hippocampus                                  │
├─────────────────┼──────────────────────────────────────────────────────┤
│ asset://        │ Physical asset manifests and provenance clusters.    │
│                 │ Example: asset://mesh.hippocampus.left.v1            │
├─────────────────┼──────────────────────────────────────────────────────┤
│ mesh://         │ Specific 3D mesh representations, LOD levels, and    │
│                 │ runtime binary deliverables.                         │
│                 │ Example: mesh://mesh.hippocampus.left.v1/canonical   │
│                 │ Example: mesh://mesh.hippocampus.left.v1/runtime/lod0│
├─────────────────┼──────────────────────────────────────────────────────┤
│ texture://      │ Material surface maps, normal textures, matcaps,     │
│                 │ and KTX2/Basis Universal stream buffers.             │
│                 │ Example: texture://matcap.pial_cortical_v1.ktx2      │
├─────────────────┼──────────────────────────────────────────────────────┤
│ evidence://     │ Epistemic grounding claims, clinical literature,     │
│                 │ meta-analyses, and RDoC construct links.             │
│                 │ Example: evidence://claim.hpc.volume_reduction.mdd   │
└─────────────────┴──────────────────────────────────────────────────────┘
```

### Architectural Guarantees:
* An `entity://` URI can exist **without any physical mesh** (e.g., planned subfields, functional default mode network nodes, microscopic nuclei).
* A single `entity://` can reference **multiple alternate asset versions** (e.g., high-res ex vivo 7T MRI vs. low-poly real-time mobile mesh).
* An `evidence://` claim references `entity://` nodes, **never physical mesh files directly**.

---

## 3. Semantic Versioning for 3D Assets

All asset identifiers follow the schema `[type].[organ].[laterality].[version]` (e.g., `mesh.hippocampus.left.v1`).

Versioning follows Semantic Versioning rules adapted for digital geometry:

### Major Version Bump (`v1` $\rightarrow$ `v2`):
A breaking change requiring downstream entity record or pipeline migration:
* Upstream source change (e.g., migrating from BodyParts3D to Julich-Brain / BigBrain).
* Coordinate system or reference origin change (e.g., changing AC-PC origin definition).
* Substantial topological boundary redefinition (e.g., splitting macroscopic hippocampus into discrete CA1-CA4 subfields).
* Redistribution license change.

### Minor Version Bump (`v1.0` $\rightarrow$ `v1.1`):
A backward-compatible enhancement:
* Addition of higher-density LOD schedules (e.g., introducing LOD4 or micro-LOD).
* Improved vertex normal generation algorithm (e.g., area-weighted smooth angle normals).
* Refined stereotaxic registration alignment without altering canonical local frame.

### Patch Version Bump (`v1.0.0` $\rightarrow$ `v1.0.1`):
A backward-compatible bugfix:
* Fix to metadata typo or attribution wording in manifest.
* Re-compression of runtime GLB with newer `meshoptimizer` release without geometric delta.

---

## 4. Immutability & Content-Addressing Policy

1. **Raw Source Immutability**:
   - Files stored in `assets/raw/[assetId]/` are strictly **immutable**.
   - `ingest_asset.ts` utilizes atomic check-before-write (`flag: 'wx'`). Overwriting raw assets is prohibited.
   - If an upstream asset changes at the remote source, a new asset version ID (`v2`) must be minted.
2. **Cryptographic Content Addressing**:
   - Every file (raw, canonical, LOD, runtime) must have its cryptographic SHA-256 digest recorded in the manifest.
   - Any byte change produces a new hash, triggering pipeline invalidation.

---

## 5. Production Whitelist vs. Research Quarantine Policy

To ensure complete legal compliance for production web deployments:

* **Production Whitelist (`production_whitelist`)**:
  - Eligible licenses: `CC_BY_4_0`, `CC_BY_SA_4_0`, `CC_BY_SA_2_1_JP`, `CC0_1_0`, `MIT`, `APACHE_2_0`, `BSD_3_CLAUSE`.
  - Must have `production_eligibility: "PRODUCTION_ALLOWED"`.
  - Must have `commercial_redistribution: "PERMITTED"`.
  - Must pass 100% of Geometric QA and Anatomical QA audits.
* **Research Quarantine (`research_quarantine`)**:
  - Restricted licenses: `CC_BY_NC_SA_4_0` (EBRAINS / BigBrain / Julich-Brain), `ALLEN_INSTITUTE_TERMS`, `HCP_OPEN_ACCESS_DATA_USE` (requires non-redistribution compliance), custom non-commercial licenses.
  - Must have `production_eligibility: "RESEARCH_ONLY"`.
  - Must have `commercial_redistribution: "PROHIBITED"`.
  - Barred from inclusion in production web application distribution bundles.
