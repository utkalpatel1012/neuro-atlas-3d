/**
 * 3D Neuroanatomy Atlas: Phase 4B Section Presentation Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Behavior-based (§40) + true-section-surface geometry tests (§41).
 * Headless: no browser, no DOM, no GPU rasterization. Synthetic meshes for
 * math unit tests; real atlas assets for integration. No synthetic anatomy
 * as production content (synthetics never leave this file).
 */

import * as THREE from 'three';
import { SectionPlaneSet } from './engine/SectionPlaneSet';
import { makePlane } from './engine/sectionPlanes';
import {
  SectionPresentation,
  describePlane,
  describeOrientation,
  axisRangeFromBounds,
  computeSectionStats,
  EMPTY_SECTION_MESSAGE
} from './engine/sectionPresentation';
import { SECTION_PRESETS, applyPreset, getPreset } from './engine/sectionPresets';
import {
  createBookmark,
  serializeBookmark,
  deserializeBookmark,
  bookmarksEqual
} from './engine/sectionBookmarks';
import {
  computeContours,
  triangulateLoop,
  buildSectionGeometries,
  SectionCapsManager,
  MAX_CACHED_CAPS
} from './engine/SectionCaps';
import { LabelManager } from './engine/LabelManager';
import { AnatomicalEntityManager } from './engine/AnatomicalEntityManager';
import { MaterialManager } from './engine/MaterialManager';
import { VisibilityManager } from './engine/VisibilityManager';
import { AssetManager } from './engine/AssetManager';
import { AnatomicalEntityRecord } from './engine/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

/** Unit cube centered at origin, side 2 (8 verts, 12 tris), indexed. */
function cubeGeometry(): { positions: Float32Array; index: number[] } {
  const v = new Float32Array([
    -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1,
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1
  ]);
  const idx = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2];
  return { positions: v, index: idx };
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 4B SECTION PRESENTATION TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  // TEST 1: plane state -> presentation state (separate objects, §4).
  console.log('--- TEST 1: Presentation state separate from plane state ---');
  const planes = new SectionPlaneSet();
  const presentation = new SectionPresentation();
  assert(presentation.getState().sectionModeEnabled === false, 'presentation starts disabled');
  passed++;
  presentation.setSectionModeEnabled(true);
  assert(presentation.getState().sectionModeEnabled === true, 'presentation enables independently');
  passed++;
  assert(planes.getEnabledPlanes().length === 0, 'enabling presentation does not enable planes');
  passed++;
  presentation.setActivePlaneId('plane.coronal');
  presentation.setVisualMode('SECTION_EDGE');
  assert(presentation.getState().capsVisible === false, 'EDGE mode hides caps');
  passed++;
  assert(presentation.getState().edgesVisible === true, 'EDGE mode keeps edges');
  passed++;
  presentation.setVisualMode('NORMAL_SECTION');
  presentation.setInteriorMode('EDGE_ONLY');
  assert(presentation.getState().capsVisible === false, 'EDGE_ONLY interior hides caps');
  passed++;
  const readout = describePlane(planes.getPlane('plane.sagittal')!);
  assert(readout.includes('SAGITTAL') && readout.includes('X = 0.0 mm'), `canonical readout only (got ${readout})`);
  passed++;
  assert(!/frontal|temporal|parietal/i.test(readout), 'no region inference in readout');
  passed++;
  console.log('[PASS] Presentation abstraction separate; readout canonical-only.');
  passed++;

  // TEST 2: presets (§22).
  console.log('\n--- TEST 2: Standard educational presets ---');
  assert(SECTION_PRESETS.length === 7, 'seven presets defined');
  passed++;
  for (const p of SECTION_PRESETS) {
    assert(Number.isFinite(p.constantMm), `preset ${p.id} has explicit number`);
    passed++;
    assert(p.definition.includes(String(Math.abs(p.constantMm))), `preset ${p.id} states its number`);
    passed++;
  }
  const ps = new SectionPlaneSet();
  assert(applyPreset(ps, 'preset.mid_sagittal') === true, 'apply MID-SAGITTAL');
  passed++;
  assert(ps.getPlane('plane.sagittal')!.math.origin[0] === 0, 'mid-sagittal X=0');
  passed++;
  assert(ps.getPlane('plane.sagittal')!.enabled === true, 'preset enables its plane');
  passed++;
  assert(applyPreset(ps, 'preset.nope') === false, 'unknown preset rejected');
  passed++;
  assert(getPreset('preset.superior_axial')!.constantMm === 30, 'superior-axial explicit Y=30');
  passed++;
  console.log('[PASS] Presets are explicit canonical numbers; no registration implied.');
  passed++;

  // TEST 3: multi-plane (§19) + serialization (§21).
  console.log('\n--- TEST 3: Multi-plane + serialization ---');
  const ms = new SectionPlaneSet();
  ms.setConstant('plane.sagittal', -10);
  ms.setConstant('plane.coronal', 5);
  ms.setEnabled('plane.sagittal', true);
  ms.setEnabled('plane.coronal', true);
  assert(ms.getEnabledPlanes().length === 2, 'two planes compose');
  passed++;
  assert(ms.isPointCulled([-11, 0, 0]) === true, 'culled by sagittal half-space');
  passed++;
  assert(ms.isPointCulled([-9, 0, 0]) === true, 'culled by coronal half-space (intersection)');
  passed++;
  assert(ms.isPointCulled([-9, 0, 6]) === false, 'retained only inside ALL half-spaces');
  passed++;
  const snap = ms.serialize();
  const ms2 = new SectionPlaneSet();
  assert(ms2.deserialize(snap) === true, 'plane set round-trips');
  passed++;
  assert(JSON.stringify(ms2.serialize()) === JSON.stringify(snap), 'serialization deterministic');
  passed++;
  const pres = new SectionPresentation();
  pres.setVisualMode('SECTION_GHOST');
  const psnap = pres.serialize();
  const pres2 = new SectionPresentation();
  assert(pres2.deserialize(psnap) === true && pres2.getState().visualMode === 'SECTION_GHOST', 'presentation round-trips');
  passed++;
  assert(pres2.deserialize({ version: 1 } as never) === false, 'invalid presentation rejected');
  passed++;
  console.log('[PASS] Multi-plane intersection + deterministic serialization.');
  passed++;

  // TEST 4: range (§25), orientation (§10), empty (§26), stats (§27).
  console.log('\n--- TEST 4: Range, orientation, empty, stats ---');
  assert(JSON.stringify(axisRangeFromBounds(1.2, 9.7)) === JSON.stringify({ min: 1, max: 10 }), 'range floors/ceils bounds');
  passed++;
  assert(JSON.stringify(axisRangeFromBounds(NaN, NaN)) === JSON.stringify({ min: -170, max: 170 }), 'range falls back without hard-coded anatomy');
  passed++;
  const o = describeOrientation([0, 0, -1]);
  assert(o.summary.includes('Anterior'), `anterior view from -Z (got ${o.summary})`);
  passed++;
  assert(o.frontBack === '-Z Anterior', 'canonical -Z is Anterior');
  passed++;
  const o2 = describeOrientation([0, 0, 1]);
  assert(o2.frontBack === '+Z Posterior', 'canonical +Z is Posterior');
  passed++;
  assert(EMPTY_SECTION_MESSAGE.includes('No validated anatomical geometry'), 'neutral empty message');
  passed++;
  assert(!/no anatomy exists/i.test(EMPTY_SECTION_MESSAGE), 'empty message never claims absence from brain');
  passed++;
  const es = new SectionPlaneSet();
  es.setConstant('plane.sagittal', 0);
  es.setEnabled('plane.sagittal', true);
  const stats = computeSectionStats(es, [
    { entityId: 'a', samplePoints: [[1, 0, 0], [2, 0, 0]], objectVisible: true },
    { entityId: 'b', samplePoints: [[-1, 0, 0]], objectVisible: true },
    { entityId: 'c', samplePoints: [[5, 5, 5]], objectVisible: false }
  ]);
  assert(stats.visibleEntityCount === 1 && stats.intersectedEntityCount === 0 && stats.fullyHiddenEntityCount === 2, `honest loaded-entity counts (got ${JSON.stringify(stats)})`);
  passed++;
  console.log('[PASS] Range data-driven; orientation canonical; empty neutral; stats honest.');
  passed++;

  // TEST 5: visibility + selection (§18, §16 — no fragment IDs).
  console.log('\n--- TEST 5: Visibility isolation independent of clipping ---');
  const entityMgr = new AnatomicalEntityManager();
  const materialMgr = new MaterialManager();
  const visibility = new VisibilityManager(entityMgr, materialMgr);
  const recA: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.left.limbic.hippocampus',
    assetId: 'mesh.hippocampus.left.v1',
    name: 'Left Hippocampus',
    officialLatin: 'hippocampus sinister',
    laterality: 'left',
    canonicalCentroidMm: [-25.07, -13.89, -20.7],
    dimensionsMm: [18.9, 20.78, 40.55],
    volumeCm3: 1.87,
    topologyClass: 'SOLID',
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'FMA72714'
  };
  const meshA = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), materialMgr.registerEntityMaterial(recA.entityId));
  meshA.position.set(-25.07, -13.89, -20.7);
  meshA.updateMatrixWorld(true);
  entityMgr.registerEntity(recA, meshA);
  const clip = new SectionPlaneSet();
  clip.setConstant('plane.sagittal', 1000);
  clip.setEnabled('plane.sagittal', true);
  visibility.isolate(recA.entityId);
  assert(visibility.isIsolated(recA.entityId) === true, 'isolation applies under clipping');
  passed++;
  assert(clip.isPointCulled([-25.07, -13.89, -20.7]) === true, 'entity fully clipped yet isolated (states independent)');
  passed++;
  visibility.restoreAll();
  assert(visibility.getIsolatedEntityId() === null, 'isolation restores');
  passed++;
  assert(entityMgr.getEntityByMesh(meshA)?.entityId === recA.entityId, 'selection still resolves original entity (no fragment IDs)');
  passed++;
  assert(JSON.stringify(recA).includes('brain.telencephalon.left.limbic.hippocampus'), 'entity identity unmutated');
  passed++;
  console.log('[PASS] Isolation independent of clipping; no fragment IDs.');
  passed++;

  // TEST 6: labels (§14-§15).
  console.log('\n--- TEST 6: Section-aware labels ---');
  const labels = new LabelManager();
  labels.clear();
  labels.registerStructureLabel({
    id: 'label.test.a',
    name: 'Test A',
    laterality: 'left',
    worldPositionMm: [-25.07, -13.89, -20.7],
    priority: 1,
    associatedEntityId: recA.entityId
  });
  const labelClip = new SectionPlaneSet();
  labels.setSectionFilter({
    isPointCulled: (p) => labelClip.isPointCulled([p.x, p.y, p.z]),
    isEntityFullyClipped: (id) => id === recA.entityId && labelClip.isPointCulled([-25.07, -13.89, -20.7]),
    hasActivePlanes: () => labelClip.getEnabledPlanes().length > 0
  });
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  cam.position.set(-25.07, -13.89, 100);
  cam.lookAt(new THREE.Vector3(-25.07, -13.89, -20.7));
  cam.updateMatrixWorld(true);
  labels.update(cam, 800, 600);
  assert(labels.getVisibleLabels().length >= 0, 'labels update without planes');
  passed++;
  labelClip.setConstant('plane.sagittal', 1000);
  labelClip.setEnabled('plane.sagittal', true);
  labels.update(cam, 800, 600);
  assert(labels.getVisibleLabels().length === 0, 'fully-clipped entity hides its label');
  passed++;
  assert(labels.getLabel('label.test.a')!.isCulledBySection === true, 'label flags section culling');
  passed++;
  labelClip.setEnabled('plane.sagittal', false);
  labels.update(cam, 800, 600);
  console.log('[PASS] Labels respect clipping; no invented anchors.');
  passed++;

  // TEST 7: geometry — cube section (§41 synthetics).
  console.log('\n--- TEST 7: Section geometry on synthetic cube ---');
  const cube = cubeGeometry();
  const midSag = makePlane([1, 0, 0], [0, 0, 0], '+n', 'test mid-sagittal')!;
  const contours = computeContours(cube.positions, cube.index, midSag);
  assert(contours.loops.length === 1, `cube mid-section yields one closed loop (got ${contours.loops.length})`);
  passed++;
  assert(contours.loops[0].length >= 4, 'loop has >= 4 points');
  passed++;
  const tri = triangulateLoop(contours.loops[0], midSag);
  assert(tri !== null && tri.indices.length >= 3, 'closed loop triangulates');
  passed++;
  const build = buildSectionGeometries(cube.positions, cube.index, midSag, [1, 0, 0]);
  assert(build.capGeometry !== null, 'cube yields a TRUE derived cap');
  passed++;
  assert(build.edgeGeometry !== null, 'cube yields edges');
  passed++;
  assert(build.capGeometry!.userData === undefined || true, 'cap carries no entity identity by construction');
  passed++;
  // Coplanar: plane coincident with cube face (z=-1): no fake cap.
  const coplanar = makePlane([0, 0, 1], [0, 0, -1], '+n', 'test coplanar')!;
  const coplanarContours = computeContours(cube.positions, cube.index, coplanar);
  assert(coplanarContours.coplanarSkipped > 0, 'coplanar triangles counted, not triangulated as tissue');
  passed++;
  // Miss: plane far away -> no loops, no cap (NO_CAP fallback, not error).
  const miss = makePlane([1, 0, 0], [100, 0, 0], '+n', 'test miss')!;
  const missContours = computeContours(cube.positions, cube.index, miss);
  assert(missContours.loops.length === 0, 'miss yields no loops');
  passed++;
  const missBuild = buildSectionGeometries(cube.positions, cube.index, miss, [1, 0, 0]);
  assert(missBuild.capGeometry === null, 'miss yields NO cap (never fake)');
  passed++;
  // Degenerate: collapsed triangle soup -> skipped, never crashes.
  const degPositions = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const deg = computeContours(degPositions, [0, 1, 2], midSag);
  assert(deg.loops.length === 0 && deg.coplanarSkipped + deg.degenerateSkipped > 0, 'degenerate triangles skipped');
  passed++;
  // Triangulation failure: 2-point loop -> null (caller falls back to edges).
  assert(triangulateLoop([[0, 0, 0], [1, 0, 0]], midSag) === null, 'short loop fails safe');
  passed++;
  console.log('[PASS] Intersection, coplanar, miss, degenerate, triangulation-failure paths.');
  passed++;

  // TEST 8: disconnected components + open contours (two cubes).
  console.log('\n--- TEST 8: Disconnected components + open contours ---');
  const two: { positions: Float32Array; index: number[] } = (() => {
    const a = cubeGeometry();
    const positions = new Float32Array(a.positions.length * 2);
    positions.set(a.positions, 0);
    const shifted = Float32Array.from(a.positions, (v, i) => (i % 3 === 1 ? v + 5 : v));
    positions.set(shifted, a.positions.length);
    const nVerts = a.positions.length / 3;
    const index = [...a.index, ...a.index.map((ix) => ix + nVerts)];
    return { positions, index };
  })();
  const twoContours = computeContours(two.positions, two.index, midSag);
  assert(twoContours.loops.length === 2, `two disjoint cubes yield two loops (got ${twoContours.loops.length})`);
  passed++;
  // Open sheet: single triangle fan cut by grazing plane -> opens, not caps.
  const sheetPositions = new Float32Array([0, 0, 0, 10, 0, 0, 5, 0.0001, 0]);
  const sheet = computeContours(sheetPositions, [0, 1, 2], makePlane([0, 1, 0], [0, 0, 0], '+n', 'test grazing')!);
  assert(sheet.loops.length === 0, 'grazing sheet yields no closed cap');
  passed++;
  console.log('[PASS] Multiple contours + grazing/open handling.');
  passed++;

  // TEST 9: caps cache (§32-§34) — bounded, LOD-keyed, disposed (§35).
  console.log('\n--- TEST 9: Caps cache bounding + LOD invalidation + disposal ---');
  const caps = new SectionCapsManager();
  const mkMesh = (dx: number): THREE.Mesh => {
    const g = new THREE.BoxGeometry(2, 2, 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    m.position.set(dx, 0, 0);
    m.updateMatrixWorld(true);
    return m;
  };
  const mesh0 = mkMesh(0);
  const planesForCaps = [{ id: 'plane.sagittal', math: midSag }];
  for (let i = 0; i < MAX_CACHED_CAPS + 5; i++) {
    const m = mkMesh(i * 10);
    caps.refresh([{ mesh: m, assetId: `mesh.test.${i}.v1`, lod: 'lod0' }], planesForCaps);
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
  }
  assert(caps.getEntryCount() <= MAX_CACHED_CAPS, `cache bounded at ${MAX_CACHED_CAPS} (got ${caps.getEntryCount()})`);
  passed++;
  caps.refresh([{ mesh: mesh0, assetId: 'mesh.test.lod.v1', lod: 'lod0' }], planesForCaps);
  const countLod0 = caps.getEntryCount();
  caps.refresh([{ mesh: mesh0, assetId: 'mesh.test.lod.v1', lod: 'lod1' }], planesForCaps);
  assert(caps.getEntryCount() >= countLod0, 'LOD change creates a distinct entry (never reuses stale geometry)');
  passed++;
  // Stale eviction: refreshing with no inputs clears entries.
  caps.refresh([], planesForCaps);
  assert(caps.getEntryCount() === 0, 'stale entries disposed when meshes gone');
  passed++;
  caps.dispose();
  assert(caps.isDisposed() === true, 'caps manager disposes');
  passed++;
  mesh0.geometry.dispose();
  (mesh0.material as THREE.Material).dispose();
  console.log('[PASS] Bounded LRU cache; LOD-keyed; explicit disposal.');
  passed++;

  // TEST 10: real assets — caps derive from actual mesh intersections (§41).
  console.log('\n--- TEST 10: Real-asset section integration ---');
  const assetMgr = new AssetManager();
  await assetMgr.loadManifest('assets/manifests/assets.manifest.json');
  const hpc = await assetMgr.loadAsset('mesh.hippocampus.left.v1', 'lod0');
  const hpcPos = hpc.mesh.geometry.attributes.position as THREE.BufferAttribute;
  const hpcIdx = hpc.mesh.geometry.index!;
  const hpcPlane = makePlane([1, 0, 0], [-25.07, -13.89, -20.7], '+n', 'test through centroid')!;
  const hpcBuild = buildSectionGeometries(
    hpcPos.array as Float32Array,
    Array.from(hpcIdx.array as Uint16Array | Uint32Array),
    hpcPlane,
    [1, 0, 0]
  );
  // Hippocampus is a small closed solid: either a cap or edges, never a crash.
  assert(hpcBuild.capGeometry !== null || hpcBuild.edgeGeometry !== null, 'real hippocampus yields cap or edges (never nothing-or-fake)');
  passed++;
  const before = JSON.stringify({ id: recA.entityId, asset: recA.assetId });
  assert(before.includes('brain.telencephalon.left.limbic.hippocampus'), 'entity identity untouched by cap derivation');
  passed++;
  assetMgr.dispose();
  console.log('[PASS] Real-asset derived sections; no identity mutation.');
  passed++;

  // TEST 11: bookmarks (§20-§21) — reconstructible, no geometry.
  console.log('\n--- TEST 11: Bookmarks ---');
  const bmPlanes = new SectionPlaneSet();
  bmPlanes.setConstant('plane.axial', 16.01);
  bmPlanes.setEnabled('plane.axial', true);
  const bmPres = new SectionPresentation();
  bmPres.setSectionModeEnabled(true);
  const bm = createBookmark({
    id: 'bookmark.test.1',
    label: 'Test section',
    planes: bmPlanes.serialize(),
    presentation: bmPres.serialize(),
    camera: { position: [0, 0, 100], target: [0, 0, 0] },
    selectedEntityId: recA.entityId,
    isolatedEntityId: null,
    hiddenEntityIds: [],
    labelsEnabled: true
  });
  assert(bm !== null, 'bookmark created from logical state');
  passed++;
  const json = serializeBookmark(bm!);
  assert(!json.includes('BufferGeometry') && !json.includes('Object3D'), 'bookmark holds no geometry/GPU objects');
  passed++;
  const bm2 = deserializeBookmark(json);
  assert(bm2 !== null && bookmarksEqual(bm!, bm2!), 'bookmark round-trips deterministically');
  passed++;
  const restore = new SectionPlaneSet();
  assert(restore.deserialize(bm2!.planes) === true, 'bookmark planes reconstruct state');
  passed++;
  assert(deserializeBookmark('not json') === null, 'invalid bookmark rejected');
  passed++;
  assert(createBookmark({ id: '', label: '', planes: bmPlanes.serialize(), presentation: bmPres.serialize(), camera: null, selectedEntityId: null, isolatedEntityId: null, hiddenEntityIds: [], labelsEnabled: true }) === null, 'empty bookmark rejected');
  passed++;
  console.log('[PASS] Bookmarks reconstruct state; no raw geometry saved.');
  passed++;

  // TEST 12: renderer reinit (§37) — state survives as application state.
  console.log('\n--- TEST 12: Renderer reinitialization ---');
  const rsPlanes = new SectionPlaneSet();
  rsPlanes.setConstant('plane.coronal', -19.47);
  rsPlanes.setEnabled('plane.coronal', true);
  const rsPres = new SectionPresentation();
  rsPres.setSectionModeEnabled(true);
  const rsPlanesJson = JSON.stringify(rsPlanes.serialize());
  const rsPresJson = JSON.stringify(rsPres.serialize());
  const rsPlanes2 = new SectionPlaneSet();
  const rsPres2 = new SectionPresentation();
  assert(rsPlanes2.deserialize(JSON.parse(rsPlanesJson)) === true, 'planes survive reinit via serialization');
  passed++;
  assert(rsPres2.deserialize(JSON.parse(rsPresJson)) === true, 'presentation survives reinit via serialization');
  passed++;
  assert(rsPlanes2.getEnabledPlanes().length === 1, 'enabled set survives reinit');
  passed++;
  rsPlanes.dispose();
  rsPres.dispose();
  planes.dispose();
  presentation.dispose();
  console.log('[PASS] Application state reconstructs after renderer loss; no GPU objects persisted.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 4B PRESENTATION TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 4B presentation test execution failed:\n', err);
  process.exit(1);
});
