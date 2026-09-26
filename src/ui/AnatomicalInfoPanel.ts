/**
 * 3D Neuroanatomy Atlas: Anatomical Information Panel
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Accessible semantic panel displaying anatomical identity, neuroscientific metadata,
 * stereotaxic metrics, and source provenance for selected structures.
 */

import { SelectionManager } from '../engine/SelectionManager';
import { VisibilityManager } from '../engine/VisibilityManager';
import { CameraManager } from '../engine/CameraManager';
import { AnatomicalEntityRecord } from '../engine/types';
import * as THREE from 'three';

export class AnatomicalInfoPanel {
  private container: HTMLElement;
  private selectionManager: SelectionManager;
  private visibilityManager: VisibilityManager;
  private cameraManager: CameraManager;
  private element: HTMLElement;
  private unsubscribeSelection?: () => void;
  private unsubscribeVisibility?: () => void;

  constructor(
    container: HTMLElement,
    selectionManager: SelectionManager,
    visibilityManager: VisibilityManager,
    cameraManager: CameraManager
  ) {
    this.container = container;
    this.selectionManager = selectionManager;
    this.visibilityManager = visibilityManager;
    this.cameraManager = cameraManager;

    this.element = document.createElement('aside');
    this.element.className = 'neuro-info-panel';
    this.element.setAttribute('role', 'complementary');
    this.element.setAttribute('aria-label', 'Anatomical Structure Information');
    this.element.setAttribute('aria-live', 'polite');

    this.container.appendChild(this.element);

    this.renderEmpty();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.unsubscribeSelection = this.selectionManager.onSelectionChanged(
      (_id, record) => {
        if (record) {
          this.renderRecord(record);
        } else {
          this.renderEmpty();
        }
      }
    );

    this.unsubscribeVisibility = this.visibilityManager.onVisibilityChanged(() => {
      const record = this.selectionManager.getSelectedRecord();
      if (record) {
        this.renderRecord(record);
      }
    });
  }

  private renderEmpty(): void {
    this.element.innerHTML = `
      <div class="info-card info-empty">
        <div class="info-header">
          <span class="info-badge">Atlas Explorer</span>
          <h2 class="info-title">No Structure Selected</h2>
        </div>
        <p class="info-instructions">
          Click on an anatomical structure in the 3D viewport to inspect its identity,
          stereotaxic coordinates, morphometry, and scientific provenance.
        </p>
        <div class="info-guide">
          <div class="guide-item">
            <span class="guide-key">Orbit</span>
            <span class="guide-val">Left click + Drag / 1 Finger</span>
          </div>
          <div class="guide-item">
            <span class="guide-key">Pan</span>
            <span class="guide-val">Right click + Drag / 2 Fingers</span>
          </div>
          <div class="guide-item">
            <span class="guide-key">Zoom</span>
            <span class="guide-val">Scroll / Pinch</span>
          </div>
          <div class="guide-item">
            <span class="guide-key">Pick</span>
            <span class="guide-val">Click structure</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderRecord(record: AnatomicalEntityRecord): void {
    const isIsolated = this.visibilityManager.isIsolated(record.entityId);
    const centroidStr = record.canonicalCentroidMm
      .map((n) => (n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)))
      .join(', ');
    const dimStr = record.dimensionsMm.map((n) => n.toFixed(1)).join(' × ');

    this.element.innerHTML = `
      <div class="info-card">
        <div class="info-header">
          <div class="info-top-row">
            <span class="info-badge info-badge-success">${record.validationStatus}</span>
            <span class="info-lat">${record.laterality.toUpperCase()}</span>
          </div>
          <h2 class="info-title">${record.name}</h2>
          <div class="info-latin">${record.officialLatin}</div>
        </div>

        <div class="info-section">
          <h3 class="section-title">Identifiers</h3>
          <div class="info-grid">
            <div class="grid-label">Entity ID:</div>
            <div class="grid-value code-snippet">${record.entityId}</div>
            <div class="grid-label">Asset ID:</div>
            <div class="grid-value code-snippet">${record.assetId}</div>
            <div class="grid-label">Topology:</div>
            <div class="grid-value">${record.topologyClass}</div>
          </div>
        </div>

        <div class="info-section">
          <h3 class="section-title">Stereotaxic Morphometry</h3>
          <div class="info-grid">
            <div class="grid-label">Centroid (X,Y,Z):</div>
            <div class="grid-value">[ ${centroidStr} ] mm</div>
            <div class="grid-label">Bounding Box:</div>
            <div class="grid-value">${dimStr} mm</div>
            <div class="grid-label">Volume:</div>
            <div class="grid-value"><strong>${record.volumeCm3.toFixed(2)} cm³</strong></div>
          </div>
        </div>

        <div class="info-section">
          <h3 class="section-title">Upstream Provenance</h3>
          <div class="info-grid">
            <div class="grid-label">Dataset:</div>
            <div class="grid-value">${record.upstreamDataset}</div>
            <div class="grid-label">License:</div>
            <div class="grid-value">${record.upstreamLicense}</div>
            <div class="grid-label">Source ID:</div>
            <div class="grid-value">${record.sourceDefinition}</div>
          </div>
        </div>

        <div class="info-actions">
          <button id="btn-isolate" class="btn btn-action ${isIsolated ? 'btn-active' : ''}">
            ${isIsolated ? '✓ Restore Context' : '🔍 Isolate Structure'}
          </button>
          <button id="btn-focus" class="btn btn-action">
            🎯 Focus Camera
          </button>
        </div>
      </div>
    `;

    // Wire buttons
    const btnIsolate = this.element.querySelector('#btn-isolate');
    btnIsolate?.addEventListener('click', () => {
      this.visibilityManager.isolate(record.entityId);
    });

    const btnFocus = this.element.querySelector('#btn-focus');
    btnFocus?.addEventListener('click', () => {
      const target = new THREE.Vector3(...record.canonicalCentroidMm);
      this.cameraManager.focusOn(target, 120);
    });
  }

  public dispose(): void {
    if (this.unsubscribeSelection) this.unsubscribeSelection();
    if (this.unsubscribeVisibility) this.unsubscribeVisibility();
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
