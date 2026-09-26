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
import { AnatomicalAssemblyManager } from '../engine/AnatomicalAssemblyManager';
import { AnatomicalEntityRecord, AnatomicalGroup } from '../engine/types';
import * as THREE from 'three';

export class AnatomicalInfoPanel {
  private container: HTMLElement;
  private selectionManager: SelectionManager;
  private visibilityManager: VisibilityManager;
  private cameraManager: CameraManager;
  private assemblyManager?: AnatomicalAssemblyManager;
  private element: HTMLElement;
  private unsubscribeSelection?: () => void;
  private unsubscribeVisibility?: () => void;
  private unsubscribeAssembly?: () => void;

  constructor(
    container: HTMLElement,
    selectionManager: SelectionManager,
    visibilityManager: VisibilityManager,
    cameraManager: CameraManager,
    assemblyManager?: AnatomicalAssemblyManager
  ) {
    this.container = container;
    this.selectionManager = selectionManager;
    this.visibilityManager = visibilityManager;
    this.cameraManager = cameraManager;
    this.assemblyManager = assemblyManager;

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
    if (this.assemblyManager) {
      this.unsubscribeAssembly = this.assemblyManager.onSelectionChanged((state) => {
        if (state.primaryEntityId) {
          const entity = this.assemblyManager!.getEntity(state.primaryEntityId);
          if (entity) {
            this.renderRecord(entity);
            return;
          }
        }
        if (state.primaryGroupId) {
          const group = this.assemblyManager!.getGroup(state.primaryGroupId);
          if (group) {
            this.renderGroup(group);
            return;
          }
        }
        this.renderEmpty();
      });

      this.unsubscribeVisibility = this.assemblyManager.onVisibilityChanged(() => {
        const primaryEntity = this.assemblyManager!.getPrimarySelectedEntity();
        if (primaryEntity) {
          this.renderRecord(primaryEntity);
        } else {
          const primaryGroup = this.assemblyManager!.getPrimarySelectedGroup();
          if (primaryGroup) {
            this.renderGroup(primaryGroup);
          }
        }
      });
    } else {
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
    const isIsolated = this.assemblyManager
      ? this.assemblyManager.getEntityVisibilityState(record.entityId) === 'ISOLATED'
      : this.visibilityManager.isIsolated(record.entityId);
    const centroidStr = record.canonicalCentroidMm
      .map((n) => (n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)))
      .join(', ');
    const dimStr = record.dimensionsMm.map((n) => n.toFixed(1)).join(' × ');

    const ancestorPath = this.assemblyManager
      ? this.assemblyManager.getAncestorGroupIds(record.entityId).reverse().map((gid) => {
          const g = this.assemblyManager!.getGroup(gid);
          return g ? g.name : gid;
        }).join(' › ')
      : '';

    this.element.innerHTML = `
      <div class="info-card">
        <div class="info-header">
          <div class="info-top-row">
            <span class="info-badge info-badge-success">${record.validationStatus}</span>
            <span class="info-lat">${record.laterality.toUpperCase()}</span>
          </div>
          <h2 class="info-title">${record.name}</h2>
          <div class="info-latin">${record.officialLatin}</div>
          ${ancestorPath ? `<div class="info-path" style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">${ancestorPath}</div>` : ''}
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
      if (this.assemblyManager) {
        this.assemblyManager.isolateEntity(record.entityId);
      } else {
        this.visibilityManager.isolate(record.entityId);
      }
    });

    const btnFocus = this.element.querySelector('#btn-focus');
    btnFocus?.addEventListener('click', () => {
      if (this.assemblyManager) {
        const box = this.assemblyManager.getEntityBoundingBox(record.entityId);
        this.cameraManager.focusBoundingBox(box);
      } else {
        const target = new THREE.Vector3(...record.canonicalCentroidMm);
        this.cameraManager.focusOn(target, 120);
      }
    });
  }

  private renderGroup(group: AnatomicalGroup): void {
    const descendantCount = this.assemblyManager
      ? this.assemblyManager.getDescendantEntityIds(group.groupId).length
      : group.memberEntityIds.length;

    this.element.innerHTML = `
      <div class="info-card">
        <div class="info-header">
          <div class="info-top-row">
            <span class="info-badge info-badge-success">${group.status}</span>
            <span class="info-lat">${group.category.toUpperCase()}</span>
          </div>
          <h2 class="info-title">${group.name}</h2>
          ${group.description ? `<div class="info-latin">${group.description}</div>` : ''}
        </div>

        <div class="info-section">
          <h3 class="section-title">Anatomical Hierarchy</h3>
          <div class="info-grid">
            <div class="grid-label">Group ID:</div>
            <div class="grid-value code-snippet">${group.groupId}</div>
            <div class="grid-label">Category:</div>
            <div class="grid-value">${group.category}</div>
            <div class="grid-label">Structures:</div>
            <div class="grid-value"><strong>${descendantCount} member structure(s)</strong></div>
            ${group.parentGroupId ? `
            <div class="grid-label">Parent Group:</div>
            <div class="grid-value code-snippet">${group.parentGroupId}</div>
            ` : ''}
          </div>
        </div>

        <div class="info-actions">
          <button id="btn-isolate-group" class="btn btn-action">
            🔍 Isolate Group
          </button>
          <button id="btn-focus-group" class="btn btn-action">
            🎯 Focus Group
          </button>
          <button id="btn-restore-all-group" class="btn btn-action">
            ↺ Restore All
          </button>
        </div>
      </div>
    `;

    this.element.querySelector('#btn-isolate-group')?.addEventListener('click', () => {
      this.assemblyManager?.isolateGroup(group.groupId);
    });

    this.element.querySelector('#btn-focus-group')?.addEventListener('click', () => {
      if (this.assemblyManager) {
        const box = this.assemblyManager.getGroupBoundingBox(group.groupId);
        this.cameraManager.focusBoundingBox(box);
      }
    });

    this.element.querySelector('#btn-restore-all-group')?.addEventListener('click', () => {
      this.assemblyManager?.restoreAll();
      this.visibilityManager.restoreAll();
    });
  }

  public dispose(): void {
    if (this.unsubscribeSelection) this.unsubscribeSelection();
    if (this.unsubscribeVisibility) this.unsubscribeVisibility();
    if (this.unsubscribeAssembly) this.unsubscribeAssembly();
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
