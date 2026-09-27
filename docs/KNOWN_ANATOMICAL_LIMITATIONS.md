# Known Anatomical Limitations (living document — append, never silently delete)

**Started:** 2026-09-27 (Phase 3.1). Each entry states what is limited, why, and what
would resolve it. Nothing here may be "fixed" by generating geometry.

## L1. Cortex is a partial multi-shell composite, not a whole-cortex pial surface
16 disjoint closed shells per hemisphere from 14 BodyParts3D chunks; sulci exist only as
inter-chunk gaps. Missing entirely: inferior frontal, superior parietal/precuneus,
orbitofrontal, medial frontal, true superior temporal, cuneus, lingual pieces.
**Resolve:** ingest a true continuous pial representation (`mri_surface`, e.g.
FreeSurfer) as a new representation; never deform chunks to fake continuity.

## L2. Landmark anchors are schematic and partly misplaced
All 24 `CEREBRAL_LANDMARKS` anchors + 6 lobe centroids are hand-placed, unmeasured;
pole anchors sit at the wrong mesh ends (authored under false +Z=anterior).
**Resolve:** documented expert-vs-mesh re-anchoring with recorded overlays (Part 4 gate).

## L3. No stereotaxic registration exists
Canonical space is internal (+X R, +Y S, +Z Posterior); MNI/Talairach/fs_LR mapping:
NOT CURRENTLY REPRESENTED. AC-PC centering constants asserted, method undocumented.
**Resolve:** real ANTs SyN/FLIRT computation with TRE + Dice, then update records.

## L4. Source frame asserted, not proven
`dicom_lps_whole_body` for mirror STLs is consistent with data magnitudes but uncited;
BodyParts3D defines its own universal system (Mitsuhashi et al. 2009).
**Resolve:** cite the BodyParts3D coordinate specification or re-derive from the
official archive OBJ + `coordinate_system` documentation.

## L5. Ontology IDs unverified
`TA2:5415`, `FMA:242442/242443` (cortex), `TA2:5488`, `FMA:275020` (hippocampus),
`UBERON:0000956` (labels cortex but is the whole-brain ID — suspect), `UBERON:0001954`,
`NN:*`, hippocampus `sourceDefinition: FJ3162 (FMA61884)`: none verified against TA2/FMA/
UBERON releases in this repo. Component FMA IDs verified against the distribution name
list (authoritative for files) but not against the live FMA ontology.
**Resolve:** ontology lookup pass with edition + access date recorded per ID.

## L6. Reference bands and constants unjustified
Volume bands (180–380 cortex; 1.5–4.8 hippocampus), dimension bands, LOD thresholds
(Hausdorff ≤3.0 mm, vol ≤1.0%), raycast <15 ms bar, translation constants, 110 MB
Jetsam ceiling: asserted without derivation records.
**Resolve:** cite sources or derive empirically with recorded method.

## L7. Display-metadata staleness risk
Runtime entity records (`main.ts`, test fixtures) duplicate validated numbers by hand;
left-hippocampus volume/dims were 70% off until Phase 3.1. No single-source binding
between manifest and UI records exists.
**Resolve:** load UI records from the manifest at boot (future phase).

## L8. License conflict unresolved
`package.json` (CC-BY-SA-4.0) vs `SOURCES_AND_LICENSES.md`/history (Apache-2.0 code);
no LICENSE file. BodyParts3D relicense retroactivity unreviewed.
**Resolve:** explicit licensing decision + LICENSE file + counsel review before any
commercial redistribution.

## L9. Validation artifacts are lean but history is heavy
Regenerated `geometry_qa.json` files exclude bulk arrays (5 KB); git history retains
the 51 MB versions. Previous-agent absolute paths (`C:\Users\UTKAL PATEL\.gemini\…`)
persist in history and in untouched historical reports.
**Resolve:** nothing (history immutable); future artifacts stay lean via fixed generators.

## L10. Single-subject, single-population source
All geometry derives from one adult-male whole-body model (Mitsuhashi et al. 2009).
No population variance, no female anatomy, no age range.
**Resolve:** state in-app; multi-subject sources are a future phase with fresh licensing.

## L11. Resource ownership gaps (recovery pass §30)
Reference counting exists but: per-asset (not per-LOD) key granularity with a
bulk-dispose hazard in `unloadAsset`; `ResourceManager` has zero production callers;
LOD-switch leak fixed + regression-tested (TEST 11), but scene-remove/unregister paths
detach without GPU disposal (leak); `entityRepresentations` map never cleared; BVH
`disposeBoundsTree` absent on swap/remove paths; no unload backoff/retry. "Zero memory
leakage" must not be claimed.
**Resolve:** per-LOD refkeys + disposal on all detach paths + ownership proof (Phase 4 gate).

## L12. Deployment caveats (recovery pass §23)
Dual deploy mechanism (`gh-pages -d dist` script vs Actions `deploy-pages` workflow) —
single source of truth UNKNOWN. Manifest `lod_files`/`canonical_glb_path` entries are
NOT shipped to Pages (plugin copies runtime/ only); harmless today (AssetManager reads
runtime/ only) but any future consumer will 404. Duplicate root manifest
(`assets/assets.manifest.json`) is copied but never referenced. No 404.html (fine:
single route, no router). Live site content predates Phase 3.1 until redeploy.
**Resolve:** pick one deploy mechanism; either ship or drop dead manifest paths on deploy.

## L13. Expert review pending (recovery pass §14)
No neuroanatomist expert review has occurred for any mesh, landmark, or boundary in
this repo. Automated/reference comparisons are NOT expert validation.
**Status: EXPERT_REVIEW_PENDING.** Nothing in the repo claims otherwise (verified);
keep it that way until a documented review with named reviewer + date + scope occurs.

## L14. Sectional visualization limits (Phase 4A)
Cut interiors render HOLLOW (`SECTION_CAPS_PENDING`) — no cap geometry exists and
none is faked. GPU clipping is headless-tested only (no browser/device proof;
WebGPU path code-identical but device-unverified). Raycasting ignores clipping by
design (selection may resolve clipped-away geometry). Grazing-incidence rays can
slip between adjacent triangles despite edge-watertight QA. Plane gizmos and labels
are orientation aids, never anatomy. No MRI, no parcellation, no psychiatry overlays.

## L15. Section presentation limits (Phase 4B)
Derived caps/edges are geometric visualization aids, not tissue: flat amber
surfaces triangulated per closed loop from actual mesh-plane intersections
(earcut); nested-loop holes are NOT resolved (donut-like sections may overfill);
open/grazing/disconnected contours fall back to edges or nothing — never a fake
surface. Caps never carry entity IDs or provenance. Orientation/preset/readout
UI uses canonical coordinates only (+X R, +Y S, +Z Posterior); preset names
imply no registration. Presentation + clipping headless-tested only (92 new
checks); browser/iPad/WebGPU-device proof still pending. Empty views show
mostly empty space by design (white matter, basal ganglia, thalamus, brainstem,
cerebellum, ventricles, vasculature, complete cortex NOT yet in atlas).
