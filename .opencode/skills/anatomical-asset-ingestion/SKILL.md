# Skill: anatomical-asset-ingestion

Ingest anatomical geometry through the controlled pipeline. Reuse the
proven Phase 5.0/5.1 pattern: scope doc FIRST, then batch.

## Pipeline (each stage independently testable)

1. SOURCE RESEARCH: dataset, release/version, URL, identifier, license,
   attribution, coordinate system, population/reference, scope. Mirror
   parts against the distribution list; verify Z-Anatomy-equivalent
   derivatives are never preferred over primary sources.
2. SCOPE DOC (`docs/PHASE_X_Y_*_SCOPE.md`): structure/priority/source/
   availability/license/coordinates/geometry/batch/reason/limitations.
3. PREP: stage bytes + `ingestion.json` (both schema conventions where the
   pipeline requires), hash-verify vs authority, measured laterality check
   (transform-aware, never filenames alone).
4. RUN: topology measurement → profile selection → 6-stage pipeline →
   verdicts (RUNTIME_READY / REVIEW_REQUIRED / REJECTED with reasons).
   Rejections are valid outcomes; never repair geometry by editing meshes.
5. RECORDS: lean anatomy-only structure JSONs (FMA distribution IDs;
   TA2/UBERON UNVERIFIED); hierarchy catalog AVAILABLE vs DOCUMENTED.
6. INTEGRATE: manifest (single, authoritative), on-demand loading, existing
   selection/clipping/LOD/isolation/bookmarks systems (no second systems).
7. VERIFY: hash chains, mirror signs, containment, LOD monotonicity,
   legacy-entries identical.

## Rules

- Same-source additions preferred; new sources need explicit transforms.
- Per-asset licenses; uncertainty → LEGAL_REVIEW_REQUIRED (never resolve law
  by editing JSON). Banned terms never enter live metadata.
- No invented nuclei/subdivisions; gross boundaries only as sourced.
- Default loaded set unchanged (avoid double-rendered overlaps).
- Geometry states honest: REJECTED/REVIEW_REQUIRED paths must exist and work.
