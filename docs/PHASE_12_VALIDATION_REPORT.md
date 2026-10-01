# PHASE 12 VALIDATION REPORT — Final Validation Sweep

Branch: `autonomous/phase-12` · Date (UTC): 2026-10-01 · Scope: read-only sweep + 3 allowed creates + 1 `package.json` test-script addition. No commit.
Authority: `.opencode/workflow/PHASE_REGISTRY.json` phase 12 entry; `AGENTS.md` no-false-progress rule.

**Headline:** all automated gates observed PASS. Certification is **NOT** declared.
Status: **HUMAN_REVIEW_REQUIRED** — see §9 unblock list. Hard-stop verdict: **NO BLOCKED GATE — PROCEED TO HUMAN REVIEW** (§10).

## 1. Gates run (observed results)

| Gate | Command / target | Observed result |
|---|---|---|
| Full chain | `npm.cmd test` | exit 0 — 24 suites, **23,435 checks**, all PASS (breakdown §4) |
| Tutor (standalone) | `npm.cmd run test:tutor11` | exit 0 — **4,689 checks**, all PASS (NOT in `test` chain — observation F-1) |
| New sweep suite | `npm.cmd run test:validation12` | exit 0 — **55 checks**, all PASS |
| Typecheck | `npm.cmd run typecheck` | exit 0, zero errors (incl. new suite) |
| Build | `npm.cmd run build` | SUCCESS (870 ms; known `fs`/`path` externalization warnings only, per AGENTS.md); `dist/sw.js` + `dist/manifest.webmanifest` + `dist/data/` verified present |
| Asset validate (sample) | `asset:validate` × 7 | 7/7 **VALIDATION PASSED 10/10** spanning 5.0 hippocampus (`mesh.hippocampus.left.v1`), 5.1 putamen (`mesh.putamen.left.v1`), 5.2 cerebellum (`mesh.cerebellum.bilateral.v1`) + third ventricle (`mesh.third_ventricle.midline.v1`), 5.3 corpus callosum (`mesh.corpus_callosum.midline.v1`), 5.4 optic nerve (`mesh.optic_nerve.left.v1`), 5.5 precentral gyrus (`mesh.precentral_gyrus.left.v1`) |
| Phase-1 audit | `npm.cmd run audit:phase1` | **ALL SECTIONS PASSED** (7/7 sections; 10-gate asset CLI 10/10) |

Grand total automated: **28,179 checks across 26 test files**, zero failures.

## 2. Manifest census (observed)

- `assets.manifest.json` v1.1.0: **total_assets 63**; asset dict 63 entries; **production_whitelist 63**; **research_quarantine 0**.
- All 63: `validation_status CLEARED` (technical clearance only — never silent on legal/scientific limits), `production_eligibility PRODUCTION_ALLOWED`, `expert_review_status EXPERT_REVIEW_PENDING` (63/63), commercial posture `LEGAL_REVIEW_REQUIRED` with caveat present.
- Carried limitation (pre-existing, documented): L21 provenance conflict — `acquisition_date_conflict: UNRESOLVED` (manifest 2026-09-26 vs ingestion.json 2026-09-27) + CC-BY-SA 2.1 JP vs portal CC BY retroactivity UNRESOLVED → feeds HUMAN_REVIEW unblock item U-1.

## 3. Records / hierarchy / knowledge / psychiatry / tutor census (observed)

- Structure records `data/structures/`: **63 files** = manifest 63. PASS.
- Knowledge `data/knowledge/build_meta.json`: **available 63 / documented 74 / total 137**, claim types DISTRIBUTION/RECORD/ONTOLOGY, **literature_claims 0**; `search_index.json` entry_count 137; 139 files on disk (137 + build_meta + search_index). Phase-6 suite pins 555 typed claims, 933 cited paths resolve, FMA 59 VERIFIED / 4 UNVERIFIED. PASS.
- Hierarchy `data/anatomical_hierarchy.json`: **135 nodes = 61 AVAILABLE + 74 DOCUMENTED**. Delta vs knowledge-AVAILABLE (63) explained and asserted in suite: the 2 extra AVAILABLE knowledge records are whole-cortex aggregates (`brain.telencephalon.{left,right}.cortex`, i.e. `mesh.cortex.left/right.v1`) which honestly hold **no hierarchy node**. PASS with documented reason.
- Psychiatry: **69 relationships** (all INSUFFICIENT_EVIDENCE + verbatim causation disclaimer) / **7 refusal templates** / **7 systems** (all LOW-certainty with member gaps). PASS.
- Tutor routing `data/tutor/intent_routing.json`: **7 refusal routes / 7 system aliases**. PASS.

## 4. Suite census (observed tallies)

25 test files on disk before this phase (24 in `npm test` + `phase11_tutor` standalone), 26 after adding `phase12_validation`.

| Suite | Checks |
|---|---|
| schema | 10 |
| pipeline | 15 |
| engine | 10 |
| assembly | 20 |
| consolidation | 8 |
| cortex | 40 |
| phase31 | 49 |
| section-math | 44 |
| section (clipping) | 86 |
| presentation | 92 |
| mri | 103 |
| registration | 64 |
| phase5 | 2,904 |
| quality51 | 44 |
| anatomy51 | 418 |
| anatomy52 | 636 |
| anatomy53 | 657 |
| anatomy54 | 420 |
| anatomy55 | 972 |
| knowledge6 | 7,206 |
| parcellation7 | 1,793 |
| psychiatry8 | 3,952 |
| study9 | 3,778 |
| offline10 | 114 |
| **chain subtotal (24 files)** | **23,435** |
| tutor11 (standalone) | 4,689 |
| validation12 (new, standalone) | 55 |
| **Grand total (26 files)** | **28,179** |

## 5. Review sweep 5.2–11 (observed)

`git tag -l 'phase-*-certified'` returns all 10: `phase-5-2` through `phase-5-5`, `phase-6`, `7`, `8`, `9`, `10`, `11` — certified.
Completion reports present for all 10 (`docs/PHASE_{5_2,5_3,5_4,5_5,6,7,8,9,10,11}_COMPLETION_REPORT.md`).
**No phase missing certification. PASS.**

## 6. Prohibited-claim sweep (observed, each hit classified)

Pattern: `clinically validated|fully validated|iPad validated|iPad-validated|expert.reviewed|expert validated|license cleared|licence-cleared|dual compliance|unrestricted|Relicensed under` over shipped `src/` (non-test), `index.html`, `data/{structures,knowledge,psychiatry}/`.

| Hit | Classification |
|---|---|
| `index.html:46-47` — "not licence-cleared, not clinically validated, not expert-reviewed" | **COMPLIANT** — required negative honesty banner (+ not-for-diagnostic-use) |
| `src/ui/AnatomicalInfoPanel.ts:211` — "not licence-cleared" + LEGAL_REVIEW_REQUIRED | **COMPLIANT** — negative disclaimer in shipped UI |
| `*.test.ts` guard lines (`dual compliance`, `Relicensed under` inside `assert(!/…/)`) | **COMPLIANT** — test-only absence assertions, never shipped claims |
| `EXPERT_REVIEW_PENDING` tokens (types, `mriVolume.ts`, test assertions) | **COMPLIANT** — honest pending-status vocabulary, asserted PENDING 63/63 |
| `data/` (all three dirs) | **ZERO hits — PASS** |
| `fully validated`, `iPad validated`, `license cleared`, `dual compliance`, `unrestricted`, `Relicensed under` as assertive prose | **ABSENT everywhere — PASS** |

Zero assertive/device/legal-clearance claims in shipped surfaces. **PASS** (automated guard: `test:validation12` TEST 3 + TEST 4).

## 7. Device-validation inventory (observed — all DEVICE_VALIDATED PENDING)

| Item | Code/implementation evidence | Run/device evidence | State | What unblocks |
|---|---|---|---|---|
| browser-validation | headless `tsx` suites only | none (no headed run) | **PENDING** | headed Chromium/Firefox/Safari render+pick+clip runs with measured timings |
| WebGPU-validation | code-identical path (three r186); loss-detection hooks present, full recreation self-marked FUTURE | none | **PENDING** | WebGPU-device run + device-loss recovery drill |
| WebGL-fallback | fallback probe logic, headless-tested (phase 5.1 TEST 4) | none on device | **PENDING** (impl. present) | fallback-behavior run on WebGL-only device |
| memory-validation | 110 MB base-iPad ceilings, LRU eviction, bounded UI stores (headless-tested); MRI accounting honest non-VRAM | no on-device measurement | **PENDING** (impl. present) | on-device heap/VRAM measurement incl. iPadOS Jetsam threshold |
| iPad-validation | touch handlers + responsive UI implemented; `PHASE_9_TOUCH_SUPPORT.md` marks device run pending | none | **PENDING** (impl. present) | physical iPad pass (tap/pinch, Jetsam, quota/eviction, install prompt) |
| accessibility | ARIA labels/roles/live regions across panels; 1 automated `aria-expanded` assertion | no assistive-tech run | **PENDING** (impl. partial) | screen-reader + keyboard-only + contrast audit |
| security | none found (no CSP/headers in vite config or repo) | none | **PENDING** | security review (CSP/headers/dependency audit; note: static site, local-only, no backend) |
| deployment | gh-pages wiring, dist stamp, SW versioning; mechanics noted working in review | no live-URL post-deploy verification this phase | **PENDING** (impl. present) | deploy + live-URL verification pass |

Docs agree unanimously (`KNOWN_ANATOMICAL_LIMITATIONS.md` L12, `PHASE_9_TOUCH_SUPPORT.md`, `OPENCODE_PROJECT_HANDOFF_AUDIT.md`): no browser/iPad/WebGPU-device proof claimed anywhere.

## 8. Findings / observations (non-blocking)

- **F-1:** `npm test` chain covers 24/25 pre-existing suites; `test:tutor11` (4,689 checks, green standalone) is not in the chain. Same applies to new `test:validation12` (only the single allowed `package.json` addition was used for its focused script). Recommend a follow-up wiring change — recorded, not silently fixed (out of allowed scope).
- **F-2 (pre-existing, carried):** L21 provenance conflict + license retroactivity UNRESOLVED → unblock item U-1.
- No new critical findings introduced by this sweep.

## 9. HUMAN_REVIEW_REQUIRED — unblock list (certification predecessors)

1. **U-1 L21 provenance/legal decision:** resolve acquisition-date conflict + BodyParts3D CC-BY-SA 2.1 JP vs portal CC BY retroactivity; legal review for HCP/commercial posture before any commercial redistribution.
2. **U-2 Physical-device runs:** browser matrix + WebGPU-device + WebGL-fallback + memory/Jetsam + physical iPad pass (§7 rows 1–5 evidence).
3. **U-3 Expert anatomical review:** documented neuroanatomy review to lift EXPERT_REVIEW_PENDING (all 63 assets) — required before any expert-validated wording.
4. **U-4 Legal review for HCP/commercial:** HCP gate stays CLOSED; parcellation mapping stays MAPPING_PENDING until source/version/license verified + registration method proven.
5. **U-5 (recommended):** accessibility + security + live-deployment verification passes (§7 rows 6–8).

## 10. Hard-stop verdict

- `any-failing-gate`: **none** — typecheck 0, full test exit 0 (23,435), tutor exit 0 (4,689), validation12 exit 0 (55), build success, asset:validate 7×10/10, audit:phase1 ALL SECTIONS PASSED.
- `unresolved-critical-finding`: **none new** — F-1/F-2 recorded with dispositions, nothing certified over.
- `device-claim-without-device`: **none** — sweep §6 clean; all device items honestly PENDING (§7).
- **Verdict: NO HARD STOP TRIGGERED — HUMAN_REVIEW_REQUIRED (§9), FINAL_PROJECT_CERTIFIED explicitly NOT declared** (see `docs/FINAL_PROJECT_AUDIT.md`).
