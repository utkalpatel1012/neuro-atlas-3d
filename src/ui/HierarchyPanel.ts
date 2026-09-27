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

  constructor(container: HTMLElement, app: AtlasApplication) {
    this.app = app;
    this.element = document.createElement('section');
    this.element.className = 'neuro-hierarchy-panel';
    this.element.setAttribute('aria-label', 'Anatomical hierarchy browser');
    this.element.innerHTML = `
      <div class="controls-group">
        <span class="controls-label">Anatomy:</span>
        <span id="hierarchy-status" role="status">loading hierarchy…</span>
      </div>
      <div id="hierarchy-tree" role="tree" aria-label="Anatomical hierarchy"></div>
      <div class="controls-group">
        <small>DOCUMENTED = identity known, no geometry. AVAILABLE = validated geometry, loads on demand. Default view loads only the 4 production assets.</small>
      </div>
    `;
    container.appendChild(this.element);
    void this.initialize();
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
    const roots = this.nodes.filter((n) => n.level <= 1);
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
      upstreamDataset: record.asset_provenance?.dataset_name || 'BodyParts3D Release 3.0',
      upstreamLicense: 'CC BY 4.0',
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
}
