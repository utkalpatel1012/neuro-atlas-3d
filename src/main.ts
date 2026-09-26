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
    manifestPath: '/assets/manifests/assets.manifest.json',
    initialProfile: 'HIGH',
    enableGrid: true,
    enableOriginMarker: true
  });

  try {
    // 2. Initialize Engine (GPU renderer, capabilities, shaders)
    await app.initialize('/assets/manifests/assets.manifest.json');

    // 3. Define and Load Bilateral Hippocampus Structures
    const leftRecord: AnatomicalEntityRecord = {
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

    // Load both structures into the Anatomical Assembly
    await app.loadEntity(leftRecord);
    await app.loadEntity(rightRecord);

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
      app.getAssemblyManager()
    );

    // 5. Select bilateral limbic system by default to showcase assembly hierarchy
    app.getAssemblyManager().selectGroup('system.limbic');
    const limbicBox = app.getAssemblyManager().getGroupBoundingBox('system.limbic');
    app.getCameraManager().focusBoundingBox(limbicBox);

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
