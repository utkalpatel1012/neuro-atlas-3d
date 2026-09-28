# Phase 5.2 Asset QA Report (posterior fossa + ventricles)

**Method:** `prepare_posterior_batch.ts` (fresh mirror downloads; SHA-256 gated against
the committed pins in `data/phase52_source_hashes.json`, midline-span measured) →
generalized batch runner (license/coordinate pre-checks → measured topology → profile →
6-stage pipeline) → verdicts in `data/phase52_batch_qa.json`. Verdicts: 5 RUNTIME_READY,
0 REVIEW_REQUIRED, 2 REJECTED with reasons. Shared license chain (historical 2.1 JP,
portal CC BY, derivatives CC-BY-SA-4.0, retroactivity UNRESOLVED); asserted-LPS adapter
unchanged; on-demand loading (default view unchanged).

> **Source-integrity scope (Phase 5.2 CRITICAL-2 repair).** The pinned hashes establish
> *which* converted bytes were ingested and will reject a swapped or re-converted mirror
> artifact on re-run. They do **not** establish equivalence to a DBCLS-original release
> artifact — the third-party mirror performs an OBJ→STL conversion and no official
> DBCLS-published checksum is available for comparison. That residual risk is recorded as
> `MIRROR_CONVERSION_UNVERIFIED` in `data/phase52_source_hashes.json`. This is an open,
> documented limitation, not a resolved gate.

| Asset | Structure | Source FMA | Tris | Shells | Boundary | Profile | Runtime |
|---|---|---|---|---|---|---|---|
| mesh.pons.bilateral.v1 | Pons | FMA67943 | 90072 | 4 | 0 | — | REJECTED (non-manifold=10, duplicates=1) |
| mesh.medulla_oblongata.bilateral.v1 | Medulla oblongata | FMA62004 | 52760 | 1 | 0 | — | REJECTED (non-manifold=2) |
| mesh.cerebellum.bilateral.v1 | Cerebellum (whole) | FMA67944 | 238506 | 2 | 0 | composite-cortical-assembly | READY |
| mesh.third_ventricle.midline.v1 | Third ventricle (cavity) | FMA78454 | 16808 | 1 | 0 | closed-pial-surface | READY |
| mesh.fourth_ventricle.midline.v1 | Fourth ventricle (cavity) | FMA78469 | 30134 | 1 | 0 | closed-pial-surface | READY |
| mesh.cerebral_aqueduct.midline.v1 | Cerebral aqueduct (cavity) | FMA78467 | 2252 | 1 | 0 | closed-pial-surface | READY |
| mesh.interventricular_foramen.midline.v1 | Interventricular foramen (cavity) | FMA75351 | 4642 | 2 | 0 | composite-cortical-assembly | READY |

**Rejected analysis:** pons/medulla source segments carry non-manifold edges
(10/2) — repair would alter source anatomy, so both stay DOCUMENTED with
reasons recorded. Brainstem continuity is preserved by NOT splitting or
patching. Midbrain (whole segment), lateral ventricles, vermis, cerebellar
nuclei and Luschka/Magendie remain DOCUMENTED — see
`PHASE_5_2_ANATOMICAL_SCOPE.md` for the per-structure availability evidence, which now
distinguishes "absent from the distribution" from "present but not imported".

**LOD note:** default QEM ratios retained for all 5 (monotonic, tested); smallest
pieces (aqueduct 2252 tris, foramen 4642) keep usable LOD3 counts — no
structure-specific ratios were used; this decision is recorded here rather than in
per-asset metadata. **Open caveat (Phase 5.2 graphics review):** triangle *counts* are
usable, but geometric deviation at LOD3 on the two smallest structures is a large
fraction of their own size (aqueduct 1.11 mm max surface deviation on a 3.03 mm minimum
dimension ≈ 36%; foramen 1.32 mm on 4.94 mm ≈ 27%). No degenerate or zero-area faces are
present. A min-dimension-aware LOD floor is deferred to a later phase.

**Cavity note:** ventricular pieces are `ventricular_space` / `cavity_cast`
records — never neural tissue in records, labels, or QA. **Open caveat (Phase 5.2
review):** the profile ids `closed-pial-surface` and `composite-cortical-assembly` were
applied to the four ventricular records in `data/phase52_batch_qa.json`. Both are
purely *topological* templates (their enforced criteria are watertight / non-manifold /
zero-area / duplicate / aspect-ratio only, with no membrane or tissue semantics), so the
ids are misnomers rather than false claims — the ventricular surface is the
ventricular/ependymal boundary, not pia, and no cortex was validated. The ledger is left
as the truthful record of what was actually run rather than being retroactively
rewritten. For subsequent batches the anatomical category now travels through the
pipeline ledger (`category` in `data/phase52_batch.json`), so cavity categories select
`closed-cavity-cast` / `multi-shell-cavity-cast` instead; that change takes effect on
re-run and is not claimed for the assets above.

**Paired-aperture caveat:** the interventricular foramen of Monro is anatomically a
left and a right aperture. FMA75351 is a single non-lateralised source segment measured
as 2 disjoint shells, most likely the paired foramina (plausible, **NOT DETERMINED**).
`laterality: midline` therefore describes the *source segment*, not the paired anatomy.
