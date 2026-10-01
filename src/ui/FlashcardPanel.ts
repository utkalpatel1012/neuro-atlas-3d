/**
 * 3D Neuroanatomy Atlas: Phase 9 flashcard panel.
 * Standard: AAS-2026-NEURO-V1
 *
 * Deck viewer over cards generated ONLY from verified claims
 * (src/study/flashcards.ts). The panel never invents content: it renders
 * card front/back verbatim and reports the generator's explicit skip count.
 * Known/unknown marks go to the single shared StudyStore (bounded).
 * Collapsible (collapsed by default); dispose() detaches everything.
 * Requires document (browser only).
 */

import type { Flashcard } from '../study/flashcards';
import type { StudyStore } from '../study/studyStore';

export interface FlashcardPanelOptions {
  getDeck?: () => Flashcard[];
  getSkippedCount?: () => number;
}

export class FlashcardPanel {
  private element: HTMLElement;
  private body: HTMLElement;
  private status: HTMLElement;
  private cardFront: HTMLElement;
  private cardBack: HTMLElement;
  private store: StudyStore;
  private deck: Flashcard[] = [];
  private skippedCount = 0;
  private cursor = 0;
  private flipped = false;
  private getDeck: () => Flashcard[];
  private getSkippedCount: () => number;
  private disposables: Array<() => void> = [];
  private disposed = false;

  constructor(container: HTMLElement, store: StudyStore, options: FlashcardPanelOptions = {}) {
    this.store = store;
    this.getDeck = options.getDeck ?? (() => []);
    this.getSkippedCount = options.getSkippedCount ?? (() => 0);

    this.element = document.createElement('section');
    this.element.className = 'neuro-study-panel neuro-flashcard-panel';
    this.element.setAttribute('aria-label', 'Flashcards from verified claims');
    this.element.innerHTML = `
      <div class="controls-group">
        <button class="btn btn-secondary study-toggle" aria-label="Expand or collapse flashcards" aria-expanded="false">Flashcards ▸</button>
        <span class="study-status" role="status">no deck</span>
      </div>
      <div class="study-body" hidden>
        <div class="study-card-front" aria-live="polite"></div>
        <div class="study-card-back" aria-live="polite" hidden></div>
        <div class="controls-group">
          <button class="btn btn-secondary study-flip">Flip</button>
          <button class="btn btn-secondary study-prev">◂ Prev</button>
          <button class="btn btn-secondary study-next">Next ▸</button>
        </div>
        <div class="controls-group">
          <button class="btn btn-action study-known">Mark known</button>
          <button class="btn btn-secondary study-unknown">Mark unknown</button>
        </div>
      </div>
    `;
    container.appendChild(this.element);

    const toggle = this.element.querySelector('.study-toggle') as HTMLButtonElement | null;
    this.body = this.element.querySelector('.study-body') as HTMLElement;
    this.status = this.element.querySelector('.study-status') as HTMLElement;
    this.cardFront = this.element.querySelector('.study-card-front') as HTMLElement;
    this.cardBack = this.element.querySelector('.study-card-back') as HTMLElement;
    const flip = this.element.querySelector('.study-flip') as HTMLButtonElement | null;
    const prev = this.element.querySelector('.study-prev') as HTMLButtonElement | null;
    const next = this.element.querySelector('.study-next') as HTMLButtonElement | null;
    const known = this.element.querySelector('.study-known') as HTMLButtonElement | null;
    const unknown = this.element.querySelector('.study-unknown') as HTMLButtonElement | null;

    if (toggle && this.body) {
      const onToggle = (): void => {
        const hidden = this.body.hasAttribute('hidden');
        if (hidden) {
          this.body.removeAttribute('hidden');
          toggle.setAttribute('aria-expanded', 'true');
          toggle.textContent = 'Flashcards ▾';
          this.reloadDeck();
        } else {
          this.body.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = 'Flashcards ▸';
        }
      };
      toggle.addEventListener('click', onToggle);
      this.disposables.push(() => toggle.removeEventListener('click', onToggle));
    }

    const wire = (btn: HTMLButtonElement | null, fn: () => void): void => {
      if (!btn) return;
      btn.addEventListener('click', fn);
      this.disposables.push(() => btn.removeEventListener('click', fn));
    };
    wire(flip, () => this.setFlipped(!this.flipped));
    wire(prev, () => this.step(-1));
    wire(next, () => this.step(1));
    wire(known, () => this.markCurrent('known'));
    wire(unknown, () => this.markCurrent('unknown'));

    const unsubscribe = this.store.subscribe(() => this.render());
    this.disposables.push(unsubscribe);
  }

  /** Host supplies the deck (built by generateDeck from knowledge records). */
  public setDeck(cards: Flashcard[], skippedCount = 0): void {
    this.deck = [...cards];
    this.skippedCount = skippedCount;
    this.cursor = 0;
    this.flipped = false;
    this.render();
  }

  public reloadDeck(): void {
    this.setDeck(this.getDeck(), this.getSkippedCount());
  }

  public getCursor(): number {
    return this.cursor;
  }

  public getDeckSize(): number {
    return this.deck.length;
  }

  private step(delta: number): void {
    if (this.deck.length === 0) return;
    this.cursor = (this.cursor + delta + this.deck.length) % this.deck.length;
    this.flipped = false;
    this.render();
  }

  private setFlipped(flipped: boolean): void {
    this.flipped = flipped;
    this.render();
  }

  private markCurrent(mark: 'known' | 'unknown'): void {
    const card = this.deck[this.cursor];
    if (!card) return;
    this.store.markCard(card.cardId, mark);
    this.step(1);
  }

  private render(): void {
    if (this.disposed) return;
    const counts = this.store.getProgressCounts();
    if (this.deck.length === 0) {
      this.status.textContent = this.skippedCount > 0
        ? `no cards — ${this.skippedCount} structure(s) skipped (no verified claim)`
        : 'no deck';
      this.cardFront.textContent = 'No flashcards: every structure without a verified claim is skipped, never invented.';
      this.cardBack.setAttribute('hidden', '');
      return;
    }
    const card = this.deck[this.cursor];
    if (!card) return;
    const mark = this.store.getCardMark(card.cardId);
    this.status.textContent =
      `card ${this.cursor + 1}/${this.deck.length}` +
      (mark ? ` · marked ${mark}` : '') +
      ` · known ${counts.known} / unknown ${counts.unknown}` +
      (this.skippedCount > 0 ? ` · ${this.skippedCount} skipped (no claim)` : '');
    this.cardFront.textContent = card.front;
    this.cardBack.textContent = card.back;
    if (this.flipped) this.cardBack.removeAttribute('hidden');
    else this.cardBack.setAttribute('hidden', '');
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const dispose of this.disposables) {
      try {
        dispose();
      } catch (err) {
        console.error('[FlashcardPanel] Dispose error:', err);
      }
    }
    this.disposables.length = 0;
    this.deck = [];
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
