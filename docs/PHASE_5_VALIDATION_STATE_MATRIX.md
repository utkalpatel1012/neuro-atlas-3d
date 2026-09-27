# Phase 5.0.2 Validation-State Matrix (20 production assets, actual values)

**Method:** values read from `assets.manifests/assets.manifest.json`,
`data/structures/*.json`, `assets/raw/*/ingestion.json`, and
`assets/validation/*.geometry_qa.json` on the audit date. Every asset audited;
no geometry changed by this audit.

## Status definitions (repository-actual meanings, §3)

- PROVENANCE_VALIDATED: source dataset/version/identifier/file/hash/derivation/
  license all recorded and hash-verified. (Implemented as ingestion + hash tests.)
- GEOMETRY_VALIDATED: profile-conformant topology (finite vertices, defect
  counts within profile limits, watertightness per class, nonzero triangles).
- COORDINATE_VALIDATED: canonical adapter applied; centroid signs encode
  laterality through the verified transform chain (never filename alone).
- ANATOMY_VALIDATED (production-asset sense): source-authoritative structure
  identity (Level A) + GEOMETRY_VALIDATED (Level B) + measured scale/laterality
  plausibility. NOT expert review, NOT morphological proof for new segments.
  Benchmark hippocampus additionally has a morphological audit
  (`docs/ANATOMICAL_ASSET_QA.md` §3). (Ambiguity with the Phase-1 benchmark
  procedure and catalogue-lifecycle wording flagged here and scoped in those
  documents; the D7 pipeline rule governs production records.)
- ANATOMICAL_MAPPING_PENDING: component identities/boundaries not verified
  even at source level (the two cortex composites). Distinct from geometry
  failure.
- EXPERT_REVIEW_PENDING: no documented specialist review (repo-wide, L13).
  Tracked separately; never implied by any other status (§6).
- RUNTIME_READY: technical clearance for controlled runtime use (provenance +
  geometry + manifest hash-linkage complete). Implies nothing anatomical,
  histological, ontological, clinical, or legal beyond the recorded states.
- CLEARED (`validation_status`): pipeline QA clearance = technical + record
  completeness gate. NEVER legal/scientific clearance: every CLEARED entry
  still carries LEGAL_REVIEW_REQUIRED and UNVERIFIED ontology where applicable
  (mechanically tested).
- LEGAL_REVIEW_REQUIRED: retroactivity unresolved; no commercial redistribution
  without review. Present on all 20 assets — clearance never erases it.
- UNVERIFIED: ontology cross-references (TA2/UBERON) without a lookup pass
  (all 16 batch records, explicitly marked). Legacy records carry CLAIMED IDs
  (L5-flagged globally; per-asset lookup still pending).

## Evidence levels (§14 — documents existing reality; no new claims)

- LEVEL A (source-authoritative identity + geometry provenance): all 20 assets.
- LEVEL B (technical geometry validation): all 20 assets (profile-conformant).
- LEVEL C (independent anatomical review): hippocampus benchmark audit only;
  no gyral asset claims it.
- LEVEL D (clinical/expert validation): NONE. Never claimed anywhere.

## Matrix (columns §2; all rows verified)

| assetId | structure | lat | source FMA | license | provenance | geometry | coordinate | topology | anatomical mapping | ontology TA2/UBERON | expert | runtime |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mesh.hippocampus.left.v1 | hippocampus | L | FMA72714 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | SOLID | ANATOMY_VALIDATED (benchmark §3) | CLAIMED (L5) | PENDING | READY/CLEARED |
| mesh.hippocampus.right.v1 | hippocampus | R | FMA72713 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | SOLID | ANATOMY_VALIDATED (source+plausibility) | CLAIMED (L5) | PENDING | READY/CLEARED |
| mesh.cortex.left.v1 | cortex composite | L | assembly | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | MULTI_SHELL_COMPOSITE | MAPPING_PENDING | CLAIMED (L5) | PENDING | READY/CLEARED |
| mesh.cortex.right.v1 | cortex composite | R | assembly | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | MULTI_SHELL_COMPOSITE | MAPPING_PENDING | CLAIMED (L5) | PENDING | READY/CLEARED |
| mesh.superior_frontal_gyrus.left.v1 | sup. frontal g. | L | FMA72654 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | MULTI_SHELL_COMPOSITE (2 shells) | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.superior_frontal_gyrus.right.v1 | sup. frontal g. | R | FMA72653 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | MULTI_SHELL_COMPOSITE (2 shells) | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.middle_frontal_gyrus.left.v1 | mid. frontal g. | L | FMA72656 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.middle_frontal_gyrus.right.v1 | mid. frontal g. | R | FMA72655 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.precentral_gyrus.left.v1 | precentral g. | L | FMA72662 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.precentral_gyrus.right.v1 | precentral g. | R | FMA72661 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.postcentral_gyrus.left.v1 | postcentral g. | L | FMA72666 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.postcentral_gyrus.right.v1 | postcentral g. | R | FMA72665 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.supramarginal_gyrus.left.v1 | supramarginal g. | L | FMA72668 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.supramarginal_gyrus.right.v1 | supramarginal g. | R | FMA72667 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.angular_gyrus.left.v1 | angular g. | L | FMA72670 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.angular_gyrus.right.v1 | angular g. | R | FMA72669 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.middle_temporal_gyrus.left.v1 | mid. temporal g. | L | FMA72686 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.middle_temporal_gyrus.right.v1 | mid. temporal g. | R | FMA72685 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.cingulate_gyrus.left.v1 | cingulate g. | L | FMA72718 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |
| mesh.cingulate_gyrus.right.v1 | cingulate g. | R | FMA72717 | VERIFIED-terms/REVIEW_REQ | VALIDATED | VALIDATED | VALIDATED | CLOSED_SURFACE | ANATOMY_VALIDATED (A+B) | UNVERIFIED | PENDING | READY/CLEARED |

## Family audit notes (§5–§13)

- ANATOMY_VALIDATED retained on 18 assets per §18 retain-condition (source
  authority documented in components record + D7 rule); 2 composites stay
  PENDING. No blind downgrades; reason documented here.
- CLEARED = pipeline QA clearance; all 20 CLEARED entries keep
  LEGAL_REVIEW_REQUIRED + UNVERIFIED/CLAIMED ontology (mechanically tested —
  clearance cannot silently mean legal/scientific clearance).
- Laterality consistent across record/assetId/filename/manifest/metadata for
  all 8 pairs (mirror-sign tested); no discrepancy found (else STOP per §10 —
  not triggered).
- Topology limitations visible per asset (2-shell pair flagged composite;
  16-shell composites flagged); none converted to failures (§8, §11).
- Provenance complete per asset (dataset/version/identifier/file/hash/
  derivedFrom/method/license); nothing fabricated (§12).
- License: historical 2.1 JP + portal CC BY kept distinct; uncertainty
  explicit; prohibited terms absent from live records (re-scanned §13, §21).
