# Autonomous Protocol (supervisor operating manual)

## State machine

DISCOVER → BASELINE → PLAN → IMPLEMENT → TEST → REPAIR → INDEPENDENT_REVIEW
→ REPAIR_REVIEW → CERTIFY → COMMIT → PUSH → VERIFY_REMOTE → ADVANCE →
NEXT_PHASE. Failure routes: TEST_FAIL→REPAIR, REVIEW_FAIL→REPAIR,
SCIENTIFIC_BLOCKER→HUMAN_REVIEW_REQUIRED, LICENSE_BLOCKER→
HUMAN_REVIEW_REQUIRED, UNRECOVERABLE_SOFTWARE_FAILURE→BLOCKED.

## Per-phase loop (§11)

A. Read repository (never trust summaries). B. Read phase spec (registry +
roadmap). C. Verify previous phase (rerun key gates; do not replay work).
D. Implementation plan. E. Implement (scope-locked). F. Tests. G. Repair
(≤5 cycles, then AUTOMATED_REPAIR_EXHAUSTED). H. Independent reviewers
(fresh agents, preserved reports). I. Repair findings. J. Full validation.
K. Completion report. L. Git review. M. Commit (registry message). N. Push.
O. Verify remote. P. Certify (final-certifier PASS). Q. Advance state.

## Safety (non-overridable)

Git: never `reset --hard` / `clean -fd` / history rewrites; pre-existing
user changes → USER_WORKTREE_CHANGES_PRESENT + stop. Locks:
SUPERVISOR.lock (PID/startedAt/machine); second instance refuses to start.
Crash: leave INTERRUPTED, re-read Git before resume. Logs: compact summaries
committed, large logs local/ignored. No secrets/PHI in Git/logs/reports/state.
Scientific/license/coordinate/anatomy/privacy uncertainty → stop with
HUMAN_REVIEW_REQUIRED.md (problem/evidence/why/ files/phase/options/needed).

## Invocation

OpenCode engine: if an `opencode` CLI exists, probe `opencode --version`,
`opencode --help`, `opencode run --help` and use only verified flags
(prefer non-interactive + machine-readable output). If no CLI exists (as at
bootstrap on 2026-09-27: no binary on PATH), execution runs inside the
OpenCode agent session via subagents driven by this repository state — the
session IS the implementation engine, and this protocol still governs it.
Never hard-code unverified CLI flags.

## Reporting

`AUTONOMOUS_STATUS.md` dashboard (ENGINEERING_ESTIMATE percentages only).
`HEARTBEAT.json` per run. Phase artifacts: completion report + docs +
`.opencode/reviews/`. Tags `phase-X-Y-certified` post-certification.
Branches `autonomous/phase-X-Y` per major phase; never silently overwrite main.
