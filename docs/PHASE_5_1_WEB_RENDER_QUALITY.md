# Phase 5.1 Web Render Quality (blur diagnosis → fix → verification)

**Status:** root cause found, fixed, tested (44 checks), deployed, verified
live in headless Chrome. No "4K"/"retina"/"photorealistic" claims.

## Original blur diagnosis (§22–§23)

The renderer was NEVER sized after creation: `RendererManager.setSize`
existed but had zero callers, so the drawing buffer stayed at the canvas
default (300×150, confirmed in live DOM) while CSS stretched it to fill —
the dominant blur source. Contributing factors ruled OUT by inspection:
DPR caps were already bounded (2.0/1.5/1.0), AA enabled on HIGH/MEDIUM,
LOD starts at lod0, materials/colors/normals correct, camera depth sane.

## Root cause

Missing viewport-size synchronization between canvas CSS size and drawing
buffer (no init sizing, no resize handling).

## Corrective action

- `resizeToDisplaySize()`: buffer = CSS × bounded DPR, style untouched;
  called at init, on profile change, and on resize/orientationchange
  (listener disposed properly; headless-safe).
- Bounded adaptive DPR policy as a pure tested function (never blind ×2).
- Quality modes AUTO (default) / HIGH / BALANCED / LOW over existing
  profiles; AUTO steps down/up gradually on sustained FPS evidence
  (<20 ×2 windows down one tier; >55 ×4 windows up; deadband resets).
- DebugPanel profile buttons now route through the full apply path
  (review fix); device safe-start (tablet/phone → MEDIUM) with AUTO
  recovery (review fix).
- LOD thresholds + hysteresis unchanged (verified adequate); background
  LOD preload retained; focus zooms resolve detail via distance-based LOD.

## DPR / canvas resolution / LOD policy / AA / shading

DPR ceilings 2.0/1.5/1.0 per tier; buffer always equals CSS × applied DPR
(tested); LOD 80/150/250 mm ±6 mm hysteresis with per-profile multipliers;
MSAA where the profile/backend supports it (WebGL2 context flag; WebGPU
passthrough with documented fallback); area-weighted normals (one-time);
sRGB output; ACES on WebGL2 (backend variance documented).

## Quality modes / memory

Modes map to profiles + LOD multipliers only (no raw GPU settings, no
unbounded allocation); `maxResidentMeshes` ceilings remain unenforced
(tracked under L11 — documented, not silently fixed); MRI/caps caches
bounded; lazy loading preserved (startup = 4 entities).

## Deployment verification (§47–§48)

Source of truth: `gh-pages` branch via `npm run deploy` (fresh `vite build`
+ `gh-pages -d dist`). Verified: branch manifest = 31 assets; live manifest
= 31 assets; runtime GLBs + structure JSONs serve 200; correct (non-stale)
bundle hash in live HTML. The Actions `deploy-pages` workflow fails at
scheduling (zero steps run — no runner; pre-existing, out of scope); it is
left untouched per no-competing-method.

## Browser validation

Headless-Chrome DOM verification only (canvas present, panels render,
hierarchy single-tree, Load controls live): AUTOMATED_TEST_VALIDATION class.
No physical-device validation claimed (§49 matrix, §50 iPad PENDING).

## Device limitations

Base-iPad 110 MB discipline retained; LOW tier (DPR 1, no AA) is the
survival path; crisp-selected-anatomy preferred over many-blurry-structures
via distance LOD + on-demand residency (engineering targets, not measurements).
