# Phase 5.3 Anatomical Scope (white matter + major pathways)

**Method:** same-source addition from the BodyParts3D distribution via the established
mirror (identical license chain, coordinate frame, consolidated pipeline from M2).
No new dataset. Availability below was checked against the mirror's own distribution
listing (`parts_list_e.txt`) and its served STL index — list presence and servable
bytes are reported separately, and "present but not imported" is distinguished from
"absent from the distribution".

## Planned batch (10 assets)

| Structure | Source FMA | Laterality | Notes |
|---|---|---|---|
| Corpus callosum | FMA86464 (single) | midline | Whole commissure in one segment; no regional subdivision fabricated |
| Anterior limb of internal capsule, right | FMA72908 (single) | right | Paired segment; posterior limb / whole capsule absent |
| Anterior limb of internal capsule, left | FMA72909 (single) | left | Paired segment |
| Fornix, right | FMA72924 (single) | right | Paired segment; crus/body/column not subdivided |
| Fornix, left | FMA72925 (single) | left | Paired segment |
| Commissure of fornix | FMA61970 (single) | midline | Hippocampal commissure |
| Anterior commissure | FMA61961 (single) | midline | Single segment |
| Posterior commissure | FMA62072 (single) | midline | Single segment |
| Optic tract, right | FMA62382 (single) | right | Paired segment |
| Optic tract, left | FMA67936 (single) | left | Paired segment |

Optional, pending QA: peduncle of midbrain (FMA62394, present in mirror) — a midbrain
substructure carried over from 5.2's DOCUMENTED list. Include only if it passes the
same gates; otherwise it stays DOCUMENTED.

## DOCUMENTED, not imported (no source geometry in the distribution)

- **Internal capsule as a whole** (FMA61950): listed, no mirror STL. Only the paired
  anterior-limb segments are servable.
- **Corona radiata:** absent from the distribution entirely. DOCUMENTED.
- **Association tracts (SLF/arcuate, uncinate, ILF, cingulum):** absent from the
  distribution entirely. BodyParts3D is a segmentation atlas, not tractography; these
  cannot be represented without streamline fabrication, which is prohibited.
  DOCUMENTED.
- Whole fornix (FMA61965), whole optic tract (FMA62046), unpaired anterior limb
  (FMA61952): listed, no mirror STL. Only the lateralised segments above are servable.

## Non-negotiable separation (registry hard stop: functional-conflation)

Every 5.3 record enforces `WHITE_MATTER_STRUCTURE ≠ FUNCTIONAL_NETWORK ≠
PSYCHIATRIC_CIRCUIT`. Structures are substrate only: no network membership, no RDoC,
no circuit, no receptor, no pharmacology claim may appear in any 5.3 record, label, or
test. The Phase 5.2 anatomy-first guard is extended to the 5.3 suite.

## Category-appropriate QA

White-matter segments are solid structures, not cortical sheets and not cavities. The
category-aware profile selection (M2/N4 repair) applies: non-cavity, non-cortex
categories must not receive cortical or cavity profile names. Tract-appropriate
topology expectations (solid, watertight where measured) are recorded in
`data/phase53_batch_qa.json`, never assumed.
