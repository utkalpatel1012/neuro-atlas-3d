# Phase 5.2 Anatomical Scope (brainstem + cerebellum + ventricles)

**Method:** BodyParts3D distribution `parts_list_e.txt` + mirror
byte-availability check (same-source addition — identical license chain,
coordinate frame, pipeline). No new dataset.

## Planned batch (7 assets)

| Structure | Source FMA | License | Coordinates | Batch |
|---|---|---|---|---|
| pons | FMA67943 (single) | same chain | asserted-LPS → canonical | 5.2 |
| medulla oblongata | FMA62004 (single) | same chain | asserted-LPS → canonical | 5.2 |
| cerebellum (whole: hemispheres + vermis in one segment) | FMA67944 (single) | same chain | asserted-LPS → canonical | 5.2 |
| third ventricle | FMA78454 (single) | same chain | asserted-LPS → canonical | 5.2 |
| fourth ventricle | FMA78469 (single) | same chain | asserted-LPS → canonical | 5.2 |
| cerebral aqueduct | FMA78467 (single) | same chain | asserted-LPS → canonical | 5.2 |
| interventricular foramen | FMA75351 (single) | same chain | asserted-LPS → canonical | 5.2 |

## DOCUMENTED, not imported

Availability below was checked against the mirror's own distribution listing
(`parts_list_e.txt`) and its served STL index. "Present but not imported" means the
geometry **exists in the source** and was deliberately not ingested in this batch — it
is not a claim that the source lacks the structure.

- Midbrain as a whole segment: FMA61993 has no mirror STL (only `FMA61993nsn`, suffix
  meaning unverified — never guess). DOCUMENTED.
- Midbrain substructures: **present in the distribution but not imported** —
  FMA62394 (peduncle of midbrain), FMA73422/FMA73423 (right/left superior colliculus),
  FMA73434/FMA73435 (right/left inferior colliculus). DOCUMENTED.
- Lateral ventricles: the unpaired parent FMA78448 has no mirror STL, but the **paired
  segments are present in the distribution and the mirror** — FMA78449 (right lateral
  ventricle) and FMA78450 (left lateral ventricle). Not imported in this batch;
  DOCUMENTED. (Phase 5.2 review correction: an earlier revision of this file stated the
  lateral ventricles had "no source geometry", which was factually wrong.)
- Vermis-specific / cerebellar hemispheres separately / deep cerebellar
  nuclei (dentate/fastigial/emboliform/globose): absent from the distribution
  list. DOCUMENTED; no lobules fabricated from the gross mesh.
- Foramina of Luschka/Magendie: absent. DOCUMENTED.
- Hypothalamus: carried DOCUMENTED from 5.1. **Corrected here:** the 5.1 scope doc said
  "no STL in mirror — no source". The unpaired FMA62008 has no mirror STL, but
  `FMA62008nsn` **is** served (884,584 B), where the `nsn` suffix means the segmentation
  has no standard FMA name. That suffix is never guessed, so the hypothalamus remains
  DOCUMENTED — but the absence claim itself was overstated and is corrected here.
  `docs/PHASE_5_1_ANATOMICAL_SCOPE.md` is retained as history and not rewritten in place.

## Known limitations (batch)

- Brainstem segments must remain continuous siblings (no arbitrary splits for
  labels; midbrain gap recorded, not bridged).
- Ventricles are CAVITIES: `VENTRICULAR_SPACE` category, never rendered or
  described as neural tissue; thin/foraminal geometry may fail QA → honest
  REJECTED/REVIEW_REQUIRED outcomes expected for the smallest pieces.
- Cerebellum is one gross segment (hemispheres + vermis inseparable in
  source); fine lobules/nuclei stay future.
- Single-subject source limits (L10) apply unchanged.
