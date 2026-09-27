/**
 * 3D Neuroanatomy Atlas: Application Entry Point
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Bootstraps the AtlasApplication runtime, mounts UI components,
 * and loads the canonical Left Hippocampus validated asset.
 */

import { AtlasApplication } from './engine/AtlasApplication';
import { AnatomicalInfoPanel } from './ui/AnatomicalInfoPanel';
import { DebugPanel } from './ui/DebugPanel';
import { ControlsBar } from './ui/ControlsBar';
import { SectionControls } from './ui/SectionControls';
import { SectionPresentationPanel } from './ui/SectionPresentationPanel';
import { MriPanel } from './ui/MriPanel';
import { AnatomicalEntityRecord } from './engine/types';

async function bootstrap() {
  const canvasContainer = document.getElementById('canvas-container');
  const appContainer = document.getElementById('app');

  if (!canvasContainer || !appContainer) {
    throw new Error('Required DOM containers (#canvas-container, #app) not found.');
  }

  // 1. Instantiate Application Engine
  const app = new AtlasApplication({
    container: canvasContainer,
    manifestPath: 'assets/manifests/assets.manifest.json',
    initialProfile: 'HIGH',
    enableGrid: true,
    enableOriginMarker: true
  });

  try {
    // 2. Initialize Engine (GPU renderer, capabilities, shaders)
    await app.initialize('assets/manifests/assets.manifest.json');

    // 3. Define and Load Bilateral Hippocampus Structures
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

    const leftCortexRecord: AnatomicalEntityRecord = {
      entityId: 'brain.telencephalon.left.cortex',
      assetId: 'mesh.cortex.left.v1',
      name: 'Left Cerebral Cortex',
      officialLatin: 'cortex cerebri sinister',
      laterality: 'left',
      canonicalCentroidMm: [-32.50, 16.01, -19.47],
      dimensionsMm: [65.19, 110.74, 170.23],
      volumeCm3: 260.21,
      topologyClass: 'MULTI_SHELL_COMPOSITE',
      validationStatus: 'APPROVED',
      upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
      upstreamLicense: 'CC BY 4.0',
      sourceDefinition: 'BodyParts3D_Cortex_Left_Assembly_14_Structures',
      groups: [
        'division.cerebrum',
        'hemisphere.left',
        'region.cortex',
        'region.cortex.left'
      ]
    };

    const rightCortexRecord: AnatomicalEntityRecord = {
      entityId: 'brain.telencephalon.right.cortex',
      assetId: 'mesh.cortex.right.v1',
      name: 'Right Cerebral Cortex',
      officialLatin: 'cortex cerebri dexter',
      laterality: 'right',
      canonicalCentroidMm: [33.78, 16.00, -19.47],
      dimensionsMm: [65.21, 110.74, 170.23],
      volumeCm3: 260.24,
      topologyClass: 'MULTI_SHELL_COMPOSITE',
      validationStatus: 'APPROVED',
      upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
      upstreamLicense: 'CC BY 4.0',
      sourceDefinition: 'BodyParts3D_Cortex_Right_Assembly_14_Structures',
      groups: [
        'division.cerebrum',
        'hemisphere.right',
        'region.cortex',
        'region.cortex.right'
      ]
    };

    // Load structures into the Anatomical Assembly
    await app.loadEntity(leftCortexRecord);
    await app.loadEntity(rightCortexRecord);
    await app.loadEntity(leftRecord);
    await app.loadEntity(rightRecord);

    // Register structure labels for high-level annotations
    const lm = app.getLabelManager();
    lm.registerStructureLabel({
      id: 'label.structure.cortex.left',
      name: 'Left Cortex',
      latinName: 'Cortex cerebri sinister',
      laterality: 'left',
      worldPositionMm: [-32.50, 16.01, -19.47],
      priority: 1,
      associatedEntityId: leftCortexRecord.entityId
    });
    lm.registerStructureLabel({
      id: 'label.structure.cortex.right',
      name: 'Right Cortex',
      latinName: 'Cortex cerebri dexter',
      laterality: 'right',
      worldPositionMm: [33.78, 16.00, -19.47],
      priority: 1,
      associatedEntityId: rightCortexRecord.entityId
    });
    lm.registerStructureLabel({
      id: 'label.structure.hippocampus.left',
      name: 'Left Hippocampus',
      latinName: 'Hippocampus sinister',
      laterality: 'left',
      worldPositionMm: [-25.07, -13.89, -20.70],
      priority: 2,
      associatedEntityId: leftRecord.entityId
    });
    lm.registerStructureLabel({
      id: 'label.structure.hippocampus.right',
      name: 'Right Hippocampus',
      latinName: 'Hippocampus dexter',
      laterality: 'right',
      worldPositionMm: [26.38, -13.89, -20.74],
      priority: 2,
      associatedEntityId: rightRecord.entityId
    });

    // 4. Mount UI Components
    new AnatomicalInfoPanel(
      appContainer,
      app.getSelectionManager(),
      app.getVisibilityManager(),
      app.getCameraManager(),
      app.getAssemblyManager()
    );

    new DebugPanel(
      appContainer,
      app.getPerformanceManager(),
      app.getLODManager(),
      app.getRendererManager(),
      app.getSceneManager()
    );

    new ControlsBar(
      appContainer,
      app.getCameraManager(),
      app.getVisibilityManager(),
      app.getSelectionManager(),
      app.getAssemblyManager(),
      app.getLabelManager()
    );

    // Phase 4A: mesh-based sectional visualization controls (state + adapter
    // already wired in AtlasApplication; gizmo group mounted at initialize).
    new SectionControls(
      appContainer,
      app.getSectionPlaneSet(),
      app.getClippingAdapter(),
      app.getEntityManager()
    );

    // Phase 4B: presentation aids (orientation, readout, presets, stats).
    // Educational only; no anatomical claims beyond canonical coordinates.
    new SectionPresentationPanel(appContainer, app);

    // Phase 4C: educational MRI reference (lazy data, gated display;
    // overlay stays disabled until canonical registration is validated).
    new MriPanel(appContainer, app);

    // 5. Select bilateral cerebrum by default to showcase macroanatomy
    app.getAssemblyManager().selectGroup('division.cerebrum');
    const cerebrumBox = app.getAssemblyManager().getGroupBoundingBox('division.cerebrum');
    app.getCameraManager().focusBoundingBox(cerebrumBox);

    // 6. Start Render Loop
    app.start();

    console.info('[Bootstrap] Neuro Atlas 3D successfully initialized with bilateral hippocampal assembly.');
  } catch (err) {
    console.error('[Bootstrap] Initialization failed:', err);
    canvasContainer.innerHTML = `
      <div style="color: #EF4444; padding: 40px; font-family: monospace;">
        <h2>Atlas Initialization Error</h2>
        <p>${(err as Error).message}</p>
      </div>
    `;
  }
}

// Kick off when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
