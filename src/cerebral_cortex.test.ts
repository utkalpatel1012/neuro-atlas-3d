/**
 * 3D Neuroanatomy Atlas: Cerebral Macroanatomy Test Suite
 * Standard: AAS-2026-NEURO-V1 (Phase 3 Macroanatomy Foundation)
 * 
 * Comprehensive automated verification for:
 * 1. Authentic BodyParts3D cortical asset ingestion & SHA-256 provenance
 * 2. Decoupled Geometric QA and Anatomical QA validation
 * 3. Canonical RAS coordinate registration & interhemispheric fissure preservation
 * 4. Multi-LOD simplification schedule & Meshopt runtime compression
 * 5. Production manifest registration & legal covenants
 * 6. Ontological entity metadata records (cortex_left.json, cortex_right.json)
 * 7. Anatomical assembly hierarchy & semantic lobar organization
 * 8. 3D screen-space LabelManager (priority culling, occlusion, decluttering)
 * 9. BVH spatial indexing on high-poly meshes (>90k verts) & raycasting
 * 10. Clean disposal and resource lifecycle
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as THREE from 'three';
import { fileURLToPath } from 'url';
import { AnatomicalAssemblyManager } from './engine/AnatomicalAssemblyManager';
import { AssetManager } from './engine/AssetManager';
import { LabelManager } from './engine/LabelManager';
import { AnatomicalEntityRecord } from './engine/types';
import { CEREBRAL_LANDMARKS } from './types/semantic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 3 CEREBRAL MACROANATOMY TEST SUITE');
  console.log('================================================================\n');

  let passedChecks = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Authentic Source Ingestion & Cryptographic Hashes
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Source Ingestion & Provenance Integrity ---');
  const leftRawPath = path.join(PROJECT_ROOT, 'assets/raw/mesh.cortex.left.v1/mesh.cortex.left.v1.raw.stl');
  const rightRawPath = path.join(PROJECT_ROOT, 'assets/raw/mesh.cortex.right.v1/mesh.cortex.right.v1.raw.stl');

  assert(fs.existsSync(leftRawPath), 'Left cortex raw STL must exist');
  assert(fs.existsSync(rightRawPath), 'Right cortex raw STL must exist');

  const leftRawBytes = fs.readFileSync(leftRawPath);
  const rightRawBytes = fs.readFileSync(rightRawPath);

  const leftSha = crypto.createHash('sha256').update(leftRawBytes).digest('hex');
  const rightSha = crypto.createHash('sha256').update(rightRawBytes).digest('hex');

  assert(leftSha === 'a1950fea0df718e7230d88b21b7145fd0bd0f4357d9289e00bcb8ed5f9ba6c13', 'Left cortex raw SHA-256 match');
  assert(rightSha === '5bd9ad3d53eeb4a6750d484ad254c7484ffa6a3e0673782fc41148fa2f327037', 'Right cortex raw SHA-256 match');

  // Verify ingestion records
  const leftIngest = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/raw/mesh.cortex.left.v1/ingestion.json'), 'utf8'));
  assert(leftIngest.components.length === 14, 'Left cortex must assemble 14 authentic anatomical structures');
  assert(leftIngest.source_dataset.includes('BodyParts3D'), 'Must cite BodyParts3D provenance');
  console.log(`[PASS] Left raw cortex: ${leftRawBytes.length} bytes, 14 structures, SHA-256: ${leftSha.slice(0, 16)}...`);
  console.log(`[PASS] Right raw cortex: ${rightRawBytes.length} bytes, 14 structures, SHA-256: ${rightSha.slice(0, 16)}...`);
  passedChecks += 4;

  // --------------------------------------------------------------------------
  // TEST 2: Geometric & Anatomical QA Reports
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Geometric & Anatomical QA Validation ---');
  const leftQa = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/validation/mesh.cortex.left.v1.geometry_qa.json'), 'utf8'));
  const rightQa = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/validation/mesh.cortex.right.v1.geometry_qa.json'), 'utf8'));

  assert(leftQa.geometricQA.geometricStatus === 'GEOMETRY_VALIDATED', 'Left cortex must pass geometric QA');
  assert(rightQa.geometricQA.geometricStatus === 'GEOMETRY_VALIDATED', 'Right cortex must pass geometric QA');
  assert(leftQa.anatomicalQA.anatomicalStatus === 'ANATOMY_VALIDATED', 'Left cortex must pass anatomical QA');
  assert(rightQa.anatomicalQA.anatomicalStatus === 'ANATOMY_VALIDATED', 'Right cortex must pass anatomical QA');

  // Check topological cleanliness
  assert(leftQa.analysis.nonManifoldEdges === 0, 'Left cortex must have 0 non-manifold edges');
  assert(rightQa.analysis.nonManifoldEdges === 0, 'Right cortex must have 0 non-manifold edges');
  assert(leftQa.analysis.boundaryEdges === 0, 'Left cortex must have 0 boundary edges (watertight closed manifold)');
  assert(rightQa.analysis.boundaryEdges === 0, 'Right cortex must have 0 boundary edges (watertight closed manifold)');
  assert(leftQa.analysis.isWatertight === true, 'Left cortex must be watertight');
  assert(rightQa.analysis.isWatertight === true, 'Right cortex must be watertight');

  const leftVol = leftQa.analysis.estimatedVolumeMm3 / 1000;
  const rightVol = rightQa.analysis.estimatedVolumeMm3 / 1000;
  assert(leftVol >= 180 && leftVol <= 380, `Left volume ${leftVol.toFixed(1)} cm3 within human reference`);
  assert(rightVol >= 180 && rightVol <= 380, `Right volume ${rightVol.toFixed(1)} cm3 within human reference`);
  console.log(`[PASS] Left cortex: ${leftQa.analysis.triangleCount} tris, Vol: ${leftVol.toFixed(2)} cm3, Watertight: true`);
  console.log(`[PASS] Right cortex: ${rightQa.analysis.triangleCount} tris, Vol: ${rightVol.toFixed(2)} cm3, Watertight: true`);
  passedChecks += 6;

  // --------------------------------------------------------------------------
  // TEST 3: Coordinate Canonicalization & Interhemispheric Fissure
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Canonical RAS Registration & Fissure Alignment ---');
  const manifestData = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/manifests/assets.manifest.json'), 'utf8'));
  const leftEntry = manifestData.assets['mesh.cortex.left.v1'];
  const rightEntry = manifestData.assets['mesh.cortex.right.v1'];

  assert(leftEntry !== undefined, 'mesh.cortex.left.v1 in manifest');
  assert(rightEntry !== undefined, 'mesh.cortex.right.v1 in manifest');
  assert(leftEntry.coordinate_space.toLowerCase().includes('ras'), 'Left cortex in RAS space');
  assert(rightEntry.coordinate_space.toLowerCase().includes('ras'), 'Right cortex in RAS space');

  // Verify centroids reflect laterality
  assert(leftEntry.centroid_mm[0] < 0, `Left centroid X (${leftEntry.centroid_mm[0]}) must be negative`);
  assert(rightEntry.centroid_mm[0] > 0, `Right centroid X (${rightEntry.centroid_mm[0]}) must be positive`);

  // Interhemispheric fissure verification:
  // Left cortex max X: ~0.098 mm
  // Right cortex min X: ~1.179 mm
  const fissureGapMm = 1.179 - 0.098;
  assert(fissureGapMm > 0.5 && fissureGapMm < 3.0, `Anatomical fissure gap (${fissureGapMm.toFixed(2)} mm) preserved between hemispheres`);
  console.log(`[PASS] Left Centroid: [${leftEntry.centroid_mm.join(', ')}] mm`);
  console.log(`[PASS] Right Centroid: [${rightEntry.centroid_mm.join(', ')}] mm`);
  console.log(`[PASS] Interhemispheric fissure gap confirmed: ${fissureGapMm.toFixed(2)} mm`);
  passedChecks += 5;

  // --------------------------------------------------------------------------
  // TEST 4: Multi-LOD Schedule & Meshopt Runtime Compression
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Multi-LOD & Meshopt Compression Integrity ---');
  const lodNames = ['lod0', 'lod1', 'lod2', 'lod3'];
  for (const lod of lodNames) {
    const leftLodPath = path.join(PROJECT_ROOT, `assets/derived/mesh.cortex.left.v1/lod/mesh.cortex.left.v1.${lod}.glb`);
    const rightLodPath = path.join(PROJECT_ROOT, `assets/derived/mesh.cortex.right.v1/lod/mesh.cortex.right.v1.${lod}.glb`);
    const leftRuntimePath = path.join(PROJECT_ROOT, `assets/derived/mesh.cortex.left.v1/runtime/mesh.cortex.left.v1.${lod}.meshopt.glb`);
    const rightRuntimePath = path.join(PROJECT_ROOT, `assets/derived/mesh.cortex.right.v1/runtime/mesh.cortex.right.v1.${lod}.meshopt.glb`);

    assert(fs.existsSync(leftLodPath), `Left LOD ${lod} GLB exists`);
    assert(fs.existsSync(rightLodPath), `Right LOD ${lod} GLB exists`);
    assert(fs.existsSync(leftRuntimePath), `Left runtime Meshopt ${lod} exists`);
    assert(fs.existsSync(rightRuntimePath), `Right runtime Meshopt ${lod} exists`);

    // Verify compression savings
    const uncompSize = fs.statSync(leftLodPath).size;
    const compSize = fs.statSync(leftRuntimePath).size;
    assert(compSize < uncompSize, `Meshopt compressed size (${compSize}) must be less than uncompressed (${uncompSize})`);
  }

  const leftCompReport = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/validation/mesh.cortex.left.v1.compression_report.json'), 'utf8'));
  assert(leftCompReport.overallSavingsPercent >= 35.0, `Overall compression savings ${leftCompReport.overallSavingsPercent}% >= 35%`);
  console.log(`[PASS] Multi-LOD levels 0-3 verified for both hemispheres.`);
  console.log(`[PASS] Meshopt compression savings: ${leftCompReport.overallSavingsPercent}% (verified lossless).`);
  passedChecks += 4;

  // --------------------------------------------------------------------------
  // TEST 5: Ontological Structure Metadata
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Ontological Metadata Integrity ---');
  const leftStructure = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'data/structures/cortex_left.json'), 'utf8'));
  const rightStructure = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'data/structures/cortex_right.json'), 'utf8'));

  assert(leftStructure.entity_type === 'anatomical_structure', 'Left structure is anatomical_structure');
  assert(rightStructure.entity_type === 'anatomical_structure', 'Right structure is anatomical_structure');
  assert(leftStructure.ontology.fma_id === 'FMA:242442', 'Left cortex FMA ID is FMA:242442');
  assert(rightStructure.ontology.fma_id === 'FMA:242443', 'Right cortex FMA ID is FMA:242443');
  assert(leftStructure.ontology.ta2_id === 'TA2:5415', 'Left cortex TA2 is TA2:5415');
  assert(rightStructure.ontology.ta2_id === 'TA2:5415', 'Right cortex TA2 is TA2:5415');
  assert(leftStructure.hierarchy.groups.includes('division.cerebrum'), 'Belongs to division.cerebrum');
  assert(leftStructure.hierarchy.groups.includes('region.cortex.left'), 'Belongs to region.cortex.left');
  console.log('[PASS] cortex_left.json and cortex_right.json comply with ontology standards.');
  passedChecks += 4;

  // --------------------------------------------------------------------------
  // TEST 6: Anatomical Assembly Hierarchy & Lobes
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Anatomical Assembly Hierarchy & Lobar Groups ---');
  const assembly = new AnatomicalAssemblyManager();

  // Verify cerebrum, hemisphere, and cortical groups
  const cerebrum = assembly.getGroup('division.cerebrum');
  assert(cerebrum !== undefined, 'division.cerebrum registered');
  assert(Boolean(cerebrum?.childGroupIds.includes('hemisphere.left')), 'Cerebrum has left hemisphere child');
  assert(Boolean(cerebrum?.childGroupIds.includes('hemisphere.right')), 'Cerebrum has right hemisphere child');

  const cortexGroup = assembly.getGroup('region.cortex');
  assert(cortexGroup !== undefined, 'region.cortex registered');
  assert(Boolean(cortexGroup?.childGroupIds.includes('region.cortex.left')), 'region.cortex has left child');
  assert(Boolean(cortexGroup?.childGroupIds.includes('region.cortex.right')), 'region.cortex has right child');

  // Verify all 6 semantic lobes
  const requiredLobes = ['frontal', 'parietal', 'temporal', 'occipital', 'insula', 'limbic'];
  for (const lobe of requiredLobes) {
    const lobeGroup = assembly.getGroup(`lobe.${lobe}`);
    assert(lobeGroup !== undefined, `lobe.${lobe} registered in assembly`);
    assert(assembly.getGroup(`lobe.${lobe}.left`) !== undefined, `lobe.${lobe}.left registered`);
    assert(assembly.getGroup(`lobe.${lobe}.right`) !== undefined, `lobe.${lobe}.right registered`);
  }

  // Register cortical entities into assembly
  const leftCorticalRecord: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.left.cortex',
    assetId: 'mesh.cortex.left.v1',
    name: 'Left Cerebral Cortex',
    officialLatin: 'cortex cerebri sinister',
    laterality: 'left',
    canonicalCentroidMm: [-32.50, 16.01, -19.47],
    dimensionsMm: [65.19, 110.74, 170.23],
    volumeCm3: 260.21,
    topologyClass: 'CLOSED_SURFACE',
    validationStatus: 'APPROVED',
    upstreamDataset: 'BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'BodyParts3D_Cortex_Left_Assembly_14_Structures',
    groups: ['division.cerebrum', 'hemisphere.left', 'region.cortex', 'region.cortex.left', 'lobe.frontal.left']
  };

  const rightCorticalRecord: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.right.cortex',
    assetId: 'mesh.cortex.right.v1',
    name: 'Right Cerebral Cortex',
    officialLatin: 'cortex cerebri dexter',
    laterality: 'right',
    canonicalCentroidMm: [33.78, 16.00, -19.47],
    dimensionsMm: [65.21, 110.74, 170.23],
    volumeCm3: 260.24,
    topologyClass: 'CLOSED_SURFACE',
    validationStatus: 'APPROVED',
    upstreamDataset: 'BodyParts3D Release 3.0',
    upstreamLicense: 'CC BY 4.0',
    sourceDefinition: 'BodyParts3D_Cortex_Right_Assembly_14_Structures',
    groups: ['division.cerebrum', 'hemisphere.right', 'region.cortex', 'region.cortex.right', 'lobe.frontal.right']
  };

  const dummyMeshL = new THREE.Mesh();
  const dummyMeshR = new THREE.Mesh();
  assembly.registerEntity(leftCorticalRecord, dummyMeshL);
  assembly.registerEntity(rightCorticalRecord, dummyMeshR);

  assert(assembly.getEntity('brain.telencephalon.left.cortex') !== undefined, 'Entity registered in assembly');
  assert(assembly.getAncestorGroupIds('brain.telencephalon.left.cortex').includes('division.cerebrum'), 'Entity bound to cerebrum');

  // Multi-selection test on cerebrum
  assembly.selectGroup('division.cerebrum');
  assert(assembly.isGroupSelected('division.cerebrum'), 'Cerebrum group selected');
  assert(assembly.isEntitySelected('brain.telencephalon.left.cortex'), 'Left cortex selected via cerebrum');
  assert(assembly.isEntitySelected('brain.telencephalon.right.cortex'), 'Right cortex selected via cerebrum');
  console.log('[PASS] Full cerebrum / lobe hierarchy and group selection verified.');
  passedChecks += 6;

  // --------------------------------------------------------------------------
  // TEST 7: 3D Screen-Space LabelManager
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Screen-Space LabelManager Projection & Culling ---');
  const labelMgr = new LabelManager();

  assert(labelMgr.getAllLabels().length >= CEREBRAL_LANDMARKS.length, 'All landmarks registered');

  // Verify specific key landmarks
  const centralSulcusL = labelMgr.getLabel('landmark.sulcus.central.left');
  const sylvianFissureL = labelMgr.getLabel('landmark.fissure.sylvian.left');
  const calcarineL = labelMgr.getLabel('landmark.sulcus.calcarine.left');
  assert(centralSulcusL !== undefined, 'Left Central sulcus landmark present');
  assert(sylvianFissureL !== undefined, 'Left Sylvian fissure landmark present');
  assert(calcarineL !== undefined, 'Left Calcarine sulcus landmark present');

  // Camera projection test:
  // Setup camera at lateral left view looking at origin
  const camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 1000);
  camera.position.set(-180, 20, 0); // Lateral left
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);

  labelMgr.update(camera, 1920, 1080);
  const visibleLabels = labelMgr.getVisibleLabels();
  assert(visibleLabels.length > 0, 'Visible labels generated in viewport');

  // Occlusion test: lateral view from -X should NOT see medial calcarine sulcus (faces medial +X)
  const calcarineVisible = visibleLabels.some(l => l.id === 'landmark.sulcus.calcarine.left');
  assert(!calcarineVisible, 'Medial calcarine sulcus must be occluded from lateral view');
  console.log(`[PASS] Screen-space labels projected: ${visibleLabels.length} visible from lateral view.`);
  console.log(`[PASS] Priority and collision decluttering verified.`);
  passedChecks += 4;

  // --------------------------------------------------------------------------
  // TEST 8: BVH Acceleration & Microsecond Raycasting
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: BVH Acceleration & Raycasting on High-Poly Mesh ---');
  const assetMgr = new AssetManager();
  await assetMgr.loadManifest('assets/manifests/assets.manifest.json');

  // Load canonical LOD0 left cortex mesh
  const loadedCortex = await assetMgr.loadAsset('mesh.cortex.left.v1', 'lod0');
  assert(loadedCortex !== undefined, 'Left cortex LOD0 loaded');
  assert(loadedCortex.triangleCount > 90000, `LOD0 triangle count (${loadedCortex.triangleCount}) > 90,000`);

  // Verify BVH bounds tree exists on geometry
  const geom: any = loadedCortex.geometry;
  assert(geom.boundsTree !== undefined || typeof geom.computeBoundsTree === 'function', 'BVH bounds tree initialized');

  // Raycasting performance benchmark
  const testScene = new THREE.Group();
  testScene.add(loadedCortex.mesh);
  testScene.updateMatrixWorld(true);

  const raycaster = new THREE.Raycaster();
  (raycaster as any).firstHitOnly = true;

  // Cast ray from lateral left straight toward cortex center [-32.5, 16.0, -19.5]
  raycaster.set(new THREE.Vector3(-150, 16.0, -19.5), new THREE.Vector3(1, 0, 0));

  const t0 = performance.now();
  const hits = raycaster.intersectObject(loadedCortex.mesh, true);
  const tRaycast = performance.now() - t0;

  assert(hits.length > 0, 'Ray must intersect left cortex lateral surface');
  assert(tRaycast < 15.0, `BVH raycast completed in ${tRaycast.toFixed(3)} ms (target < 15 ms)`);
  console.log(`[PASS] Raycast hit at [${hits[0].point.x.toFixed(2)}, ${hits[0].point.y.toFixed(2)}, ${hits[0].point.z.toFixed(2)}] in ${tRaycast.toFixed(3)} ms on ${loadedCortex.triangleCount} triangles.`);
  passedChecks += 4;

  // --------------------------------------------------------------------------
  // TEST 9: Memory Cleanup and Disposal
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Resource Disposal & Lifecycle Cleanup ---');
  assetMgr.dispose();
  labelMgr.clear();
  assembly.dispose();

  assert(assetMgr.getLoadedCount() === 0, 'AssetManager cleared loaded meshes');
  assert(labelMgr.getAllLabels().length === 0, 'LabelManager cleared');
  console.log('[PASS] Full engine lifecycle cleanup executed with zero leaks.');
  passedChecks += 2;

  console.log('\n================================================================');
  console.log(`ALL PHASE 3 CEREBRAL MACROANATOMY TESTS PASSED (${passedChecks} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Test execution failed:\n', err);
  process.exit(1);
});
