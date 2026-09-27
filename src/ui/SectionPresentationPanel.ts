/**
 * 3D Neuroanatomy Atlas: Section Presentation Panel (Phase 4B §10-§13, §22-§27)
 * Standard: AAS-2026-NEURO-V1
 *
 * Educational presentation aids for clipped views. Requires document (browser
 * only); all decidable logic lives in engine modules (headless-tested).
 * Honesty rules:
 * - Canonical coordinates only; no region inference (§11-§12).
 * - Orientation uses canonical axes (+X R, +Y S, +Z Posterior) (§10).
 * - Empty sections show a neutral message (§26), never "no anatomy exists".
 * - Precision note: 0.1 mm display is UI formatting, not measurement (§24).
 */

import * as THREE from 'three';
import { AtlasApplication } from '../engine/AtlasApplication';
import { describeOrientation, describePlane, EMPTY_SECTION_MESSAGE, SECTION_CONTEXT_NOTE } from '../engine/sectionPresentation';
import { SECTION_PRESETS, applyPreset } from '../engine/sectionPresets';

export class SectionPresentationPanel {
  private element: HTMLElement;
  private app: AtlasApplication;
  private readoutEl: HTMLElement | null = null;
  private orientationEl: HTMLElement | null = null;
  private statsEl: HTMLElement | null = null;
  private raf = 0;
  private disposed = false;

  constructor(container: HTMLElement, app: AtlasApplication) {
    this.app = app;
    this.element = document.createElement('section');
    this.element.className = 'neuro-section-presentation';
    this.element.setAttribute('aria-label', 'Section presentation and orientation');
    this.element.innerHTML = `
      <div class="controls-group">
        <span class="controls-label">Orientation:</span>
        <span id="section-orientation" role="status" aria-label="Canonical orientation indicator">—</span>
      </div>
      <div class="controls-group">
        <span class="controls-label">Plane:</span>
        <span id="section-plane-readout" role="status" aria-label="Active plane readout">—</span>
      </div>
      <div class="controls-group">
        <label for="section-preset">Preset:</label>
        <select id="section-preset" aria-label="Standard educational section preset">
          <option value="">— choose —</option>
          ${SECTION_PRESETS.map((p) => `<option value="${p.id}">${p.label}</option>`).join('')}
        </select>
        <button id="section-focus-visible" class="btn btn-secondary" title="Focus visible section of selected entity">Focus visible</button>
      </div>
      <div class="controls-group">
        <span id="section-stats" role="status" aria-label="Section statistics">—</span>
      </div>
      <div class="controls-group">
        <span id="section-empty" role="status" aria-label="Empty section state" style="display:none">${EMPTY_SECTION_MESSAGE}</span>
      </div>
      <div class="controls-group">
        <small>${SECTION_CONTEXT_NOTE} Display precision 0.1 mm is UI formatting, not anatomical measurement precision.</small>
      </div>
    `;
    container.appendChild(this.element);
    this.readoutEl = this.element.querySelector('#section-plane-readout');
    this.orientationEl = this.element.querySelector('#section-orientation');
    this.statsEl = this.element.querySelector('#section-stats');

    const preset = this.element.querySelector('#section-preset') as HTMLSelectElement | null;
    preset?.addEventListener('change', () => {
      if (preset.value) {
        const ok = applyPreset(this.app.getSectionPlaneSet(), preset.value);
        if (ok) this.app.getSectionPresentation().setSectionModeEnabled(true);
        preset.value = '';
      }
    });
    this.element.querySelector('#section-focus-visible')?.addEventListener('click', () => {
      const id = this.app.getSelectionManager().getSelectedEntityId()
        ?? this.app.getAssemblyManager().getPrimarySelectedEntity()?.entityId
        ?? null;
      if (id) this.app.focusVisibleSection(id);
    });

    const tick = (): void => {
      if (this.disposed) return;
      this.refresh();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private refresh(): void {
    const planeSet = this.app.getSectionPlaneSet();
    const presentation = this.app.getSectionPresentation();
    const activeId = presentation.getState().activePlaneId;
    const record = planeSet.getPlane(activeId) ?? planeSet.getPlane('plane.sagittal');
    if (this.readoutEl && record) {
      this.readoutEl.textContent = describePlane(record);
    }
    try {
      const camera = this.app.getCameraManager().getCamera();
      const target = this.app.getCameraManager().getTarget();
      const dir = target.clone().sub(camera.position);
      if (dir.lengthSq() > 1e-12) {
        dir.normalize();
        const o = describeOrientation([dir.x, dir.y, dir.z]);
        if (this.orientationEl) {
          this.orientationEl.textContent = `${o.summary} · Axes ${o.leftRight} / ${o.upDown} / ${o.frontBack}`;
        }
      }
    } catch {
      // Headless/test environments: leave orientation placeholder.
    }
    try {
      const stats = this.app.getSectionStats();
      if (this.statsEl) {
        this.statsEl.textContent =
          `Loaded entities — visible ${stats.visibleEntityCount}, intersected ${stats.intersectedEntityCount}, fully hidden ${stats.fullyHiddenEntityCount}`;
      }
      const emptyEl = this.element.querySelector('#section-empty') as HTMLElement | null;
      if (emptyEl) {
        const enabled = planeSet.getEnabledPlanes().length;
        const showEmpty = enabled > 0 && stats.visibleEntityCount === 0 && stats.intersectedEntityCount === 0;
        emptyEl.style.display = showEmpty ? '' : 'none';
      }
    } catch {
      // Stats unavailable headless: keep placeholders.
    }
    void THREE;
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
