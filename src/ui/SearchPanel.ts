/**
 * 3D Neuroanatomy Atlas: Anatomical Knowledge Search Panel (Phase 6)
 * Standard: AAS-2026-NEURO-V1
 *
 * Query box → ranked results → click selects + focuses the 3D entity through
 * the EXISTING selection/focus pipeline (AnatomicalAssemblyManager.selectEntity
 * + AtlasApplication.focusEntity; on-demand load via HierarchyPanel, same
 * CLEARED-gated path — no second systems). DOCUMENTED results are marked
 * geometry-free: selecting one shows the knowledge detail card explaining
 * what is known vs what is not meshed, with no camera move.
 * Requires document (browser only); ranking logic itself is DOM-free.
 */

import { AtlasApplication } from '../engine/AtlasApplication';
import {
  KnowledgeSearchEntry,
  RankedSearchResult,
  loadSearchIndex,
  rankSearch,
} from '../search/knowledgeIndex';
import { routeEntry } from '../search/searchSelect';
import { AnatomicalInfoPanel } from './AnatomicalInfoPanel';
import { HierarchyPanel } from './HierarchyPanel';

export class SearchPanel {
  private element: HTMLElement;
  private app: AtlasApplication;
  private infoPanel: AnatomicalInfoPanel;
  private hierarchyPanel: HierarchyPanel;
  private entries: KnowledgeSearchEntry[] = [];
  private input: HTMLInputElement;
  private resultsBox: HTMLElement;
  private status: HTMLElement;

  constructor(
    container: HTMLElement,
    app: AtlasApplication,
    infoPanel: AnatomicalInfoPanel,
    hierarchyPanel: HierarchyPanel
  ) {
    this.app = app;
    this.infoPanel = infoPanel;
    this.hierarchyPanel = hierarchyPanel;

    this.element = document.createElement('section');
    this.element.className = 'neuro-search-panel';
    this.element.setAttribute('aria-label', 'Anatomical knowledge search');
    this.element.innerHTML = `
      <div class="controls-group">
        <input id="knowledge-search-input" type="search" placeholder="Search structures (name, alias, Latin)…"
          aria-label="Search anatomical structures" autocomplete="off" />
        <span id="knowledge-search-status" role="status">loading search index…</span>
      </div>
      <div id="knowledge-search-results" role="listbox" aria-label="Search results"></div>
    `;
    container.appendChild(this.element);
    this.input = this.element.querySelector('#knowledge-search-input') as HTMLInputElement;
    this.resultsBox = this.element.querySelector('#knowledge-search-results') as HTMLElement;
    this.status = this.element.querySelector('#knowledge-search-status') as HTMLElement;

    this.input.addEventListener('input', () => this.renderResults());
    this.input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') void this.activateTop();
    });
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.entries = await loadSearchIndex();
      this.status.textContent = `${this.entries.length} structures indexed`;
    } catch (err) {
      this.status.textContent = `search unavailable (${(err as Error).message})`;
    }
  }

  private currentRanked(): RankedSearchResult[] {
    return rankSearch(this.input.value, this.entries).slice(0, 8);
  }

  private renderResults(): void {
    const ranked = this.currentRanked();
    this.resultsBox.innerHTML = '';
    if (this.input.value.trim() === '') {
      this.status.textContent = `${this.entries.length} structures indexed`;
      return;
    }
    this.status.textContent = ranked.length === 0 ? 'no match — query resolves to nothing' : `${ranked.length} match(es)`;
    for (const result of ranked) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-search-result';
      btn.setAttribute('role', 'option');
      const badge = result.geometryFree ? 'documented · no geometry' : 'available';
      btn.textContent = `${result.entry.display_name} [${badge}]`;
      btn.setAttribute('aria-label', `Select ${result.entry.display_name} (${badge})`);
      btn.addEventListener('click', () => {
        void this.activate(result);
      });
      this.resultsBox.appendChild(btn);
    }
  }

  private async activateTop(): Promise<void> {
    const ranked = this.currentRanked();
    if (ranked.length === 0) {
      this.status.textContent = 'no match — query resolves to nothing';
      return;
    }
    await this.activate(ranked[0]);
  }

  private async activate(result: RankedSearchResult): Promise<void> {
    const assembly = this.app.getAssemblyManager();
    const entityManager = this.app.getEntityManager();
    try {
      const outcome = await routeEntry(result, {
        isLoaded: (id) => entityManager.hasEntity(id),
        ensureLoaded: async (id) => {
          await this.hierarchyPanel.loadAvailableByEntityId(id);
          return entityManager.hasEntity(id);
        },
        selectLoaded: (id) => assembly.selectEntity(id),
        focusLoaded: (id) => this.app.focusEntity(id),
        showDocumented: (id) => this.infoPanel.showKnowledge(id),
      });
      if (outcome.kind === 'selected-focused') {
        this.status.textContent = `selected: ${result.entry.display_name}`;
      } else if (outcome.kind === 'geometry-free') {
        this.status.textContent = `documented (no geometry): ${result.entry.display_name}`;
      } else {
        this.status.textContent = 'no match — query resolves to nothing';
      }
    } catch (err) {
      this.status.textContent = `cannot select (${(err as Error).message})`;
    }
  }

  public dispose(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
