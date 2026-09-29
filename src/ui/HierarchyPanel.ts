/**
 * 3D Neuroanatomy Atlas: Anatomical Hierarchy Panel (Phase 5.0 §39–§40)
 * Standard: AAS-2026-NEURO-V1
 *
 * Hierarchical browsing with explicit geometry states: AVAILABLE structures
 * (RUNTIME_READY manifest assets) can be loaded on demand through the
 * existing AtlasApplication.loadEntity path (lazy, LOD, BVH, clipping,
 * selection, bookmarks all reused — no second systems). DOCUMENTED nodes
 * show that geometry does not exist (§5: labels never imply geometry).
 * Requires document (browser only); asset gating logic is manifest-driven.
 */

import { AtlasApplication } from '../engine/AtlasApplication';
import { AnatomicalEntityRecord } from '../engine/types';

interface HierarchyNode {
  id: string;
  level: number;
  name: string;
  geometry_state: string;
  children?: string[];
  asset_id?: string;
  structure_record?: string;
}

export class HierarchyPanel {
  private element: HTMLElement;
  private app: AtlasApplication;
  private nodes: HierarchyNode[] = [];
  private manifestAssets: Record<string, { validation_status?: string; structure_id?: string }> = {};
  private ready: Promise<void>;
  private resolveReady: () => void = () => undefined;

  constructor(container: HTMLElement, app: AtlasApplication) {
    this.app = app;
    this.ready = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });
    this.element = document.createElement('section');
    this.element.className = 'neuro-hierarchy-panel';
    this.element.setAttribute('aria-label', 'Anatomical hierarchy browser');
    this.element.innerHTML = `
      <div class="controls-group">
        <button id="btn-tree-toggle" class="btn btn-secondary" aria-label="Expand or collapse the anatomy tree" aria-expanded="false">Anatomy ▸</button>
        <span id="hierarchy-status" role="status">loading hierarchy…</span>
        <button id="btn-load-all" class="btn btn-secondary" aria-label="Load all available structures">Load all</button>
      </div>
      <div id="hierarchy-tree" role="tree" aria-label="Anatomical hierarchy" hidden></div>
      <div class="controls-group hierarchy-note" hidden>
        <small>DOCUMENTED = identity known, no geometry. AVAILABLE = validated geometry. The full atlas loads automatically; use the tree to inspect individual structures.</small>
      </div>
    `;
    container.appendChild(this.element);
    const toggleBtn = this.element.querySelector('#btn-tree-toggle');
    const tree = this.element.querySelector('#hierarchy-tree');
    const note = this.element.querySelector('.hierarchy-note');
    if (toggleBtn && tree) {
      toggleBtn.addEventListener('click', () => {
        const hidden = tree.hasAttribute('hidden');
        if (hidden) {
          tree.removeAttribute('hidden');
          if (note) note.removeAttribute('hidden');
          toggleBtn.setAttribute('aria-expanded', 'true');
          toggleBtn.textContent = 'Anatomy ▾';
        } else {
          tree.setAttribute('hidden', '');
          if (note) note.setAttribute('hidden', '');
          toggleBtn.setAttribute('aria-expanded', 'false');
          toggleBtn.textContent = 'Anatomy ▸';
        }
      });
    }
    const loadAllBtn = this.element.querySelector('#btn-load-all');
    if (loadAllBtn) {
      loadAllBtn.addEventListener('click', () => {
        loadAllBtn.setAttribute('disabled', 'true');
        void this.loadAllAvailable().finally(() => loadAllBtn.removeAttribute('disabled'));
      });
    }
    void this.initialize();
  }

  /**
   * Load every AVAILABLE + CLEARED structure that is not already loaded.
   * Runs in the background: each asset is error-isolated so one failure never
   * blocks the rest, and progress is reported in the panel status line.
   * This is what makes the full atlas visible instead of only the 4 defaults.
   */
  public async loadAllAvailable(): Promise<{ loaded: number; failed: string[] }> {
    // Wait for the hierarchy + manifest fetch; otherwise an early call sees zero nodes.
    await this.ready;
    let loaded = 0;
    const failed: string[] = [];
    const status = this.element.querySelector('#hierarchy-status');
    const loadables = this.nodes.filter((n) => this.isLoadable(n));
    let i = 0;
    for (const node of loadables) {
      i++;
      // Re-check: a node may have become loaded (or unloadable) while we worked.
      if (!this.isLoadable(node)) continue;
      if (status) status.textContent = `loading anatomy… ${i}/${loadables.length} (${node.name})`;
      try {
        await this.loadNode(node);
        loaded++;
      } catch (err) {
        failed.push(`${node.asset_id}: ${(err as Error).message}`);
      }
    }
    this.render();
    if (status) {
      const base = `${loaded} structures loaded`;
      status.textContent = failed.length === 0 ? base : `${base} · ${failed.length} failed (see console)`;
    }
    if (failed.length > 0) console.warn('[HierarchyPanel] load-all failures:', failed);
    return { loaded, failed };
  }

  private async initialize(): Promise<void> {
    try {
      const [hierarchy, manifest] = await Promise.all([
        fetch('data/anatomical_hierarchy.json').then((r) => {
          if (!r.ok) throw new Error(`hierarchy HTTP ${r.status}`);
          return r.json();
        }),
        fetch('assets/manifests/assets.manifest.json').then((r) => {
          if (!r.ok) throw new Error(`manifest HTTP ${r.status}`);
          return r.json();
        })
      ]);
      this.nodes = hierarchy.nodes || [];
      this.manifestAssets = manifest.assets || {};
      this.render();
    } catch (err) {
      const status = this.element.querySelector('#hierarchy-status');
      if (status) status.textContent = `hierarchy unavailable (${(err as Error).message})`;
    } finally {
      this.resolveReady();
    }
  }

  private isLoadable(node: HierarchyNode): boolean {
    if (node.geometry_state !== 'AVAILABLE' || !node.asset_id) return false;
    const entry = this.manifestAssets[node.asset_id];
    // Renderer refuses invalid-provenance assets (§30): only CLEARED entries load.
    if (!entry || entry.validation_status !== 'CLEARED') return false;
    if (this.app.getEntityManager().hasEntity(this.entityIdFor(node))) return false;
    return true;
  }

  private entityIdFor(node: HierarchyNode): string {
    // Structure records carry the canonical id; derive deterministically here
    // for the loaded-check (authoritative id resolved at load time).
    return node.id;
  }

  private render(): void {
    const tree = this.element.querySelector('#hierarchy-tree');
    const status = this.element.querySelector('#hierarchy-status');
    if (!tree) return;
    if (status) {
      const available = this.nodes.filter((n) => n.geometry_state === 'AVAILABLE').length;
      const documented = this.nodes.filter((n) => n.geometry_state === 'DOCUMENTED').length;
      status.textContent = `${available} available · ${documented} documented (no geometry)`;
    }
    tree.innerHTML = '';
    // Roots = nodes at the shallowest level only. (Filtering level <= 1
    // duplicates subtrees: level-1 nodes already render as children of level 0.)
    const minLevel = Math.min(...this.nodes.map((n) => n.level));
    const roots = this.nodes.filter((n) => n.level === minLevel);
    for (const root of roots) {
      tree.appendChild(this.renderNode(root, 0));
    }
  }

  private renderNode(node: HierarchyNode, depth: number): HTMLElement {
    const div = document.createElement('div');
    div.setAttribute('role', 'treeitem');
    div.style.marginLeft = `${depth * 12}px`;
    const badge = document.createElement('span');
    badge.textContent = node.geometry_state === 'AVAILABLE' ? ' [available]' : ' [documented]';
    badge.className = node.geometry_state === 'AVAILABLE' ? 'state-available' : 'state-documented';
    const label = document.createElement('span');
    label.textContent = node.name;
    div.appendChild(label);
    div.appendChild(badge);
    if (this.isLoadable(node)) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Load';
      btn.setAttribute('aria-label', `Load ${node.name} geometry on demand`);
      btn.addEventListener('click', () => {
        btn.disabled = true;
        void this.loadNode(node).finally(() => this.render());
      });
      div.appendChild(btn);
    } else if (node.geometry_state === 'AVAILABLE' && node.asset_id && this.app.getEntityManager().hasEntity(node.id)) {
      const loaded = document.createElement('span');
      loaded.textContent = ' [loaded]';
      div.appendChild(loaded);
    }
    for (const childId of node.children || []) {
      const child = this.nodes.find((n) => n.id === childId);
      if (child) div.appendChild(this.renderNode(child, depth + 1));
    }
    return div;
  }

  private async loadNode(node: HierarchyNode): Promise<void> {
    if (!node.structure_record || !node.asset_id) return;
    const record = await fetch(node.structure_record).then((r) => {
      if (!r.ok) throw new Error(`structure HTTP ${r.status}`);
      return r.json();
    });
    const entry = this.manifestAssets[node.asset_id];
    if (!entry || entry.validation_status !== 'CLEARED') {
      throw new Error(`Refusing ${node.asset_id}: provenance not CLEARED (§30).`);
    }
    const entity: AnatomicalEntityRecord = {
      entityId: record.id,
      assetId: record.asset_id,
      name: record.name?.official_english || record.canonical_name,
      officialLatin: record.name?.official_latin || record.latin_name || '',
      laterality: record.laterality,
      canonicalCentroidMm: record.spatial.stereotaxic_registration.registered_centroid,
      dimensionsMm: [
        record.spatial.bounding_box.max[0] - record.spatial.bounding_box.min[0],
        record.spatial.bounding_box.max[1] - record.spatial.bounding_box.min[1],
        record.spatial.bounding_box.max[2] - record.spatial.bounding_box.min[2]
      ],
      volumeCm3: record.spatial.estimated_volume_cm3 ?? 0,
      topologyClass: record.representations?.[0]?.metadata?.topology || 'UNKNOWN',
      validationStatus: 'APPROVED',
      // Visibility fix: flag cavity casts so the renderer draws them translucent.
      // Without this, ventricular CSF spaces rendered as opaque solids.
      isCavity: Array.isArray(record.representations) &&
        record.representations.some((r: any) => r?.representation_type === 'cavity_cast'),
      upstreamDataset: record.asset_provenance?.dataset_name || 'BodyParts3D Release 3.0',
      // Phase 5.2 provenance review MAJOR-1: this used to be a hardcoded 'CC BY 4.0'
      // literal. The manifest records the upstream files as CC_BY_SA_2_1_JP and marks
      // portal-listing retroactivity UNRESOLVED / LEGAL_REVIEW_REQUIRED, so showing
      // users "CC BY 4.0" resolved, in the UI, the exact question the project
      // deliberately leaves open. Report what the record actually says.
      upstreamLicense: record.asset_provenance?.upstream_license || 'UNRECORDED',
      sourceDefinition: record.ontology?.fma_id || '',
      groups: record.hierarchy?.groups || []
    };
    await this.app.loadEntity(entity);
    // Register lobe/hemisphere/division groups on demand; placement reuses
    // the existing assembly + selection + visibility systems (§41).
    const assembly = this.app.getAssemblyManager();
    for (const groupId of entity.groups || []) {
      if (!assembly.getGroup(groupId)) {
        const category = groupId.startsWith('division.') ? 'division'
          : groupId.startsWith('hemisphere.') ? 'hemisphere'
          : groupId.startsWith('lobe.') ? 'lobe' : 'region';
        assembly.registerGroup({
          groupId,
          name: groupId,
          semanticType: 'STRUCTURAL_CONTAINER',
          category,
          childGroupIds: [],
          memberEntityIds: [],
          status: 'AVAILABLE'
        });
      }
      assembly.addEntityToGroup(entity.entityId, groupId);
    }
  }

  public dispose(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }

  /**
   * Phase 6 search wiring: load one AVAILABLE structure by hierarchy node id
   * through the same CLEARED-gated on-demand path as manual loads (no second
   * systems). DOCUMENTED nodes and non-CLEARED assets are refused — search
   * precision requires never resolving to an unsupported structure.
   */
  public async loadAvailableByEntityId(entityId: string): Promise<void> {
    await this.ready;
    const node = this.nodes.find((n) => n.id === entityId);
    if (!node) throw new Error(`Unknown hierarchy node: ${entityId}.`);
    if (this.app.getEntityManager().hasEntity(node.id)) return;
    if (!this.isLoadable(node)) {
      throw new Error(`Refusing ${entityId}: not AVAILABLE with a CLEARED manifest asset.`);
    }
    await this.loadNode(node);
    this.render();
  }
}
