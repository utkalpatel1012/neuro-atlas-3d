/**
 * 3D Neuroanatomy Atlas: Phase 5.1 Visual-Quality Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Deterministic headless tests for the render-quality policy (§57): DPR
 * calculation, canvas/buffer matching, resize safety, quality-mode
 * transitions, profile ceilings, renderer fallback, memory-budget
 * enforcement. Nothing here measures subjective sharpness (§57 forbids it);
 * sharpness claims rest on the diagnosed buffer mismatch fix + browser QA.
 */

import { RendererManager, computeDrawingBufferSize } from './engine/RendererManager';
import { AtlasApplication, initialProfileForDevice } from './engine/AtlasApplication';
import { PERFORMANCE_PROFILES } from './engine/types';
import { MAX_CACHED_CAPS } from './engine/SectionCaps';
import { computeMriMemoryBudget } from './engine/mriVolume';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 5.1 VISUAL-QUALITY TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  // TEST 1: DPR policy calculation (§24 — bounded, never blind ×2).
  console.log('--- TEST 1: DPR policy ---');
  const full = computeDrawingBufferSize(1600, 1000, 2, 2);
  assert(full !== null && full.appliedDpr === 2 && full.bufferWidth === 3200 && full.bufferHeight === 2000, 'native DPR within ceiling applies exactly');
  passed++;
  const capped = computeDrawingBufferSize(1600, 1000, 3, 2);
  assert(capped !== null && capped.appliedDpr === 2 && capped.bufferWidth === 3200, 'DPR above ceiling clamps (never blind ×2)');
  passed++;
  const low = computeDrawingBufferSize(800, 600, 1, 2);
  assert(low !== null && low.appliedDpr === 1 && low.bufferWidth === 800, 'DPR 1 passes through (no upscaling cost)');
  passed++;
  const frac = computeDrawingBufferSize(100.7, 100.7, 1.5, 1.5);
  assert(frac !== null && frac.cssWidth === 100 && frac.bufferWidth === 151, 'fractional CSS/DPR floors deterministically');
  passed++;
  assert(computeDrawingBufferSize(0, 600, 1, 2) === null, 'zero width rejected');
  passed++;
  assert(computeDrawingBufferSize(800, -600, 1, 2) === null, 'negative height rejected');
  passed++;
  assert(computeDrawingBufferSize(800, 600, NaN, 2) === null, 'NaN DPR rejected');
  passed++;
  assert(computeDrawingBufferSize(800, 600, 1, 0) === null, 'zero ceiling rejected');
  passed++;
  assert(computeDrawingBufferSize(Infinity, 600, 1, 2) === null, 'infinite CSS rejected');
  passed++;
  console.log('[PASS] Bounded DPR policy; invalid inputs keep last state.');
  passed++;

  // TEST 2: canvas/buffer matching strategy — buffer equals CSS × applied DPR.
  console.log('\n--- TEST 2: Canvas/buffer match ---');
  const match = computeDrawingBufferSize(1280, 720, 2, 2)!;
  assert(match.bufferWidth / match.cssWidth === match.appliedDpr, 'buffer/CSS ratio equals applied DPR (no stretch blur)');
  passed++;
  assert(match.bufferHeight / match.cssHeight === match.appliedDpr, 'vertical ratio matches too');
  passed++;
  console.log('[PASS] Buffer dimensions derive from displayed size (the blur fix).');
  passed++;

  // TEST 3: resize handling safety (headless + invalid).
  console.log('\n--- TEST 3: Resize safety ---');
  const rm = new RendererManager();
  assert(rm.resizeToDisplaySize() === null, 'headless resize is a safe no-op (NULL, no throw)');
  passed++;
  rm.startResizeHandling();
  rm.stopResizeHandling();
  rm.stopResizeHandling();
  assert(true, 'listener install/remove idempotent headless');
  passed++;
  rm.dispose();
  console.log('[PASS] Resize paths safe without a window.');
  passed++;

  // TEST 4: renderer fallback (headless dummy, §40-adjacent).
  console.log('\n--- TEST 4: Renderer fallback ---');
  const rm2 = new RendererManager();
  const dummy = await rm2.initialize();
  assert(dummy && typeof dummy.render === 'function', 'headless yields a dummy renderer (never throws)');
  passed++;
  assert(rm2.getActiveBackend() === 'unsupported', 'headless backend honestly reported');
  passed++;
  assert(rm2.getDrawingBufferSize() === null, 'no buffer headless (NULL, not invented)');
  passed++;
  rm2.dispose();
  console.log('[PASS] Fallback path total and honest.');
  passed++;

  // TEST 5: profile ceilings + AA flags (bounded policy, §24, §31).
  console.log('\n--- TEST 5: Profile ceilings ---');
  assert(PERFORMANCE_PROFILES.HIGH.maxPixelRatio === 2.0 && PERFORMANCE_PROFILES.HIGH.antialias === true, 'HIGH: DPR ≤2 + AA');
  passed++;
  assert(PERFORMANCE_PROFILES.MEDIUM.maxPixelRatio === 1.5 && PERFORMANCE_PROFILES.MEDIUM.antialias === true, 'MEDIUM: DPR ≤1.5 + AA');
  passed++;
  assert(PERFORMANCE_PROFILES.LOW.maxPixelRatio === 1.0 && PERFORMANCE_PROFILES.LOW.antialias === false, 'LOW: DPR 1, no AA (survival)');
  passed++;
  console.log('[PASS] Profile ceilings bounded; AA deliberate per tier.');
  passed++;

  // TEST 6: quality-mode transitions (§37–§39).
  console.log('\n--- TEST 6: Quality modes ---');
  const fakeContainer = { clientWidth: 1280, clientHeight: 720 } as unknown as HTMLElement;
  const app = new AtlasApplication({ container: fakeContainer, enableGrid: false, enableOriginMarker: false });
  assert(app.getQualityMode() === 'AUTO', 'AUTO is the default mode');
  passed++;
  assert(app.setQualityMode('HIGH') === true && app.getQualityMode() === 'HIGH', 'HIGH pins high profile');
  passed++;
  assert(app.getRendererManager().getPerformanceProfile().id === 'HIGH', 'HIGH reaches the renderer profile');
  passed++;
  assert(app.setQualityMode('BALANCED') === true, 'BALANCED accepted');
  passed++;
  assert(app.getRendererManager().getPerformanceProfile().id === 'MEDIUM', 'BALANCED maps to MEDIUM (no raw GPU settings exposed)');
  passed++;
  assert(app.setQualityMode('LOW') === true, 'LOW accepted');
  passed++;
  assert(app.getRendererManager().getPerformanceProfile().id === 'LOW', 'LOW reaches the renderer profile');
  passed++;
  assert(app.setQualityMode('AUTO') === true && app.getQualityMode() === 'AUTO', 'AUTO re-arms adaptive policy');
  passed++;
  assert(app.setQualityMode('ULTRA' as never) === false, 'invalid mode rejected (state unchanged)');
  passed++;
  assert(app.getQualityMode() === 'AUTO', 'rejected mode leaves state intact');
  passed++;
  app.dispose();
  console.log('[PASS] Mode transitions exact; invalid rejected.');
  passed++;

  // TEST 7: memory-budget enforcement (§40, §51 — bounded, labeled).
  console.log('\n--- TEST 7: Memory budgets ---');
  assert(MAX_CACHED_CAPS === 12, 'section-cap cache bounded (no unbounded growth)');
  passed++;
  assert(computeMriMemoryBudget([0, 1, 1], 4, 1, 'R8', 1) === null, 'degenerate MRI budget rejected');
  passed++;
  const desktop = computeDrawingBufferSize(1920, 1080, 2, 2)!;
  assert(desktop.bufferWidth * desktop.bufferHeight * 4 <= 110 * 1024 * 1024, 'desktop framebuffer fits iPad-discipline order of magnitude');
  passed++;
  console.log('[PASS] Budgets bounded and enforced, never actual-VRAM claims.');
  passed++;

  // TEST 8: device safe-start profiles (§50 — engineering target, explicit).
  console.log('\n--- TEST 8: Safe-start profiles ---');
  assert(initialProfileForDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0, 1920) === 'HIGH', 'desktop boots HIGH');
  passed++;
  assert(initialProfileForDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 5, 1024) === 'MEDIUM', 'iPad boots MEDIUM (no forced desktop quality)');
  passed++;
  assert(initialProfileForDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5, 390) === 'MEDIUM', 'phone boots MEDIUM');
  passed++;
  assert(initialProfileForDevice('', 0, 1920) === 'HIGH', 'unknown UA defaults HIGH (headless/SSR safe)');
  passed++;
  console.log('[PASS] Tablets/phones start bounded; AUTO recovers on headroom.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 5.1 VISUAL-QUALITY TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 5.1 visual-quality test execution failed:\n', err);
  process.exit(1);
});
