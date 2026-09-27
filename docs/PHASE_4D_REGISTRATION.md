# Phase 4D Registration (MRI-world → canonical atlas)

**Status:** pipeline IMPLEMENTED + headless-tested (64 checks); production
registration REGISTRATION_PENDING (no computation performed on production
data — documented below, not hidden). Overlay GATED_OFF. No HCP/Julich/
parcellation/psychiatry/diagnostics.

## Registration objective

Establish the traceable chain MRI voxel → MRI world → verified registration
→ canonical atlas → shared section plane → synchronized mesh + MRI view
(§20). The objective is traceability, not visual alignment.

## Source

Colin27 1998 original T1 (`volume.mri.colin27_1998.v1`; see
`docs/MRI_SOURCE_SELECTION.md`, `data/mri_volumes.json`). Inputs to any future
computation are immutable references: file SHA-256 recorded in the registry;
canonical mesh geometry versioned in `assets/manifests/assets.manifest.json`.

## Coordinate systems

Voxel-index → Talairach MRI-world (measured sform) → internal canonical
(+X R, +Y Superior, +Z Posterior — NOT MNI, NOT RAS-ordered). Canonical space
unchanged. Talairach coordinates are never called MNI (§1).

## Landmark selection

No computation was performed because no genuine correspondences exist (§5
investigation, recorded here): canonical structure centroids are validated
GEOMETRY but not homologous fiducials (centroid ≠ landmark; cortex is a
partial multi-shell composite, L1); the canonical origin is an asserted
approximation (L3); the Colin27 file ships no commissural coordinates; the
atlas schematic anchors are explicitly unvalid and forbidden as inputs (§6).
Using any of these would fabricate correspondence. Status: insufficient
genuine landmarks → computation STOPPED per §1/§39.

## Computation

Reproducible pipeline implemented in `src/engine/mriRegistration.ts` and
proven on TEST_ONLY_SYNTHETIC data (recovery error ~1e-14): provenance-gated
landmark pairing → Horn rigid 6-DOF via exact Jacobi eigensolve (rank ≥ 2
degeneracy gate; orthonormality + det +1 + handedness post-proofs) →
fitting residual reported as residual (never TRE). Affine/nonlinear NOT
implemented (unjustified deformation prohibited, §5). External software path:
none executed; protocol specifies ANTs-class rigid with recorded
command/config when a future session runs it (§10).

## Transform

Direction MRI-world → canonical, row-major 4×4, units mm, stored with
input/output space + convention (§8–§9). Inverse derived mathematically when
needed; renderer mapping verified by test (no silent inversion). Production
matrix: NULL.

## Validation

Independent-landmark TRE protocol implemented (§11–§12): estimation ≠
validation sets (overlap excluded and counted); <3 independent landmarks →
LIMITED_VALIDATION; invertibility + orientation consistency reported; Dice
NOT used across representations. Uncertainty NULL/NOT_MEASURED (§13).
Expert review EXPERT_REVIEW_PENDING (§14).

## Overlay gating

Phase 4C.1 correction ENFORCED in `canOverlayWithMesh`: LICENSE VERIFIED +
WORLD TRANSFORM VALIDATED + REGISTERED_TO_CANONICAL + REGISTRATION_VALIDATED
+ valid non-singular non-mirroring MRI→canonical matrix (§3, §18). Current
Colin27 record fails at REGISTRATION_PENDING → overlay GATED_OFF. UI statuses
use the mandated educational wording (§27); no expert implication (§18).

## Section synchronization

Canonical plane authoritative (§20): plane → inverse registration → MRI world
→ voxel (tested sagittal/coronal/axial/oblique + inverse). Mesh multi-plane
clipping stays intersection-of-half-spaces; MRI renders the active selected
plane only (§24). Bookmarks logical/state-based (§25). Labels stay
entity-tied; schematics gain no MRI status (§36 in 4C).

## Performance

No per-frame registration math: static transforms precomputed, inverses
cached by construction (pure-function memo at call sites), slice sampling on
plane-change events only (§28). No device measurements claimed (§29).

## Limitations

Registration uncomputed (see investigation above); device display unproven;
single-subject template; UNKNOWN field strength. See L16–L17.
