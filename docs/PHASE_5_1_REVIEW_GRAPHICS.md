# Independent Graphics/Performance Review — Phase 5.1 (implementer fixes applied)

**Reviewer:** independent subagent (read-only pass). Renderer sizing, DPR
policy, LOD, normals/materials/color: PASS. Four FAILs below — all fixed or
documented with reasons.

## FAIL-1 (fixed): DebugPanel bypassed the full profile path

Profile buttons called `performanceManager.setProfile` only, leaving renderer
DPR ceiling, LOD multiplier, and buffer stale. **Fix applied:** optional
`onProfileChange` callback wired to `AtlasApplication.applyProfile` in
`main.ts`; direct call preserved as fallback when unwired.

## FAIL-2 (fixed): tablets/phones booted HIGH quality

Device classification existed but nothing mapped it to a profile. **Fix
applied:** `initialProfileForDevice()` (tablet/phone → MEDIUM, desktop →
HIGH, marked engineering target) + AUTO recovery on headroom; `main.ts` no
longer forces HIGH.

## FAIL-3 (documented, not implemented): `maxResidentMeshes` unenforced

Declared ceilings (200/100/50) have no consumer; on-demand loads can grow
past them. Implementing eviction is a large architectural change with
selection/visibility regression risk; it is already tracked (L11 resource
gaps). Documented here + L11 note instead of a rushed implementation.

## FAIL-4 (documented, not rebuilt): dual deployment mechanism

`npm run deploy` (gh-pages branch, ACTIVE and verified serving) vs the
failing Actions `deploy-pages` workflow (jobs die at scheduling with zero
steps — no runner ever picks them up). Source of truth recorded in the
render-quality doc (§48). CI repair is out of scope; the Actions file is
left untouched (no second method created, none removed).

## Other notes (kept as documented behavior)

- Dead public `setSize` API: all sizing flows through `resizeToDisplaySize`
  (kept for API compatibility, harmless).
- Tone mapping ACES on WebGL2 only (WebGPU/WebGL1 differ in highlight
  rolloff) — backend variance documented, not blur-relevant.
- `preloadAllLODs` tensions the progressive-loading constraint text but is
  non-blocking with ref-balance handled; startup stays 4 entities.
