# Phase 7 Completion Report — Cortical Parcellation (Documented Deferral)

**Phase**: 7 (Cortical parcellation) · **Outcome**: DOCUMENTED DEFERRAL (no geometry)
**Branch**: `autonomous/phase-7` · **Scope authority**: `docs/PHASE_7_ANATOMICAL_SCOPE.md`
**Registry**: `.opencode/workflow/PHASE_REGISTRY.json` phase 7 entry
**Date**: 2026-09-29 · **Commit**: none (uncommitted working tree, per instruction)

## 1. Objective (registry)

Separate physical cortex from atlas parcellation (HCP MMP 1.0 / Brodmann /
verified others only). Verify exact source/version/license first; HCP legal
gate in force; never map parcels onto BodyParts3D geometry without a verified
registration/mapping method.

## 2. Outcome: documented deferral with reason (registry-explicit alternative)

The registry permits "physically-separated parcellation OR documented deferral
with reason". The source reality (`docs/PHASE_7_ANATOMICAL_SCOPE.md`) forces
the second alternative:

- **HCP MMP 1.0**: HCP Open Access Data Use Terms require formal legal review
  before any import (standing policy, `docs/PRODUCTION_DATASET_LICENSE_MATRIX.md`).
  No legal review has occurred. **No HCP bytes ingested.**
- **Brodmann**: classical BA 1–52 originate from published maps, not from a
  single downloadable geometry release with a clean license chain available to
  this project. No verified source/version/license triple. **No Brodmann
  geometry ingested.**
- **Mapping method**: none verified. Projecting parcels onto BodyParts3D
  segments by visual approximation is explicitly prohibited and was not attempted.

Delivered instead:

1. **Data model** (`src/types/parcellation.ts`): `ParcelAtlas` (`HCP_MMP1`,
   `Brodmann`, extensible via `string & {}` tail), `ParcelRecord` (id, atlas,
   version, license posture, mapping state), `MappingState =
   'MAPPING_PENDING' | 'MAPPED_VERIFIED'` (exactly these two; nothing ships
   as `MAPPED_VERIFIED`). `entity_type: 'cortical_parcel'` discriminant keeps
   parcels non-interchangeable with `AnatomicalStructure`.
2. **Separation enforcement** (`src/parcellation/mappingGate.ts`):
   `isMappingAllowed()` (false — zero verified mapping records),
   `assertMappingAllowed()` / `guardParcelRender()` (throw
   `ParcelMappingBlockedError`; the guard is the mandatory entry point for any
   future render path).
3. **Records** (`data/parcellation/atlas_registry.json`,
   `data/parcellation/deferral_record.json`): bibliographic identity only,
   honest statuses (`LEGAL_REVIEW_REQUIRED` unversioned for HCP;
   `SOURCE_UNVERIFIED` for Brodmann), per-atlas unblock conditions plus shared
   registration-method + QA conditions.
4. **Tests** (`src/phase7_parcellation.test.ts`, wired as `test:parcellation7`
   and appended to `test`): 7 test groups covering registry honesty, zero
   parcel geometry (filename + payload scan over `assets/` + `data/`),
   closed mapping gate, intact HCP gate, two-direction type separation
   (compile-time `@ts-expect-error` + run-time guards), deferral completeness,
   and untouched structure/manifest counts (63/63).

No parcel is rendered, no parcel is mapped, no parcel geometry ships.

## 3. Files created (no existing files touched except `package.json` scripts)

- `src/types/parcellation.ts` (new — parcellation types + guards)
- `src/parcellation/mappingGate.ts` (new — closed mapping gate + render guard)
- `src/parcellation/index.ts` (new — module barrel)
- `src/phase7_parcellation.test.ts` (new — Phase 7 suite)
- `data/parcellation/atlas_registry.json` (new — honest atlas statuses)
- `data/parcellation/deferral_record.json` (new — deferral + unblock conditions)
- `docs/PHASE_7_COMPLETION_REPORT.md` (new — this report)
- `package.json` (new `test:parcellation7` script only + `test` chain inclusion)

Untouched as required: `assets/`, manifests, structure/hierarchy records,
engine core, all existing tests.

## 4. Verification (observed)

- `npm.cmd run typecheck`: exit 0, 0 errors.
- `npm.cmd test`: exit 0 — all 21 suites green (20 existing + new Phase 7 suite).
- `npm.cmd run build`: exit 0.
- `npm.cmd run audit:phase1`: PASS.

## 5. Hard stops — observed, none tripped

- No parcel geometry ingested (scan-asserted over `assets/` + `data/`).
- No parcel mapping claimed (nothing `MAPPED_VERIFIED`; gate closed).
- No HCP terms accepted or circumvented (`terms_accepted: false`, no record).
- No Brodmann source invented (`SOURCE_UNVERIFIED`, no release claimed).

If any of the above had been tempting, the instruction was to STOP and record
instead — nothing required stopping: the deferral path was the authorized
outcome from the start.
