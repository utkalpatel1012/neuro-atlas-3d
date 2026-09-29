# Phase 6 Completion Report — Anatomical knowledge + search

## Objective (registry)

Authoritative info layer (names/Latin/aliases/hierarchy/ontology/boundaries/
neighbors/vascular relations/sources/evidence) + high-performance search
QUERY→STRUCTURE→SELECTION→DETAIL. Knowledge-evidence reviewer mandatory.
No psychiatric claims unless authorized.

## Outcome

137 knowledge records (63 AVAILABLE + 74 DOCUMENTED), 555 claims — every one typed
(DISTRIBUTION/RECORD/ONTOLOGY-verified-only), sourced, cited, evidence-graded.
**0 LITERATURE claims**: no corpus exists in-repo, so nothing is asserted from
general knowledge; every gap is explicitly recorded, not silently absent.
FMA 59 VERIFIED / 4 UNVERIFIED (honest mismatch marking, never invented).

Search: hand-rolled precision-first ranker (no new dependencies), official names +
aliases + abbreviations + Latin + hierarchy + laterality. Nonsense and psychiatry
queries resolve to nothing. DOCUMENTED nodes searchable, marked geometry-free.

UI: query → ranked results → select + focus 3D entity (existing pipeline reused, no
duplicated camera/selection system) → detail panel with per-claim source + citation
+ evidence. DOCUMENTED selection shows known-vs-not-meshed with no camera move.

## Success criteria — evidenced

- **Typed cited knowledge layer:** 555/555 claims complete; 933/933 cited repo paths
  resolve on disk; 0 invented citations (no DOI/PMID/ISBN strings anywhere).
- **Working search→selection:** exact/alias/prefix/token/substring/hierarchy tiers,
  laterality-gated, capped at 25; verified by trace + 7206-check suite.
- **All suites green:** 20/20, Phase 6 suite 7206 checks; typecheck, build,
  audit:phase1 pass.
- **Docs + limitations:** scope, this report, precision notes, per-record gaps.

## Separation (hard stops held)

Zero psychiatry/RDoC/network/receptor/pharmacology content in knowledge, search, or
UI (assertive-content scan: 0 hits; denials excluded by design). Anatomy-function
conflation: none — behavior/physiology/clinical topics are gapped, never asserted.

## Review

Knowledge-evidence, neuroanatomy, and architecture reviewers: all PASS_WITH_MINOR
NOTES, zero CRITICAL/MAJOR. No test weakened; no duplicated systems; no new
dependencies (`minisearch` stays absent); builder deterministic (local-only,
re-runnable, no network/absolute paths).

## Open / deferred

- L21 unchanged, open for human decision.
- MINOR: upstream-URL granularity; display-name derivation rule; hierarchy-panel
  helper scope note; CSS/scripts-only additions outside strict allowedScope wording.

## Not claimed

No expert review, no clinical validity, no licence clearance, no device validation,
no literature-backed facts beyond the repo's own records, no psychiatry. Phase 7+ excluded.
