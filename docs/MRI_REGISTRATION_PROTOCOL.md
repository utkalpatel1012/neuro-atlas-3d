# MRI Registration Protocol (reusable, Phase 4D §34)

Mandatory sequence for ANY future MRI registration in this atlas. Skipping a
step is a defect; guessing through a blocker is fabrication.

## 1. SOURCE VERIFICATION

Confirm dataset, version/release, source organization, URL, acquisition type,
subject/template status, modality, license text snapshot + verification date,
redistribution terms, file size, SHA-256 of the exact artifact. Record in
`data/mri_volumes.json`. License uncertain → LEGAL_REVIEW_REQUIRED, no
production use. PHI check on headers (descrip/aux/intent, no DICOM) → any
identifier aborts the integration.

## 2. COORDINATE VERIFICATION

Parse the file header (never the filename): dims, datatype, spacing (>0,
finite), qform/sform codes. Authoritative rule: sform > qform > REJECT.
Record world frame as dataset-declared (never assume MNI; never infer
orientation from index order). Canonical space is immutable.

## 3. LANDMARK VERIFICATION

Collect candidate corresponding fiducials (commissures, midline structures,
reproducible points). REJECT: schematic/unvalidated anchors, structure
centroids as point correspondences, visually-estimated points without method.
Every kept landmark records: id, name, space, mm coordinates, provenance
(method + source ref + manual/algorithmic flag), uncertainty or NULL, role
(registration vs validation). Insufficient genuine landmarks → STOP with
REGISTRATION_PENDING (document the investigation).

## 4. REGISTRATION

Rigid 6-DOF first (Horn/Kabsch-class, reproducible code or documented
software + version + command + config + inputs + date). Affine only with
residual justification; nonlinear only with explicit scientific justification
+ validation. Record: rotation/translation (rigid) or full matrix + scale/
shear (affine), determinant, orthogonality, handedness. Reject NaN/Infinity/
singular/reflections-unjustified. Version as
`registration.<dataset>.to.canonical.vN`; never silently replace.

## 5. INDEPENDENT VALIDATION

TRE over validation-role landmarks disjoint from estimation (overlap counted,
never double-used). <3 independent → LIMITED_VALIDATION, no strong claims.
Check invertibility + orientation consistency. Dice across representations is
NOT appropriate. Metrics computed or NULL — never illustrative.

## 6. EXPERT REVIEW

EXPERT_VALIDATED only after documented review (named reviewer + date +
scope). Otherwise EXPERT_REVIEW_PENDING — integration may proceed, claims may
not expand.

## 7. RUNTIME ENABLEMENT

Overlay requires: LICENSE VERIFIED + WORLD TRANSFORM VALIDATED +
REGISTERED_TO_CANONICAL + REGISTRATION_VALIDATED + valid non-singular
non-mirroring matrix (enforced in `canOverlayWithMesh`). Statuses shown
individually in the provenance panel; educational wording only
(pending/computed/validated tiers). Canonical planes drive mesh + MRI;
bookmarks stay logical; GPU resources explicitly managed.
