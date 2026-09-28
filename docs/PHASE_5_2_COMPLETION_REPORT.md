# Phase 5.2 Completion Report — Brainstem + cerebellum + ventricular system

## Objective (registry)

Source-backed gross brainstem (midbrain/pons/medulla), cerebellum
(hemispheres/vermis/gross lobules), and ventricles (lateral/third/aqueduct/fourth/
foramina) via the controlled ingestion pipeline. No fabricated nuclei or fictional
boundaries.

## Outcome

5 assets RUNTIME_READY, 2 REJECTED with measured reasons, balance DOCUMENTED.

| Asset | Structure | FMA | Triangles | Shells | Verdict |
|---|---|---|---|---|---|
| mesh.cerebellum.bilateral.v1 | Cerebellum (whole) | FMA67944 | 238,506 | 2 | RUNTIME_READY |
| mesh.third_ventricle.midline.v1 | Third ventricle (cavity) | FMA78454 | 16,808 | 1 | RUNTIME_READY |
| mesh.fourth_ventricle.midline.v1 | Fourth ventricle (cavity) | FMA78469 | 30,134 | 1 | RUNTIME_READY |
| mesh.cerebral_aqueduct.midline.v1 | Cerebral aqueduct (cavity) | FMA78467 | 2,252 | 1 | RUNTIME_READY |
| mesh.interventricular_foramen.midline.v1 | Foramen of Monro (cavity) | FMA75351 | 4,642 | 2 | RUNTIME_READY |
| mesh.pons.bilateral.v1 | Pons | FMA67943 | 90,072 | 4 | REJECTED (non-manifold=10, duplicates=1) |
| mesh.medulla_oblongata.bilateral.v1 | Medulla oblongata | FMA62004 | 52,760 | 1 | REJECTED (non-manifold=2) |

Rejected and out-of-scope structures are DOCUMENTED, geometry-free, with reasons
recorded: midbrain (whole), midbrain substructures (peduncle, colliculi — present in
source, not imported), lateral ventricles (FMA78449/78450 present in source, not
imported), vermis/hemispheres separately, deep cerebellar nuclei, Luschka/Magendie,
hypothalamus. Ventricular pieces are `ventricular_space` / `cavity_cast` — never
neural tissue in any record, label, or hierarchy node.

## Success criteria (registry) — evidenced

- **Batch RUNTIME_READY with reasons for any rejection:** 5 ready, 2 rejected with
  measured topology. The pons/medulla rejections were independently stress-tested
  (vertex welding at 1e-4 mm changes nothing; the pons has 4 shells) and confirmed
  technically correct, not over-caution.
- **Manifest authoritative (legacy identical):** all 31 pre-5.2 `acquisition_date`
  values are byte-identical to the committed baseline. A provenance regression
  introduced by this phase (birthtime-derived dates) was found by review and reverted;
  see L21 below.
- **Hierarchy AVAILABLE vs DOCUMENTED honest:** every AVAILABLE node has `asset_id`,
  every DOCUMENTED node has neither `asset_id` nor `structure_record`; the brainstem is
  not bridged; the cerebellum ships as one gross segment with no fabricated split.
- **All suites green:** `npm test` exit 0 — 16/16 suites, Phase 5.2 suite 474 checks
  (238 original + 74 provenance-integrity + 162 consistency guards); `typecheck` clean;
  `build` clean; `audit:phase1` ALL SECTIONS PASSED; `asset:validate` PASS on the
  hippocampus sample and all 5 new assets.
- **Docs (scope/QA/completion) + limitations update:** `docs/PHASE_5_2_ANATOMICAL_SCOPE.md`,
  `docs/PHASE_5_2_ASSET_QA.md`, this report, `docs/KNOWN_ANATOMICAL_LIMITATIONS.md`
  L20 (amended) + L21 (new).

## Gates run (observed, not asserted)

All commands were run and their outputs recorded: 16/16 `tsx` suites green (4 held no
`ALL ... PASSED` banner; two of those are the ANSI-colored Phase-2.1 banner —
`npm test` exit code is the authority, exit 0), `tsc --noEmit` exit 0,
`vite build` exit 0 with all 40 runtime GLBs + manifests copied to `dist/`,
`audit_phase1.ts` all sections passed, `validate_asset.ts` 10/10 on 6 targets,
324/324 manifest SHA-256 assertions recomputed from disk with 0 mismatches.

## Independent review

Round 1 (neuroanatomy, provenance/license, graphics/performance, architecture):
2 CRITICAL + 6 MAJOR, every item independently re-verified by the orchestrator before
repair. Round 2 (same four, independent of round 1 and the repairs): C1 and C2
genuinely closed; exposed that the round-1 repairs had broken two project gates
(`audit_phase1` and `validate_asset` both *required* the self-contradicting
`commercial_redistribution === 'PERMITTED'`) — fixed by accepting the conservative
posture with the caveat required, both re-verified green; and that the licensing repair
had been applied to generators but not the shipped records — now applied to all 36
records and all ingestion files. Full record: `.opencode/reviews/PHASE_5_2_CONSOLIDATED_REVIEW.md`.

User-visible corrections shipped: the UI reads the licence from the record (no longer
hardcodes a resolved claim), a BodyParts3D/LSIDC attribution and licence-status footer
ships in the app and `dist/`, and the false "Relicensed under CC BY 4.0" claim is gone
from every layer (scripts, manifest, 36 records, all ingestion files).

## Open items (explicit, not hidden)

1. **L21 — `acquisition_date` conflict on 27 pre-5.2 assets (needs a human).** The
   published manifest says 2026-09-26; the assets' own ingestion records say
   2026-09-27. The published value was itself produced by the (now removed) birthtime
   fallback, so neither is authoritative. The generator preserves the published value,
   emits an explicit `acquisition_date_conflict` on all 27, and the conflict is
   documented in `docs/KNOWN_ANATOMICAL_LIMITATIONS.md`. Choosing is a provenance
   judgement. Non-scientific, non-anatomical; load-bearing for no mesh or metric.
2. **M2 — batch-script fork (~470 duplicated lines)** across the three stage/write
   script pairs. Must be consolidated before Phase 5.3 or each subsequent phase spawns
   another near-duplicate and cross-cutting fixes silently no-op.
3. **Deferred MINOR:** lineage `timestamp` literals are placeholders; LOD3 geometric
   deviation is large relative to the two smallest structures' own size; fossil-fuel
   items (`maxResidentMeshes` consumer, unload path, small-structure LOD floor).

## What is NOT claimed

No expert review (`EXPERT_REVIEW_PENDING` on all 36 manifest entries). No clinical
validity. No licence clearance (`LEGAL_REVIEW_REQUIRED` standing, with the unresolved
retroactivity recorded in every layer). No iPad / browser-device / WebGPU-device
validation beyond the automated suites and the build. No cortical continuity claim. No
parcellation, knowledge layer, psychiatry, offline, or AI capability — those are
Phases 6–11 and are explicitly excluded from this report.
