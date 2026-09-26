# Phase 4 Runtime Constraints (hard engineering constraints)

Violating any constraint below in Phase 4 implementation is a defect, not a tradeoff.
Derived from the Phase 3.1/3.2 audits (L11, resilience PARTIALs, deployment findings).

1. **Memory budgets are ceilings, not goals.** Base-iPad total GPU ≤110 MB discipline
applies to every new feature (clipping, overlays, MRI). New allocations need a budget
line before code.
2. **Progressive loading only.** No feature may require all LODs (or any MRI volume)
up front. Load order: active LOD → neighbors → rest; volumes tiled/streamed or not at all.
3. **Disposal on every detach path.** scene-remove, unregister, LOD-swap, context-loss
reload: geometries + materials + BVH (`disposeBoundsTree`) released; refcounts balanced
(TEST 11 pattern). Close L11 gaps (per-LOD keys, orphaned ResourceManager) before
claiming any memory property.
4. **Context/device loss drills.** Every new GPU resource must be re-creatable from
CPU-side state; reload paths must not duplicate scene nodes (current naive reload
does — fix when touching it). No feature may assume a loss-free session.
5. **LOD transitions stay hysteresis-guarded** (±6 mm bands exist; keep or justify
change with measurements, not feelings).
6. **BVH memory accounted.** `three-mesh-bvh` trees cost RAM per LOD; per-LOD geometry
sharing rules must be written down before adding structures (shared-cache + dispose
semantics, else double-free or leak).
7. **Texture memory: zero until proven.** No KTX2/PNG/JPEG textures without a measured
VRAM budget line (the "75% saving" was never measured).
8. **Large-asset deployability.** New assets >2 MB each must be justified against the
~13 MB current bundle; `dist` stays gitignored; manifest lod/canonical dead paths
must be resolved (ship or drop) before any consumer reads them.
9. **No headless-only performance claims.** Any new timing claim ships with
environment + triangle count + LOD + query count + CPU/GPU attribution, or it ships
as TARGET.
