/**
 * 3D Neuroanatomy Atlas: Minimal Educational MRI Panel (Phase 4C §28–§31, §37)
 * Standard: AAS-2026-NEURO-V1
 *
 * Educational reference controls ONLY: visibility, display mode, window/level
 * (presentation), opacity, reset, and a technical provenance summary.
 * Requires document (browser only); all decidable logic is engine-side and
 * headless-tested. No diagnostic language; voxel intensities are never
 * labeled as anatomy (§32); schematic labels stay schematic (§36).
 */

import { AtlasApplication } from '../engine/AtlasApplication';
import { MriDisplayMode } from '../engine/mriVolume';

export class MriPanel {
  private element: HTMLElement;
  private app: AtlasApplication;
  private statusEl: HTMLElement | null = null;
  private provenanceEl: HTMLElement | null = null;
  private raf = 0;
  private disposed = false;
  private lastStatus = '';

  constructor(container: HTMLElement, app: AtlasApplication) {
    this.app = app;
    this.element = document.createElement('section');
    this.element.className = 'neuro-mri-panel';
    this.element.setAttribute('aria-label', 'MRI reference controls (educational)');
    this.element.innerHTML = `
      <div class="controls-group">
        <span class="controls-label">MRI reference:</span>
        <select id="mri-volume" aria-label="MRI reference volume"></select>
        <button id="mri-toggle" class="btn btn-secondary" title="Show/hide MRI slice">Show</button>
      </div>
      <div class="controls-group">
        <label for="mri-mode">Mode:</label>
        <select id="mri-mode" aria-label="Mesh MRI display mode">
          <option value="MESH_ONLY">Mesh only</option>
          <option value="MRI_ONLY">MRI only</option>
          <option value="SPLIT">Split</option>
          <option value="OVERLAY">Overlay</option>
        </select>
        <button id="mri-reset" class="btn btn-secondary" title="Reset MRI display settings">Reset</button>
      </div>
      <div class="controls-group">
        <label for="mri-ww">Window:</label>
        <input id="mri-ww" type="range" min="1" max="2000" step="1" value="0" aria-label="Contrast window width (display only)" />
        <label for="mri-wc">Level:</label>
        <input id="mri-wc" type="range" min="0" max="2000" step="1" value="0" aria-label="Contrast window center (display only)" />
        <label for="mri-opacity">Opacity:</label>
        <input id="mri-opacity" type="range" min="0" max="1" step="0.05" value="1" aria-label="MRI overlay opacity" />
      </div>
      <div class="controls-group">
        <span id="mri-status" role="status" aria-label="MRI status">—</span>
      </div>
      <div class="controls-group">
        <small id="mri-provenance" aria-label="MRI provenance summary">—</small>
      </div>
      <div class="controls-group">
        <small>Educational reference only — not for diagnosis, surgical planning, or navigation. Contrast controls never alter source data.</small>
      </div>
    `;
    container.appendChild(this.element);
    this.statusEl = this.element.querySelector('#mri-status');
    this.provenanceEl = this.element.querySelector('#mri-provenance');
    this.refreshVolumeOptions();

    const volumeSel = this.element.querySelector('#mri-volume') as HTMLSelectElement | null;
    volumeSel?.addEventListener('change', () => {
      const mri = this.app.getMriManager();
      mri.setDisplayVolume(volumeSel.value || null);
      this.refreshVolumeOptions();
    });
    this.element.querySelector('#mri-toggle')?.addEventListener('click', () => {
      const mri = this.app.getMriManager();
      mri.setVisible(!mri.getDisplay().visible);
    });
    const modeSel = this.element.querySelector('#mri-mode') as HTMLSelectElement | null;
    modeSel?.addEventListener('change', () => {
      this.app.getMriManager().setMode(modeSel.value as MriDisplayMode);
    });
    const ww = this.element.querySelector('#mri-ww') as HTMLInputElement | null;
    const wc = this.element.querySelector('#mri-wc') as HTMLInputElement | null;
    const applyWindow = (): void => {
      if (ww && wc) this.app.getMriManager().setWindow(parseFloat(ww.value), parseFloat(wc.value));
    };
    ww?.addEventListener('input', applyWindow);
    wc?.addEventListener('input', applyWindow);
    const op = this.element.querySelector('#mri-opacity') as HTMLInputElement | null;
    op?.addEventListener('input', () => {
      if (op) this.app.getMriManager().setOpacity(parseFloat(op.value));
    });
    this.element.querySelector('#mri-reset')?.addEventListener('click', () => {
      this.app.getMriManager().reset();
    });

    const tick = (): void => {
      if (this.disposed) return;
      this.refresh();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private refreshVolumeOptions(): void {
    const sel = this.element.querySelector('#mri-volume') as HTMLSelectElement | null;
    if (!sel) return;
    const mri = this.app.getMriManager();
    const current = mri.getDisplay().volumeId;
    sel.innerHTML = '<option value="">— none —</option>';
    for (const id of mri.getRegisteredVolumeIds()) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = id;
      if (id === current) option.selected = true;
      sel.appendChild(option);
    }
  }

  private refresh(): void {
    try {
      const mri = this.app.getMriManager();
      const display = mri.getDisplay();
      const toggle = this.element.querySelector('#mri-toggle');
      if (toggle) toggle.textContent = display.visible ? 'Hide' : 'Show';
      const modeSel = this.element.querySelector('#mri-mode') as HTMLSelectElement | null;
      if (modeSel && modeSel.value !== display.mode) modeSel.value = display.mode;
      const status = display.visible && display.volumeId
        ? (mri.getDisabledReason() || 'MRI slice active.')
        : 'MRI display inactive.';
      if (status !== this.lastStatus) {
        this.lastStatus = status;
        if (this.statusEl) this.statusEl.textContent = status;
      }
      if (this.provenanceEl && display.volumeId) {
        const summary = mri.getProvenanceSummary(display.volumeId);
        this.provenanceEl.textContent = summary
          ? Object.entries(summary).map(([k, v]) => `${k}: ${v}`).join(' · ')
          : '—';
      } else if (this.provenanceEl) {
        this.provenanceEl.textContent = 'No MRI volume selected.';
      }
    } catch {
      // Headless/test environments: keep placeholders.
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
