# Phase 5.5 Asset QA Report (cortical completion)

**Method:** `prepare_cortical55_batch.ts` (fresh mirror downloads staged from
`C:/Projects/_audit_tmp/phase55_<FMA>.stl`; SHA-256 gated against the committed
pins in `data/phase55_source_hashes.json`; paired-geometry measured in the
asserted source frame) → generalized batch runner
(`run_gyral_batch.ts` parameterized: license/coordinate pre-checks → measured
topology → category-appropriate profile → 6-stage pipeline) → verdicts in
`data/phase55_batch_qa.json`. Verdicts: 14 RUNTIME_READY, 0 REVIEW_REQUIRED,
0 REJECTED. Shared license chain (historical 2.1 JP, portal CC BY,
derivatives CC-BY-SA-4.0, retroactivity UNRESOLVED); asserted-LPS adapter
unchanged; on-demand loading (default view unchanged).

> **Source-integrity scope (Phase 5.2 CRITICAL-2 pattern, applied to 5.5).**
> The pinned hashes establish *which* converted bytes were ingested and will
> reject a swapped or re-converted mirror artifact on re-run. They do **not**
> establish equivalence to a DBCLS-original release artifact — the third-party
> mirror performs an OBJ→STL conversion and no official DBCLS-published
> checksum is available for comparison. That residual risk is recorded as
> `MIRROR_CONVERSION_UNVERIFIED` in `data/phase55_source_hashes.json`. This is
> an open, documented limitation, not a resolved gate.

> **Continuity decision (registry requirement: continuity-decision-record).**
> The 14 meshes below are DISCONNECTED distribution segments. They are not
> presented as a continuous surface: the atlas does not bridge gaps between
> them, does not smooth seams, does not join pia, and implies no pial
> continuity. Each mesh is one watertight shell, so per-mesh QA honestly
> classifies it `CLOSED_SURFACE` — that classification describes EACH mesh
> alone (measured single-shell topology), never the 14 together. A true
> continuous cortical representation would require verified source geometry
> and is explicitly out of scope (see `docs/PHASE_5_5_ANATOMICAL_SCOPE.md`).
> This decision is recorded here rather than implemented in geometry: no
> geometric operation in this phase connects, merges, or deforms any segment
> toward any other.

> **Surface-vs-parcel distinction (registry required evidence).**
> These are surface-derived segments, never atlas parcels. No parcellation
> mapping (no Brodmann area, no HCP parcel, no parcel boundary) was performed
> onto these meshes and none is claimed in any record, label, or test. The
> `src/phase55_anatomy.test.ts` separation suite scans every 5.5 record for
> parcel vocabulary (outside the records' own explicit denial sentences) and
> fails on any hit.

| Asset | Structure | Source FMA | Tris | Shells | Boundary | Profile | Runtime |
|---|---|---|---|---|---|---|---|
| mesh.inferior_temporal_gyrus.right.v1 | Inferior temporal gyrus, right | FMA72687 | 13056 | 1 | 0 | closed-pial-surface | READY |
| mesh.inferior_temporal_gyrus.left.v1 | Inferior temporal gyrus, left | FMA72688 | 13040 | 1 | 0 | closed-pial-surface | READY |
| mesh.fusiform_gyrus.right.v1 | Fusiform gyrus, right | FMA72689 | 6150 | 1 | 0 | closed-pial-surface | READY |
| mesh.fusiform_gyrus.left.v1 | Fusiform gyrus, left | FMA72690 | 6148 | 1 | 0 | closed-pial-surface | READY |
| mesh.parahippocampal_gyrus.right.v1 | Parahippocampal gyrus, right | FMA72705 | 3454 | 1 | 0 | closed-pial-surface | READY |
| mesh.parahippocampal_gyrus.left.v1 | Parahippocampal gyrus, left | FMA72706 | 3452 | 1 | 0 | closed-pial-surface | READY |
| mesh.superior_temporal_gyrus_anterior.right.v1 | Superior temporal gyrus, anterior part, right | FMA72800 | 8348 | 1 | 0 | closed-pial-surface | READY |
| mesh.superior_temporal_gyrus_anterior.left.v1 | Superior temporal gyrus, anterior part, left | FMA72801 | 8338 | 1 | 0 | closed-pial-surface | READY |
| mesh.superior_temporal_gyrus_posterior.right.v1 | Superior temporal gyrus, posterior part, right | FMA72804 | 10472 | 1 | 0 | closed-pial-surface | READY |
| mesh.superior_temporal_gyrus_posterior.left.v1 | Superior temporal gyrus, posterior part, left | FMA72805 | 10472 | 1 | 0 | closed-pial-surface | READY |
| mesh.insula.right.v1 | Insula, right | FMA72977 | 12240 | 1 | 0 | closed-pial-surface | READY |
| mesh.insula.left.v1 | Insula, left | FMA72978 | 12242 | 1 | 0 | closed-pial-surface | READY |
| mesh.occipital_lobe.right.v1 | Occipital lobe, right | FMA72975 | 18762 | 1 | 0 | closed-pial-surface | READY |
| mesh.occipital_lobe.left.v1 | Occipital lobe, left | FMA72976 | 18746 | 1 | 0 | closed-pial-surface | READY |

**Rejections:** none. Every source measured zero non-manifold edges, zero
duplicate faces, zero zero-area faces, zero boundary edges, exactly one
watertight shell. Had any source carried such defects it would have been
REJECTED with reasons rather than repaired — repair would alter source
anatomy. Paired laterality was asserted from measured source-frame geometry
(bbox center on the declared side in asserted DICOM LPS, +X Left; bulk of the
span declared-side): right segments X −67.4..−1.2 mm (centers −52.3..−19.6
mm, all negative), left segments X −0.1..66.1 mm (centers +18.3..+50.9 mm,
all positive). The left occipital lobe touches X=−0.1 mm — a 0.1 mm midline
touch that does not reclassify it, documented here as measured, not smoothed
or cut. No subdivision was fabricated (the superior temporal gyrus ships ONLY
as its two sourced parts; the whole-STG mesh is NOT synthesized and stays
DOCUMENTED). BP48/49/50 (superior parietal / precuneus, non-standard BP
identifiers) were never attempted — uncertain-source-identity hard stop,
DOCUMENTED with the reason. No parcel of any atlas was mapped onto any mesh.

**Measured volumes (cm³, from geometry QA):** inferior temporal 18.51 /
18.50; fusiform 8.18 / 8.18; parahippocampal 3.18 / 3.18; STG anterior 8.99 /
8.99; STG posterior 13.86 / 13.86; insula 9.56 / 9.56; occipital lobe 32.70 /
32.70 (right / left). No presupposed volume band was applied (invented
biological thresholds prohibited); volumes are recorded, not gated.

**LOD note:** default QEM ratios retained for all 14 (monotonic, tested):
LOD3 holds exactly 25% of LOD0 triangles on every asset (e.g. occipital
18762→4690 / 18746→4686 tris; parahippocampal 3454→862 / 3452→862 tris) — no
structure-specific ratios were used; this decision is recorded here rather
than in per-asset metadata.
**Open caveat:** triangle *counts* are usable, but geometric deviation at LOD3
on the smallest structure is a large fraction of its own size
(parahippocampal right 3.40 mm max surface deviation; left 2.98 mm). Volume
deviation at LOD3 is ≤1.4% on all fourteen. No degenerate or zero-area faces
are present. A min-dimension-aware LOD floor is deferred to a later phase.
LOD0 reports 0.00 mm Hausdorff max against its own canonical input at 0%
volume deviation on all fourteen.

**Subtype note:** gyral segments are recorded as `cortical_gyrus`; the insula
and the occipital lobe as `cortical_structure` — both subtypes already
existed in `AnatomicalStructureSubtype` and are preferred over any new union
member. No union change was needed for 5.5. The `closed-pial-surface`
profile id is a purely topological template (its enforced criteria are
watertight / non-manifold / zero-area / duplicate / aspect-ratio only); it
is not a claim that the segments form one joined cortex.

**Residual risks (open, not gates):** `MIRROR_CONVERSION_UNVERIFIED` (above);
source frame ASSERTED (`dicom_lps_whole_body`), not proven — laterality rests
on measured geometry in that asserted frame plus the canonical adapter, never
on filenames alone; `EXPERT_REVIEW_PENDING` on all records and manifest
entries — pipeline QA attests technical validity only; acquisition dates for
the 14 new assets are the genuine staging run date (2026-09-29), while all 49
pre-5.5 dates are preserved byte-identical (31× 2026-09-26, 5× 2026-09-27,
13× 2026-09-28).
