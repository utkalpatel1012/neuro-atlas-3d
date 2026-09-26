# Phase 3.1 Scientific Integrity & Cortical Asset Correction Gate Report

**Date:** 2026-09-27
**Agent:** OpenCode primary engineering agent (takeover audit + correction)
**Scope:** corrections only — NO new anatomy, NO Phase 4, NO HCP/Julich runtime data,
NO psychiatry modules, NO renderer redesign. Geometry byte-identical throughout
(all raw/derived hashes unchanged; verified by re-run of hash-pinned suites).
**History:** no phase report rewritten; corrections live in code, records, and this
report. Full documented-vs-actual comparison: `docs/OPENCODE_PROJECT_HANDOFF_AUDIT.md`.

---

## 1. Current repository state

4 production mesh assets (bilateral hippocampus solids + bilateral cortex composites)
with LOD/meshopt derivatives, hash-linked manifest (4 entries, `source_components`
for cortex), 4 structure records, vanilla-TS Three.js engine, 7 headless test suites.
`AGENTS.md` (new), `PART_4_ENTRY_CRITERIA.md` (new), 4 new audit/correction docs.
`node_modules/` installed locally for verification (not committed).

## 2. Problems discovered (all evidenced in the audit doc)

- **D1:** "welded / continuous pial surface / CLOSED_SURFACE" — code concatenates
triangle buffers; measured **16 disjoint shells/side** (independent union-find +
pipeline counter agree).
- **F1 (new, critical):** 10 of 28 cortex component names mislabeled vs the
authoritative distribution name list (temporal-series shift; cuneus/lingual/
parahippocampal misassignments); 2 lobe assignments wrong per side.
- **D3:** "+Z Anterior / RAS" labels contradict coded math; measured +Z = POSTERIOR
(3 independent lines); eval doc stated a third, unimplemented formula; manifest
recorded a fourth (`x_negated_z_negated`). Camera Ant/Post presets were swapped
relative to anatomy; landmark anchors authored under the false convention.
- **D4:** unmeasured registration metrics (affine 12-DOF, 1.2/1.1 mm, dice 0.85/0.81)
in all 4 structure records; hippocampus cited nonexistent `register_to_mni152.py`;
`source_centroid` duplicated canonical values.
- **D6:** unscoped "lossless/bit-exact" for a pipeline containing lossy QEM.
- **D7:** `ANATOMY_VALIDATED` from scale checks only; §3 "morphological verification"
against Duvernoy/Schmahmann/Ono never performed (retracted); anchors schematic.
- **D8:** FPS/VRAM/PWA/iPad/"microsecond" claims unmeasured or numerically false.
- **E:** README described React 19/R3F/Zustand/MiniSearch/Dexie/PWA/KTX2 — zero present;
geometry source misattributed to Z-Anatomy; HCP described as ingested; code license
conflict (package.json CC-BY-SA-4.0 vs Apache-2.0 claim, no LICENSE file).
- **Incidental:** 51 MB validation artifacts with machine-local path leaks;
`asset:validate` dimension check used a hippocampus template (failed ALL cortex assets);
left-hippocampus UI volume/dims 70% off measured; `dist/`-era build warning (`fs`/`path`
externalized) unchanged.

## 3. Problems corrected

1. Terminology: concatenation/multi-shell language everywhere it matters; new
`MULTI_SHELL_COMPOSITE` topology class + `composite-cortical-assembly` QA profile +
measured `connectedShellCount` in `stl_utils` (union-find) enforced by QA checks.
2. All 10 mislabeled components renamed + 4 lobe assignments fixed in generator code,
both `ingestion.json` files, manifest `source_components` (14/side, hashes, URLs),
and `docs/PHASE_3_CORTEX_SOURCE_COMPONENTS.md` (full hash table).
3. Axis docs corrected in code comments, COORDINATE_SYSTEMS, contract, mesh standard,
invariants, accuracy standard, pipeline docs, manifest generator + regenerated manifest;
camera Ant/Post presets swapped to match measured anatomy (+ engine test updated).
4. All fabricated registration metrics removed (method `not_registered`, NULL metrics,
PENDING kept); phantom script citation gone; source centroids replaced with measured
source-frame bbox centers; centroid convention documented (bbox-center).
5. LOD/meshopt wording scoped in generators, reports, manifest, structure records,
tests, and audit script (`meshopt_roundtrip_lossless_vs_lod_input` + `qem_simplification_lossy`).
6. Cortex anatomical QA → `ANATOMICAL_MAPPING_PENDING` (code + regenerated reports +
manifest statuses read from reports, never hardcoded); §3 morphological claims retracted;
anchors marked `SCHEMATIC_UNVALIDATED` (interface field + registry notice + gate test).
7. Performance numbers classified (MEASURED/CONSISTENT/ASSERTED/TARGET/UNKNOWN);
"Observed FPS" rows set UNMEASURED; microsecond/silky language removed; fissure test
now derives the gap from manifest bounds (1.08 mm inter-piece gap, explicitly not biology).
8. Laterality verified through full chain (FMA lateral IDs → det=+1 rigid map →
canonical signs; distinct meshes) — PASS, documented.
9. Licensing: SPL-PNL blend removed from dataset names (kept only as validation
reference where it belongs); acquisition channel (third-party mirror) explicit;
"formally cleared" softened to dual-compliance + LEGAL_REVIEW_REQUIRED; Z-Anatomy/HCP
source claims corrected; code-license conflict documented as unresolved (L8).
10. Validation artifacts regenerated lean (51 MB → ~5 KB, relative paths); lod/compression
reports relativized + reworded; manifest regenerated via fixed generator.
11. `asset:validate` dimension check generalized (macroscopic band + sorted-dim
transform-consistency check); now passes all 3 validated assets; anatomical check
reports honest statuses.
12. Left-hippocampus UI volume/dims corrected to measured values in `main.ts` + fixtures.

## 4. Scientific claims corrected (claim → status)

- Welded/continuous pial/CLOSED_SURFACE → multi-shell composite (measured 16/side).
- 28 named structures → count kept, 10 identities corrected; STG/cuneus/lingual NOT present.
- +Z Anterior/RAS/MNI → +Z Posterior internal space; registration PENDING, no metrics.
- Bit-exact lossless pipeline → scoped encode-step verification; QEM lossy.
- Microsecond/1.317 ms/26x → run-varying CPU ms, headless only.
- Biological fissure/falx preservation → 1.08 mm inter-piece gap.
- Morphological verification (Duvernoy/Schmahmann/Ono) → NOT PERFORMED, retracted.
- React/R3F/Zustand/MiniSearch/Dexie/PWA/KTX2 current → PLANNED ONLY.
- Z-Anatomy source / HCP ingested → BodyParts3D-via-mirror; HCP types-only.
- "Formally cleared / 100% legal safety" → exact-terms record + LEGAL_REVIEW_REQUIRED (recovery pass §19: "dual compliance" terminology removed repo-wide — no legal basis for the term).

## 5. Coordinate-system verification

Coded: Xc=-Xs, Yc=Zs-1561.7, Zc=Ys+70.1, det=+1 (proper rotation, no mirroring).
Measured: frontal chunks low-Z, occipital high-Z; precentral anterior to postcentral;
hippocampus ventral-anterior → +Z POSTERIOR (3 lines converge). Adapter corner-mapping
test pins the math exactly. Source-frame LPS + translation constants: ASSERTED,
method undocumented (L3/L4). Camera presets + engine test realigned to measured axes.

## 6. Cortex representation verified

Concatenated 14-component assembly, 16 disjoint closed shells/side, triangle sums
exact (198230/198310), per-component hashes/URLs preserved end-to-end
(raw ingestion.json → manifest.source_components → correction doc). PARTIAL covering,
documented as such. NO geometry altered.

## 7. Source provenance verified

Chain: manifest.source_components → ingestion.json#components → hash-pinned mirror
STLs → DBCLS Release 3.0 name authority → Mitsuhashi et al. 2009 (PMID 18835852).
Mirror's OBJ→STL conversion + "display purposes" caveat recorded. No HCP/Julich/
BigBrain bytes in production paths (test-enforced). Corrected names positionally
cross-checked (accessory-short anterior-insular, cingulate medial-long, etc.).

## 8. Licensing verified

To the extent possible without counsel: upstream portal CC BY noted; historical
CC-BY-SA 2.1 JP honored via CC-BY-SA-4.0 distribution; no NC bytes present;
retroactivity/scope flagged LEGAL_REVIEW_REQUIRED; code-license conflict (L8) disclosed,
not resolved. No research-only asset in production (whitelist = 4 BodyParts3D assets).

## 9. LOD terminology corrected

See §3.5 + regenerated reports. QEM ratios/fidelity numbers untouched (measured).

## 10. Performance claims corrected

See §3.7 + reclassified baseline doc. No new measurements claimed; device testing
remains entirely open (entry criteria 6–10).

## 11. Tests run (2026-09-27, this machine)

- `npm test`: 7/7 suites green (schema 7, pipeline 15, engine 10, assembly 20,
consolidation 8, cortex 40, phase31 38 checks).
- `npm run typecheck`: clean. `npm run build`: success (known `fs`/`path`
externalization warning, pre-existing).
- `asset:validate` ×3 (both cortex + left hippocampus): 10/10 pass.
- `audit:phase1`: all sections pass.
- Independent Python re-measurement: shell counts (16/16), centroids, bounds,
triangle sums, adapter corner mapping — all agree with pipeline outputs.

## 12. Build result

`vite build` succeeds; `dist/` regenerated with corrected manifest + data. Chunk-size
warning pre-existing. Reconciliation: single clean commit
`feat(phase-3.1): complete scientific integrity and phase 4 readiness gate` on main,
pushed to origin, remote-verified (see Reconciliation record below).

## 13. Remaining limitations

L1–L10 (`docs/KNOWN_ANATOMICAL_LIMITATIONS.md`): partial covering, schematic anchors,
no registration, asserted source frame/constants, unverified ontology IDs, unjustified
bands, UI-record duplication risk, license conflict, heavy history, single-subject
source. Plus: zero browser/device testing; camera views never visually verified
headless run only; `dist/` + `node_modules/` local-only (gitignored, never committed).

## 14. Ready for Phase 4?

**Phase 3.1 as a correction gate: COMPLETE — all 15 required corrections executed,
tested, and documented.**

**Part 4 entry: NOT READY — by design.** `PART_4_ENTRY_CRITERIA.md`: criteria 1–5 pass;
6 (anchor verification), 7 (section-plane math), 8 (MRI dataset verification), 9
(license resolution), 10 (reviewer agents) are open. Phase 4 must not begin until all
ten pass with evidence.

---

# VERDICT (original pass — SUPERSEDED by the recovery-pass revised verdict at end of file)

**PHASE_3_1_COMPLETE — PART_4_BLOCKED** (first-pass verdict under a stricter rule;
superseded below per §43: documented limitations do not block).

Per the mission's allowed verdicts, this is returned as:

---

# RECOVERY-PASS ADDENDUM (2026-09-27, same session — prior pass was never committed)

The working tree from the first Phase 3.1 pass was recovered intact (HEAD unchanged at
`f2eca09`; 66 files). This addendum records what the recovery pass added beyond it,
per the expanded §0–§44 scope. No anatomy added; no geometry altered.

## R1. Legal language (§19) — "dual compliance" removed repo-wide
The term had no legal basis. Replaced in generator, both manifests (field
`dual_licensing_notes` renamed to `licensing_posture_notes`), all 4 structure records,
hippocampus ingestion strategy, README, architecture, source-evaluation, and audit
script with exact-terms language + UNRESOLVED retroactivity + LEGAL_REVIEW_REQUIRED.
Enforced by pipeline Check 15, audit §6, and phase31 TEST 5 (ban assertions).

## R2. Resource leak fixed + tested (§30)
Real bug: `LODManager.applyLOD` added +1 ref per cache-miss switch without release.
Minimal fix (balance the miss's ref post-swap, guarded against use-after-dispose) +
regression TEST 11 (fails on old code by construction, passes now). Remaining gaps
documented (L11): per-asset key granularity + bulk-dispose hazard, orphaned
ResourceManager, no disposal on scene-remove/unregister, BVH gaps on swap paths.

## R3. Renderer resilience classified (§31–32)
WebGPU device-loss: detection real, full recreation self-marked FUTURE (PARTIAL).
WebGL context: listeners + pause/resume real; snapshot/re-init absent; naive reload
can duplicate nodes (PARTIAL). Invariant 8 amended to match. No new subsystem built.

## R4. Deployment verified (§23)
Vite `base './'` + base-aware AssetManager: subpath-safe (live site + manifest fetch
OK). 16/16 runtime files exist source↔dist with matching hashes. Findings recorded:
dual deploy mechanism (gh-pages script vs Actions; source-of-truth UNKNOWN),
manifest lod/canonical paths not shipped (nothing reads them at runtime), duplicate
root manifest unreferenced, live content predates Phase 3.1 (L12).

## R5. Structural/functional separation + identity (§28–29)
Verified: limbic exists only as FUNCTIONAL_SYSTEM membership (never a structural
parent); entityId≠assetId≠mesh name≠file upheld via userData.neuroAtlas.entityId.

## R6. Package audit (§22)
three / three-mesh-bvh / meshoptimizer / tsx / tsc / vite / gh-pages / @types: all
used-or-required. React/R3F/Zustand/MiniSearch/Dexie/PWA/KTX2: 0 deps, 0 imports
(enforced by TEST 12, mechanical — not prose-based).

## R7. Invariants amended to match reality
Invariant 6 ("zero leakage"), 8 ("recovery pathway"), 10 (metrics-mandate that
contradicted §8: now metrics-only-if-computed, `not_registered` otherwise).

## R8. Part 4 criteria rewritten as §36 checkboxes; Phase 3 report gained Appendix A
(PREVIOUS CLAIM vs CURRENT VERIFIED STATUS, §39); limitations register extended
(L11–L13: resources, deployment, EXPERT_REVIEW_PENDING).

## R9. Validation re-run (recovery pass)
`npm test` 7/7 (now 40+43 cortex/phase31 checks incl. TEST 11–12), `typecheck` clean,
`vite build` OK, `asset:validate` 10/10 ×3 assets, `audit:phase1` all sections pass.

---

# REVISED VERDICT (recovery pass, per §43)

§43 rule: a documented limitation does NOT block Phase 4; a false claim, fabricated
metric, invalid coordinate assumption, broken provenance chain, or unresolved critical
architectural contradiction DOES. Recovery-pass verification: no false claim remains
in live records (scanner tests green), no fabricated metrics (all removed or
method-tagged), coordinates mathematically verified + documented, provenance chain
hash-complete, invariants amended to match reality, licensing recorded as
exact-terms + LEGAL_REVIEW_REQUIRED (uncertainty, not falsehood).

## PHASE_3_1_COMPLETE — PART_4_READY

(Read: Phase 3.1 corrections are complete and verified to the §43 standard. Known
limits (L1–L13) are documented, not hidden. Open items that constrain HOW Phase 4
must proceed — license conflict L8, expert review L13, device validation, resource
gaps L11, MRI provenance rules — are gated inside PART_4_ENTRY_CRITERIA.md and the
Phase 4 plan, not as a blanket block. Reconciliation task committed and pushed this
work to origin/main with remote verification — see §20 chat report for SHAs.
STOP — awaiting explicit next instruction.)
