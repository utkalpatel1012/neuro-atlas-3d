/**
 * 3D Neuroanatomy Atlas: Telemetry and Debug Panel
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Live performance telemetry overlay, GPU capability report,
 * and LOD override controls for development and validation.
 */

import { PerformanceManager } from '../engine/PerformanceManager';
import { LODManager } from '../engine/LODManager';
import { RendererManager } from '../engine/RendererManager';
import { SceneManager } from '../engine/SceneManager';
import { LODMode, PerformanceProfileType, TelemetryMetrics } from '../engine/types';

export class DebugPanel {
  private container: HTMLElement;
  private performanceManager: PerformanceManager;
  private lodManager: LODManager;
  private rendererManager: RendererManager;
  private sceneManager: SceneManager;
  private element: HTMLElement;
  private isCollapsed: boolean = false;
  private unsubscribeTelemetry?: () => void;

  constructor(
    container: HTMLElement,
    performanceManager: PerformanceManager,
    lodManager: LODManager,
    rendererManager: RendererManager,
    sceneManager: SceneManager
  ) {
    this.container = container;
    this.performanceManager = performanceManager;
    this.lodManager = lodManager;
    this.rendererManager = rendererManager;
    this.sceneManager = sceneManager;

    this.element = document.createElement('div');
    this.element.className = 'neuro-debug-panel';
    this.container.appendChild(this.element);

    this.render();
    this.bindEvents();
  }

  private render(): void {
    const report = this.rendererManager.getCapabilityReport();
    const metrics = this.performanceManager.getMetrics();
    const currentLodMode = this.lodManager.getMode();

    const backendBadgeClass =
      metrics.activeBackend === 'webgpu'
        ? 'badge-backend-webgpu'
        : 'badge-backend-webgl2';

    this.element.innerHTML = `
      <div class="debug-header">
        <div class="debug-title-row">
          <span class="debug-badge ${backendBadgeClass}">${metrics.activeBackend.toUpperCase()}</span>
          <span class="debug-title">Engine Telemetry</span>
        </div>
        <button id="btn-toggle-debug" class="debug-btn-toggle" title="Collapse / Expand (D)">
          ${this.isCollapsed ? '➕' : '➖'}
        </button>
      </div>

      <div class="debug-content ${this.isCollapsed ? 'hidden' : ''}">
        <div class="debug-stat-grid">
          <div class="stat-item">
            <span class="stat-label">FPS</span>
            <span class="stat-val ${metrics.fps < 45 ? 'stat-warn' : 'stat-good'}" id="stat-fps">${metrics.fps}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Frame Time</span>
            <span class="stat-val" id="stat-frametime">${metrics.frameTimeMs} ms</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Triangles</span>
            <span class="stat-val" id="stat-triangles">${metrics.triangles.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Draw Calls</span>
            <span class="stat-val" id="stat-drawcalls">${metrics.drawCalls}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Active LOD</span>
            <span class="stat-val stat-accent" id="stat-lod">${metrics.activeLOD.toUpperCase()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Distance</span>
            <span class="stat-val" id="stat-distance">${metrics.cameraDistanceMm} mm</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Entities (L/F)</span>
            <span class="stat-val" id="stat-entities">${metrics.loadedEntities ?? 1} / ${metrics.failedEntities ?? 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Visible / Hid</span>
            <span class="stat-val" id="stat-visibility">${metrics.visibleEntities ?? 1} / ${metrics.hiddenEntities ?? 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Resident GPU</span>
            <span class="stat-val" id="stat-resident">${metrics.residentAssets}</span>
          </div>
        </div>

        <div class="debug-control-group">
          <span class="control-label">LOD Override:</span>
          <div class="btn-group" id="lod-buttons">
            <button class="btn btn-sm ${currentLodMode === 'AUTO' ? 'btn-selected' : ''}" data-lod="AUTO">Auto</button>
            <button class="btn btn-sm ${currentLodMode === 'LOD0' ? 'btn-selected' : ''}" data-lod="LOD0">LOD0</button>
            <button class="btn btn-sm ${currentLodMode === 'LOD1' ? 'btn-selected' : ''}" data-lod="LOD1">LOD1</button>
            <button class="btn btn-sm ${currentLodMode === 'LOD2' ? 'btn-selected' : ''}" data-lod="LOD2">LOD2</button>
            <button class="btn btn-sm ${currentLodMode === 'LOD3' ? 'btn-selected' : ''}" data-lod="LOD3">LOD3</button>
          </div>
        </div>

        <div class="debug-control-group">
          <span class="control-label">Profile:</span>
          <div class="btn-group" id="profile-buttons">
            <button class="btn btn-sm ${this.performanceManager.getProfile().id === 'HIGH' ? 'btn-selected' : ''}" data-profile="HIGH">High</button>
            <button class="btn btn-sm ${this.performanceManager.getProfile().id === 'MEDIUM' ? 'btn-selected' : ''}" data-profile="MEDIUM">Med</button>
            <button class="btn btn-sm ${this.performanceManager.getProfile().id === 'LOW' ? 'btn-selected' : ''}" data-profile="LOW">Low</button>
          </div>
        </div>

        <div class="debug-control-group">
          <span class="control-label">Reference Overlays:</span>
          <div class="btn-group">
            <button id="btn-toggle-grid" class="btn btn-sm btn-selected">Grid</button>
            <button id="btn-toggle-origin" class="btn btn-sm btn-selected">AC-PC Origin</button>
          </div>
        </div>

        ${report.adapterInfo ? `
        <div class="debug-footer">
          <div class="adapter-text">${report.adapterInfo.description || report.adapterInfo.vendor || 'GPU Adapter'}</div>
        </div>
        ` : ''}
      </div>
    `;

    this.bindButtons();
  }

  private bindButtons(): void {
    const toggleBtn = this.element.querySelector('#btn-toggle-debug');
    toggleBtn?.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      const content = this.element.querySelector('.debug-content');
      if (content) {
        content.classList.toggle('hidden', this.isCollapsed);
      }
      if (toggleBtn) {
        toggleBtn.textContent = this.isCollapsed ? '➕' : '➖';
      }
    });

    const lodButtons = this.element.querySelectorAll('#lod-buttons button');
    lodButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const lodMode = target.getAttribute('data-lod') as LODMode;
        if (lodMode) {
          this.lodManager.setMode(lodMode);
          lodButtons.forEach((b) => b.classList.remove('btn-selected'));
          target.classList.add('btn-selected');
        }
      });
    });

    const profileButtons = this.element.querySelectorAll('#profile-buttons button');
    profileButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const prof = target.getAttribute('data-profile') as PerformanceProfileType;
        if (prof) {
          this.performanceManager.setProfile(prof);
          profileButtons.forEach((b) => b.classList.remove('btn-selected'));
          target.classList.add('btn-selected');
        }
      });
    });

    const gridBtn = this.element.querySelector('#btn-toggle-grid');
    gridBtn?.addEventListener('click', () => {
      const isVisible = this.sceneManager.isGridVisible();
      this.sceneManager.setGridVisible(!isVisible);
      gridBtn.classList.toggle('btn-selected', !isVisible);
    });

    const originBtn = this.element.querySelector('#btn-toggle-origin');
    originBtn?.addEventListener('click', () => {
      const isVisible = this.sceneManager.isOriginMarkerVisible();
      this.sceneManager.setOriginMarkerVisible(!isVisible);
      originBtn.classList.toggle('btn-selected', !isVisible);
    });
  }

  private bindEvents(): void {
    this.unsubscribeTelemetry = this.performanceManager.onMetricsUpdated((metrics) => {
      this.updateTelemetryDOM(metrics);
    });

    // Keyboard shortcut 'D' to toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        const toggleBtn = this.element.querySelector('#btn-toggle-debug') as HTMLButtonElement;
        toggleBtn?.click();
      }
    });
  }

  private updateTelemetryDOM(metrics: TelemetryMetrics): void {
    if (this.isCollapsed) return;

    const fpsEl = this.element.querySelector('#stat-fps');
    if (fpsEl) {
      fpsEl.textContent = metrics.fps.toString();
      fpsEl.className = `stat-val ${metrics.fps < 45 ? 'stat-warn' : 'stat-good'}`;
    }

    const ftEl = this.element.querySelector('#stat-frametime');
    if (ftEl) ftEl.textContent = `${metrics.frameTimeMs} ms`;

    const triEl = this.element.querySelector('#stat-triangles');
    if (triEl) triEl.textContent = metrics.triangles.toLocaleString();

    const dcEl = this.element.querySelector('#stat-drawcalls');
    if (dcEl) dcEl.textContent = metrics.drawCalls.toString();

    const lodEl = this.element.querySelector('#stat-lod');
    if (lodEl) lodEl.textContent = metrics.activeLOD.toUpperCase();

    const distEl = this.element.querySelector('#stat-distance');
    if (distEl) distEl.textContent = `${metrics.cameraDistanceMm} mm`;

    const entEl = this.element.querySelector('#stat-entities');
    if (entEl) entEl.textContent = `${metrics.loadedEntities ?? 1} / ${metrics.failedEntities ?? 0}`;

    const visEl = this.element.querySelector('#stat-visibility');
    if (visEl) visEl.textContent = `${metrics.visibleEntities ?? 1} / ${metrics.hiddenEntities ?? 0}`;

    const resEl = this.element.querySelector('#stat-resident');
    if (resEl) resEl.textContent = metrics.residentAssets.toString();
  }

  public dispose(): void {
    if (this.unsubscribeTelemetry) this.unsubscribeTelemetry();
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
