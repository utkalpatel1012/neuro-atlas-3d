/**
 * 3D Neuroanatomy Atlas: Controls and View Presets Bar
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Accessible toolbar providing standard anatomical projection views,
 * camera reset, and global visibility actions.
 */

import { CameraManager } from '../engine/CameraManager';
import { VisibilityManager } from '../engine/VisibilityManager';
import { SelectionManager } from '../engine/SelectionManager';
import { CameraViewPreset } from '../engine/types';
import * as THREE from 'three';

export class ControlsBar {
  private container: HTMLElement;
  private cameraManager: CameraManager;
  private visibilityManager: VisibilityManager;
  private selectionManager: SelectionManager;
  private element: HTMLElement;

  constructor(
    container: HTMLElement,
    cameraManager: CameraManager,
    visibilityManager: VisibilityManager,
    selectionManager: SelectionManager
  ) {
    this.container = container;
    this.cameraManager = cameraManager;
    this.visibilityManager = visibilityManager;
    this.selectionManager = selectionManager;

    this.element = document.createElement('nav');
    this.element.className = 'neuro-controls-bar';
    this.element.setAttribute('role', 'toolbar');
    this.element.setAttribute('aria-label', 'Camera and View Controls');

    this.container.appendChild(this.element);

    this.render();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="controls-group">
        <span class="controls-label">Projections:</span>
        <button class="btn btn-view" data-preset="anterior" title="Anterior View (Coronal Face)">Ant</button>
        <button class="btn btn-view" data-preset="posterior" title="Posterior View (Occipital)">Post</button>
        <button class="btn btn-view" data-preset="superior" title="Superior View (Axial Top)">Sup</button>
        <button class="btn btn-view" data-preset="lateral_left" title="Lateral Left View (Sagittal)">Lat (L)</button>
        <button class="btn btn-view" data-preset="medial_left" title="Medial Left View (Midsagittal)">Med (L)</button>
        <button class="btn btn-view btn-selected" data-preset="isometric" title="Isometric Perspective">Iso</button>
      </div>

      <div class="controls-divider"></div>

      <div class="controls-group">
        <button id="btn-reset-cam" class="btn btn-secondary" title="Reset Camera to Standard View">
          ↺ Reset View
        </button>
        <button id="btn-restore-all" class="btn btn-secondary" title="Show All Structures and Exit Isolation">
          👁 Show All
        </button>
      </div>
    `;

    this.bindEvents();
  }

  private getFocusTarget(): THREE.Vector3 {
    const selectedRecord = this.selectionManager.getSelectedRecord();
    if (selectedRecord) {
      return new THREE.Vector3(...selectedRecord.canonicalCentroidMm);
    }
    // Default left hippocampus centroid
    return new THREE.Vector3(-25.2, -20.6, -11.4);
  }

  private bindEvents(): void {
    const viewButtons = this.element.querySelectorAll('.btn-view');
    viewButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const preset = target.getAttribute('data-preset') as CameraViewPreset;
        if (preset) {
          const focusPos = this.getFocusTarget();
          this.cameraManager.setPreset(preset, focusPos);
          viewButtons.forEach((b) => b.classList.remove('btn-selected'));
          target.classList.add('btn-selected');
        }
      });
    });

    const resetBtn = this.element.querySelector('#btn-reset-cam');
    resetBtn?.addEventListener('click', () => {
      const focusPos = this.getFocusTarget();
      this.cameraManager.reset(focusPos);
      viewButtons.forEach((b) => b.classList.remove('btn-selected'));
      this.element.querySelector('[data-preset="isometric"]')?.classList.add('btn-selected');
    });

    const restoreBtn = this.element.querySelector('#btn-restore-all');
    restoreBtn?.addEventListener('click', () => {
      this.visibilityManager.restoreAll();
    });
  }

  public dispose(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
