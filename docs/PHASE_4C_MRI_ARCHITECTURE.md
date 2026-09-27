# Phase 4C MRI Architecture (verified reference integration foundation)

**Status:** implemented, headless-tested (103 checks), device-UNVERIFIED.
Reference volume SELECTED (Colin27 1998 T1); canonical registration
REGISTRATION_PENDING → production overlay DISABLED by construction. No HCP,
no Julich/BigBrain runtime, no parcellation, no psychiatry, no diagnostics.

## Dataset strategy

`docs/MRI_SOURCE_SELECTION.md` (authoritative sources, 2026-09-27): Colin27
1998 original T1 selected (Type A reference) — permissive Collins/MNI license
with attribution, Talairach 1 mm, NIfTI, header-measured geometry, no PHI.
MNI152NLin2009cAsym via TemplateFlow retained as the DEFERRED Type B
registration-target candidate (license text retrieved, release pin pending).
NC datasets stay quarantined; per-release-DUA datasets unevaluated this phase.

## Licensing

Colin27: VERIFIED for educational reference use with copyright-notice
attribution (rendered in-app via the provenance panel + cited in-docs).
TemplateFlow MNI copy: LEGAL_REVIEW_REQUIRED before any production use. No
license reinterpreted; uncertain volumes never enter production (§5, §39).

## Voxel space

Integer (i,j,k) indices into a 3D grid. Colin27 measured: 181×217×181,
float32, 1.0 mm isotropic. Voxel indices are NEVER millimeter coordinates
(§8); L/R/A/P/S/I are NEVER inferred from index order (§10).

## World space

Dataset-declared frame via the authoritative NIfTI transform (§9): sform wins
when present (Colin27: sform code 1, qform 0 → sform governs); otherwise qform
is derived; otherwise the file is REJECTED. Colin27 measured world mapping:
world = voxel + (−90, −126, −72), frame Talairach — NOT MNI, never relabeled.

## Canonical space

UNCHANGED (§11): internal +X Right, +Y Superior, +Z Posterior, mm. Not MNI.

## Transforms

`src/engine/mriVolume.ts` (dependency-free 4×4 row-major math, unit-tested):
voxel→world (from header) → MRI-world→canonical (registration, PENDING) →
canonical plane → voxel plane (`canonicalPlaneToVoxel`). Direction explicit
(§13); NaN/Infinity/singular rejected (§17, §38); round-trip error measured
on synthetics (§16; no clinical threshold claimed).

## Registration

Planned method recorded in `data/mri_registration.colin27_1998.json`: rigid
6DOF from commissural/landmark correspondences with TRE measurement; affine
only if rigid residuals demand it; nonlinear NOT justified. Current status
REGISTRATION_PENDING with NULL metrics (§14); expert review
EXPERT_REVIEW_PENDING (§15). `COMPUTATIONALLY_REGISTERED` is used only when a
real computation lands with method + validation recorded.

## Slice generation

`src/engine/mriSlice.ts`: trilinear CPU sampler + exact axis extraction
(sagittal→voxel-X, coronal→voxel-Z, axial→voxel-Y per mapped normal) +
bounded general resampler covering oblique planes (§21–§22, one robust path).
Out-of-volume → NaN background (neutral, not error). Allocations bounded
(≤2048² px). Intensities carry NO anatomical labels (§32).

## Mesh synchronization

`src/engine/MriManager.ts`: the SAME canonical plane drives GPU mesh clipping
(4A, untouched) and slice sampling (§20). Modes MESH_ONLY/MRI_ONLY/SPLIT/
OVERLAY (§30) with independently controlled visibility/opacity (§31).
Event-driven refresh (plane/display/volume changes, 0.5 mm quantization);
volumes never resampled wholesale per slider tick (§23).

## Rendering

Slice → window/leveled Uint8 → single `THREE.DataTexture` (R8) on a
canonically-placed plane mesh (grayscale, depthWrite off for overlay).
WebGL2 path + WebGPU code-identical material path; DEVICE-UNVERIFIED.
Window/level is presentation state; source data never altered (§29).

## Memory

ONE resident volume max; slice cache LRU-3; explicit texture/geometry disposal
(§24–§25, §35). Budget helper labels MEASURED (header) vs ESTIMATED (formula)
vs UNKNOWN (device). Colin27 floats: 28.4 MB MEASURED uncompressed; no VRAM
claimed. Lazy fetch only — never at startup (§26).

## Streaming

Prepared, not yet needed: single-T1 lazy load fits the discipline with the
above bounds; tile/slice streaming is the documented fallback if larger
volumes arrive (§26). No volume bytes in git (§27): URL + SHA-256 recorded.

## Error states

Corrupt/unsupported header, datatype, spacing, missing transform, geometry
mismatch, unregistered overlay request, unlicensed production, texture failure,
unsupported renderer → explicit refusal reasons; overlay disabled, never
approximate (§38–§39). Neutral UI strings (e.g. "MRI volume selected but data
not loaded") — never "no anatomy exists".

## Limitations

Registration uncomputed (overlay off); browser/iPad/WebGPU-device unproven;
single-subject template (no population variance); field strength UNKNOWN;
orientation labels beyond axis metadata not established. See L16.

## Future extensions

Rigid registration computation + TRE → overlay enablement; TemplateFlow MNI
pin as Type B target; tiled streaming; GPU-resident multi-slice; parcellation
as a separate later layer (never voxel-intensity labels).
