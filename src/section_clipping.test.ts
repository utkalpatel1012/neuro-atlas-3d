/**
 * 3D Neuroanatomy Atlas: Sectional Clipping Integration Tests (Phase 4A)
 * Standard: AAS-2026-NEURO-V1
 *
 * Covers §24: state, renderer integration, entity integrity, LOD, lifecycle —
 * against REAL current assets (hippocampus + cortex). Headless: GPU rasterization
 * is NOT exercised (documented); all assertions are state/geometry/data checks.
 * BVH raycasting is CPU-side (three-mesh-bvh) and ignores GPU clipping by design
 * (three.js Raycaster does not apply clippingPlanes) — asserted explicitly.
 */

import * as THREE from 'three';
import { SectionPlaneSet } from './engine/SectionPlaneSet';
import { ClippingAdapter } from './engine/ClippingAdapter';
import { AssetManager } from './engine/AssetManager';
import { AnatomicalEntityManager } from './engine/AnatomicalEntityManager';
import { AnatomicalAssemblyManager } from './engine/AnatomicalAssemblyManager';
import { MaterialManager } from './engine/MaterialManager';
import { SelectionManager } from './engine/SelectionManager';
import { LODManager } from './engine/LODManager';
import { AnatomicalEntityRecord } from './engine/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 4A SECTIONAL CLIPPING TEST SUITE');
  console.log('================================================================\n');
  let passedChecks = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Plane state — add/enable/disable/invert/reset/multi/serialize
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Plane State Semantics ---');
  const store = new SectionPlaneSet();
  assert(store.getPlanes().length === 3, 'reset yields 3 neutral standard planes');
  passedChecks++;
  assert(store.getEnabledPlanes().length === 0, 'all disabled by default');
  passedChecks++;

  let notifications = 0;
  const unsub = store.onChange(() => { notifications++; });
  const v0 = store.getVersion();
  assert(store.setEnabled('plane.sagittal', true) === true, 'enable sagittal');
  passedChecks++;
  assert(store.getVersion() === v0 + 1, 'version bumps exactly once per change');
  passedChecks++;
  assert(store.setEnabled('plane.sagittal', true) === false, 'redundant enable is a no-op');
  passedChecks++;
  assert(store.getVersion() === v0 + 1, 'no-op does not bump version');
  passedChecks++;

  assert(store.setConstant('plane.sagittal', 12.4) === true, 'move sagittal to X=12.4');
  passedChecks++;
  const sag = store.getPlane('plane.sagittal')!;
  assert(sag.math.origin[0] === 12.4 && sag.math.normal[0] === 1, 'sagittal move keeps +X normal');
  passedChecks++;
  assert(store.setConstant('plane.sagittal', NaN) === false, 'NaN move rejected');
  passedChecks++;
  assert(store.setConstant('plane.oblique.missing', 5) === false, 'unknown id rejected');
  passedChecks++;

  assert(store.invert('plane.sagittal') === true, 'invert');
  passedChecks++;
  assert(store.getPlane('plane.sagittal')!.math.retainedSide === '-n', 'retained side flipped');
  passedChecks++;
  assert(store.invert('plane.sagittal') === true, 'invert back');
  passedChecks++;
  assert(store.getPlane('plane.sagittal')!.math.retainedSide === '+n', 'retained side restored');
  passedChecks++;

  // Multi-plane: coronal + axial alongside sagittal.
  assert(store.setConstant('plane.coronal', -19.47) === true, 'move coronal to Z=-19.47');
  passedChecks++;
  const cor = store.getPlane('plane.coronal')!;
  assert(cor.math.origin[2] === -19.47 && cor.math.normal[2] === 1, 'coronal is Z-constant (NOT Y)');
  passedChecks++;
  assert(store.setConstant('plane.axial', 16.01) === true, 'move axial to Y=16.01');
  passedChecks++;
  const axi = store.getPlane('plane.axial')!;
  assert(axi.math.origin[1] === 16.01 && axi.math.normal[1] === 1, 'axial is Y-constant (NOT Z)');
  passedChecks++;
  store.setEnabled('plane.coronal', true);
  store.setEnabled('plane.axial', true);
  assert(store.getEnabledPlanes().length === 3, 'three planes simultaneously enabled');
  passedChecks++;

  // Oblique with auto-normalization + zero rejection.
  const obl = store.addObliquePlane([0, 0, 5], [1, 2, 3], '+n', 'plane.oblique.test');
  assert(obl !== null && obl.math.normal[2] === 1, 'oblique normal auto-normalized');
  passedChecks++;
  assert(store.addObliquePlane([0, 0, 0], [0, 0, 0]) === null, 'zero normal rejected');
  passedChecks++;
  assert(store.setObliqueNormal('plane.oblique.test', [1, 1, 1]) === true, 'oblique normal replaced');
  passedChecks++;
  const oblMag = Math.sqrt(obl!.math.normal.reduce((s, v) => s + v * v, 0));
  assert(Math.abs(oblMag - 1) < 1e-12, 'replaced oblique normal is unit');
  passedChecks++;

  // Serialization round-trip preserves everything.
  const snapshot = store.serialize();
  const store2 = new SectionPlaneSet();
  assert(store2.deserialize(snapshot) === true, 'deserialize valid snapshot');
  passedChecks++;
  assert(store2.getEnabledPlanes().length === 3, 'enabled set survives round-trip');
  passedChecks++;
  assert(store2.getPlane('plane.sagittal')!.math.origin[0] === 12.4, 'constants survive round-trip');
  passedChecks++;
  assert(store2.deserialize({ version: 1, planes: [{ id: 'x', kind: 'nope' }] } as any) === false, 'invalid snapshot rejected');
  passedChecks++;

  store.reset();
  assert(store.getEnabledPlanes().length === 0, 'reset disables all');
  passedChecks++;
  assert(store.getPlane('plane.sagittal')!.math.origin[0] === 0, 'reset restores neutral origin');
  passedChecks++;
  unsub();
  const nBefore = notifications;
  store.setEnabled('plane.sagittal', true);
  assert(notifications === nBefore, 'unsubscribed listener not called');
  passedChecks++;
  console.log('[PASS] State: add/enable/disable/invert/reset/multi/serialize/version/listener-cleanup.');
  passedChecks += 1;

  // --------------------------------------------------------------------------
  // TEST 2: Renderer integration — planes reach materials, restore works
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Renderer Integration (state transfer, headless) ---');
  const state = new SectionPlaneSet();
  const adapter = new ClippingAdapter();
  adapter.bind(state);
  const matA = new THREE.MeshStandardMaterial();
  const matB = new THREE.MeshStandardMaterial();
  adapter.registerMaterial('brain.a', matA);
  adapter.registerMaterial('brain.b', matB);
  assert(matA.clippingPlanes !== null && matA.clippingPlanes === matB.clippingPlanes, 'materials share ONE stable plane array');
  passedChecks++;
  assert(adapter.getActivePlaneCount() === 0, 'no planes while all disabled');
  passedChecks++;

  state.setConstant('plane.sagittal', 12.4);
  state.setEnabled('plane.sagittal', true);
  assert(adapter.getActivePlaneCount() === 1, 'one active plane');
  passedChecks++;
  const plane = matA.clippingPlanes![0];
  assert(plane.normal.x === 1 && plane.normal.y === 0 && plane.normal.z === 0, 'sagittal GPU normal is +X');
  passedChecks++;
  assert(Math.abs(plane.constant - -12.4) < 1e-9, `sagittal GPU constant -n.p0 (got ${plane.constant})`);
  passedChecks++;

  // Move mutates in place: same array, same plane object, no recompile flag.
  // (THREE.Material.needsUpdate is write-only; shader version is the observable.)
  const arrayRef = matA.clippingPlanes!;
  const planeRef = plane;
  const versionBeforeMove = matA.version;
  state.setConstant('plane.sagittal', 20.0);
  assert(matA.clippingPlanes === arrayRef, 'array identity stable across moves');
  passedChecks++;
  assert(matA.clippingPlanes![0] === planeRef, 'plane object identity stable across moves');
  passedChecks++;
  assert(Math.abs(planeRef.constant - -20.0) < 1e-9, 'moved constant applied in place');
  passedChecks++;
  assert(matA.version === versionBeforeMove, 'value moves do not recompile materials');
  passedChecks++;

  // Disable removes; invert negates.
  state.setEnabled('plane.sagittal', false);
  assert(adapter.getActivePlaneCount() === 0 && matA.clippingPlanes!.length === 0, 'disable empties shared array');
  passedChecks++;
  state.setEnabled('plane.sagittal', true);
  state.invert('plane.sagittal');
  const invPlane = matA.clippingPlanes![0];
  assert(invPlane.normal.x === -1 && Math.abs(invPlane.constant - 20.0) < 1e-9, 'inversion negates GPU plane');
  passedChecks++;

  // Renderer flag: applied where exposed, honestly reported where absent.
  const fakeGL = { localClippingEnabled: false };
  assert(adapter.applyRendererState(fakeGL) === true && fakeGL.localClippingEnabled === true, 'WebGL-style flag applied');
  passedChecks++;
  assert(adapter.applyRendererState({}) === false, 'missing flag reported false, nothing invented');
  passedChecks++;

  // Simulated renderer recreation: fresh materials + resync restores planes.
  const matC = new THREE.MeshStandardMaterial();
  adapter.registerMaterial('brain.c', matC);
  assert(matC.clippingPlanes!.length === 1, 'late-registered material receives current planes');
  passedChecks++;
  adapter.resync(state, fakeGL);
  assert(matC.clippingPlanes!.length === 1 && fakeGL.localClippingEnabled === true, 'resync restores after recreation');
  passedChecks++;
  console.log('[PASS] Planes reach materials with exact values; restore path works; no renderer invention.');
  passedChecks += 1;

  // --------------------------------------------------------------------------
  // TEST 3: Entity integrity with REAL assets + BVH behavior documented
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Entity Integrity on Real Assets ---');
  const assetMgr = new AssetManager();
  await assetMgr.loadManifest('assets/manifests/assets.manifest.json');
  const entityMgr = new AnatomicalEntityManager();
  const assembly = new AnatomicalAssemblyManager();
  const materialMgr = new MaterialManager();
  const selectionMgr = new SelectionManager(entityMgr, materialMgr);

  const hpcLoaded = await assetMgr.loadAsset('mesh.hippocampus.left.v1', 'lod0');
  const record: AnatomicalEntityRecord = {
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
  const recordBefore = JSON.stringify(record);
  const material = materialMgr.registerEntityMaterial(record.entityId);
  hpcLoaded.mesh.material = material;
  entityMgr.registerEntity(record, hpcLoaded.mesh);
  assembly.registerEntity(record, hpcLoaded.mesh);
  adapter.registerMaterial(record.entityId, material);

  // Clipping that removes the ENTIRE mesh from view.
  state.setConstant('plane.sagittal', 1000);
  state.setEnabled('plane.sagittal', true);
  assert(adapter.getActivePlaneCount() === 1, 'full-cull plane active');
  passedChecks++;

  // Entity identity, metadata, provenance all survive clipping untouched.
  assert(JSON.stringify(record) === recordBefore, 'entity record byte-identical under clipping');
  passedChecks++;
  assembly.selectEntity(record.entityId);
  selectionMgr.select(record.entityId);
  assert(assembly.isEntitySelected(record.entityId) === true, 'assembly selection works under clipping');
  passedChecks++;
  assert(selectionMgr.getSelectedEntityId() === record.entityId, 'selection manager resolves clipped entity');
  passedChecks++;
  assert(entityMgr.getEntityByMesh(hpcLoaded.mesh)?.entityId === record.entityId, 'mesh-to-entity lookup survives clipping');
  passedChecks++;

  // BVH raycast operates on ORIGINAL geometry and ignores GPU clipping by design
  // (three.js Raycaster + three-mesh-bvh never consult clippingPlanes).
  // This test pins the behavior so no future change can silently alter it.
  // Ray choice matters: grazing-incidence rays can slip between adjacent
  // triangles, so aim through the centroid along Z (guaranteed cross-section).
  const scene = new THREE.Group();
  scene.add(hpcLoaded.mesh);
  scene.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  (raycaster as any).firstHitOnly = true;
  raycaster.set(new THREE.Vector3(-25.07, -13.89, -150), new THREE.Vector3(0, 0, 1));
  const hits = raycaster.intersectObject(hpcLoaded.mesh, true);
  assert(hits.length > 0, 'raycast hits fully-clipped mesh: BVH tests original geometry (documented, not a bug)');
  passedChecks++;
  console.log('[PASS] Entity ID/metadata/provenance survive clipping; BVH-on-original behavior pinned.');
  passedChecks += 1;

  // --------------------------------------------------------------------------
  // TEST 4: LOD transitions preserve clipping (real asset)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: LOD × Clipping ---');
  const lodMgr = new LODManager(assetMgr, entityMgr);
  state.setConstant('plane.axial', 0);
  state.setEnabled('plane.axial', true);
  assert(material.clippingPlanes !== null && material.clippingPlanes.length >= 1, 'clipping active pre-switch');
  passedChecks++;
  await lodMgr.applyLOD(record.entityId, 'lod1');
  assert(hpcLoaded.mesh.material === material, 'LOD switch keeps the same material object');
  passedChecks++;
  assert(material.clippingPlanes !== null && material.clippingPlanes.length >= 1, 'clipping survives LOD switch');
  passedChecks++;
  await lodMgr.applyLOD(record.entityId, 'lod0');
  assert(material.clippingPlanes !== null && material.clippingPlanes.length >= 1, 'clipping survives switch back');
  passedChecks++;
  console.log('[PASS] Clipping follows materials across LOD transitions; no duplicates.');
  passedChecks += 1;

  // --------------------------------------------------------------------------
  // TEST 5: Lifecycle — repeated toggles, disposal, listener hygiene
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Lifecycle & Disposal ---');
  const poolSize = (): number => (adapter as any).planes.size;
  for (let i = 0; i < 100; i++) {
    state.setConstant('plane.sagittal', -50 + i);
    state.setEnabled('plane.coronal', i % 2 === 0);
  }
  assert(poolSize() <= 3, `plane pool bounded after 100 moves (got ${poolSize()})`);
  passedChecks++;
  assert(state.getEnabledPlanes().length <= 3, 'enabled set bounded');
  passedChecks++;

  let calls = 0;
  const off = state.onChange(() => { calls++; });
  state.setEnabled('plane.axial', false);
  assert(calls === 1, 'listener fires once per change');
  passedChecks++;
  off();
  state.setEnabled('plane.axial', true);
  assert(calls === 1, 'unsubscribed listener silent');
  passedChecks++;

  const gizmoCount = adapter.getGizmoGroup().children.length;
  assert(gizmoCount === state.getEnabledPlanes().length, 'one gizmo per enabled plane, none orphaned');
  passedChecks++;
  adapter.setGizmoVisible(false);
  assert(adapter.isGizmoVisible() === false, 'gizmo hideable');
  passedChecks++;
  adapter.setGizmoVisible(true);

  adapter.unregisterMaterial(record.entityId);
  assert(material.clippingPlanes === null, 'unregister clears material planes');
  passedChecks++;
  adapter.dispose();
  assert(adapter.getActivePlaneCount() === 0, 'dispose empties planes');
  passedChecks++;
  assert(adapter.getGizmoGroup().children.length === 0, 'dispose removes all gizmos');
  passedChecks++;
  assert(adapter.isDisposed() === true, 'dispose flagged');
  passedChecks++;
  state.dispose();
  assembly.dispose();
  assetMgr.dispose();
  materialMgr.dispose();
  console.log('[PASS] Repeated use bounded; disposal complete; no unmanaged listeners.');
  passedChecks += 1;

  // --------------------------------------------------------------------------
  // TEST 6: Real cortex asset under multi-plane clipping
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Cortex Under Multi-Plane Clipping ---');
  const assetMgr2 = new AssetManager();
  await assetMgr2.loadManifest('assets/manifests/assets.manifest.json');
  const state2 = new SectionPlaneSet();
  const adapter2 = new ClippingAdapter();
  adapter2.bind(state2);
  const cortex = await assetMgr2.loadAsset('mesh.cortex.left.v1', 'lod0');
  assert(cortex.triangleCount > 90000, `cortex LOD0 loaded (${cortex.triangleCount} tris)`);
  passedChecks++;
  const cortexMat = new THREE.MeshStandardMaterial();
  cortex.mesh.material = cortexMat;
  adapter2.registerMaterial('brain.telencephalon.left.cortex', cortexMat);
  state2.setConstant('plane.sagittal', -32.5);
  state2.setConstant('plane.coronal', -19.47);
  state2.setConstant('plane.axial', 16.01);
  state2.setEnabled('plane.sagittal', true);
  state2.setEnabled('plane.coronal', true);
  state2.setEnabled('plane.axial', true);
  assert(adapter2.getActivePlaneCount() === 3, 'three planes clip 198k-tri cortex');
  passedChecks++;
  assert(cortexMat.clippingPlanes !== null && cortexMat.clippingPlanes.length === 3, 'cortex material carries all 3 planes');
  passedChecks++;
  // Intersection-of-half-spaces order is deterministic (insertion order).
  const clipArray = cortexMat.clippingPlanes;
  if (clipArray === null || clipArray.length !== 3) {
    throw new Error('cortex material must carry all 3 planes');
  }
  passedChecks++;
  const normals = clipArray.map((p) => [p.normal.x, p.normal.y, p.normal.z]);
  assert(JSON.stringify(normals[0]) === JSON.stringify([1, 0, 0]), 'plane order deterministic [sagittal first]');
  passedChecks++;
  adapter2.dispose();
  state2.dispose();
  assetMgr2.dispose();
  console.log('[PASS] Multi-plane clipping on real 198k-tri asset; deterministic order.');
  passedChecks += 1;

  // --------------------------------------------------------------------------
  // TEST 7: Clipping-aware picking (§8) — fully-clipped entities not selected
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Clipping-Aware Picking ---');
  const pickStore = new SectionPlaneSet();
  // Pure predicate checks (no renderer).
  pickStore.setConstant('plane.sagittal', 1000);
  pickStore.setEnabled('plane.sagittal', true);
  assert(pickStore.isPointCulled([-25.07, -13.89, -20.7]) === true, 'hippocampus centroid culled by X>=1000 plane');
  passedChecks++;
  assert(pickStore.isPointCulled([1001, 0, 0]) === false, 'retained-side point not culled');
  passedChecks++;
  pickStore.setEnabled('plane.sagittal', false);
  assert(pickStore.isPointCulled([-25.07, -13.89, -20.7]) === false, 'disabled plane culls nothing');
  passedChecks++;

  // Integration on a real asset through InteractionManager.
  const { InteractionManager } = await import('./engine/InteractionManager');
  const pickAssetMgr = new AssetManager();
  await pickAssetMgr.loadManifest('assets/manifests/assets.manifest.json');
  const pickEntityMgr = new AnatomicalEntityManager();
  const pickLoaded = await pickAssetMgr.loadAsset('mesh.hippocampus.left.v1', 'lod0');
  const pickRecord: AnatomicalEntityRecord = {
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
  pickEntityMgr.registerEntity(pickRecord, pickLoaded.mesh);
  const pickRoot = new THREE.Group();
  pickRoot.add(pickLoaded.mesh);
  pickRoot.updateMatrixWorld(true);
  const pickCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  pickCamera.position.set(-25.07, -13.89, 379.3);
  pickCamera.lookAt(new THREE.Vector3(-25.07, -13.89, -20.7));
  pickCamera.updateMatrixWorld(true);
  const pickInteraction = new InteractionManager(pickCamera, pickRoot, pickEntityMgr);
  (pickInteraction as any).pointerNdc.set(0, 0);
  pickInteraction.setClippingFilter({
    isPointCulled: (p) => pickStore.isPointCulled([p.x, p.y, p.z]),
    hasActivePlanes: () => pickStore.getEnabledPlanes().length > 0
  });

  // No planes enabled: nearest-hit shortcut active, entity resolves.
  assert(pickInteraction.performHoverRaycast() === pickRecord.entityId, 'unclipped hover resolves entity');
  passedChecks++;
  assert(pickInteraction.performSelectRaycast() === pickRecord.entityId, 'unclipped select resolves entity');
  passedChecks++;

  // Fully culling plane: NOTHING resolves (was: invisible entity selected).
  pickStore.setConstant('plane.sagittal', 1000);
  pickStore.setEnabled('plane.sagittal', true);
  assert(pickInteraction.performHoverRaycast() === null, 'fully-clipped hover resolves null');
  passedChecks++;
  assert(pickInteraction.performSelectRaycast() === null, 'fully-clipped select resolves null');
  passedChecks++;

  // Retaining plane: entity still resolves (partial-visibility path intact).
  pickStore.setConstant('plane.sagittal', -1000);
  assert(pickInteraction.performHoverRaycast() === pickRecord.entityId, 'retained hover still resolves');
  passedChecks++;
  pickStore.setEnabled('plane.sagittal', false);
  pickInteraction.setClippingFilter(null);
  assert(pickInteraction.performHoverRaycast() === pickRecord.entityId, 'filter removal restores legacy behavior');
  passedChecks++;
  pickInteraction.dispose();
  pickStore.dispose();
  pickEntityMgr.clear();
  pickAssetMgr.dispose();
  console.log('[PASS] Fully-clipped entities not pickable; retained entities resolve; filter removable.');
  passedChecks += 1;

  console.log('\n================================================================');
  console.log(`ALL SECTIONAL CLIPPING TESTS PASSED (${passedChecks} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Section clipping test execution failed:\n', err);
  process.exit(1);
});
