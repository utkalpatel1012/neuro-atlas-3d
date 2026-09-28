# Phase 5.3 Asset QA Report (white matter + major pathways)

**Method:** `prepare_tract_batch.ts` (fresh mirror downloads staged from
`C:/Projects/_audit_tmp/phase53_<FMA>.stl`; SHA-256 gated against the committed
pins in `data/phase53_source_hashes.json`; midline-span or paired-geometry
measured in the asserted source frame) → generalized batch runner
(`run_gyral_batch.ts` parameterized: license/coordinate pre-checks → measured
topology → category-appropriate profile → 6-stage pipeline) → verdicts in
`data/phase53_batch_qa.json`. Verdicts: 10 RUNTIME_READY, 0 REVIEW_REQUIRED,
0 REJECTED. Shared license chain (historical 2.1 JP, portal CC BY,
derivatives CC-BY-SA-4.0, retroactivity UNRESOLVED); asserted-LPS adapter
unchanged; on-demand loading (default view unchanged).

> **Source-integrity scope (Phase 5.2 CRITICAL-2 pattern, applied to 5.3).**
> The pinned hashes establish *which* converted bytes were ingested and will
> reject a swapped or re-converted mirror artifact on re-run. They do **not**
> establish equivalence to a DBCLS-original release artifact — the third-party
> mirror performs an OBJ→STL conversion and no official DBCLS-published
> checksum is available for comparison. That residual risk is recorded as
> `MIRROR_CONVERSION_UNVERIFIED` in `data/phase53_source_hashes.json`. This is
> an open, documented limitation, not a resolved gate.

| Asset | Structure | Source FMA | Tris | Shells | Boundary | Profile | Runtime |
|---|---|---|---|---|---|---|---|
| mesh.corpus_callosum.midline.v1 | Corpus callosum (whole commissure) | FMA86464 | 132552 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.internal_capsule_anterior_limb.right.v1 | Anterior limb of internal capsule, right | FMA72908 | 48722 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.internal_capsule_anterior_limb.left.v1 | Anterior limb of internal capsule, left | FMA72909 | 48712 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.fornix.right.v1 | Fornix, right (unsegmented) | FMA72924 | 29300 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.fornix.left.v1 | Fornix, left (unsegmented) | FMA72925 | 29372 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.fornix_commissure.midline.v1 | Commissure of fornix | FMA61970 | 46164 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.anterior_commissure.midline.v1 | Anterior commissure | FMA61961 | 3690 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.posterior_commissure.midline.v1 | Posterior commissure | FMA62072 | 3786 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.optic_tract.right.v1 | Optic tract, right | FMA62382 | 10110 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.optic_tract.left.v1 | Optic tract, left | FMA67936 | 10122 | 1 | 0 | solid-subcortical-nucleus | READY |

**Rejections:** none. Every source measured zero non-manifold edges, zero
duplicate faces, zero zero-area faces, zero boundary edges, exactly one
watertight shell. Had any source carried such defects it would have been
REJECTED with reasons rather than repaired — repair would alter source
anatomy. Paired laterality was asserted from measured source-frame geometry
(bbox center on the declared side in asserted DICOM LPS, +X Left; bulk of the
span declared-side). Two near-commissural paired segments show a sub-millimetre
midline touch that does not reclassify them: left fornix X −0.7..29.0 mm
(center +14.2 mm, left) and left optic tract X −0.1..23.3 mm (center +11.6 mm,
left), each plausibly commissural contact, documented here as measured, not
smoothed or cut. Corona radiata, SLF/arcuate, uncinate, ILF and cingulum stay
DOCUMENTED (no source geometry in the distribution) — no attempt was made, and
no subdivision was fabricated (no callosal regions, no fornix crus/body/column,
no capsule limb beyond the sourced anterior limb).

**LOD note:** default QEM ratios retained for all 10 (monotonic, tested);
smallest pieces (anterior commissure 3690 tris, posterior commissure 3786)
keep usable LOD3 counts (922/946 tris) — no structure-specific ratios were
used; this decision is recorded here rather than in per-asset metadata.
**Open caveat:** triangle *counts* are usable, but geometric deviation at LOD3
on the smallest structures is a large fraction of their own size (posterior
commissure 0.99 mm max surface deviation on a 2.60 mm minimum dimension ≈ 38%;
anterior commissure 0.70 mm on 2.50 mm ≈ 28%; left optic tract 1.34 mm on
7.59 mm ≈ 18%). No degenerate or zero-area faces are present. A
min-dimension-aware LOD floor is deferred to a later phase. Corpus callosum
LOD0 reports a 2.76 mm Hausdorff max against its own canonical input at 0%
volume deviation; the cause is undetermined and recorded here as measured —
LOD1–LOD3 deviations (3.83/3.37/3.18 mm) are of the same order on a
36.71 mm minimum dimension (≈ 9%).

**White-matter separation note:** all ten records are `white_matter_structure`
/ `macroscopic_mesh` SOLID substrate. No record, label, or test carries
functional-network membership, RDoC association, circuit/pathway physiology,
receptor, pharmacology, or psychiatric claims — the `src/phase53_anatomy.test.ts`
separation suite scans every 5.3 record for that vocabulary (outside the
records' own explicit denial sentences) and fails on any hit. BodyParts3D is a
segmentation atlas, not tractography: no streamlines were generated, and the
`tract-streamlines` representation type appears nowhere in 5.3 records. The
`solid-subcortical-nucleus` profile id is a purely topological template (its
enforced criteria are watertight / non-manifold / zero-area / duplicate /
aspect-ratio only, with no membrane or tissue semantics); it is not a claim
that white matter is a subcortical nucleus.

**Residual risks (open, not gates):** `MIRROR_CONVERSION_UNVERIFIED` (above);
source frame ASSERTED (`dicom_lps_whole_body`), not proven — laterality rests
on measured geometry in that asserted frame plus the canonical adapter, never
on filenames alone; `EXPERT_REVIEW_PENDING` on all records and manifest
entries — pipeline QA attests technical validity only; acquisition dates for
the 10 new assets are the genuine staging run date (2026-09-28), while all 36
pre-5.3 dates are preserved byte-identical (31× 2026-09-26, 5× 2026-09-27).
