# Phase 5 Anatomical Expansion Plan

**Status:** living plan (Phase 5.0 executes Batch 1 only). Levels define
granularity; geometry availability is tracked per structure (§5 states) and a
label NEVER implies geometry.

## Hierarchy levels

- LEVEL 0 — Whole brain (single conceptual root; no whole-brain mesh claimed).
- LEVEL 1 — Major systems/regions: cerebrum, diencephalon, brainstem,
  cerebellum, ventricular system, vasculature.
- LEVEL 2 — Major structures: cerebral hemispheres, lobes (frontal, parietal,
  temporal, occipital, insular, limbic), thalamus, hypothalamus, basal ganglia
  divisions, hippocampal formation, amygdala, midbrain/pons/medulla,
  cerebellar hemispheres/vermis, lateral/third/fourth ventricles.
- LEVEL 3 — Substructures: individual gyri/sulci (e.g. precentral gyrus),
  named nuclei, ventricular horns, cerebellar lobes (gross).
- LEVEL 4 — Fine subdivisions: gyral segments, subnuclei, ventricular foramina.
- LEVEL 5 — Microscopic/cytoarchitectural layers: EXCLUDED from Phase 5
  (no Brodmann/HCP/Julich cellular layers; parcels stay a later layer, §23).

Relationships use PART_OF / ADJACENT_TO / CONTINUOUS_WITH / BRANCH_OF /
CONTAINS / ORIGINATES_FROM / TERMINATES_IN (§12); adjacency never implies
functional connectivity.

## Geometry states (§5)

DOCUMENTED (identity + source known, no geometry) → SOURCE_AVAILABLE →
GEOMETRY_AVAILABLE → GEOMETRY_VALIDATED (or
VALID_WITH_KNOWN_TOPOLOGY_LIMITATION / INVALID) → RUNTIME_READY.
REJECTED (failed validation, reason recorded) and REVIEW_REQUIRED
(uncertain, reason recorded) are terminal holding states — never silent.

## Source doctrine (§6–§8)

Authoritative sources only (BodyParts3D Release 3.0 chain first; Z-Anatomy
only after exact repo/version/license verification per §7). Per-asset license
records mandatory; uncertainty → LEGAL_REVIEW_REQUIRED. No anonymous,
AI-generated, game, or unlicensed-commercial geometry. Laterality from
source metadata + geometry, never filenames alone (§10, §15).

## Batch 1 (Phase 5.0): 8 bilateral gyral pairs = 16 assets

Source: in-repo BodyParts3D components (identical provenance chain to the
production cortex composites; see `docs/PHASE_3_CORTEX_SOURCE_COMPONENTS.md`).
No new downloads, no new licenses, no new coordinate frames.

| Structure | Lobe | L FMA | R FMA | Asset IDs |
|---|---|---|---|---|
| superior frontal gyrus | frontal | FMA72654 | FMA72653 | mesh.superior_frontal_gyrus.{left,right}.v1 |
| middle frontal gyrus | frontal | FMA72656 | FMA72655 | mesh.middle_frontal_gyrus.{left,right}.v1 |
| precentral gyrus | frontal | FMA72662 | FMA72661 | mesh.precentral_gyrus.{left,right}.v1 |
| postcentral gyrus | parietal | FMA72666 | FMA72665 | mesh.postcentral_gyrus.{left,right}.v1 |
| supramarginal gyrus | parietal | FMA72668 | FMA72667 | mesh.supramarginal_gyrus.{left,right}.v1 |
| angular gyrus | parietal | FMA72670 | FMA72669 | mesh.angular_gyrus.{left,right}.v1 |
| middle temporal gyrus | temporal | FMA72686 | FMA72685 | mesh.middle_temporal_gyrus.{left,right}.v1 |
| cingulate gyrus | limbic | FMA72718 | FMA72717 | mesh.cingulate_gyrus.{left,right}.v1 |

Remaining components (inferior temporal, fusiform, accessory short, insula,
parahippocampal, occipital lobe) stay DOCUMENTED — candidates for Batch 2,
not silently available. Deep structures, brainstem, cerebellum, ventricles,
nerves, vasculature: DOCUMENTED pipeline targets (§24–§28), zero geometry
claimed in 5.0.

## Coexistence with composites (§21–§23)

Batch-1 gyri are PART_OF their lobe/hemisphere siblings of the existing
cortex composites — NOT replacements (§38 pattern). Composites and gyri
overlap spatially, so the default loaded set stays the 4 production assets;
gyral assets load ON DEMAND (lazy, §32) to avoid double-rendered anatomy.
Cortical surface ≠ parcellation: no parcel IDs on gyral records (§23).

## Pipeline (existing 6-stage + batch controls, §34)

Per-asset: raw derivation (hash-pinned copy + ingestion.json, §18–§19) →
validate (VALID / VALID_WITH_KNOWN_TOPOLOGY_LIMITATION / INVALID) →
canonicalize (asserted-LPS adapter, §14) → LOD0–3 (QEM, identity-preserving,
§20–§21) → meshopt runtime → manifest update (single manifest, §31).
Batch controls: discovery from the components record → license/coordinate
pre-checks → per-asset verdicts → REJECTED/REVIEW_REQUIRED with reasons
(§35) → QA report (§36). Laterality mirror checks (§15) and sanity scale
bounds (§16, recorded as sanity — never biological thresholds).

## Integration (§30–§32, §39–§43)

Manifest stays authoritative; renderer refuses invalid-provenance assets.
Assembly groups per lobe/hemisphere; hierarchy UI shows DOCUMENTED vs
AVAILABLE; selection/focus/isolation/clipping/bookmarks/LOD/lazy reuse the
existing systems (§41–§42, no second selection system). MRI overlay stays
gated by Phase 4 registration status (§43). No psychiatry content (§47).
