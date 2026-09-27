# Autonomous Control (user-facing)

Run from the repository root in Windows PowerShell 5.1:

- `scripts\autonomous-supervisor.ps1 -Mode Status` — print current state.
- `scripts\autonomous-supervisor.ps1 -Mode DryRun` — show what would run
  (no modifications, no commits).
- `scripts\autonomous-supervisor.ps1 -Mode Once` — execute the current
  phase once.
- `scripts\autonomous-supervisor.ps1 -Mode Continue` — continue current
  phase until CERTIFIED or BLOCKED.
- `scripts\autonomous-supervisor.ps1 -Mode RunAll` — execute all remaining
  phases until FINAL_PROJECT_CERTIFIED, HUMAN_REVIEW_REQUIRED, or BLOCKED.
- `scripts\autonomous-supervisor.ps1 -Mode Resume` — resume from
  `PROJECT_STATE.json` exactly where the last run stopped.

Safety: START/PAUSE/RESUME/STOP-AFTER-CURRENT are honored between phases
(`AUTONOMOUS_CONTROL.md` flag respected: create `STOP_AFTER_CURRENT` file to
pause after the active phase). RESET ONLY FAILED PHASE is supported via
`-Mode ResetFailed` (clears attempt counters, never deletes user work).
No command destroys user work; destructive Git commands are forbidden.
