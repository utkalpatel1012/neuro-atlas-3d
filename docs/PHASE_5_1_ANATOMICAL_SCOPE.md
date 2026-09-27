# Phase 5.1 Anatomical Scope (deep gray matter + limbic)

**Method:** BodyParts3D distribution `parts_list_e.txt` (authoritative for
files) + mirror byte-availability check. No new dataset introduced (§5:
same-source addition — identical license chain, coordinate frame, and
pipeline as all production assets).

## Z-Anatomy reassessment (§4 verdict: NOT USED)

Z-Anatomy (github.com/z-anatomy, CC-BY-SA 4.0 content) redistributes
artist-retopologized BodyParts3D derivatives (Blender/Unity templates, no
versioned per-structure STL distribution with hashes). It is a secondary
derivative, not a primary source: using it would ADD an artistry/provenance
layer between the atlas and BodyParts3D for zero anatomical gain. No exact
per-asset release/version/identifier verifiable for pipeline ingestion.
BodyParts3D-direct remains strictly better provenance. Reassess only if
Z-Anatomy publishes versioned per-structure sources.

## Planned batch (7 structures, 12 assets)

| Structure | Priority | Source FMA (L/R) | License | Coordinates | Batch |
|---|---|---|---|---|---|
| thalamus | 1 | FMA258716 / FMA258714 | same chain | asserted-LPS → canonical | 5.1 (bilateral) |
| caudate nucleus | 2 | FMA72827 / FMA72826 | same chain | asserted-LPS → canonical | 5.1 (bilateral) |
| putamen | 3 | FMA72829 / FMA72828 | same chain | asserted-LPS → canonical | 5.1 (bilateral) |
| globus pallidus | 4 | FMA72831 / FMA72830 | same chain | asserted-LPS → canonical | 5.1 (bilateral) |
| amygdala | 6 | FMA72833 / FMA72832 | same chain | asserted-LPS → canonical | 5.1 (bilateral, gross only — no nuclei) |
| mammillary body | 9 | FMA74877 (single; laterality from geometry) | same chain | asserted-LPS → canonical | 5.1 if defensible boundary |
| septum pellucidum | 10 | FMA61844 (midline) | same chain | asserted-LPS → canonical | 5.1 if defensible boundary |

## DOCUMENTED, not imported (§14 + scope limits)

- Nucleus accumbens: absent from distribution list — no source.
- Hypothalamus (FMA62008): no STL in mirror — no source.
- Lateral/third ventricles (FMA78448/FMA78454): no STL in mirror — no source.
- Hippocampal subdivision (CA/dentate/subiculum): same source as existing
  hippocampi; comparison shows no finer-grained source — NO replacement, NO
  artificial partitions (§9).
- Brainstem (pons FMA67943, medulla FMA62004), cerebellum (FMA67944): STLs
  exist but belong to §25–§26 eventual stages, not the 5.1 deep/limbic batch.
- Thalamic nuclei, amygdala nuclei (basolateral/central/medial): source
  supplies gross boundaries only — nuclei stay future layers (§10–§11).
- Pallidum naming: source says "globus pallidus" — recorded exactly; no
  pallidum equivalence asserted (§12).

## Known limitations (batch)

Deep meshes are BodyParts3D gross segments (no nuclei/subfields); single
meshes may span midline (laterality from geometry, never filenames);
sulcal-level detail expectations do not apply to deep gray QA (solid/sheet
profiles by measurement); field/population limits of single-subject source
(L10) apply unchanged.

## As-built amendment (batch execution outcome)

Septum pellucidum REJECTED (non-manifold=2, zero-area=4 — boundary
indefensible from this source; stays DOCUMENTED per §14). Accepted batch: 6
structures, 11 assets (thalamus/caudate/putamen/pallidus/amygdala bilateral +
mammillary bilateral single). Thalamus L/R triangle asymmetry (7396 vs 3298)
is a source property, not a defect. Hippocampal comparison: same source as
existing hippocampi — NO replacement, NO artificial partitions (§9).
