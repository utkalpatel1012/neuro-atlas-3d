# Phase 5.1 Deep Gray Matter + Limbic Anatomy

**Status:** 11 assets RUNTIME_READY (6 structures); septum pellucidum
REJECTED with reason; accumbens/hypothalamus/ventricles DOCUMENTED.
Anatomy-only substrate — no functional/psychiatric content anywhere (§2).

## Accepted batch

Thalamus, caudate nucleus, putamen, globus pallidus, amygdala (bilateral
pairs) + mammillary body (bilateral single, 2-shell composite). Source:
BodyParts3D Release 3.0 mirror STLs (fresh downloads, hash-pinned, same
license/coordinate chain as all production assets). Laterality from
distribution records + measured source geometry (Xc=−Xs mapping); mammillary
spans midline → BILATERAL single asset.

## Per-structure notes

- Thalamus: gross organ only; nuclei stay future (no parcellation source).
  L/R triangle asymmetry (7396 vs 3298) is a source property.
- Caudate/putamen/globus pallidus: gross organs under `brain.basal_ganglia`;
  never collapsed into one mesh; pallidum named exactly as sourced.
- Amygdala: gross organ under limbic lobes; basolateral/central/medial nuclei
  absent by design (§10).
- Mammillary body: paired bodies in one 2-shell segment → composite topology,
  honestly classified.
- Septum pellucidum: source STL non-manifold + zero-area defects → REJECTED;
  stays DOCUMENTED (§14).

## What was NOT done (§9, §13, §24–§28)

No hippocampus replacement (same source — nothing finer available); no CA/
dentate/subiculum partitions; no hypothalamic nuclei; no brainstem/
cerebellum (STL availability noted, deferred to §25–§26 stages); no
ventricles (no STL); no nerves/vasculature; no HCP/Julich/BigBrain.

## Integration

Hierarchy nodes (AVAILABLE with asset links; DOCUMENTED accumbens/
hypothalamus); on-demand loading via HierarchyPanel (default view
unchanged); selection/focus/isolation/clipping/bookmarks/LOD/lazy reuse
existing systems (tested sagittal/coronal/axial on thalamus); MRI overlay
stays gated (REGISTRATION_PENDING); deep visibility via existing
isolate/ghost/hide (no fake transparency, normal depth semantics).
