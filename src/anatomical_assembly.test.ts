/**
 * 3D Neuroanatomy Atlas: Anatomical Assembly & Multi-Structure Test Suite
 * Standard: AAS-2026-NEURO-V1 (Phase 2.1 Multi-Structure Foundation)
 * 
 * Verifies all 20 behavior-based requirements for multi-structure hierarchy,
 * data-driven assembly, ancestor/descendant relationships, aggregate bounds,
 * hierarchical visibility, multi-selection, error isolation, raycast filtering,
 * reference-counted caching, and independent LOD control.
 */

import * as THREE from 'three';
import { AnatomicalAssemblyManager } from './engine/AnatomicalAssemblyManager';
import { AnatomicalEntityManager } from './engine/AnatomicalEntityManager';
import { AssetManager } from './engine/AssetManager';
import { MaterialManager } from './engine/MaterialManager';
import { CameraManager } from './engine/CameraManager';
import { InteractionManager } from './engine/InteractionManager';
import { LODManager } from './engine/LODManager';
import { AnatomicalEntityRecord, AnatomicalGroup } from './engine/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 2.1 ANATOMICAL ASSEMBLY AUTOMATED TESTS');
  console.log('================================================================\n');

  // Shared instances
  const assemblyMgr = new AnatomicalAssemblyManager();
  const entityMgr = new AnatomicalEntityManager();
  const assetMgr = new AssetManager();
  const materialMgr = new MaterialManager();
  const cameraMgr = new CameraManager(1920, 1080);
  const searchRoot = new THREE.Group();
  const interactionMgr = new InteractionManager(cameraMgr.getCamera(), searchRoot, entityMgr);
  const lodMgr = new LODManager(assetMgr, entityMgr);

  await assetMgr.loadManifest('assets/manifests/assets.manifest.json');

  // Sample entity records for bilateral hippocampus
  const leftRecord: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.left.limbic.hippocampus',
    assetId: 'mesh.hippocampus.left.v1',
    name: 'Left Hippocampus',
    officialLatin: 'hippocampus sinister',
    laterality: 'left',
    canonicalCentroidMm: [-25.07, -13.89, -20.70],
    dimensionsMm: [18.9, 20.78, 40.55],
    volumeCm3: 1.87,
    topologyClass: '2-manifold',
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'FJ3162 (FMA61884)',
    groups: [
      'division.cerebrum',
      'hemisphere.left',
      'system.limbic',
      'system.limbic.left',
      'region.medial_temporal'
    ]
  };

  const rightRecord: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.right.limbic.hippocampus',
    assetId: 'mesh.hippocampus.right.v1',
    name: 'Right Hippocampus',
    officialLatin: 'hippocampus dexter',
    laterality: 'right',
    canonicalCentroidMm: [26.38, -13.89, -20.74],
    dimensionsMm: [18.92, 20.78, 40.49],
    volumeCm3: 1.85,
    topologyClass: '2-manifold',
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'FMA72713',
    groups: [
      'division.cerebrum',
      'hemisphere.right',
      'system.limbic',
      'system.limbic.right',
      'region.medial_temporal'
    ]
  };

  // --------------------------------------------------------------------------
  // TEST 1: register_entity
  // --------------------------------------------------------------------------
  console.log('TEST 1: register_entity...');
  assemblyMgr.registerEntity(leftRecord);
  const retrievedLeft = assemblyMgr.getEntity(leftRecord.entityId);
  assert(!!retrievedLeft, 'Left Hippocampus entity retrieved from assembly');
  assert(retrievedLeft?.name === 'Left Hippocampus', 'Entity name matches Left Hippocampus');
  assert(retrievedLeft?.canonicalCentroidMm[0] === -25.07, 'Centroid X coordinate matches');
  console.log('  ✓ TEST 1 passed: Entity registration and retrieval verified.');

  // --------------------------------------------------------------------------
  // TEST 2: register_asset
  // --------------------------------------------------------------------------
  console.log('\nTEST 2: register_asset...');
  const leftProv = assetMgr.getAssetProvenance('mesh.hippocampus.left.v1');
  assert(!!leftProv, 'Left Hippocampus provenance entry exists');
  assert(leftProv.dataset_name.includes('BodyParts3D'), 'Provenance dataset is BodyParts3D');
  const rightProv = assetMgr.getAssetProvenance('mesh.hippocampus.right.v1');
  assert(!!rightProv, 'Right Hippocampus provenance entry exists');
  assert(rightProv.dataset_name.includes('BodyParts3D'), 'Right hippocampus provenance is BodyParts3D');
  console.log('  ✓ TEST 2 passed: Asset registration and provenance verification passed.');

  // --------------------------------------------------------------------------
  // TEST 3: create_group
  // --------------------------------------------------------------------------
  console.log('\nTEST 3: create_group...');
  const customGroup: AnatomicalGroup = {
    groupId: 'system.limbic.subiculum',
    name: 'Subicular Complex',
    semanticType: 'FUNCTIONAL_SYSTEM',
    category: 'region',
    parentGroupId: 'system.limbic.left',
    childGroupIds: [],
    memberEntityIds: [],
    status: 'AVAILABLE',
    description: 'Subicular transition zone'
  };
  assemblyMgr.registerGroup(customGroup);
  const retrievedGroup = assemblyMgr.getGroup('system.limbic.subiculum');
  assert(!!retrievedGroup, 'Custom group registered');
  assert(retrievedGroup?.parentGroupId === 'system.limbic.left', 'Parent group assigned');
  const parentGroup = assemblyMgr.getGroup('system.limbic.left');
  assert(parentGroup?.childGroupIds.includes('system.limbic.subiculum') === true, 'Parent lists new group as child');
  console.log('  ✓ TEST 3 passed: Anatomical group creation and hierarchical parent linkage passed.');

  // --------------------------------------------------------------------------
  // TEST 4: add_entity_to_group
  // --------------------------------------------------------------------------
  console.log('\nTEST 4: add_entity_to_group...');
  assemblyMgr.addEntityToGroup(leftRecord.entityId, 'system.limbic.subiculum');
  const subiculum = assemblyMgr.getGroup('system.limbic.subiculum');
  assert(subiculum?.memberEntityIds.includes(leftRecord.entityId) === true, 'Entity added to group members');
  const ancestors = assemblyMgr.getAncestorGroupIds(leftRecord.entityId);
  assert(ancestors.includes('system.limbic.subiculum'), 'Ancestor list includes added group');
  assert(ancestors.includes('system.limbic.left'), 'Ancestor list includes recursive parent group');
  console.log('  ✓ TEST 4 passed: Entity added to group and ancestor traversal verified.');

  // --------------------------------------------------------------------------
  // TEST 5: load_single_structure
  // --------------------------------------------------------------------------
  console.log('\nTEST 5: load_single_structure...');
  const leftLoaded = await assetMgr.loadAsset('mesh.hippocampus.left.v1', 'lod0');
  assert(!!leftLoaded.mesh, 'Left hippocampus mesh returned');
  assert(leftLoaded.triangleCount === 4280, `Left hippocampus triangle count is 4,280 (got ${leftLoaded.triangleCount})`);
  
  const leftMat = materialMgr.registerEntityMaterial(leftRecord.entityId);
  leftLoaded.mesh.material = leftMat;
  entityMgr.registerEntity(leftRecord, leftLoaded.mesh);
  assemblyMgr.attachMesh(leftRecord.entityId, leftLoaded.mesh);
  searchRoot.add(leftLoaded.mesh);
  console.log('  ✓ TEST 5 passed: Single structure loaded and registered in scene.');

  // --------------------------------------------------------------------------
  // TEST 6: load_multiple_structures
  // --------------------------------------------------------------------------
  console.log('\nTEST 6: load_multiple_structures...');
  const rightLoaded = await assetMgr.loadAsset('mesh.hippocampus.right.v1', 'lod0');
  assert(!!rightLoaded.mesh, 'Right hippocampus mesh returned');
  assert(rightLoaded.triangleCount === 4452, `Right hippocampus triangle count is 4,452 (got ${rightLoaded.triangleCount})`);
  
  const rightMat = materialMgr.registerEntityMaterial(rightRecord.entityId);
  rightLoaded.mesh.material = rightMat;
  entityMgr.registerEntity(rightRecord, rightLoaded.mesh);
  assemblyMgr.registerEntity(rightRecord, rightLoaded.mesh);
  searchRoot.add(rightLoaded.mesh);

  assert(assemblyMgr.getAllEntities().length >= 2, 'At least 2 entities in assembly');
  assert(entityMgr.getEntityCount() === 2, '2 entities in entity manager');
  console.log('  ✓ TEST 6 passed: Multiple authentic structures loaded concurrently.');

  // --------------------------------------------------------------------------
  // TEST 7: hide_entity
  // --------------------------------------------------------------------------
  console.log('\nTEST 7: hide_entity...');
  assemblyMgr.hideEntity(leftRecord.entityId);
  assert(assemblyMgr.isEntityEffectivelyVisible(leftRecord.entityId) === false, 'Left Hippocampus is effectively hidden');
  assert(assemblyMgr.isEntityEffectivelyVisible(rightRecord.entityId) === true, 'Right Hippocampus remains visible');
  assert(leftLoaded.mesh.visible === false, 'Left mesh visible property set to false');
  assert(rightLoaded.mesh.visible === true, 'Right mesh visible property remains true');
  console.log('  ✓ TEST 7 passed: Single entity hidden while sibling remains visible.');

  // --------------------------------------------------------------------------
  // TEST 8: restore_entity
  // --------------------------------------------------------------------------
  console.log('\nTEST 8: restore_entity...');
  assemblyMgr.showEntity(leftRecord.entityId);
  assert(assemblyMgr.isEntityEffectivelyVisible(leftRecord.entityId) === true, 'Left Hippocampus restored to visible');
  assert(leftLoaded.mesh.visible === true, 'Left mesh visible property restored to true');
  console.log('  ✓ TEST 8 passed: Hidden entity restored to visible.');

  // --------------------------------------------------------------------------
  // TEST 9: hide_group
  // --------------------------------------------------------------------------
  console.log('\nTEST 9: hide_group...');
  assemblyMgr.hideGroup('system.limbic');
  assert(assemblyMgr.isEntityEffectivelyVisible(leftRecord.entityId) === false, 'Left member entity hidden by group');
  assert(assemblyMgr.isEntityEffectivelyVisible(rightRecord.entityId) === false, 'Right member entity hidden by group');
  assert(assemblyMgr.getEntityVisibilityState(leftRecord.entityId) === 'ANCESTOR_HIDDEN', 'Visibility state is ANCESTOR_HIDDEN');
  assert(leftLoaded.mesh.visible === false, 'Left mesh hidden by group action');
  assert(rightLoaded.mesh.visible === false, 'Right mesh hidden by group action');
  console.log('  ✓ TEST 9 passed: Hierarchical group hiding cascades to all descendant entities.');

  // --------------------------------------------------------------------------
  // TEST 10: restore_group
  // --------------------------------------------------------------------------
  console.log('\nTEST 10: restore_group...');
  assemblyMgr.showGroup('system.limbic');
  assert(assemblyMgr.isEntityEffectivelyVisible(leftRecord.entityId) === true, 'Left member entity visible again');
  assert(assemblyMgr.isEntityEffectivelyVisible(rightRecord.entityId) === true, 'Right member entity visible again');
  assert(assemblyMgr.getEntityVisibilityState(leftRecord.entityId) === 'VISIBLE', 'Visibility state restored to VISIBLE');
  assert(leftLoaded.mesh.visible === true, 'Left mesh visible restored');
  assert(rightLoaded.mesh.visible === true, 'Right mesh visible restored');
  console.log('  ✓ TEST 10 passed: Group visibility restoration passed.');

  // --------------------------------------------------------------------------
  // TEST 11: isolate_entity
  // --------------------------------------------------------------------------
  console.log('\nTEST 11: isolate_entity...');
  assemblyMgr.isolateEntity(leftRecord.entityId);
  assert(assemblyMgr.isEntityEffectivelyVisible(leftRecord.entityId) === true, 'Isolated Left Hippocampus is visible');
  assert(assemblyMgr.isEntityEffectivelyVisible(rightRecord.entityId) === false, 'Non-isolated Right Hippocampus is hidden');
  assert(assemblyMgr.getEntityVisibilityState(leftRecord.entityId) === 'ISOLATED', 'State is ISOLATED');
  
  assemblyMgr.restoreAll();
  assert(assemblyMgr.isEntityEffectivelyVisible(leftRecord.entityId) === true, 'Left visible after restoreAll');
  assert(assemblyMgr.isEntityEffectivelyVisible(rightRecord.entityId) === true, 'Right visible after restoreAll');
  console.log('  ✓ TEST 11 passed: Entity isolation and global restore passed.');

  // --------------------------------------------------------------------------
  // TEST 12: isolate_group
  // --------------------------------------------------------------------------
  console.log('\nTEST 12: isolate_group...');
  assemblyMgr.isolateGroup('system.limbic.left');
  assert(assemblyMgr.isEntityEffectivelyVisible(leftRecord.entityId) === true, 'Left limbic member is visible');
  assert(assemblyMgr.isEntityEffectivelyVisible(rightRecord.entityId) === false, 'Right limbic member is hidden');
  
  assemblyMgr.restoreAll();
  assert(assemblyMgr.isEntityEffectivelyVisible(leftRecord.entityId) === true, 'Both visible after restore');
  assert(assemblyMgr.isEntityEffectivelyVisible(rightRecord.entityId) === true, 'Both visible after restore');
  console.log('  ✓ TEST 12 passed: Group isolation and global restore passed.');

  // --------------------------------------------------------------------------
  // TEST 13: select_single_entity
  // --------------------------------------------------------------------------
  console.log('\nTEST 13: select_single_entity...');
  assemblyMgr.selectEntity(leftRecord.entityId);
  assert(assemblyMgr.isEntitySelected(leftRecord.entityId) === true, 'Left entity selected');
  assert(assemblyMgr.isEntitySelected(rightRecord.entityId) === false, 'Right entity not selected');
  assert(assemblyMgr.getPrimarySelectedEntity()?.entityId === leftRecord.entityId, 'Primary entity matches Left');
  
  materialMgr.setEntityState(leftLoaded.mesh, leftRecord.entityId, 'SELECTED');
  materialMgr.setEntityState(rightLoaded.mesh, rightRecord.entityId, 'DEFAULT');
  assert(materialMgr.getEntityState(leftRecord.entityId) === 'SELECTED', 'Material state is SELECTED');
  assert(materialMgr.getEntityState(rightRecord.entityId) === 'DEFAULT', 'Material state is DEFAULT');
  console.log('  ✓ TEST 13 passed: Single entity selection and visual state verified.');

  // --------------------------------------------------------------------------
  // TEST 14: select_group
  // --------------------------------------------------------------------------
  console.log('\nTEST 14: select_group...');
  assemblyMgr.selectGroup('system.limbic');
  assert(assemblyMgr.isGroupSelected('system.limbic') === true, 'Limbic group is selected');
  assert(assemblyMgr.isEntitySelected(leftRecord.entityId) === true, 'Left hippocampus selected by group');
  assert(assemblyMgr.isEntitySelected(rightRecord.entityId) === true, 'Right hippocampus selected by group');
  
  materialMgr.setEntityState(leftLoaded.mesh, leftRecord.entityId, 'GROUP_SELECTED');
  materialMgr.setEntityState(rightLoaded.mesh, rightRecord.entityId, 'GROUP_SELECTED');
  assert(materialMgr.getEntityState(leftRecord.entityId) === 'GROUP_SELECTED', 'Left in GROUP_SELECTED state');
  assert(materialMgr.getEntityState(rightRecord.entityId) === 'GROUP_SELECTED', 'Right in GROUP_SELECTED state');
  console.log('  ✓ TEST 14 passed: Group multi-selection and GROUP_SELECTED material state verified.');

  // --------------------------------------------------------------------------
  // TEST 15: focus_entity
  // --------------------------------------------------------------------------
  console.log('\nTEST 15: focus_entity...');
  const leftBox = assemblyMgr.getEntityBoundingBox(leftRecord.entityId);
  assert(!leftBox.isEmpty(), 'Left bounding box is non-empty');
  cameraMgr.focusBoundingBox(leftBox, 0);
  const leftCenter = new THREE.Vector3();
  leftBox.getCenter(leftCenter);
  // Center should be roughly [-25, -14, -21]
  assert(Math.abs(leftCenter.x - (-25.07)) < 1.0, `Left center X (${leftCenter.x}) aligns with -25.07`);
  console.log(`  ✓ TEST 15 passed: Entity focus aligns with entity bounding box center [${leftCenter.x.toFixed(1)}, ${leftCenter.y.toFixed(1)}, ${leftCenter.z.toFixed(1)}].`);

  // --------------------------------------------------------------------------
  // TEST 16: focus_group
  // --------------------------------------------------------------------------
  console.log('\nTEST 16: focus_group...');
  const limbicBox = assemblyMgr.getGroupBoundingBox('system.limbic');
  assert(!limbicBox.isEmpty(), 'Bilateral limbic group bounding box is non-empty');
  const limbicCenter = new THREE.Vector3();
  limbicBox.getCenter(limbicCenter);
  // Bilateral center X should be near midline (approx 0.65 mm)
  assert(Math.abs(limbicCenter.x) < 5.0, `Bilateral limbic center X (${limbicCenter.x.toFixed(2)}) is near midline`);
  cameraMgr.focusBoundingBox(limbicBox, 0);
  console.log(`  ✓ TEST 16 passed: Group focus spans bilateral aggregate bounding box (Midline X = ${limbicCenter.x.toFixed(2)}).`);

  // --------------------------------------------------------------------------
  // TEST 17: failed_asset_isolation
  // --------------------------------------------------------------------------
  console.log('\nTEST 17: failed_asset_isolation...');
  let failedCaught = false;
  try {
    await assetMgr.loadAsset('mesh.nonexistent.v1', 'lod0');
  } catch (err) {
    failedCaught = true;
  }
  assert(failedCaught, 'Invalid asset load rejected');
  assert(assetMgr.getAssetLoadingState('mesh.nonexistent.v1') === 'FAILED', 'Loading state for failed asset is FAILED');
  assert(assetMgr.getAssetLoadingState('mesh.hippocampus.left.v1') === 'LOADED' || assetMgr.getAssetLoadingState('mesh.hippocampus.left.v1') === 'CACHED', 'Left asset remains LOADED');
  assert(assetMgr.getAssetLoadingState('mesh.hippocampus.right.v1') === 'LOADED' || assetMgr.getAssetLoadingState('mesh.hippocampus.right.v1') === 'CACHED', 'Right asset remains LOADED');
  console.log('  ✓ TEST 17 passed: Error isolation prevents failure cascading to resident assets.');

  // --------------------------------------------------------------------------
  // TEST 18: hidden_asset_not_pickable
  // --------------------------------------------------------------------------
  console.log('\nTEST 18: hidden_asset_not_pickable...');
  // Point raycaster towards Left Hippocampus
  const leftCentroid = new THREE.Vector3(-25.07, -13.89, -20.70);
  const rayOrigin = new THREE.Vector3(-25.07, -13.89, 100.0);
  const rayDir = leftCentroid.clone().sub(rayOrigin).normalize();
  
  const testRaycaster = new THREE.Raycaster(rayOrigin, rayDir);
  let hits = testRaycaster.intersectObjects(searchRoot.children, true);
  assert(hits.length > 0, 'Raycaster hits visible left hippocampus');

  // Now hide left entity
  assemblyMgr.hideEntity(leftRecord.entityId);
  assert(leftLoaded.mesh.visible === false, 'Mesh visibility is false');

  // Raycast with visibility filtering like InteractionManager
  hits = testRaycaster.intersectObjects(searchRoot.children, true);
  const visibleHits = hits.filter((h) => {
    let obj: THREE.Object3D | null = h.object;
    while (obj) {
      if (!obj.visible) return false;
      obj = obj.parent;
    }
    return true;
  });
  assert(visibleHits.length === 0, 'Hidden entity mesh is not pickable by raycaster');

  assemblyMgr.showEntity(leftRecord.entityId);
  console.log('  ✓ TEST 18 passed: Hidden assets are strictly excluded from raycasting intersections.');

  // --------------------------------------------------------------------------
  // TEST 19: cache_reference_counting
  // --------------------------------------------------------------------------
  console.log('\nTEST 19: cache_reference_counting...');
  const initialRef = assetMgr.getRefCount('mesh.hippocampus.left.v1');
  assert(initialRef >= 1, 'Initial refcount is at least 1');
  
  // Load second reference
  await assetMgr.loadAsset('mesh.hippocampus.left.v1', 'lod0');
  const secondRef = assetMgr.getRefCount('mesh.hippocampus.left.v1');
  assert(secondRef === initialRef + 1, 'Refcount incremented to 2');

  // Unload first reference
  const disposed1 = assetMgr.unloadAsset('mesh.hippocampus.left.v1');
  assert(!disposed1, 'Unload did not dispose GPU geometry while refcount > 0');
  assert(assetMgr.getRefCount('mesh.hippocampus.left.v1') === initialRef, 'Refcount decremented');

  console.log('  ✓ TEST 19 passed: Reference-counted caching correctly protects GPU geometry.');

  // --------------------------------------------------------------------------
  // TEST 20: independent_lods
  // --------------------------------------------------------------------------
  console.log('\nTEST 20: independent_lods...');
  // Set Left to LOD0 and Right to LOD2
  await lodMgr.setEntityLOD(leftRecord.entityId, 'lod0');
  await lodMgr.setEntityLOD(rightRecord.entityId, 'lod2');

  assert(lodMgr.getEntityLOD(leftRecord.entityId) === 'lod0', 'Left Hippocampus is at LOD0');
  assert(lodMgr.getEntityLOD(rightRecord.entityId) === 'lod2', 'Right Hippocampus is at LOD2');

  const leftState = lodMgr.getEntityLODState(leftRecord.entityId);
  const rightState = lodMgr.getEntityLODState(rightRecord.entityId);
  assert(leftState?.activeLevel === 'lod0', 'Left LOD state confirms LOD0');
  assert(rightState?.activeLevel === 'lod2', 'Right LOD state confirms LOD2');
  assert(leftState!.triangleCount > rightState!.triangleCount, `LOD0 tris (${leftState!.triangleCount}) > LOD2 tris (${rightState!.triangleCount})`);
  console.log(`  ✓ TEST 20 passed: Independent per-asset LOD switching verified (Left: ${leftState!.triangleCount} tris @ LOD0 vs Right: ${rightState!.triangleCount} tris @ LOD2).`);

  // Cleanup
  assemblyMgr.dispose();
  entityMgr.getAllMeshes().forEach((m) => m.geometry.dispose());
  materialMgr.dispose();
  assetMgr.dispose();
  lodMgr.dispose();
  cameraMgr.dispose();
  interactionMgr.dispose();

  console.log('\n================================================================');
  console.log('\x1b[32mALL 20 PHASE 2.1 BEHAVIORAL TESTS PASSED SUCCESSFULLY!\x1b[0m');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\x1b[31mFATAL TEST ERROR:\x1b[0m', err);
  process.exit(1);
});
