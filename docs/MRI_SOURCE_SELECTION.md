# MRI Source Selection (Phase 4C §3–§5)

**Method:** authoritative sources only (provider pages, repository LICENSE files,
measured file headers). Third-party summaries were used only to locate providers.
**Verification date:** 2026-09-27 (Phase 4C session). License snapshots are quoted
verbatim below; "permissive" below means ONLY what the quoted text grants.

## Candidate 1 — Colin27 1998 original (SELECTED, Type A reference)

- Dataset name: Colin 27 Average Brain, Stereotaxic Registration Model, original 1998 version
- Version/release: 1998 original (Holmes et al. 1998); file `colin27_t1_tal_lin.nii`
- Source organization: McConnell Brain Imaging Centre (BIC), Montreal Neurological Institute, McGill University
- URL: `http://packages.bic.mni.mcgill.ca/mni-models/colin27/mni_colin27_1998_nifti.zip` (linked from `http://www.bic.mni.mcgill.ca/ServicesAtlases/Colin27`)
- Acquisition type: 27 T1-weighted scans of ONE normal individual (CJH), linearly registered and averaged (two-pass); resampled on a 1 mm stereotaxic grid
- Subject/template status: single-subject average — high definition, does NOT capture population variability (documented limitation, not a defect)
- Field strength: NOT DOCUMENTED by provider (recorded as UNKNOWN, not assumed)
- Modality: T1-weighted MRI (average t1w scan; archive also carries brain + head masks)
- Voxel dimensions (MEASURED from downloaded file header, 2026-09-27): 181 × 217 × 181, float32, 1.0 mm isotropic
- Orientation convention: file sform (code 1) authoritative (qform 0 = absent); rotation is identity with offset (−90, −126, −72); voxel index order alone is NOT used for L/R/A/P/S/I claims
- World-coordinate definition (MEASURED): world = voxel + offset (x −90…90, y −126…90, z −72…108 mm); frame is Talairach stereotaxic (NOT MNI — provider states linear registration to average305; do not relabel as MNI)
- Template space: Talairach stereotaxic space (provider-declared)
- Licensing (verbatim snapshot from provider page): "Copyright (C) 1993–2009 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Permission to use, copy, modify, and distribute this software and its documentation for any purpose and without fee is hereby granted, provided that the above copyright notice appear in all copies."
- Redistribution terms: use/copy/modify/distribute for any purpose + fee-free, conditional ONLY on reproducing the copyright notice (attribution mechanism implemented as provenance panel + docs citation)
- Intended academic/educational use: Type A high-detail single-subject reference backdrop for section-plane co-display (strategy Need A); explicitly NOT a registration target for population work, NOT subject-specific diagnosis
- File size (MEASURED): zip 24,250,681 bytes; T1 .nii 28,436,900 bytes (float32, SHA-256 `81a80619…127511ace` — full hash in `data/mri_volumes.json`); brain/head masks int16 14,218,626 bytes each
- Suitability for browser delivery: FEASIBLE with constraints — never at startup; lazy on-demand fetch of the single T1 only (masks excluded from runtime); slice textures are ≤217×181 px; full accounting in `docs/PHASE_4C_MRI_PERFORMANCE.md`
- Provenance quality: HIGH — primary provider, versioned file, measured header, permissive license text, citable publications (Holmes et al. 1998, doi:10.1097/00004728-199803000-00032; Aubert-Broche et al. 2006)
- PHI check (MEASURED 2026-09-27): NIfTI header `descrip` = `"mnc2nii colin27_t1_tal_lin.mnc colin27_t1_tal_lin.nii"` (conversion provenance only); `aux_file` and `intent_name` empty; no DICOM; public volunteer template distributed since 1998 — NO identifiers present
- Git disposition (§27): bytes NOT committed (24 MB zip / 28 MB .nii unjustified in git); source URL + SHA-256 + version recorded in `data/mri_volumes.json`; archive retained OUTSIDE the repo (transient audit path, never a runtime dependency of tests)

### §4 gate verdict — Colin27 1998 T1

A. traceable source: PASS (BIC/MNI primary). B. version identified: PASS (1998 original).
C. coordinate system documented: PASS (Talairach 1 mm, sform-measured). D. license documented:
PASS (verbatim snapshot above). E. redistribution understood: PASS (attribution-only condition).
F. scientifically appropriate: PASS (Type A reference). G. browser-feasible: PASS (lazy-only).
**Status: SELECTED as the Phase 4C reference volume. Production overlay remains DISABLED
until canonical registration is genuinely computed and validated (REGISTRATION_PENDING —
failure-safe hierarchy §39: NO VERIFIED TRANSFORM → NO OVERLAY).**

## Candidate 2 — MNI152NLin2009cAsym via TemplateFlow (DEFERRED alternate, Type B target)

- Source: TemplateFlow archive, subdataset `tpl-MNI152NLin2009cAsym` (DataLad, S3 distribution)
- Version: subdataset pin REQUIRED before use (e.g. `@ 15d7c02` observed at research time — NOT pinned by this repo; pin at acquisition)
- License (verbatim snapshot from `templateflow/tpl-MNI152NLin2009cAsym` LICENSE, fetched 2026-09-27): "Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Permission to use, copy, modify, and distribute this software and its documentation for any purpose and without fee is hereby granted, provided that the above copyright notice appear in all copies." — same permissive family as Colin27
- Verdict: DEFERRED — license family documented, but exact release files + version pin + per-release terms were not verified in this session, and Phase 4C needs a Type A reference first; retained as the future Type B registration-target candidate. Third-party "License: unknown" labels (e.g. nilearn docs) are superseded by the primary LICENSE file above for the TemplateFlow copy only.

## Rejected / quarantined (unchanged)

- BigBrain 20 µm, Julich-Brain: CC-BY-NC-SA 4.0 → RESEARCH_ONLY quarantine stands (no change).
- HCP S1200/MMP, Brodmann, fsaverage surfaces: parcellation/surface layers explicitly out of Phase 4C (§33); HCP terms remain LEGAL_REVIEW_REQUIRED.
- OASIS/IXI/ADNI-class releases: per-release DUAs unverified → not evaluated further this phase.
- DICOM archives: never considered (§6).

## License gate (§5) outcome

Colin27 1998: exact license verified in writing (snapshot above) → NOT LEGAL_REVIEW_REQUIRED for the documented educational reference use with attribution; attribution is rendered in-app (provenance panel) and in-docs (citation). TemplateFlow MNI copy: license text retrieved but release pin pending → LEGAL_REVIEW_REQUIRED before any production use. No license was reinterpreted; no uncertain volume enters production.
