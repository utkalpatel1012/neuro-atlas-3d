# ACTIVE PHASE: 5.2 — Brainstem + Cerebellum + Ventricular System

## Objective

Source-backed gross brainstem (midbrain/pons/medulla), cerebellum
(hemispheres/vermis/gross lobules), and ventricles (lateral/third/aqueduct/
fourth/foramina) via the controlled ingestion pipeline. No fabricated fine
nuclei; no fictional boundaries.

## Scope

Per `PHASE_REGISTRY.json` phase 5.2 `allowedScope`. Anatomy-only substrate;
no functional/psychiatric content.

## Current risks

- Ventricular spaces are cavities, not tissue — must use a distinct category
  and honest representation (no solid-tissue rendering of a cavity).
- Brainstem continuity must not be arbitrarily split for label convenience.
- Fine cerebellar lobules must not be fabricated from gross meshes.
- Foramina only where authoritative geometry exists.

## Required reviewers

neuroanatomy-reviewer, provenance-license-reviewer,
graphics-performance-reviewer, software-architecture-reviewer,
final-certifier.

## Acceptance criteria

Per registry 5.2 `successCriteria` + standard gates (tests, typecheck, build,
asset validation, audits, reviews, docs, focused commit, push verified,
tree clean).

## Expected outputs

`docs/PHASE_5_2_ANATOMICAL_SCOPE.md`, batch ingestion + QA ledgers, structure
records, hierarchy update, phase tests, `docs/PHASE_5_2_*.md`,
`PHASE_5_2_COMPLETION_REPORT.md`, review reports, commit
`feat(phase-5.2): add brainstem, cerebellum and ventricular anatomy`.
