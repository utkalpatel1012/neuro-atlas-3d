/**
 * 3D Neuroanatomy Atlas: Rendering Engine Automated Test Suite
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Verifies capabilities, scene hierarchy, material shaders, asset ingestion,
 * BVH acceleration, entity registration, selection, visibility isolation,
 * LOD switching, reference-counting, and telemetry.
 */

import * as THREE from 'three';
import { RendererManager } from './engine/RendererManager';
import { SceneManager } from './engine/SceneManager';
import { CameraManager } from './engine/CameraManager';
import { MaterialManager } from './engine/MaterialManager';
import { AssetManager } from './engine/AssetManager';
import { AnatomicalEntityManager } from './engine/AnatomicalEntityManager';
import { SelectionManager } from './engine/SelectionManager';
import { VisibilityManager } from './engine/VisibilityManager';
import { LODManager } from './engine/LODManager';
import { PerformanceManager } from './engine/PerformanceManager';
import { ResourceManager } from './engine/ResourceManager';
import { AnatomicalEntityRecord } from './engine/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('NEURO ATLAS 3D: PHASE 2.0 RENDERING ENGINE TEST SUITE');
  console.log('====================================================\n');

  // TEST 1: Capability Detection & Environment Checks
  console.log('TEST 1: Capability Detection & Environment Checks...');
  const rendererMgr = new RendererManager();
  assert(rendererMgr.getPerformanceProfile().id === 'HIGH', 'Default profile is HIGH');
  const caps = await RendererManager.checkCapabilities();
  assert(typeof caps.hasWebGPU === 'boolean', 'Capability report includes hasWebGPU boolean');
  assert(typeof caps.hasWebGL2 === 'boolean', 'Capability report includes hasWebGL2 boolean');
  assert(['webgpu', 'webgl2', 'webgl', 'unsupported'].includes(caps.preferredBackend), 'Preferred backend is valid enum');
  console.log(`  ✓ Capabilities detected: Preferred Backend = ${caps.preferredBackend}, Device = ${caps.deviceType}`);

  // TEST 2: Scene Hierarchy & Lighting Calibration
  console.log('\nTEST 2: Scene Hierarchy & Lighting Calibration...');
  const sceneMgr = new SceneManager();
  const scene = sceneMgr.getScene();
  const anatomyRoot = sceneMgr.getAnatomyRoot();
  const brainRoot = sceneMgr.getBrainRoot();
  const refRoot = sceneMgr.getReferenceRoot();
  const visRoot = sceneMgr.getVisualizationRoot();

  assert(scene.children.includes(anatomyRoot), 'Scene contains anatomyRoot');
  assert(anatomyRoot.children.includes(brainRoot), 'anatomyRoot contains brainRoot');
  assert(anatomyRoot.children.includes(refRoot), 'anatomyRoot contains referenceRoot');
  assert(anatomyRoot.children.includes(visRoot), 'anatomyRoot contains visualizationRoot');
  assert(sceneMgr.isGridVisible(), 'Grid is visible by default');
  assert(sceneMgr.isOriginMarkerVisible(), 'AC-PC origin marker is visible by default');

  sceneMgr.setGridVisible(false);
  assert(!sceneMgr.isGridVisible(), 'Grid visibility toggles off');
  sceneMgr.setGridVisible(true);
  console.log('  ✓ 3-tier scene hierarchy and stereotaxic references verified');

  // TEST 3: Camera Manager & Viewing Presets
  console.log('\nTEST 3: Camera Manager & Presets...');
  const cameraMgr = new CameraManager(1920, 1080);
  const camera = cameraMgr.getCamera();
  assert(camera.fov === 45, 'Camera field of view is 45 degrees');
  assert(camera.near === 1.0, 'Camera near clipping plane is 1.0 mm');
  assert(camera.far === 2000.0, 'Camera far clipping plane is 2000.0 mm');

  const origin = new THREE.Vector3(0, 0, 0);
  cameraMgr.setPreset('anterior', origin, 0);
  // Phase 3.1 (D3): measured canonical +Z is POSTERIOR, so the anterior
  // (frontal) viewpoint sits at -Z. Pre-3.1 asserted +Z (occiput side).
  assert(camera.position.z < origin.z, 'Anterior view positions camera at frontal (-Z) side');

  cameraMgr.setPreset('posterior', origin, 0);
  assert(camera.position.z > origin.z, 'Posterior view positions camera at occipital (+Z) side');

  cameraMgr.setPreset('superior', origin, 0);
  assert(camera.position.y > origin.y, 'Superior view positions camera above (+Y)');
  console.log('  ✓ Camera projection parameters and anatomical view presets verified');

  // TEST 4: Material System & Visual States
  console.log('\nTEST 4: Material System & Visual States...');
  const materialMgr = new MaterialManager();
  const testMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
  const testMat = materialMgr.registerEntityMaterial('test.structure');
  testMesh.material = testMat;

  assert(testMat.color.getHex() === MaterialManager.DEFAULT_HIPPOCAMPUS_COLOR, 'Default allocortex color is limbic beige');
  assert(!testMat.transparent, 'Default material is opaque');

  materialMgr.setEntityState(testMesh, 'test.structure', 'HOVER');
  assert(testMat.emissiveIntensity > 0, 'Hover state enables emissive highlight');

  materialMgr.setEntityState(testMesh, 'test.structure', 'SELECTED');
  assert(testMat.emissiveIntensity === 0.40, 'Selected state applies 0.40 emissive glow');

  materialMgr.setEntityState(testMesh, 'test.structure', 'GHOSTED');
  assert(testMat.transparent === true, 'Ghosted state enables transparency');
  assert(testMat.opacity === 0.12, 'Ghosted opacity is 0.12');
  assert(testMat.depthWrite === false, 'Ghosted state disables depthWrite to avoid z-sorting artifacts');

  materialMgr.setEntityState(testMesh, 'test.structure', 'DEFAULT');
  assert(!testMat.transparent && testMat.opacity === 1.0, 'Default state restores opacity');
  console.log('  ✓ MaterialManager states (DEFAULT, HOVER, SELECTED, GHOSTED) verified');

  // TEST 5: Asset Ingestion, Meshopt Decompression & BVH Acceleration
  console.log('\nTEST 5: Asset Ingestion & Meshopt Decompression...');
  const assetMgr = new AssetManager();
  await assetMgr.loadManifest('assets/manifests/assets.manifest.json');
  const provenance = assetMgr.getAssetProvenance('mesh.hippocampus.left.v1');
  assert(provenance.dataset_name.includes('BodyParts3D'), 'Provenance matches BodyParts3D');

  const lod0 = await assetMgr.loadAsset('mesh.hippocampus.left.v1', 'lod0');
  assert(lod0.triangleCount === 4280, `LOD0 triangle count (${lod0.triangleCount}) === 4,280`);
  assert(!!(lod0.geometry as any).boundsTree, 'LOD0 geometry has three-mesh-bvh boundsTree computed');

  const lod3 = await assetMgr.loadAsset('mesh.hippocampus.left.v1', 'lod3');
  assert(lod3.triangleCount === 1070, `LOD3 triangle count (${lod3.triangleCount}) === 1,070`);
  assert(lod3.triangleCount < lod0.triangleCount, 'LOD3 has fewer triangles than LOD0');
  console.log(`  ✓ Meshopt GLB loaded successfully: LOD0=${lod0.triangleCount} tris, LOD3=${lod3.triangleCount} tris with BVH acceleration`);

  // TEST 6: Anatomical Entity Manager
  console.log('\nTEST 6: Anatomical Entity Manager...');
  const entityMgr = new AnatomicalEntityManager();
  const sampleRecord: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.left.limbic.hippocampus',
    assetId: 'mesh.hippocampus.left.v1',
    name: 'Left Hippocampus',
    officialLatin: 'hippocampus sinister',
    laterality: 'left',
    canonicalCentroidMm: [-25.2, -20.6, -11.4],
    dimensionsMm: [18.9, 20.78, 40.55],
    volumeCm3: 1.87,
    topologyClass: '2-manifold',
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'FJ3162'
  };

  entityMgr.registerEntity(sampleRecord, lod0.mesh);
  assert(entityMgr.hasEntity('brain.telencephalon.left.limbic.hippocampus'), 'Entity is registered in registry');
  assert(entityMgr.getEntityCount() === 1, 'Entity count is 1');
  assert(lod0.mesh.userData.neuroAtlas.entityId === sampleRecord.entityId, 'Mesh userData contains entityId');
  assert(entityMgr.getEntityByMesh(lod0.mesh)?.entityId === sampleRecord.entityId, 'Bidirectional mesh-to-entity lookup succeeds');
  console.log('  ✓ AnatomicalEntityManager entity-to-mesh bidirectional registry verified');

  // TEST 7: Selection and Visibility Isolation
  console.log('\nTEST 7: Selection & Visibility Isolation...');
  const selectMgr = new SelectionManager(entityMgr, materialMgr);
  let selectionNotified = false;
  selectMgr.onSelectionChanged((id, rec) => {
    if (id === sampleRecord.entityId && rec?.name === 'Left Hippocampus') {
      selectionNotified = true;
    }
  });

  selectMgr.select(sampleRecord.entityId);
  assert(selectMgr.getSelectedEntityId() === sampleRecord.entityId, 'Selected entity matches');
  assert(selectionNotified, 'Selection change listener fired');

  const visMgr = new VisibilityManager(entityMgr, materialMgr, true);
  visMgr.isolate(sampleRecord.entityId);
  assert(visMgr.isIsolated(sampleRecord.entityId), 'Structure is isolated');

  visMgr.restoreAll();
  assert(!visMgr.isIsolated(sampleRecord.entityId), 'Isolation restored');
  console.log('  ✓ SelectionManager & VisibilityManager isolation/restore flow verified');

  // TEST 8: Continuous Distance-Based LOD Manager
  console.log('\nTEST 8: LOD Manager & Geometry Swapping...');
  const lodMgr = new LODManager(assetMgr, entityMgr);
  assert(lodMgr.getActiveLOD(sampleRecord.entityId) === 'lod0', 'Initial active LOD is lod0');

  // Manually override to LOD2
  await lodMgr.setMode('LOD2');
  assert(lodMgr.getMode() === 'LOD2', 'LOD mode set to LOD2');
  assert(lod0.mesh.userData.activeLOD === 'lod2', 'Mesh geometry swapped to LOD2');

  // Switch to AUTO and test camera distance update
  await lodMgr.setMode('AUTO');
  assert(lodMgr.getMode() === 'AUTO', 'LOD mode set to AUTO');

  // Place camera far away (400 mm)
  camera.position.set(-25.2, -20.6, 400);
  camera.updateMatrixWorld();
  lodMgr.update(camera);
  // Wait a microtask for async load if needed
  await new Promise((r) => setTimeout(r, 20));
  assert(['lod2', 'lod3'].includes(lodMgr.getActiveLOD(sampleRecord.entityId)), 'Distant camera triggers low LOD');

  // Place camera close (50 mm)
  camera.position.set(-25.2, -20.6, 38.6);
  camera.updateMatrixWorld();
  lodMgr.update(camera);
  await new Promise((r) => setTimeout(r, 20));
  assert(lodMgr.getActiveLOD(sampleRecord.entityId) === 'lod0', 'Close camera triggers LOD0');
  console.log('  ✓ LODManager distance switching and geometry hot-swapping verified');

  // TEST 9: Resource Manager & Reference Counting
  console.log('\nTEST 9: Resource Manager & Deterministic Disposal...');
  const resourceMgr = new ResourceManager();
  const dummyGeom = new THREE.BufferGeometry();
  resourceMgr.retain('geom.test', dummyGeom, 'geometry');
  assert(resourceMgr.getRefCount('geom.test') === 1, 'Ref count is 1 after first retain');

  resourceMgr.retain('geom.test', dummyGeom, 'geometry');
  assert(resourceMgr.getRefCount('geom.test') === 2, 'Ref count is 2 after second retain');

  const released1 = resourceMgr.release('geom.test');
  assert(!released1, 'Not yet disposed while refCount > 0');
  assert(resourceMgr.getRefCount('geom.test') === 1, 'Ref count is now 1');

  const released2 = resourceMgr.release('geom.test');
  assert(released2, 'Disposed when refCount reached 0');
  assert(resourceMgr.getRefCount('geom.test') === 0, 'Ref count is 0');
  console.log('  ✓ ResourceManager reference counting and GPU buffer disposal verified');

  // TEST 10: Performance Manager & Rolling Telemetry
  console.log('\nTEST 10: Performance Manager & Rolling Telemetry...');
  const perfMgr = new PerformanceManager('webgpu', 'HIGH');
  assert(perfMgr.getProfile().id === 'HIGH', 'Default profile is HIGH');
  assert(perfMgr.getProfile().maxPixelRatio === 2.0, 'High profile pixel ratio is 2.0');

  perfMgr.setProfile('LOW');
  assert(perfMgr.getProfile().id === 'LOW', 'Switched profile to LOW');
  assert(perfMgr.getProfile().maxPixelRatio === 1.0, 'Low profile pixel ratio is 1.0');
  assert(perfMgr.getMetrics().activeBackend === 'webgpu', 'Backend reported correctly');
  console.log('  ✓ PerformanceManager telemetry metrics and adaptive profiling verified');

  console.log('\n====================================================');
  console.log('ALL PHASE 2.0 RENDERING ENGINE TESTS PASSED (10/10)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error during Phase 2.0 test execution:', err);
  process.exit(1);
});
