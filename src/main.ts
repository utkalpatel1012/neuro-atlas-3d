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

    // 3. Fetch Canonical Structure Metadata
    let record: AnatomicalEntityRecord;
    try {
      const res = await fetch('/data/structures/hippocampus_left.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      record = {
        entityId: data.entity_id || 'brain.telencephalon.left.limbic.hippocampus',
        assetId: 'mesh.hippocampus.left.v1',
        name: data.names?.canonical_name || 'Left Hippocampus',
        officialLatin: data.names?.official_latin || 'hippocampus sinister',
        laterality: data.laterality || 'left',
        canonicalCentroidMm: data.bounding_box?.centroid_canonical || [-25.2, -20.6, -11.4],
        dimensionsMm: [
          data.bounding_box?.dimensions?.x ?? 19.4,
          data.bounding_box?.dimensions?.y ?? 40.2,
          data.bounding_box?.dimensions?.z ?? 18.6
        ],
        volumeCm3: data.volume_measurements?.canonical_volume_cm3 ?? 3.18,
        topologyClass: data.topology?.class ?? '2-manifold',
        validationStatus: data.qa_status?.overall_status ?? 'APPROVED',
        upstreamDataset: data.provenance?.upstream_source?.dataset ?? 'DBCLS BodyParts3D Release 3.0',
        upstreamLicense: data.provenance?.upstream_source?.license ?? 'CC BY 4.0',
        sourceDefinition: data.provenance?.upstream_source?.source_identifier ?? 'FJ3162 (FMA61884)'
      };
    } catch (e) {
      console.warn('[Bootstrap] Falling back to embedded hippocampus record:', e);
      record = {
        entityId: 'brain.telencephalon.left.limbic.hippocampus',
        assetId: 'mesh.hippocampus.left.v1',
        name: 'Left Hippocampus',
        officialLatin: 'hippocampus sinister',
        laterality: 'left',
        canonicalCentroidMm: [-25.2, -20.6, -11.4],
        dimensionsMm: [19.4, 40.2, 18.6],
        volumeCm3: 3.18,
        topologyClass: '2-manifold',
        validationStatus: 'APPROVED',
        upstreamDataset: 'DBCLS BodyParts3D Release 3.0',
        upstreamLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        sourceDefinition: 'FJ3162 (FMA61884)'
      };
    }

    // 4. Ingest and Render Anatomical Entity
    await app.loadEntity(record);

    // 5. Mount UI Components
    new AnatomicalInfoPanel(
      appContainer,
      app.getSelectionManager(),
      app.getVisibilityManager(),
      app.getCameraManager()
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
      app.getSelectionManager()
    );

    // 6. Automatically select structure to showcase provenance & metadata
    app.getSelectionManager().select(record.entityId);

    // 7. Start Render Loop
    app.start();

    console.info('[Bootstrap] Neuro Atlas 3D successfully initialized.');
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
