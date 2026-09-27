# Skill: release-certification

Certify a phase and publish it through the single deployment mechanism.

## Checklist (all must hold; see GATE_REGISTRY.json)

- Acceptance criteria evidenced (registry + completion report).
- Tests/typecheck/build/asset-validation/audits green with exact results.
- final-certifier PASS (read-only, independent).
- No prohibited language; geometry hashes unchanged (audit phases);
  manifest membership matches the phase plan.
- ONE focused commit (registry message); tag `phase-X-Y-certified` post-pass.
- Push; LOCAL HEAD == REMOTE HEAD; tree clean.
- Deploy ONLY via the recorded source of truth (`npm run deploy` →
  `gh-pages` branch; the Actions `deploy-pages` workflow is known-broken —
  do not create a competing method).
- Post-deploy: live manifest count, runtime asset HTTP 200s, correct bundle
  hash in live HTML, canvas buffer == CSS × DPR (visual-quality gate).

## Rules

- Never certify on partial execution; report exact numbers, never "all pass"
  without the runs.
- Metrics labeled MEASURED / ESTIMATED / NOT_MEASURED; device claims need
  device evidence.
- Historical reports immutable — corrections via new superseding documents.
