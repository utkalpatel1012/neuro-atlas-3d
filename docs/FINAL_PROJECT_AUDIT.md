# FINAL PROJECT AUDIT — neuro-atlas-3d (Phase 12)

Branch: `autonomous/phase-12` · Date (UTC): 2026-10-01 · Evidence: `docs/PHASE_12_VALIDATION_REPORT.md` (observed runs) + `src/phase12_validation.test.ts` (55 automated structural checks, green).
Rule: per `AGENTS.md` no-false-progress, **EXPERT_REVIEWED = PENDING everywhere** (no documented expert review exists) and **DEVICE_VALIDATED = PENDING everywhere** (no browser/device run evidence exists). **FINAL_PROJECT_CERTIFIED is NOT declared** — status is **HUMAN_REVIEW_REQUIRED** (unblock list §3).

Column key: ✅ achieved (evidence cited) · ⚠️ partial (implemented but unproven on device / limited scope) · ⏳ PENDING (not done — honest gap).

| # | Project area | IMPLEMENTED | TESTED (automated) | SCIENTIFICALLY_VALIDATED | EXPERT_REVIEWED | DEVICE_VALIDATED |
|---|---|---|---|---|---|---|
| 1 | Asset pipeline + provenance (ingest→canonical→LOD→runtime, hash chains, manifest 63/63/0) | ✅ (pipeline scripts + v1.1.0 manifest) | ✅ (pipeline 15 + phase31 49 + audit:phase1 PASS) | ✅ source-identity + distribution-identity grade (Level A+B plausibility; NOT morphological proof) | ⏳ PENDING — 63/63 `EXPERT_REVIEW_PENDING` | ⏳ PENDING — headless only |
| 2 | Geometry QA (watertightness, topology classes, LOD monotonicity, meshopt round-trip) | ✅ | ✅ (asset:validate 7×10/10 this phase; phase5 2,904) | ✅ `GEOMETRY_VALIDATED` accounting-grade only (per AGENTS.md, ≠ anatomical proof) | ⏳ PENDING | ⏳ PENDING |
| 3 | Rendering engine (Three.js, LOD manager, materials, selection, BVH raycast CPU-side) | ✅ | ✅ (engine 10 + assembly 20 + consolidation 8) | ✅ engine-behavior grade (headless measured timings, no FPS claims) | ⏳ PENDING (n/a — technical) | ⏳ PENDING — WebGPU path code-identical but device-unverified; fallback headless-tested only |
| 4 | Anatomy coverage 5.0–5.5 (63 structures: cortex, deep gray/limbic, brainstem/cerebellum/ventricles, white matter, CN/vasculature, cortical completion) | ✅ (63 RUNTIME_READY; rejections documented with reasons) | ✅ (anatomy51 418 + 52 636 + 53 657 + 54 420 + 55 972) | ✅ `ANATOMY_VALIDATED` = source identity + conformant geometry + scale/laterality plausibility; hippocampus has morphological audit (`ANATOMICAL_ASSET_QA.md` §3); multi-part composites stay `ANATOMICAL_MAPPING_PENDING` | ⏳ PENDING — all 63 pending | ⏳ PENDING |
| 5 | Knowledge + search (137 records, 63 AVAILABLE + 74 DOCUMENTED; 555 typed claims, 0 literature; FMA 59/4) | ✅ | ✅ (knowledge6 7,206) | ✅ citation-per-claim + anatomy-function separation grade (no psychiatry vocabulary in assertive content) | ⏳ PENDING | ⏳ PENDING |
| 6 | Parcellation (HCP/Brodmann) | ⚠️ registry + deferral record only — **zero parcel geometry by design** (1,196 files scanned) | ✅ (parcellation7 1,793 assert the closed gate) | ✅ deferral honestly validated (unverified-source + HCP-gate-breach hard stops held) | ⏳ PENDING | ⏳ PENDING |
| 7 | Psychiatry + neurobiology (69 co-location records, LOW/INSUFFICIENT_EVIDENCE, 7 refusals, educational guard) | ✅ (restraint model) | ✅ (psychiatry8 3,952; 100% refusal battery in tutor) | ✅ restraint validated (no causation leap, no invented receptors/drugs/DSM/diagnosis) | ⏳ PENDING | ⏳ PENDING |
| 8 | Study UI (notes, flashcards ex verified claims, quiz incl. UNKNOWN, saved views, touch, bounded memory) | ✅ | ✅ (study9 3,778) | ✅ single-store + no-duplicate-systems + bounded-memory hard stops held | ⏳ PENDING | ⏳ PENDING — touch implemented, physical-iPad run pending |
| 9 | Offline PWA (budgeted cache 150 MB, LRU, version/invalidation guards, SW stamp) | ✅ | ✅ (offline10 114; SW source behaviorally exercised in sandbox) | ✅ storage-budget + invalidation + quota-safety grade | ⏳ PENDING (n/a — technical) | ⏳ PENDING — no on-device quota/eviction/install run |
| 10 | Grounded tutor (retrieval-grounded answers, 100% adversarial refusal, citation resolution, AVAILABLE-only 3D actions, no-LLM) | ✅ | ✅ (tutor11 4,689 standalone; validation12 pins wiring) | ✅ grounding + refusal + no-invention grade | ⏳ PENDING | ⏳ PENDING |
| 11 | Sections / MRI / registration (plane math, clipping, MRI reference gated, registration pending with NULL metrics) | ✅ (overlay OFF until registration computed) | ✅ (section-math 44 + section 86 + presentation 92 + mri 103 + registration 64) | ✅ gating validated (`REGISTRATION_PENDING`, `MRI_BROWSER/IPADOS_VALIDATION_PENDING`, landmarks SCHEMATIC_UNVALIDATED) | ⏳ PENDING | ⏳ PENDING |
| 12 | Licensing / legal posture (exact-terms records, no counsel-pretending language, HCP gate CLOSED, commercial LEGAL_REVIEW_REQUIRED) | ✅ records + UI disclaimers (`index.html`, info panel) | ✅ (banned-term guards repo-wide incl. new TEST 3) | ✅ exact-terms honesty grade (retroactivity explicitly UNRESOLVED, never papered over) | ⏳ PENDING — legal review outstanding (U-1/U-4) | ⏳ PENDING (n/a) |
| 13 | Accessibility / security / deployment | ⚠️ ARIA present across panels; SW + dist stamp ship; **no CSP/headers evidence** | ⚠️ 1 aria-expanded assertion; SW sandbox tests; no security tests | ⏳ PENDING — no assistive-tech, security, or live-URL audit exists | ⏳ PENDING | ⏳ PENDING |

## 2. What the five columns mean here (no-false-progress binding)

- **IMPLEMENTED** = code/records exist in-repo. **TESTED** = headless `tsx` automation green (28,179 checks total). Neither implies device truth.
- **SCIENTIFICALLY_VALIDATED** = the repo's own evidence grade (source identity, typed citations, restraint/refusal behavior, closed gates) — real but explicitly **not** expert review and **not** device proof.
- **EXPERT_REVIEWED: PENDING in all 13 rows** — zero documented expert reviews; `EXPERT_VALIDATED` token absent from all data + manifest (auto-guarded).
- **DEVICE_VALIDATED: PENDING in all 13 rows** — zero headed-browser / physical-device runs; every FPS/VRAM/PWA/iPad-adjacent number remains a TARGET/ceiling until measured.

## 3. HUMAN_REVIEW_REQUIRED — exact unblock list

- **U-1 L21 provenance decision:** acquisition-date conflict + CC-BY-SA 2.1 JP vs portal CC BY retroactivity UNRESOLVED → legal decision required.
- **U-2 Physical-device runs:** headed browser matrix; WebGPU-device run + loss-recovery drill; WebGL-fallback run; on-device memory/Jetsam measurement; physical iPad pass (touch, quota/eviction, install).
- **U-3 Expert anatomical review:** documented neuroanatomy sign-off to lift `EXPERT_REVIEW_PENDING` (63/63) before any expert-validated wording.
- **U-4 Legal review for HCP/commercial:** HCP gate stays CLOSED; no parcel mapping until source/version/license verified + registration method proven; no commercial redistribution until U-1 resolved.
- **U-5 (recommended):** accessibility audit (screen-reader/keyboard/contrast), security review (CSP/headers/deps), live-URL post-deploy verification; wire `test:tutor11` + `test:validation12` into the `npm test` chain (observation F-1).

## 4. Certification statement (explicitly withheld)

**FINAL_PROJECT_CERTIFIED: NOT DECLARED.** Phase 12 success criteria (`FINAL_PROJECT_CERTIFICATION.md + FINAL_PROJECT_AUDIT.md`) are met only in the audit half: this document distinguishes IMPLEMENTED / TESTED / SCIENTIFICALLY_VALIDATED / EXPERT_REVIEWED / DEVICE_VALIDATED from PENDING per area, and records that the certification half must wait for U-1–U-4. No hard stop was triggered (§10 of the validation report); nothing was certified over any gap.
