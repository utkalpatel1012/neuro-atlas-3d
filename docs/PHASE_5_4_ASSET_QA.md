# Phase 5.4 Asset QA Report (cranial nerves)

**Method:** `prepare_nerve_batch.ts` (fresh mirror downloads staged from
`C:/Projects/_audit_tmp/phase54_<FMA>.stl`; SHA-256 gated against the committed
pins in `data/phase54_source_hashes.json`; midline-span or paired-geometry
measured in the asserted source frame) → generalized batch runner
(`run_gyral_batch.ts` parameterized: license/coordinate pre-checks → measured
topology → category-appropriate profile → 6-stage pipeline) → verdicts in
`data/phase54_batch_qa.json`. Verdicts: 3 RUNTIME_READY, 0 REVIEW_REQUIRED,
0 REJECTED. Shared license chain (historical 2.1 JP, portal CC BY,
derivatives CC-BY-SA-4.0, retroactivity UNRESOLVED); asserted-LPS adapter
unchanged; on-demand loading (default view unchanged).

> **Source-integrity scope (Phase 5.2 CRITICAL-2 pattern, applied to 5.4).**
> The pinned hashes establish *which* converted bytes were ingested and will
> reject a swapped or re-converted mirror artifact on re-run. They do **not**
> establish equivalence to a DBCLS-original release artifact — the third-party
> mirror performs an OBJ→STL conversion and no official DBCLS-published
> checksum is available for comparison. That residual risk is recorded as
> `MIRROR_CONVERSION_UNVERIFIED` in `data/phase54_source_hashes.json`. This is
> an open, documented limitation, not a resolved gate.

| Asset | Structure | Source FMA | Tris | Shells | Boundary | Profile | Runtime |
|---|---|---|---|---|---|---|---|
| mesh.optic_nerve.right.v1 | Optic nerve, right (CN II, unsegmented) | FMA50875 | 10310 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.optic_nerve.left.v1 | Optic nerve, left (CN II, unsegmented) | FMA50878 | 10302 | 1 | 0 | solid-subcortical-nucleus | READY |
| mesh.optic_chiasm.midline.v1 | Optic chiasm | FMA62045 | 7752 | 1 | 0 | solid-subcortical-nucleus | READY |

**Rejections:** none. Every source measured zero non-manifold edges, zero
duplicate faces, zero zero-area faces, zero boundary edges, exactly one
watertight shell. Had any source carried such defects it would have been
REJECTED with reasons rather than repaired — repair would alter source
anatomy. Paired laterality was asserted from measured source-frame geometry
(bbox center on the declared side in asserted DICOM LPS, +X Left; bulk of the
span declared-side): right nerve X −31.46..−1.25 mm (center −16.36 mm, right),
left nerve X −0.06..30.15 mm (center +15.05 mm, left) with a 0.06 mm midline
touch that does not reclassify it — plausibly chiasmal contact, documented
here as measured, not smoothed or cut. The chiasm spans X=0 (−7.57..6.26 mm)
as a midline single must. No subdivision was fabricated (no intra-nerve
segments, no chiasmal subregions); the whole-nerve FMA50863 has no servable
mirror STL and stays DOCUMENTED. No vessel of any kind was imported or
generated — all cerebral vasculature (Circle of Willis, ACA, MCA, PCA,
vertebrobasilar, all branches) and CN I/III–XII stay DOCUMENTED with the
reason. No tiny branches were fabricated.

**LOD note:** default QEM ratios retained for all 3 (monotonic, tested):
nerves 10310→2576 / 10302→2574 tris, chiasm 7752→1938 tris — no
structure-specific ratios were used; this decision is recorded here rather
than in per-asset metadata.
**Open caveat:** triangle *counts* are usable, but geometric deviation at LOD3
on the smallest structure is a large fraction of its own size (optic chiasm
1.74 mm max surface deviation on a 7.68 mm minimum dimension ≈ 23%; left
optic nerve 1.47 mm on 20.87 mm ≈ 7%; right optic nerve 1.07 mm on
20.87 mm ≈ 5%). Volume deviation at LOD3 is ≤0.5% on all three. No
degenerate or zero-area faces are present. A min-dimension-aware LOD floor is
deferred to a later phase. LOD0 reports 0.00 mm Hausdorff max against its own
canonical input at 0% volume deviation on all three.

**Nerve-vs-vessel-vs-network separation note:** all three records are
`cranial_nerve` / `macroscopic_mesh` SOLID substrate — the `cranial_nerve`
subtype already existed in `AnatomicalStructureSubtype` and is preferred over
any new union member. No record, label, or test carries vessel membership
(artery/vein/vascular/Circle-of-Willis), visual-function or conduction
claims, functional-network membership, RDoC association, circuit/pathway
physiology, receptor, pharmacology, or psychiatric claims — the
`src/phase54_anatomy.test.ts` separation suite scans every 5.4 record for
that vocabulary (outside the records' own explicit denial sentences) and
fails on any hit. BodyParts3D is a segmentation atlas, not tractography: no
streamlines were generated, and the `tractography_streamlines`
representation type appears nowhere in 5.4 records. The
`solid-subcortical-nucleus` profile id is a purely topological template (its
enforced criteria are watertight / non-manifold / zero-area / duplicate /
aspect-ratio only, with no membrane, tissue, nucleus, or vessel-wall
semantics); it is not a claim that a cranial nerve is a subcortical nucleus.
Nerves are NOT tractography and are never validated as such.

**Residual risks (open, not gates):** `MIRROR_CONVERSION_UNVERIFIED` (above);
source frame ASSERTED (`dicom_lps_whole_body`), not proven — laterality rests
on measured geometry in that asserted frame plus the canonical adapter, never
on filenames alone; `EXPERT_REVIEW_PENDING` on all records and manifest
entries — pipeline QA attests technical validity only; acquisition dates for
the 3 new assets are the genuine staging run date (2026-09-28, shared with
the 10 Phase 5.3 assets staged the same day), while all 36 pre-5.3 dates are
preserved byte-identical (31× 2026-09-26, 5× 2026-09-27).
