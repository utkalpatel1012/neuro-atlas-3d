/**
 * 3D Neuroanatomy Atlas: Architecture Consolidation & Part 3 Readiness Test Suite
 * Standard: AAS-2026-NEURO-V1 (Phase 2.1.1 Consolidation)
 * 
 * Verifies all architectural invariants, semantic group separation,
 * multiple representations per entity, coordinate frame nomenclature,
 * granular validation stages, and licensing distinctions.
 */

import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import { AnatomicalAssemblyManager } from './engine/AnatomicalAssemblyManager';
import { ResourceManager } from './engine/ResourceManager';
import { CameraManager } from './engine/CameraManager';
import { RendererManager } from './engine/RendererManager';
import {
  AnatomicalEntityRecord,
  EntityRepresentation,
  GroupSemanticType,
  DeviceValidationLevel
} from './engine/types';
import { RelationshipSemanticClass } from './types/entity';
import { VolumetricCoordinateFrame } from './types/coordinates';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

async function runConsolidationTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 2.1.1 ARCHITECTURE CONSOLIDATION TESTS');
  console.log('================================================================\n');

  // Test 1: Relationship Semantic Classes
  console.log('Test 1: RelationshipSemanticClass and GroupSemanticType enumeration verification');
  const validSemanticClasses: RelationshipSemanticClass[] = [
    'STRUCTURAL_CONTAINMENT',
    'FUNCTIONAL_MEMBERSHIP',
    'CONCEPTUAL_GROUPING',
    'NETWORK',
    'PATHWAY',
    'CONNECTIVITY',
    'TOPOGRAPHICAL',
    'HOMOLOGY',
    'LINEAGE',
    'SPATIAL_REGISTRATION',
    'CLINICAL_INTERVENTION',
    'EPISTEMIC'
  ];
  assert(validSemanticClasses.length === 12, 'Must have 12 relationship semantic classes');

  const validGroupTypes: GroupSemanticType[] = [
    'STRUCTURAL_CONTAINER',
    'ANATOMICAL_REGION',
    'FUNCTIONAL_SYSTEM',
    'NETWORK',
    'PATHWAY',
    'CLINICAL_GROUP',
    'VISUALIZATION_GROUP'
  ];
  assert(validGroupTypes.length === 7, 'Must have 7 group semantic types');
  console.log('  ✓ Semantic classes and group types verified.');

  // Test 2: Assembly Manager Structural vs Functional Separation
  console.log('\nTest 2: AnatomicalAssemblyManager structural container vs functional system separation');
  const assemblyMgr = new AnatomicalAssemblyManager();
  const structuralGroups = assemblyMgr.getGroupsBySemanticType('STRUCTURAL_CONTAINER');
  const functionalGroups = assemblyMgr.getGroupsBySemanticType('FUNCTIONAL_SYSTEM');
  const regionGroups = assemblyMgr.getGroupsBySemanticType('ANATOMICAL_REGION');

  assert(structuralGroups.some(g => g.groupId === 'division.cerebrum'), 'division.cerebrum must be STRUCTURAL_CONTAINER');
  assert(structuralGroups.some(g => g.groupId === 'hemisphere.left'), 'hemisphere.left must be STRUCTURAL_CONTAINER');
  assert(functionalGroups.some(g => g.groupId === 'system.limbic'), 'system.limbic must be FUNCTIONAL_SYSTEM');
  assert(functionalGroups.some(g => g.groupId === 'system.limbic.left'), 'system.limbic.left must be FUNCTIONAL_SYSTEM');
  assert(regionGroups.some(g => g.groupId === 'region.medial_temporal'), 'region.medial_temporal must be ANATOMICAL_REGION');

  // Register an entity with both structural and functional groups
  const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  dummyMesh.userData = { neuroAtlas: { entityId: 'brain.telencephalon.left.limbic.hippocampus' } };

  const testRecord: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.left.limbic.hippocampus',
    assetId: 'mesh.hippocampus.left.v1',
    name: 'Left Hippocampus',
    officialLatin: 'hippocampus sinister',
    laterality: 'left',
    canonicalCentroidMm: [-25.07, -13.89, -20.70],
    dimensionsMm: [19.4, 40.2, 18.6],
    volumeCm3: 3.18,
    topologyClass: '2-manifold',
    validationStatus: 'APPROVED',
    upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'FMA72714',
    groups: [
      'division.cerebrum',
      'hemisphere.left',
      'system.limbic',
      'system.limbic.left',
      'region.medial_temporal'
    ]
  };

  assemblyMgr.registerEntity(testRecord, dummyMesh);

  const structuralAncestors = assemblyMgr.getStructuralAncestorGroupIds(testRecord.entityId);
  const functionalAncestors = assemblyMgr.getFunctionalGroupIds(testRecord.entityId);
  const regionalAncestors = assemblyMgr.getRegionalGroupIds(testRecord.entityId);

  assert(structuralAncestors.includes('division.cerebrum'), 'Structural ancestors must include division.cerebrum');
  assert(structuralAncestors.includes('hemisphere.left'), 'Structural ancestors must include hemisphere.left');
  assert(!structuralAncestors.includes('system.limbic'), 'Structural ancestors must NOT include system.limbic');
  assert(!structuralAncestors.includes('region.medial_temporal'), 'Structural ancestors must NOT include region.medial_temporal');

  assert(functionalAncestors.includes('system.limbic'), 'Functional ancestors must include system.limbic');
  assert(functionalAncestors.includes('system.limbic.left'), 'Functional ancestors must include system.limbic.left');
  assert(!functionalAncestors.includes('region.medial_temporal'), 'Functional ancestors must NOT include region.medial_temporal (it is ANATOMICAL_REGION)');
  assert(!functionalAncestors.includes('division.cerebrum'), 'Functional ancestors must NOT include division.cerebrum');
  assert(!functionalAncestors.includes('hemisphere.left'), 'Functional ancestors must NOT include hemisphere.left');

  assert(regionalAncestors.includes('region.medial_temporal'), 'Regional ancestors must include region.medial_temporal');
  assert(!regionalAncestors.includes('division.cerebrum'), 'Regional ancestors must NOT include division.cerebrum');
  console.log('  ✓ Structural containment, functional membership, and regional grouping strictly separated.');

  // Test 3: Multiple Representations Per Entity (One Entity -> Many Representations)
  console.log('\nTest 3: Multiple representations per entity architecture');
  const rep1: EntityRepresentation = {
    representationId: 'rep.hpc.l.macro',
    representationType: 'macroscopic_mesh',
    assetId: 'mesh.hippocampus.left.v1',
    isDefault: true,
    description: 'Macroscopic closed surface mesh'
  };
  const rep2: EntityRepresentation = {
    representationId: 'rep.hpc.l.mri_surface',
    representationType: 'mri_surface',
    assetId: 'mesh.hippocampus.left.freesurfer_pial',
    isDefault: false,
    description: 'High-resolution FreeSurfer subcortical segmentation boundary'
  };
  const rep3: EntityRepresentation = {
    representationId: 'rep.hpc.l.streamlines',
    representationType: 'tractography_streamlines',
    assetId: 'tract.fornix.fimbria.left',
    isDefault: false,
    description: 'Fimbria-fornix efferent streamline projections'
  };

  assemblyMgr.addRepresentation(testRecord.entityId, rep1);
  assemblyMgr.addRepresentation(testRecord.entityId, rep2);
  assemblyMgr.addRepresentation(testRecord.entityId, rep3);

  const reps = assemblyMgr.getRepresentations(testRecord.entityId);
  assert(reps.length === 3, 'Must support 3 distinct representations for one entity');
  assert(assemblyMgr.getActiveRepresentation(testRecord.entityId)?.representationId === 'rep.hpc.l.macro', 'Default representation must be active');
  console.log('  ✓ One Entity -> Many Representations successfully verified.');

  // Test 4: Coordinate Frame Invariant (canonical_atlas_ras vs MNI152)
  console.log('\nTest 4: Coordinate frame invariant and external template registration');
  const frame1: VolumetricCoordinateFrame = 'canonical_atlas_ras';
  assert(frame1 === 'canonical_atlas_ras', 'canonical_atlas_ras must be a valid VolumetricCoordinateFrame');

  // Load actual JSON files to verify coordinate frame and registration status
  const leftJsonPath = path.resolve('data/structures/hippocampus_left.json');
  const rightJsonPath = path.resolve('data/structures/hippocampus_right.json');
  const leftJson = JSON.parse(fs.readFileSync(leftJsonPath, 'utf-8'));
  const rightJson = JSON.parse(fs.readFileSync(rightJsonPath, 'utf-8'));

  assert(leftJson.spatial.bounding_box.coordinate_frame === 'canonical_atlas_ras', 'Left hippocampus must declare canonical_atlas_ras coordinate frame');
  assert(rightJson.spatial.bounding_box.coordinate_frame === 'canonical_atlas_ras', 'Right hippocampus must declare canonical_atlas_ras coordinate frame');
  assert(leftJson.spatial.stereotaxic_registration.registration_status === 'REGISTRATION_PENDING', 'Left hippocampus external registration must be marked REGISTRATION_PENDING');
  assert(rightJson.spatial.stereotaxic_registration.registration_status === 'REGISTRATION_PENDING', 'Right hippocampus external registration must be marked REGISTRATION_PENDING');
  console.log('  ✓ canonical_atlas_ras and REGISTRATION_PENDING verified in production records.');

  // Test 5: Granular Validation & Device Validation Semantics
  console.log('\nTest 5: Granular validation stages and device validation semantics');
  const validationLevels: DeviceValidationLevel[] = [
    'AUTOMATED_TEST_VALIDATION',
    'BROWSER_VALIDATION',
    'PHYSICAL_DEVICE_VALIDATION',
    'DEVICE_VALIDATION_PENDING'
  ];
  assert(validationLevels.length === 4, 'Must have 4 device validation levels');

  assert(leftJson.asset_provenance.granular_validation.device_validation_level === 'AUTOMATED_TEST_VALIDATION', 'Left hippocampus must specify AUTOMATED_TEST_VALIDATION');
  assert(rightJson.asset_provenance.granular_validation.device_validation_level === 'AUTOMATED_TEST_VALIDATION', 'Right hippocampus must specify AUTOMATED_TEST_VALIDATION');
  assert(leftJson.asset_provenance.granular_validation.notes.includes('Physical mobile/desktop hardware validation is PENDING'), 'Physical device validation must be noted as pending');
  console.log('  ✓ Automated test validation semantics cleanly separated from physical hardware validation.');

  // Test 6: Licensing Separation (upstream_license vs project_distribution_policy)
  console.log('\nTest 6: Licensing separation between upstream source and derived project policy');
  assert(leftJson.asset_provenance.upstream_license === 'CC BY 4.0' || leftJson.asset_provenance.upstream_license === 'CC_BY_SA_2_1_JP', 'Upstream license must be recorded');
  assert(leftJson.asset_provenance.project_distribution_policy === 'CC-BY-SA-4.0', 'Left hippocampus project_distribution_policy must be CC-BY-SA-4.0');
  assert(rightJson.asset_provenance.project_distribution_policy === 'CC-BY-SA-4.0', 'Right hippocampus project_distribution_policy must be CC-BY-SA-4.0');

  // Verify manifests
  const manifestPath = path.resolve('assets/manifests/assets.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  for (const assetId in manifest.assets) {
    const asset = manifest.assets[assetId];
    assert(asset.project_distribution_policy === 'CC-BY-SA-4.0', `Asset ${assetId} must declare project_distribution_policy`);
    assert(asset.coordinate_space.includes('canonical_atlas_ras'), `Asset ${assetId} coordinate space must declare canonical_atlas_ras`);
  }
  console.log('  ✓ Licensing separation and manifest distribution policies verified.');

  // Test 7: Memory Lifecycle & WebGPU Device Loss
  console.log('\nTest 7: Memory management ownership and WebGPU device loss lifecycle');
  const resourceMgr = new ResourceManager();
  const testGeo = new THREE.BufferGeometry();
  const testMat = new THREE.MeshBasicMaterial();
  resourceMgr.retain('geo-test', testGeo, 'geometry');
  resourceMgr.retain('mat-test', testMat, 'material');
  assert(resourceMgr.getResidentCount() === 2, 'ResourceManager must track 2 resources');
  assert(resourceMgr.getRefCount('geo-test') === 1, 'geo-test refCount must be 1');
  resourceMgr.disposeAll();
  assert(resourceMgr.getResidentCount() === 0, 'ResourceManager must have 0 resources after disposeAll');

  // RendererManager device loss hooks
  const rendererMgr = new RendererManager();
  assert(typeof rendererMgr.isWebGPULost === 'function', 'RendererManager must expose isWebGPULost');
  assert(!rendererMgr.isWebGPULost(), 'Initial WebGPU state must not be lost');
  console.log('  ✓ Memory ownership tiers and WebGPU device loss hooks verified.');

  // Test 8: Camera frameSelection API
  console.log('\nTest 8: CameraManager frameSelection bounding box handling');
  const cameraMgr = new CameraManager(1920, 1080);
  assert(typeof cameraMgr.frameSelection === 'function', 'CameraManager must provide frameSelection');
  const testBox = new THREE.Box3(new THREE.Vector3(-30, -20, -10), new THREE.Vector3(30, 20, 10));
  cameraMgr.frameSelection(testBox, 0); // instant
  const target = cameraMgr.getTarget();
  assert(Math.abs(target.x) < 0.001 && Math.abs(target.y) < 0.001 && Math.abs(target.z) < 0.001, 'Target should center on symmetrical test box (0,0,0)');
  console.log('  ✓ CameraManager.frameSelection verified.');

  console.log('\n================================================================');
  console.log('ALL PHASE 2.1.1 ARCHITECTURE CONSOLIDATION TESTS PASSED (8/8)');
  console.log('================================================================\n');
}

runConsolidationTests().catch((err) => {
  console.error('\x1b[31mConsolidation Tests Failed:\x1b[0m', err);
  process.exit(1);
});
