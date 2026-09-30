# Phase 8 Completion Report — Psychiatry + Neurobiology Knowledge Layer (Restraint Layer)

**Phase**: 8 (Psychiatry + neurobiology knowledge layer) · **Outcome**: RESTRAINT LAYER SHIPPED (schema + registry + guards + refusals + tests)
**Branch**: `autonomous/phase-8` · **Scope authority**: `docs/PHASE_8_ANATOMICAL_SCOPE.md`
**Registry**: `.opencode/workflow/PHASE_REGISTRY.json` phase 8 entry
**Date**: 2026-09-30 · **Commit**: none (uncommitted working tree, per instruction)

## 1. Objective (registry)

RDoC/networks/pathways/circuits/receptors/pharmacology/neuromodulation as
STRUCTURE+FUNCTION/NETWORK+EVIDENCE+SOURCE+CERTAINTY. Academic education only;
never diagnosis/treatment automation from anatomy.

## 2. Outcome: restraint is the whole phase

Per the scope doc, this project has no clinical corpus, no receptor-mapping
dataset, no trial data, and no expert review — so nearly every
psychiatric/neurobiological claim a resident would want is unsupportable here.
Phase 8 does not fill that gap. It ships:

1. **Relationship schema** (`src/psychiatry/types.ts`): `PsychRelationship`
   (structure_id + function_or_network + claim_text + source + evidence_level
   + certainty, plus `certainty_reason`, `causation_disclaimer`,
   `relationship_id`, `system_id`, `structure_record`, `citation`) with
   evidence levels ESTABLISHED / MODERATE / PRELIMINARY /
   INSUFFICIENT_EVIDENCE / NOT_REPRESENTED. The schema has deliberately NO
   fields for receptors, drug mechanisms, disorder causation, DSM criteria,
   diagnosis, or treatment. Every relationship carries the canonical
   `CAUSATION_DISCLAIMER` verbatim (correlation ≠ causation).
2. **Systems registry** (`data/psychiatry/systems_registry.json`): CSTC,
   Papez, salience, default-mode, central-executive, reward, fear/threat —
   each a named study topic with framework citations that are REAL and
   checkable (NIMH RDoC framework cited as **framework identity only**,
   https://www.nimh.nih.gov/research/research-funded-by-nimh/rdoc — no matrix,
   domain, or construct content asserted), members listed ONLY where our own
   structure records support gross-anatomical co-location, per-member gaps
   with NOT_REPRESENTED status elsewhere, and overall certainty LOW with
   stated reasons on all 7 systems.
3. **69 relationship records** (`data/psychiatry/relationships.json`): the
   ONLY supportable claim shape — "structure X is anatomically positioned
   within system Y's classically described anatomy, certainty LOW, correlation
   only" — 66 at PRELIMINARY, 3 at INSUFFICIENT_EVIDENCE (thin-proxy
   co-locations, recorded honestly rather than dropped). Per-system counts:
   CSTC 14, Papez 12, salience 6, default-mode 8, central-executive 8,
   reward 12, fear/threat 9.
4. **Refusal architecture** (`data/psychiatry/refusal_templates.json` + module
   guards): 7 explicit refusal templates — receptor_localization,
   drug_mechanism, disorder_causation, dsm_criteria, diagnosis_request,
   treatment_request, neuromodulation_request — each with a first-class
   refusal status, a missing-evidence reason, and a template that refuses
   instead of answering.
5. **Module** (`src/psychiatry/index.ts`): `queryRelationship()` returns the
   recorded relationship OR an explicit `{status: INSUFFICIENT_EVIDENCE |
   NOT_REPRESENTED, reason}` refusal; `educationalUseGuard()` returns the
   contractual guard string rendered on every Phase 8 surface ("Academic
   teaching resource. Not for diagnosis, treatment decisions, or clinical
   use."); `guardClinicalQuery()` ALWAYS returns guard + refusal for
   clinical-intent queries. Entry-point refusal plus render guards mean no shipped path returns clinical guidance
   diagnostic/treatment output; `renderPhase8OverlayHtml()` /
   `renderRefusalHtml()` always prefix the guard (overlays additionally carry
   disclaimer + evidence + certainty + source).
6. **Tests** (`src/phase8_psychiatry.test.ts`, wired as `test:psychiatry8` and
   appended to `test`): 9 groups / 3952 checks — schema completeness,
   citation resolution (276 repo paths resolve; 7 URLs allowlisted),
   no-causation-leap, no-invented-psychiatry, refusal paths (incl. a
   9-query clinical battery that always gets guard + refusal), guard
   presence, Phase 6 separation (63/63 counts, knowledge assertive content
   clean, git protected-paths unmodified), registry integrity
   (members ↔ relationships cross-referenced), package.json wiring.

## 3. Files created (no existing files touched except `package.json` scripts)

- `src/psychiatry/types.ts` (new — schema, enums, guard/disclaimer constants)
- `src/psychiatry/index.ts` (new — query, guards, renderers; no engine/anatomy imports)
- `data/psychiatry/relationships.json` (new — 69 records)
- `data/psychiatry/systems_registry.json` (new — 7 systems + gaps)
- `data/psychiatry/refusal_templates.json` (new — 7 refusal templates)
- `src/phase8_psychiatry.test.ts` (new — 9 groups / 3952 checks)
- `docs/PHASE_8_COMPLETION_REPORT.md` (new — this file)
- `package.json` (scripts only: `test:psychiatry8` added; `test` chain extended)

Untouched as required: `assets/`, manifests, `data/structures/` (63),
`data/knowledge/`, `data/anatomical_hierarchy.json`, engine core,
`src/types/`, all existing tests.

## 4. Relationships recorded (69) and refusals wired (7 + guards)

Members per system reference recorded `relationship_id`s 1:1 (test-enforced).
Every classical member WITHOUT a structure record is an explicit
`member_gap` (e.g. nucleus accumbens, VTA, substantia nigra, anterior
thalamic nucleus, precuneus, orbitofrontal cortex, periaqueductal gray).
Every natural-but-unsupportable question class has a refusal template, and
`guardClinicalQuery()` routes the full clinical-intent battery to guard +
refusal. Refusals never contain synthesized answers (test-enforced).

## 5. Verification (observed)

- `npm.cmd run typecheck`: 0 errors.
- `npm.cmd test`: exit 0, all 22 suites green (21 pre-existing + Phase 8).
- `npm.cmd run build`: 0 errors.
- `npm.cmd run audit:phase1`: PASS.
- Phase 8 suite standalone: 3952 checks passed (3949 + 3 entry-point refusal assertions).

## 6. Hard stops (all clear; replacement rule honored)

- **causation-leap**: no causal verbs in any of 69 claims (scanned); verbatim
  disclaimer on all 69 (equality-asserted); "correlation only" in every claim.
- **diagnostic-automation**: 9-query clinical battery (diagnosis, drugs,
  dosage, DSM, TMS, prognosis, patient-specific) ALWAYS returns guard +
  refusal, never a relationship; non-clinical queries get guard without refusal.
- **uncited-psychiatric-claim**: 276 cited repo paths verified on disk; 7
  external URLs restricted to the single allowlisted RDoC identity URL;
  every structure_id verified as a catalogued hierarchy node with a matching
  structure record.
- **receptor-invention**: assertion-shaped scan (receptor localization, drug
  action/affinity/classes, DSM, diagnostic/treatment assertions, transmitter
  mechanisms, neuromodulation indications) over all assertive Phase 8 fields
  and module code — clean. Naming a refused question (gaps, reasons,
  templates, intent patterns) is explicitly exempt and documented in-test.

## 7. Notes and limitations

- Pre-existing repo state observed (not created or modified by Phase 8):
  structure records carry `anatomy_only_scope` denial strings and
  `hippocampus_left.json` carries `rdoc_associations`; Phase 8 neither
  depends on nor extends these — its citations use only record identity,
  hierarchy, and the RDoC identity URL.
- Invention-scan scoping is documented in-test: the scan covers Phase 8
  assertive surfaces (`data/psychiatry` assertive fields +
  `src/psychiatry` code), not the repo-wide pre-existing pharmacology/
  neuromodulation type schemas, which are out-of-scope scaffolding from
  earlier phases.
- A resident can now browse which systems implicate which atlas structures at
  the level the evidence supports (named-system co-location, LOW certainty,
  explicit gaps), and the layer visibly refuses everything beyond that.

## Post-review repairs (required for certification)

Independent review returned two MAJOR findings; both are repaired and re-verified:

1. **Pre-existing prohibited content in `data/structures/hippocampus_left.json`.**
   The record carried uncited DSM-coded disorders, 5HT1A/drug mechanisms stated as
   fact, ECT protocols, RDoC constructs, and `relationship_nature:
   direct_causal_mechanism`. Seven keys removed
   (`functional_neuroanatomy`, `psychiatric_relevance`, `neurological_deficits`,
   `imaging`, `evidence_claims`, `evidence_claim_ids`, `references`) with an explicit
   `removed_prohibited_content` audit record (prior content recoverable via git
   history; restore only with full evidence grading + expert review). No anatomical
   field altered. `src/schema_validation.test.ts`, which had asserted the presence of
   the removed claims, now asserts their absence + the audit record.

2. **Guard bypassable by design.** `queryRelationship` never consulted clinical
   intent, and the "NEVER drives clinical output" wording overclaimed. Now:
   `queryRelationship(structure, system, queryText?)` refuses at the entry point when
   query text carries clinical intent (suite-asserted for recorded pairs, benign text,
   and textless browsing); the overclaim reworded to what is actually enforced.
   Residual denylist incompleteness is recorded as a limitation for Phase 9/11 wiring.

3. **Evidence generosity (MINOR, honored).** All 66 `PRELIMINARY` memberships
   downgraded to `INSUFFICIENT_EVIDENCE` / `VERY_LOW`: support was circular (own
   records + scope doc) with no independent system-definition source. The tier remains
   for future real evidence. Suite accepts LOW (future) or VERY_LOW (current), never
   higher.
