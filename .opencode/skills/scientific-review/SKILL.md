# Skill: scientific-review

Orchestrate independent review for a phase and adjudicate findings.

## Procedure

1. Select reviewers from the phase registry (`requiredReviewers`).
2. Run each reviewer as an INDEPENDENT agent (fresh context, read-only
   instruction, file:line evidence required, PASS/FAIL per item).
3. Preserve reports to `.opencode/reviews/phase-X-Y-<role>.md` verbatim.
4. Triage: critical/major → must-fix (implementing agent repairs, re-review
   the affected items); minor/observation → fix if in-scope, else record
   with reason in the completion report.
5. A phase cannot advance with any unresolved critical/major finding.
6. Knowledge phases (6+): knowledge-evidence-reviewer is mandatory; verify
   claim typing, citations, and anatomy/function separation.

## Rules

- Reviewers never modify implementation; implementers never certify.
- Findings about banned terminology, invented metrics/citations, scope
  expansion, or weakened tests are always critical.
- Device/browser/GPU claims require physical/device evidence to pass.
