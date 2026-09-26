# MRI / Reference-Data Strategy for Phase 4 (Phase 3.2, Gate 3 — ANALYSIS ONLY)

**Status:** requirements DEFINED; acquisition DEFERRED. No MRI downloaded, no imaging
library added, no volumetric data integrated. MNI stays separate from canonical space
(§9): any future registration is CANONICAL → VERIFIED TRANSFORM → MNI, never a rename.

## 1. What Phase 4 actually requires (A–E distinguished)

| Need | Required? | Purpose |
|---|---|---|
| A. Anatomical reference MRI (single-subject, high-detail) | YES (deferred) | Visual co-display + section-plane validation backdrop for clipping views |
| B. Template MRI (population average, e.g. MNI152-class) | YES (deferred) | Registration TARGET only; never replaces canonical geometry |
| C. Volumetric atlas (labels in voxel space) | NO (not Phase 4) | Deferred beyond Phase 4 |
| D. Subject-specific MRI | NO | Explicitly out of scope (atlas is normative/educational) |
| E. Educational visualization only | YES (current) | Everything must serve teaching, not diagnosis/surgery (see disclaimer) |

## 2. Hard requirements for any future candidate

- Spatial resolution: ≤1 mm isotropic preferred (section planes at mm scale).
- Coordinate space: must ship with a documented template space + version (e.g.
MNI152NLin2009cAsym with release ID); raw scanner space unacceptable without provenance.
- Registration requirements: derive a VERIFIED canonical→template transform (phantom/
fiducial-checked, TRE recorded) BEFORE any overlay; unregistered overlay prohibited.
- File formats: NIfTI (.nii.gz) preferred; no DICOM archives in git; size budget TBD
in Phase 4 plan (large volumes need streaming/tiled strategy first).
- License requirements: production-compatible ONLY with redistribution + commercial
terms verified in writing; NC/SA-ambiguous sources stay RESEARCH_ONLY.

## 3. Candidate table (metadata only — nothing acquired)

| Candidate | Type | License (as understood; verify before use) | Production-compatible? | Legal review? | Verdict |
|---|---|---|---|---|---|
| MNI152 ICBM 2009c Nonlinear Asymmetric (template) | B | Redistribution terms version-dependent (ships inside FSL/SPM ecosystems under their licenses) | UNKNOWN | REQUIRED | DEFERRED — verify exact file provenance + terms first |
| Colin27 single-subject average | A/B | Package-dependent terms | UNKNOWN | REQUIRED | DEFERRED |
| FreeSurfer fsaverage (+ surfaces) | B/surface | FreeSurfer custom license (research-oriented, terms apply) | UNKNOWN | REQUIRED | DEFERRED |
| BigBrain 20µm | A/C | CC-BY-NC-SA (NC!) | NO | N/A (quarantined) | RESEARCH_ONLY (existing quarantine stands) |
| Julich-Brain cytoarchitecture | C | CC-BY-NC-SA (NC!) | NO | N/A (quarantined) | RESEARCH_ONLY (existing quarantine stands) |
| HCP S1200 / MMP surfaces | B/parcel | HCP Open Access Data Use Terms | UNKNOWN | REQUIRED | DEFERRED (parcels explicitly out of Phase 4) |
| OASIS / IXI / ADNI-class open MRI | A | Varies by release; check per-release DUA | UNKNOWN | REQUIRED | DEFERRED — evaluate against §2 when needed |

## 4. Explicit statement

**No MRI dataset is yet safe to integrate.** The table above is a shortlist for
Phase 4 planning, not an approval. Any future import must attach: source, exact
version/release, license text snapshot + verification date, attribution, transform
provenance, and a quarantine decision — before a single voxel enters the repo.
Importing an unsuitable dataset to "satisfy a checkbox" is prohibited.
