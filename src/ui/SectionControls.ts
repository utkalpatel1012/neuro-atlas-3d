/**
 * 3D Neuroanatomy Atlas: Section Plane Controls (Phase 4A)
 * Standard: AAS-2026-NEURO-V1
 *
 * Minimal technical control layer for mesh-based anatomical sectioning.
 * Deliberately unpolished: plane selector, position slider, invert,
 * enable/disable, reset, multi-plane toggles, gizmo toggle, position readout.
 *
 * Honesty rules enforced here (§17): readout shows canonical coordinates only
 * ("SAGITTAL · X = 12.4 mm"). No region inference (no frontal/parietal/temporal
 * labels). The single exception: sagittal X = 0.0 exactly is labeled "(midline)"
 * because X = 0 is the repo's defined midline convention (inter-piece gap).
 * Requires document (untestable headless); all logic lives in SectionPlaneSet.
 */

import * as THREE from 'three';
import { SectionPlaneSet } from '../engine/SectionPlaneSet';
import { ClippingAdapter } from '../engine/ClippingAdapter';
import { AnatomicalEntityManager } from '../engine/AnatomicalEntityManager';
import { PlaneKind, standardAxisLetter, StandardPlaneKind } from '../engine/sectionPlanes';

export class SectionControls {
  private container: HTMLElement;
  private planeSet: SectionPlaneSet;
  private adapter: ClippingAdapter;
  private entityManager: AnatomicalEntityManager;
  private element: HTMLElement;
  private activeKind: PlaneKind = 'sagittal';
  private slider: HTMLInputElement | null = null;
  private readout: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    planeSet: SectionPlaneSet,
    adapter: ClippingAdapter,
    entityManager: AnatomicalEntityManager
  ) {
    this.container = container;
    this.planeSet = planeSet;
    this.adapter = adapter;
    this.entityManager = entityManager;

    this.element = document.createElement('section');
    this.element.className = 'neuro-section-controls';
    this.element.setAttribute('aria-label', 'Section Plane Controls');
    this.container.appendChild(this.element);

    this.render();
    this.planeSet.onChange(() => this.refresh());
  }

  /** Union bounding box of loaded meshes, for honest slider ranges. */
  private computeAxisRange(): { min: number; max: number } {
    const box = new THREE.Box3();
    let hasPoints = false;
    for (const mesh of this.entityManager.getAllMeshes()) {
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      if (bb) {
        bb.applyMatrix4(mesh.matrixWorld);
        box.union(bb);
        hasPoints = true;
      }
    }
    if (!hasPoints || box.isEmpty()) return { min: -170, max: 170 };
    const axis = this.activeKind === 'sagittal' ? 'x' : this.activeKind === 'coronal' ? 'z' : 'y';
    return { min: Math.floor(box.min[axis]), max: Math.ceil(box.max[axis]) };
  }

  private planeId(): string {
    return this.activeKind === 'oblique' ? this.obliqueId() : `plane.${this.activeKind}`;
  }

  private obliqueId(): string {
    const existing = this.planeSet.getPlanes().find((p) => p.kind === 'oblique');
    if (existing) return existing.id;
    const created = this.planeSet.addObliquePlane([0, 0, 1], [0, 0, 0], '+n', 'plane.oblique.default');
    return created ? created.id : 'plane.oblique.default';
  }

  private describeActive(): string {
    const record = this.planeSet.getPlane(this.planeId());
    if (!record) return '—';
    if (record.kind === 'oblique') {
      const n = record.math.normal.map((v) => v.toFixed(2)).join(', ');
      const o = record.math.origin.map((v) => v.toFixed(1)).join(', ');
      return `OBLIQUE · n = (${n}) · p0 = (${o}) mm`;
    }
    const letter = standardAxisLetter(record.kind as StandardPlaneKind);
    const axisIndex = letter === 'X' ? 0 : letter === 'Y' ? 1 : 2;
    const value = record.math.origin[axisIndex].toFixed(1);
    const midline = record.kind === 'sagittal' && record.math.origin[0] === 0 ? ' (midline)' : '';
    const state = record.enabled ? '' : ' (disabled)';
    return `${record.kind.toUpperCase()} · ${letter} = ${value} mm${midline}${state}`;
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="controls-group">
        <span class="controls-label">Section:</span>
        <button class="btn btn-view" data-plane-kind="sagittal" title="Sagittal clipping (X constant)">Sag</button>
        <button class="btn btn-view" data-plane-kind="coronal" title="Coronal clipping (Z constant)">Cor</button>
        <button class="btn btn-view" data-plane-kind="axial" title="Axial clipping (Y constant)">Axi</button>
        <button class="btn btn-view" data-plane-kind="oblique" title="Oblique clipping (custom normal)">Obl</button>
      </div>
      <div class="controls-group">
        <input id="section-position" type="range" step="0.5" aria-label="Plane position in canonical millimeters" />
        <span id="section-readout" class="controls-readout">—</span>
      </div>
      <div class="controls-group">
        <button id="section-enable" class="btn btn-secondary" title="Enable/disable active plane">Enable</button>
        <button id="section-invert" class="btn btn-secondary" title="Invert retained half-space">Invert</button>
        <button id="section-reset" class="btn btn-secondary" title="Reset planes to defaults">Reset</button>
        <button id="section-gizmo" class="btn btn-secondary" title="Show/hide plane gizmo">Gizmo</button>
      </div>
      <div class="controls-group">
        <label title="Sagittal plane enabled"><input type="checkbox" data-plane-toggle="plane.sagittal" /> Sag</label>
        <label title="Coronal plane enabled"><input type="checkbox" data-plane-toggle="plane.coronal" /> Cor</label>
        <label title="Axial plane enabled"><input type="checkbox" data-plane-toggle="plane.axial" /> Axi</label>
      </div>
    `;
    this.slider = this.element.querySelector('#section-position');
    this.readout = this.element.querySelector('#section-readout');
    this.bindEvents();
    this.refresh();
  }

  private bindEvents(): void {
    this.element.querySelectorAll('[data-plane-kind]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const kind = (e.currentTarget as HTMLElement).getAttribute('data-plane-kind') as PlaneKind;
        if (kind) {
          this.activeKind = kind;
          this.refresh();
        }
      });
    });

    this.slider?.addEventListener('input', () => {
      if (!this.slider) return;
      const value = parseFloat(this.slider.value);
      if (!Number.isFinite(value)) return;
      this.planeSet.setConstant(this.planeId(), value);
    });

    this.element.querySelector('#section-enable')?.addEventListener('click', () => {
      const id = this.planeId();
      const record = this.planeSet.getPlane(id);
      if (record) this.planeSet.setEnabled(id, !record.enabled);
    });

    this.element.querySelector('#section-invert')?.addEventListener('click', () => {
      this.planeSet.invert(this.planeId());
    });

    this.element.querySelector('#section-reset')?.addEventListener('click', () => {
      this.planeSet.reset();
      this.activeKind = 'sagittal';
      this.refresh();
    });

    this.element.querySelector('#section-gizmo')?.addEventListener('click', () => {
      this.adapter.setGizmoVisible(!this.adapter.isGizmoVisible());
    });

    this.element.querySelectorAll('[data-plane-toggle]').forEach((box) => {
      box.addEventListener('change', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-plane-toggle');
        const checked = (e.currentTarget as HTMLInputElement).checked;
        if (id) this.planeSet.setEnabled(id, checked);
      });
    });
  }

  private refresh(): void {
    const id = this.planeId();
    const record = this.planeSet.getPlane(id);
    if (this.readout) this.readout.textContent = this.describeActive();
    const boxes = this.element.querySelectorAll('[data-plane-toggle]');
    boxes.forEach((box) => {
      const pid = (box as HTMLElement).getAttribute('data-plane-toggle');
      const rec = pid ? this.planeSet.getPlane(pid) : undefined;
      (box as HTMLInputElement).checked = rec ? rec.enabled : false;
    });
    if (this.slider && record && record.kind !== 'oblique') {
      const range = this.computeAxisRange();
      this.slider.min = String(range.min);
      this.slider.max = String(range.max);
      const letter = standardAxisLetter(record.kind as StandardPlaneKind);
      const axisIndex = letter === 'X' ? 0 : letter === 'Y' ? 1 : 2;
      this.slider.value = String(record.math.origin[axisIndex]);
      this.slider.disabled = false;
    } else if (this.slider) {
      this.slider.disabled = true;
    }
    this.element.querySelectorAll('[data-plane-kind]').forEach((b) => {
      const k = (b as HTMLElement).getAttribute('data-plane-kind');
      if (k === this.activeKind) b.classList.add('btn-selected');
      else b.classList.remove('btn-selected');
    });
  }

  public dispose(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
