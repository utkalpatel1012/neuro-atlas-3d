/**
 * 3D Neuroanatomy Atlas: Grounded Tutor Panel (Phase 11)
 * Standard: AAS-2026-NEURO-V1
 *
 * Query box → LOCAL retrieval + fixed-template answers with citations,
 * recorded evidence, and the educational-use guard. 3D actions go through
 * the EXISTING selection/focus pipeline (AnatomicalAssemblyManager +
 * AtlasApplication.focusEntity via routeEntry; on-demand load via
 * HierarchyPanel; cited detail via AnatomicalInfoPanel.showKnowledge) —
 * no second systems. AVAILABLE entities select + focus; DOCUMENTED
 * entries show the geometry-free detail card with no camera move;
 * refusals carry no 3D action.
 *
 * Plain statement: this tutor is local retrieval over the verified atlas
 * layers with templated responses. No external model is called.
 * Requires document (browser only); retrieval logic itself is DOM-free.
 */

import type { AtlasApplication } from '../engine/AtlasApplication';
import type { AnatomicalInfoPanel } from './AnatomicalInfoPanel';
import type { HierarchyPanel } from './HierarchyPanel';
import { answerQuestion, type TutorResponse } from '../tutor/index';
import {
  knowledgeFileFor,
  loadSearchIndex,
  type KnowledgeRecord,
  type KnowledgeSearchEntry,
  type RankedSearchResult,
} from '../search/knowledgeIndex';
import { routeEntry } from '../search/searchSelect';
import {
  getRelationships,
  getSystems,
  refusalForTopic,
} from '../psychiatry/index';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class TutorPanel {
  private element: HTMLElement;
  private body: HTMLElement;
  private toggle: HTMLButtonElement;
  private app: AtlasApplication;
  private infoPanel: AnatomicalInfoPanel;
  private hierarchyPanel: HierarchyPanel;
  private entries: KnowledgeSearchEntry[] = [];
  private knowledgeCache = new Map<string, KnowledgeRecord | null>();
  private input: HTMLInputElement;
  private answerBox: HTMLElement;
  private status: HTMLElement;

  constructor(
    container: HTMLElement,
    app: AtlasApplication,
    infoPanel: AnatomicalInfoPanel,
    hierarchyPanel: HierarchyPanel,
  ) {
    this.app = app;
    this.infoPanel = infoPanel;
    this.hierarchyPanel = hierarchyPanel;

    this.element = document.createElement('section');
    this.element.className = 'neuro-tutor-panel';
    this.element.setAttribute('aria-label', 'Grounded anatomy tutor');
    this.element.innerHTML = `
      <button id="tutor-toggle" class="btn btn-toggle" aria-expanded="true">
        Grounded tutor (local retrieval — no external model) [collapse]
      </button>
      <div id="tutor-body">
        <p class="tutor-local-note">Local retrieval over verified atlas layers with fixed templates.
        No external model is called; answers cite only recorded claims, relationships, and deferral states.</p>
        <div class="controls-group">
          <input id="tutor-input" type="search" placeholder="Ask about a recorded structure or system…"
            aria-label="Ask the grounded tutor" autocomplete="off" />
          <button id="tutor-ask" class="btn btn-action">Ask</button>
          <span id="tutor-status" role="status">loading search index…</span>
        </div>
        <div id="tutor-answer" aria-live="polite"></div>
      </div>
    `;
    container.appendChild(this.element);
    this.toggle = this.element.querySelector('#tutor-toggle') as HTMLButtonElement;
    this.body = this.element.querySelector('#tutor-body') as HTMLElement;
    this.input = this.element.querySelector('#tutor-input') as HTMLInputElement;
    this.answerBox = this.element.querySelector('#tutor-answer') as HTMLElement;
    this.status = this.element.querySelector('#tutor-status') as HTMLElement;
    const ask = this.element.querySelector('#tutor-ask') as HTMLButtonElement;

    this.toggle.addEventListener('click', () => {
      const collapsed = this.body.hasAttribute('hidden');
      if (collapsed) {
        this.body.removeAttribute('hidden');
        this.toggle.setAttribute('aria-expanded', 'true');
        this.toggle.textContent = 'Grounded tutor (local retrieval — no external model) [collapse]';
      } else {
        this.body.setAttribute('hidden', '');
        this.toggle.setAttribute('aria-expanded', 'false');
        this.toggle.textContent = 'Grounded tutor (local retrieval — no external model) [expand]';
      }
    });
    ask.addEventListener('click', () => {
      void this.ask();
    });
    this.input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') void this.ask();
    });
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.entries = await loadSearchIndex();
      this.status.textContent = `${this.entries.length} structures indexed · local retrieval — no external model`;
    } catch (err) {
      this.status.textContent = `tutor unavailable (${(err as Error).message})`;
    }
  }

  /** Local knowledge-record reader (same-origin data/ file only, cached). */
  private async readKnowledgeRecord(structureId: string): Promise<KnowledgeRecord | null> {
    if (this.knowledgeCache.has(structureId)) {
      return this.knowledgeCache.get(structureId) ?? null;
    }
    try {
      const res = await fetch(knowledgeFileFor(structureId));
      if (!res.ok) {
        this.knowledgeCache.set(structureId, null);
        return null;
      }
      const record = (await res.json()) as KnowledgeRecord;
      this.knowledgeCache.set(structureId, record);
      return record;
    } catch {
      this.knowledgeCache.set(structureId, null);
      return null;
    }
  }

  private async ask(): Promise<void> {
    const question = this.input.value;
    if (question.trim() === '') {
      this.status.textContent = 'type a question first — empty questions resolve to nothing';
      return;
    }
    this.status.textContent = 'answering from recorded layers…';
    this.answerBox.innerHTML = '';
    try {
      const response = await answerQuestion(question, {
        entries: this.entries,
        readKnowledge: (id) => this.readKnowledgeRecord(id),
        relationships: getRelationships(),
        systems: getSystems(),
        refusalForTopic,
        entryCount: this.entries.length,
      });
      this.renderResponse(question, response);
      this.status.textContent = `answered: ${response.status}`;
    } catch (err) {
      this.status.textContent = `tutor error (${(err as Error).message})`;
    }
  }

  private renderResponse(question: string, response: TutorResponse): void {
    const card = document.createElement('div');
    card.className = `tutor-answer tutor-${response.status.toLowerCase().replace(/_/g, '-')}`;
    const badge =
      response.status === 'ANSWER' ? 'answer — recorded' : response.status.toLowerCase().replace(/_/g, ' ');
    card.innerHTML = `
      <h3 class="tutor-status">Q: ${escapeHtml(question)}</h3>
      <p class="tutor-badge">Status: ${escapeHtml(badge)}</p>
      <div class="tutor-text" style="white-space: pre-wrap;">${escapeHtml(response.text)}</div>
      <div class="tutor-evidence"></div>
      <p class="tutor-guard">${escapeHtml(response.guard)}</p>
      <div class="tutor-actions"></div>
    `;
    this.answerBox.appendChild(card);

    const evidenceBox = card.querySelector('.tutor-evidence') as HTMLElement;
    if (response.evidence.length > 0) {
      const list = document.createElement('ul');
      list.className = 'tutor-evidence-list';
      for (const item of response.evidence) {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="tutor-evidence-text">${escapeHtml(item.statement)}</div>
          <div class="tutor-evidence-meta">Evidence: ${escapeHtml(item.evidence_level)} · Source: ${escapeHtml(item.source)}</div>
          <div class="tutor-evidence-cite">Citation: ${escapeHtml(item.citation)}</div>
        `;
        list.appendChild(li);
      }
      evidenceBox.appendChild(list);
    }

    const actionsBox = card.querySelector('.tutor-actions') as HTMLElement;
    for (const structureId of response.structureIds.slice(0, 20)) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-action';
      // Phase 11 review fix: "Show in 3D" overstated for DOCUMENTED
      // (geometry-free) ids. locate() routes safely either way; label neutrally.
      btn.textContent = `Locate: ${structureId}`;
      btn.setAttribute('aria-label', `Locate ${structureId} (3D focus where geometry exists, cited detail otherwise)`);
      btn.addEventListener('click', () => {
        void this.locate(structureId);
      });
      actionsBox.appendChild(btn);
    }
    if (response.structureIds.length > 0) {
      const detail = document.createElement('button');
      detail.className = 'btn btn-action';
      detail.textContent = 'Open cited detail';
      detail.addEventListener('click', () => {
        void this.infoPanel.showKnowledge(response.structureIds[0]);
      });
      actionsBox.appendChild(detail);
    }
  }

  /** Route one structure id through the EXISTING selection/focus pipeline. */
  private async locate(structureId: string): Promise<void> {
    const entry = this.entries.find((e) => e.structure_id === structureId);
    if (!entry) {
      this.status.textContent = 'no match — query resolves to nothing';
      return;
    }
    const result: RankedSearchResult = {
      entry,
      score: 100,
      tier: 'exact',
      geometryFree: entry.geometry_state === 'DOCUMENTED',
    };
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
        this.status.textContent = `selected: ${entry.display_name}`;
      } else if (outcome.kind === 'geometry-free') {
        this.status.textContent = `documented (no geometry): ${entry.display_name}`;
      } else {
        this.status.textContent = 'no match — query resolves to nothing';
      }
    } catch (err) {
      this.status.textContent = `cannot select (${(err as Error).message})`;
    }
  }

  public dispose(): void {
    this.knowledgeCache.clear();
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
