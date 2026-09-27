# Skill: phase-execution

Execute one registered phase through the full state machine:
DISCOVER → BASELINE → PLAN → IMPLEMENT → TEST → REPAIR (≤5 cycles) →
INDEPENDENT_REVIEW → REPAIR_REVIEW → CERTIFY → COMMIT → PUSH →
VERIFY_REMOTE → ADVANCE.

## Rules

- Authority is `.opencode/workflow/PHASE_REGISTRY.json` (scope, evidence,
  tests, reviewers, stops, commit message, next phase) plus
  `AUTONOMOUS_DEVELOPMENT_ROADMAP.md`. Never freelance scope.
- Baseline first: record suite/check counts before changing anything.
- Repair loop: max 5 automatic cycles per failure class, then
  `AUTOMATED_REPAIR_EXHAUSTED` + exact blocker (no infinite loops).
- Scientific/license/coordinate/anatomy/privacy uncertainty → STOP with
  `HUMAN_REVIEW_REQUIRED.md` + state status (never guess through).
- Certification requires final-certifier PASS; implementing agent never
  self-certifies a major phase.
- One focused commit per phase (registry `commitMessage`); tag
  `phase-X-Y-certified` only after certification; advance state only when
  LOCAL HEAD == REMOTE HEAD and tree is clean.
- Never: `reset --hard`, `clean -fd`, history rewrites, user-work deletion.
