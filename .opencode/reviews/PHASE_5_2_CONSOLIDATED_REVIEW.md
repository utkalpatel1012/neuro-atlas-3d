# Phase 5.2 — Consolidated Independent Review Record

Four independent reviewers ran against the uncommitted Phase 5.2 work. Verdicts are
recorded verbatim below. **Phase 5.2 is NOT certifiable** and was not committed or
pushed. All CRITICAL/MAJOR items below were independently re-verified by the
orchestrator (commands and evidence noted).

Reviewers: neuroanatomy, provenance-license, graphics-performance,
software-architecture. Final certifier: **NOT RUN** (blocked).

---

## Verdicts

| Reviewer | Verdict | Blocking class |
|---|---|---|
| neuroanatomy-reviewer | PASS_WITH_MINOR_NOTES | 2 MAJOR (documentation accuracy only) |
| provenance-license-reviewer | **FAIL** | 3 MAJOR + 1 licensing-surface FAIL |
| graphics-performance-reviewer | PASS_WITH_MINOR_NOTES | 0 blocking |
| software-architecture-reviewer | **FAIL** | **2 CRITICAL** + 9 MAJOR |

---

## Verified CRITICAL — must fix before certification

### C1 — Fabricated `acquisition_date` on 27 pre-existing assets
`scripts/pipeline/update_manifest.ts:219-226` falls back to the **directory birth time**
of `assets/raw/<assetId>` when `ingestion.json` has no `acquisition_date`. Only the 5
new 5.2 records carry that field, so every 3.x/5.0/5.1 record was rewritten.

**Independently verified:**
```
committed: 2026-09-26 x31
working:   2026-09-27 x32, 2026-09-26 x4
```
27 legacy assets moved `2026-09-26` → `2026-09-27`. This violates
Phase 5.2 `requiredEvidence: "legacy-identical"` and `AGENTS.md:19` (no fabricated
provenance). It is also non-reproducible (a fresh clone re-derives a different date).

**Repair:** preserve the existing manifest value instead of overwriting; never derive
provenance from filesystem timestamps. Revert the 27 legacy lines to their committed
values and pin `acquisition_date` explicitly per source record.

### C2 — No pinned source-hash gate (5.2 hard stop `mirror-swap-risk-unresolved`)
`scripts/pipeline/prepare_posterior_batch.ts:23,76-93` reads a pre-staged file from a
hardcoded local dir, hashes it, and compares only against itself on re-run. There is
**no committed expected hash**, so the staged bytes are never authenticated against an
independent authority. `PHASE_5_2_ASSET_QA.md:3` and `prepare_posterior_batch.ts:124`
nonetheless state the hash was "verified".

**Repair:** commit expected hashes in `data/phase52_source_hashes.json` and gate on
them, **or** (honest, minimal) downgrade the wording from "hash verified" to
"hash recorded (self-consistent)" and record the residual mirror risk explicitly.

---

## Verified MAJOR — blocking

- **MAJOR-1 (provenance) — UI resolves an UNRESOLVED licence question to end users.**
  `src/ui/HierarchyPanel.ts:165` hardcodes `upstreamLicense: 'CC BY 4.0'`, rendered at
  `src/ui/AnatomicalInfoPanel.ts:194`. The manifest records `CC_BY_SA_2_1_JP` plus
  `LEGAL_REVIEW_REQUIRED`. Verified present in source. This is a licence-integrity
  defect, not a cosmetic one.
- **MAJOR-2 (provenance) — required attribution is published nowhere.**
  The covenant "Preserve attribution to BodyParts3D / LSIDC in application notices and
  UI" is marked `VERIFIED (manifest-pinned)` in
  `docs/PRODUCTION_DATASET_LICENSE_MATRIX.md:12`. Verified: `index.html` contains
  **0** matches for `BodyParts3D|LSIDC|Attribution|Notice|licen|CC-BY`, and no NOTICE
  module exists in `src/ui/`. The matrix row is inaccurate as written.
- **MAJOR-3 (provenance) — attribution asserts relicensing as accomplished fact.**
  `assets/raw/*/ingestion.json` `attribution` field states "Relicensed under CC
  Attribution 4.0 International" while the adjacent `source_license` field states
  "Retroactivity UNRESOLVED - LEGAL_REVIEW_REQUIRED". Self-contradictory record.
- **MAJOR-4 (provenance) — lineage `git_commit_hash` is a hardcoded wrong commit.**
  `update_manifest.ts:238,254,272,285,304` all write `'9672869'` (a Phase 2.1.1
  commit) for every one of the 180 lineage steps, including uncommitted 5.2 code.
- **MAJOR-5 (neuroanatomy) — lateral-ventricle availability claim is factually wrong.**
  `PHASE_5_2_ANATOMICAL_SCOPE.md:23` says FMA78448 has no STL. The reviewer verified
  `FMA78449` (right) and `FMA78450` (left) **are** present in the distribution and
  mirror. The "no source geometry" rationale is false; they were simply not imported.
- **MAJOR-6 (neuroanatomy) — midbrain substructure availability understated.**
  FMA62394 (peduncle of midbrain) and the collicular pairs are present in the
  distribution and undeclared.

---

## Confirmed sound (do not rework)

- **All 324 SHA-256 manifest assertions across all 36 assets match disk exactly**, plus
  55/55 for the 5.2 batch including raw source STLs. No fabricated or stale hashes.
- **No fabricated anatomy.** All 7 FMA identities verified against `parts_list_e.txt`.
  No invented nuclei, lobules, vermis/hemisphere split, boundaries or coordinates; the
  canonical transform was re-derived by hand and reproduces every published centroid
  with zero drift. No ventricle described as neural tissue.
- **Rejected pons/medulla are technically correct rejections, not over-caution.** The
  over-caution hypothesis was tested and **disproved**: welding at 1e-4 mm changes the
  non-manifold count not at all (pons 10, medulla 2 — genuine 4-face non-manifold
  edges), and the pons has 4 connected shells so it could not have become a single
  closed surface anyway. Keep the rejections.
- **Rejected assets cannot reach production.** Absent from manifest and whitelist;
  `vite.config.ts` copies only `assets/derived/<id>/runtime/*`; verified 0 occurrences
  in the built `dist/`.
- **Phase 5.1 rendering quality is not regressed.** 5.2 changed **zero lines** in
  `src/engine/`, `src/ui/`, `src/main.ts`. DPR/buffer/resize/LOD paths byte-identical;
  a live probe on the real 238,506-tri cerebellum showed stable refcounts and full
  disposal after 52 LOD switches.
- **No pre-existing test assertion was weakened or removed.** All four modified test
  files were diffed line-by-line: only count constants 31→36, plus a pure addition of
  3 negative regression tests.
- **Hash/geometry chain integrity is excellent**; engineering gates green
  (16/16 suites, typecheck, build, audit:phase1, asset:validate 10/10).

---

# ROUND 2 — repair verification (2026-09-28)

Round-2 reviewers (independent of both round 1 and the repairs) were re-run. Their
verdicts on the original findings:

| Original finding | Round-2 status |
|---|---|
| C1 fabricated legacy `acquisition_date` | **GENUINELY CLOSED** — generator idempotent (two runs differ on `generated_at` only), all 31 legacy values byte-identical to HEAD |
| C2 unpinned source hash / mirror-swap risk | **GENUINELY CLOSED as a drift gate** — 7/7 pins verify on disk; residual disclosed as `MIRROR_CONVERSION_UNVERIFIED`; pins are circular w.r.t. first ingest and the repo says so |
| MAJOR-1 UI hardcoded `CC BY 4.0` | **CLOSED** — UI reads the record; 4 `main.ts` literals corrected; status row added |
| MAJOR-2 attribution published nowhere | **CLOSED** — footer ships in `dist/index.html`; matrix row corrected |
| MAJOR-3 relicensing asserted as fact | **WAS NOT CLOSED** — fixed in generators + manifest only; 36/36 structure records and 31/39 ingestion records still shipped the claim. **Now fixed in the data layer.** |
| MAJOR-4 hardcoded `git_commit_hash` | **CLOSED** — 6 script paths independently re-verified against `git log -1`; 3 distinct real commits |
| MAJOR-5/6 availability claims | **BOTH CLOSED** — FMA78449/78450/62394/73422/73423/73434/73435 confirmed HTTP 200 in the mirror, confirmed still not ingested |

## Regression introduced by the round-1 repairs (found by round-2 review, fixed)

The `commercial_redistribution: PERMITTED → LEGAL_REVIEW_REQUIRED` correction **broke two
of the project's own gates**: `scripts/audit_phase1.ts` and `scripts/validate_asset.ts`
both *required* `=== 'PERMITTED'`, so passing them depended on publishing the
self-contradicting value. Both gates now accept the conservative
`LEGAL_REVIEW_REQUIRED` provided the legal caveat is present, and both re-verified green.

Status files that had recorded these gates as passing while they were failing were
corrected (`AUTONOMOUS_STATUS.md`, `PROJECT_STATE.json`, `HEARTBEAT.json`).

## Additional defects found and fixed in round 2

- `commercial_redistribution` still `PERMITTED` in all 36 structure records and in all
  three record writers — the same contradiction in a second place.
- Third relicensing variant in `hippocampus_right.json` `upstream_license_history`
  ("portal relicensed to CC BY 4.0 ... without ShareAlike requirement").
- `acquisition_date_conflict` / `expert_review_status` were undeclared; a real TS2353
  surfaced once `scripts/**` was compiled directly. Both added to `AssetProvenance`, and
  the `acquisition_date` ISO-date contract corrected to admit the `NOT_RECORDED` sentinel.
- Category-aware QA profile was **dead code** — the batch ledger carried no `category`,
  so cavity assets silently kept cortical profile names. `category` now travels through
  all three preparers and `BatchVerdict`. The existing QA ledger was left as the truthful
  record of what was actually run rather than retroactively rewritten.
- Hierarchy and assembly labels no longer assert a cerebellum hemispheres/vermis split.
- Hypothalamus absence claim corrected (`FMA62008nsn` is served; suffix never guessed).

## Regression guards added

`src/phase52_anatomy.test.ts` grew from 238 → **474 checks**. TEST 10 covers C1, C2,
MAJOR-1/2/3, M3, M5; TEST 11 covers licensing-posture consistency across the manifest,
all 36 records and both gating scripts, the category-to-ledger path, and the availability
claims. Round-2 review noted several guards are source-text lints rather than behavioural
tests; the highest-value behavioural guards (raw bytes vs pins, laterality null path,
per-entry manifest attribution) are genuine assertions.

## Still open

- **L21 (needs a human):** `acquisition_date` conflict on 27 pre-5.2 assets. Both
  candidate values are unverified; the published one was itself birthtime-derived. Left
  open deliberately, documented in `docs/KNOWN_ANATOMICAL_LIMITATIONS.md` L21, and
  recorded as a blocker in `PROJECT_STATE.json`. Not scientific and not anatomical.
- M2 (batch-script fork, ~470 duplicated lines) is still outstanding and should be
  consolidated before Phase 5.3, or each of 5.3–5.5 will spawn another near-duplicate.
- Several MINOR items deferred (lineage `timestamp` literals, LOD3 deviation floor for
  tiny structures, `maxResidentMeshes` consumer, unload path).

## Final gate state (observed)

`npm test` exit 0 (16/16) · `typecheck` exit 0 · `build` exit 0 · `audit:phase1` PASS ·
`asset:validate` PASS on hippocampus + all 5 new Phase 5.2 assets.
**Not yet certified, not committed, not pushed.**

---

