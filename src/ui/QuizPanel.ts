/**
 * 3D Neuroanatomy Atlas: Phase 9 quiz panel.
 * Standard: AAS-2026-NEURO-V1
 *
 * Self-test mode over verified-claim questions (src/study/quiz.ts):
 * start → answer (free-text or 2-option verify) → reveal → score.
 * - Questions come from the host-supplied provider (verified claims or
 *   recorded-gap refusals only); the panel never invents content.
 * - Score lives in the QuizEngine instance (in-session only, never
 *   persisted — asserted in phase9 tests).
 * - UNKNOWN / NOT REPRESENTED verdicts are first-class UI states.
 * - Collapsible (collapsed by default); dispose() detaches everything.
 * - Requires document (browser only).
 */

import type { QuizQuestion, QuizVerdict } from '../study/quiz';
import { QuizEngine } from '../study/quiz';

export interface QuizPanelOptions {
  getQuestions?: () => QuizQuestion[];
}

export class QuizPanel {
  private element: HTMLElement;
  private body: HTMLElement;
  private status: HTMLElement;
  private prompt: HTMLElement;
  private answerInput: HTMLInputElement;
  private verdict: HTMLElement;
  private scoreLine: HTMLElement;
  private engine: QuizEngine;
  private getQuestions: () => QuizQuestion[];
  private disposables: Array<() => void> = [];
  private disposed = false;

  constructor(container: HTMLElement, options: QuizPanelOptions = {}) {
    this.getQuestions = options.getQuestions ?? (() => []);
    this.engine = new QuizEngine([]);

    this.element = document.createElement('section');
    this.element.className = 'neuro-study-panel neuro-quiz-panel';
    this.element.setAttribute('aria-label', 'Self-test quiz');
    this.element.innerHTML = `
      <div class="controls-group">
        <button class="btn btn-secondary study-toggle" aria-label="Expand or collapse self-test quiz" aria-expanded="false">Quiz ▸</button>
        <span class="study-status" role="status">not started</span>
      </div>
      <div class="study-body" hidden>
        <div class="study-quiz-prompt" aria-live="polite"></div>
        <div class="controls-group">
          <input class="study-quiz-answer" type="text" placeholder="Type your answer, or use True/False…" aria-label="Quiz answer" />
        </div>
        <div class="controls-group">
          <button class="btn btn-action study-submit">Submit</button>
          <button class="btn btn-secondary study-true">True</button>
          <button class="btn btn-secondary study-false">False</button>
          <button class="btn btn-secondary study-reveal">Reveal</button>
          <button class="btn btn-secondary study-next">Next ▸</button>
          <button class="btn btn-secondary study-restart">Restart</button>
        </div>
        <div class="study-quiz-verdict" aria-live="polite"></div>
        <div class="study-quiz-score" aria-live="polite"></div>
      </div>
    `;
    container.appendChild(this.element);

    const toggle = this.element.querySelector('.study-toggle') as HTMLButtonElement | null;
    this.body = this.element.querySelector('.study-body') as HTMLElement;
    this.status = this.element.querySelector('.study-status') as HTMLElement;
    this.prompt = this.element.querySelector('.study-quiz-prompt') as HTMLElement;
    this.answerInput = this.element.querySelector('.study-quiz-answer') as HTMLInputElement;
    this.verdict = this.element.querySelector('.study-quiz-verdict') as HTMLElement;
    this.scoreLine = this.element.querySelector('.study-quiz-score') as HTMLElement;

    const submit = this.element.querySelector('.study-submit') as HTMLButtonElement | null;
    const trueBtn = this.element.querySelector('.study-true') as HTMLButtonElement | null;
    const falseBtn = this.element.querySelector('.study-false') as HTMLButtonElement | null;
    const reveal = this.element.querySelector('.study-reveal') as HTMLButtonElement | null;
    const next = this.element.querySelector('.study-next') as HTMLButtonElement | null;
    const restart = this.element.querySelector('.study-restart') as HTMLButtonElement | null;

    if (toggle && this.body) {
      const onToggle = (): void => {
        const hidden = this.body.hasAttribute('hidden');
        if (hidden) {
          this.body.removeAttribute('hidden');
          toggle.setAttribute('aria-expanded', 'true');
          toggle.textContent = 'Quiz ▾';
        } else {
          this.body.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = 'Quiz ▸';
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
    wire(submit, () => this.submitFreeText());
    wire(trueBtn, () => this.submitVerify(true));
    wire(falseBtn, () => this.submitVerify(false));
    wire(reveal, () => this.reveal());
    wire(next, () => this.next());
    wire(restart, () => this.start());
  }

  /** Start (or restart) a session from the host-supplied questions. */
  public start(): void {
    this.engine.dispose();
    this.engine = new QuizEngine(this.getQuestions());
    this.verdict.textContent = '';
    this.answerInput.value = '';
    this.render();
  }

  public getEngine(): QuizEngine {
    return this.engine;
  }

  private submitFreeText(): void {
    const verdict = this.engine.answerFreeText(this.answerInput.value);
    this.showVerdict(verdict);
  }

  private submitVerify(value: boolean): void {
    const verdict = this.engine.answerVerify(value);
    this.showVerdict(verdict);
  }

  private showVerdict(verdict: QuizVerdict): void {
    const current = this.engine.current();
    if (verdict === 'UNKNOWN') {
      this.verdict.textContent = 'UNKNOWN — no verified claim covers this, or no answer was given. Nothing is guessed.';
    } else if (verdict === 'NOT_REPRESENTED') {
      this.verdict.textContent = `NOT REPRESENTED — the record explicitly marks this topic as absent. Reason: ${current?.citation ?? 'recorded gap'}`;
    } else if (verdict === 'CORRECT') {
      this.verdict.textContent = 'CORRECT — matches the verified record.';
    } else {
      this.verdict.textContent = `INCORRECT — check the verified record. Source: ${current?.source ?? 'see record'}`;
    }
    this.renderScore();
  }

  private reveal(): void {
    const current = this.engine.reveal();
    if (current === null) {
      this.verdict.textContent = 'No question: the layer has no verified claim (UNKNOWN).';
      return;
    }
    if (current.mode === 'verify' && current.assertedTrue === false) {
      this.verdict.textContent = `NOT REPRESENTED — ${current.citation}`;
    } else {
      this.verdict.textContent = `Recorded answer: ${current.expectedStatement ?? 'UNKNOWN'} (Source: ${current.source}; Citation: ${current.citation})`;
    }
  }

  private next(): void {
    this.answerInput.value = '';
    this.verdict.textContent = '';
    this.engine.next();
    this.render();
  }

  private render(): void {
    if (this.disposed) return;
    const current = this.engine.current();
    const total = this.engine.getQuestionCount();
    if (current === null) {
      this.status.textContent = total === 0 ? 'no questions (no verified claims)' : 'session complete';
      this.prompt.textContent = total === 0
        ? 'No quiz questions: structures without verified claims produce no questions (UNKNOWN), never invented ones.'
        : 'Session complete. Restart to run again (score is session-only).';
      this.renderScore();
      return;
    }
    this.status.textContent = `question · ${current.mode}`;
    this.prompt.textContent = current.prompt;
    this.renderScore();
  }

  private renderScore(): void {
    const score = this.engine.getScore();
    this.scoreLine.textContent =
      `Score (this session only): ${score.correct} correct · ${score.incorrect} incorrect · ` +
      `${score.unknown} unknown · ${score.notRepresented} not represented · ${score.asked} asked`;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.engine.dispose();
    for (const dispose of this.disposables) {
      try {
        dispose();
      } catch (err) {
        console.error('[QuizPanel] Dispose error:', err);
      }
    }
    this.disposables.length = 0;
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
