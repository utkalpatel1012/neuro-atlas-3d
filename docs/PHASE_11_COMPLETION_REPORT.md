# Phase 11 Completion Report — Grounded AI Tutor (Local Retrieval + Templated Responder)

- Phase: 11 (registry: "Grounded AI tutor")
- Scope doc: `docs/PHASE_11_ANATOMICAL_SCOPE.md`
- Branch: `autonomous/phase-11` (uncommitted; no commit per task constraints)
- Date: 2026-10-01
- Standard: AAS-2026-NEURO-V1

## 1. Objective (registry)

Retrieval + source-grounded responses + 3D entity refs/selection/highlight +
teaching/quiz. Tutor asserts ONLY verified-layer claims; UNKNOWN / NOT
REPRESENTED / INSUFFICIENT EVIDENCE otherwise. Never invents anatomy,
citations, mechanisms, criteria, or evidence.

## 2. Architecture honesty

There is no LLM backend in this repo and none was added. The tutor is a
LOCAL retrieval + templated grounded responder over the verified layers:

- `src/tutor/parseQuestion.ts` — intent via the EXISTING Phase 6 ranker
  (`rankSearch`, imported) + Phase 8 `isClinicalIntent` (imported); nothing
  reimplemented. Tutor-owned `data/tutor/intent_routing.json` adds ONLY
  matchers (refusal-topic backstops, recorded system-id aliases, parcel
  phrasing, anatomical vocabulary). No claims live there.
- `src/tutor/retrieve.ts` — reads ONLY recorded Phase 6 claims/gaps,
  Phase 8 relationships + refusal templates, and Phase 7 deferral states,
  always with citations. Every clinical-intent question is routed through
  the Phase 8 guard (`guardClinicalQuery`) and returns a refusal — never a
  relationship, even for recorded pairs.
- `src/tutor/respond.ts` — fixed templates ONLY (frames from
  `data/tutor/response_templates.json`); placeholders are filled exclusively
  with RECORDED values. Statuses: ANSWER (with citations + evidence + 3D
  ids) | UNKNOWN | NOT_REPRESENTED | INSUFFICIENT_EVIDENCE, each with reason
  + guard. Every response carries the verbatim educational-use guard.
- 3D actions reference AVAILABLE-geometry entities ONLY: AVAILABLE →
  select + focus through the EXISTING pipeline (`routeEntry` with
  `AnatomicalAssemblyManager.selectEntity` + `AtlasApplication.focusEntity`,
  on-demand load via `HierarchyPanel.loadAvailableByEntityId`);
  DOCUMENTED → geometry-free detail card (`AnatomicalInfoPanel.showKnowledge`)
  with no camera move; refusals / parcels / unknowns carry no action.
- `src/ui/TutorPanel.ts` — query box, templated answers rendered with
  citations + evidence + guard, per-structure 3D buttons through the existing
  pipeline, collapsible (aria-expanded toggle), `dispose()` removes the
  element and clears caches. Plain UI statement: "Local retrieval over
  verified atlas layers with fixed templates. No external model is called."
- `data/tutor/` holds intent-routing + templates ONLY: Phase 6/8 records are
  referenced by id, zero claim text is duplicated (asserted in TEST 7).

No support → refusal template, never synthesized prose.

## 3. Files (allowed scope only)

| Path | Change |
| ---- | ------ |
| `src/tutor/types.ts` | new — statuses, parse/retrieve/respond shapes, AVAILABLE-only action type |
| `src/tutor/parseQuestion.ts` | new — imports Phase 6 ranker + Phase 8 detector |
| `src/tutor/retrieve.ts` | new — recorded layers only, clinical→guard, parcel→deferral |
| `src/tutor/respond.ts` | new — fixed templates, recorded values only |
| `src/tutor/index.ts` | new — barrel + `answerQuestion()` orchestration |
| `src/ui/TutorPanel.ts` | new — panel UI on the existing pipeline |
| `data/tutor/intent_routing.json` | new — matchers only, ids only, no claims |
| `data/tutor/response_templates.json` | new — scaffolding with `{placeholders}` only |
| `src/phase11_tutor.test.ts` | new — 10-test grounding/refusal/citation/safety suite |
| `docs/PHASE_11_COMPLETION_REPORT.md` | new — this report |
| `package.json` | `test:tutor11` script ADDED only; full `test` chain untouched |

NOT touched: assets, manifests, records, `data/knowledge/`,
`data/psychiatry/`, `data/parcellation/`, hierarchy, engine core, existing
tests (zero count bumps: 63 structures / 63 manifest assets / 137 index
entries unchanged). No npm dependencies added, no model weights, no API
keys, no endpoints, no external calls. No commit.

## 4. Refusal-rate table (observed, `test:tutor11` TEST 2)

Adversarial battery: 34 questions across 10 classes. ALL refused (no ANSWER).

| Category | Refused / Total | Rate | Typical status |
| -------- | --------------- | ---- | -------------- |
| receptors | 4 / 4 | 100% | INSUFFICIENT_EVIDENCE (guard) / NOT_REPRESENTED (topic backstop) |
| mechanisms | 4 / 4 | 100% | INSUFFICIENT_EVIDENCE (guard) / NOT_REPRESENTED (topic backstop) |
| dsm | 3 / 3 | 100% | INSUFFICIENT_EVIDENCE (guard) |
| diagnosis | 4 / 4 | 100% | INSUFFICIENT_EVIDENCE (guard) |
| treatment | 4 / 4 | 100% | INSUFFICIENT_EVIDENCE (guard) |
| dosage | 3 / 3 | 100% | INSUFFICIENT_EVIDENCE (guard) |
| prognosis | 2 / 2 | 100% | INSUFFICIENT_EVIDENCE (guard) |
| parcels | 4 / 4 | 100% | NOT_REPRESENTED (Phase 7 deferral, MAPPING_PENDING) |
| unrepresented | 3 / 3 | 100% | NOT_REPRESENTED |
| nonsense | 3 / 3 | 100% | UNKNOWN |
| TOTAL | 34 / 34 | 100% | — |

## 5. Grounding (observed, TEST 1 + TEST 3)

13 answers, all verbatim from records, all citations resolve:

- 12 anatomy: 10 AVAILABLE (hippocampus/amygdala/middle-frontal/cingulate/
  caudate/putamen/thalamus left, corpus callosum, cerebellum, third
  ventricle) + 2 DOCUMENTED (middle cerebral artery, trigeminal nerve —
  geometry-free detail, no camera action). Every evidence item's `claim_id`,
  statement, and citation matches the on-disk knowledge record claim-by-claim.
- 1 system: CSTC member enumeration — all 14 recorded relationships,
  statement verbatim per `relationship_id`, with causation disclaimer +
  evidence grades.
- Citation resolution: 162 cited repo paths resolve on disk; 10 cited URLs
  allowlisted (BodyParts3D distribution + mirror STL hosts). Zero invented
  citations.

## 6. Verification (observed)

| Gate | Result |
| ---- | ------ |
| `npm.cmd run typecheck` (`tsc --noEmit`) | 0 errors |
| `npm.cmd test` (full chain, 24 suites) | exit 0, all green |
| `npm.cmd run test:tutor11` (new suite) | exit 0 — ALL PHASE 11 TUTOR TESTS PASSED (4689 checks) |
| Total suites green | 24 + 1 = 25 |
| `npm.cmd run build` (Vite) | 0 errors |
| `npm.cmd run audit:phase1` | PASS |

## 7. Hard stops (all observed, none tripped)

- `ungrounded-assertion` — every ANSWER renders recorded claims/relationships
  verbatim; TEST 1 asserts claim-by-claim equality; TEST 7 scans all ANSWER
  outputs for invented-psychiatry and causal-assertion shapes.
- `invented-citation` — TEST 3 resolves every cited repo path to disk and
  every URL against the allowlist (162 paths + 10 URLs).
- `diagnostic-output` — TEST 5 proves all 24 clinical-intent questions get
  guard + refusal with zero relationship id/content leakage, including via
  the lookup entry point for recorded pairs.

## 8. Limitations (labeled, not silent)

- The tutor answers only what the recorded layers support; function,
  receptor, drug, DSM, diagnostic, treatment, dosage, prognosis, and parcel
  questions are refused by design (34/34 battery).
- Parcel questions report the closed Phase 7 gate (MAPPING_PENDING) with
  recorded unblock conditions; no parcel is mapped or rendered.
- Plural phrasing that Phase 8's singular clinical patterns miss
  (e.g. "receptors", "antidepressants") is caught by the tutor routing
  backstop and still refuses with guard + recorded template.
- `TutorPanel` is implemented and tested but not mounted in `src/main.ts`
  (out of Phase 11 write scope); mounting is a follow-up wiring task.
  **Superseding note (certification repair): TutorPanel is now MOUNTED in
  `src/main.ts` with existing-pipeline deps; the above is retained as history.**
- The panel's single data-loader call targets same-origin `data/knowledge/`
  files via the existing `knowledgeFileFor()` path (proven local by TEST 6);
  no sockets, keys, vendors, model weights, or remote endpoints exist
  anywhere in tutor code or data.
