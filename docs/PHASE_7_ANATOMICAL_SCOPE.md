# Phase 7 Scope (cortical parcellation)

## Objective (registry)

Separate physical cortex from atlas parcellation (HCP MMP 1.0 / Brodmann / verified
others only). Verify exact source/version/license first; HCP legal gate in force;
never map parcels onto BodyParts3D geometry without a verified
registration/mapping method.

## Source reality

- **HCP MMP 1.0**: governed by HCP Open Access Data Use Terms. Project standing
  policy (`docs/PRODUCTION_DATASET_LICENSE_MATRIX.md`) requires LEGAL REVIEW before
  any import. No legal review has occurred. **No HCP bytes are ingested in this phase.**
- **Brodmann**: classical cytoarchitectonic areas (BA 1–52) originate from published
  maps, not from a single downloadable geometry release with a clean license chain
  available to this project. No verified source/version/license triple is
  established. **No Brodmann geometry is ingested.**
- **Mapping method**: none verified. Projecting parcels onto BodyParts3D segments by
  visual approximation is explicitly prohibited and is not attempted.

## Phase outcome (registry-explicit alternative)

The registry permits "physically-separated parcellation OR documented deferral with
reason". This phase implements:

1. The parcellation **data model** (parcel identity, atlas membership, version,
   license posture, mapping state) with rendering **MAPPING_PENDING** throughout.
2. Architectural **separation enforcement**: physical-cortex entities and parcel
   entities are distinct types; no code path joins them without a verified mapping
   method (suite-asserted).
3. A **documented deferral** naming exactly what would unblock each atlas (HCP legal
   review + exact dataset version; Brodmann verified source/license; a validated
   registration method).

No parcel is rendered, no parcel is mapped, no parcel geometry ships. The phase is
complete when the model, the separation, the deferral record, and the tests exist —
not when parcels appear on screen.
