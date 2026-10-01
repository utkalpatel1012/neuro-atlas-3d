/**
 * 3D Neuroanatomy Atlas: Phase 9 self-test quiz engine.
 * Standard: AAS-2026-NEURO-V1
 *
 * Questions come ONLY from verified claims (via flashcards.ts) or from a
 * record's own explicitly recorded gaps (verify-false "NOT REPRESENTED"
 * items — grounded refusals, never invented distractors).
 *
 * Verdicts:
 * - CORRECT / INCORRECT: free-text overlap against the recorded statement,
 *   or verify-mode boolean match against the record.
 * - UNKNOWN: empty answer, or a question whose layer carries no usable claim.
 * - NOT_REPRESENTED: the record explicitly records the topic as a gap.
 *
 * Score is kept IN-SESSION ONLY (QuizEngine instance memory). This module
 * never touches Web Storage: a fresh engine always starts at zero.
 * Pure module (no DOM, no engine, no storage): headless-testable.
 */

import type { KnowledgeGap, KnowledgeRecord } from '../search/knowledgeIndex';
import type { Flashcard } from './flashcards';
import { generateFlashcards } from './flashcards';

export type QuizVerdict = 'CORRECT' | 'INCORRECT' | 'UNKNOWN' | 'NOT_REPRESENTED';

export type QuizMode = 'free-text' | 'verify';

export interface QuizQuestion {
  questionId: string;
  structureId: string;
  displayName: string;
  claimId: string | null;
  mode: QuizMode;
  prompt: string;
  /** Verbatim expected statement, or null when the layer has no claim. */
  expectedStatement: string | null;
  /**
   * Verify mode only: true = the presented statement is the recorded claim;
   * false = the presented topic is a recorded gap (NOT REPRESENTED).
   * Null for free-text questions.
   */
  assertedTrue: boolean | null;
  source: string;
  citation: string;
}

export interface QuizScore {
  asked: number;
  correct: number;
  incorrect: number;
  unknown: number;
  notRepresented: number;
}

/** Small closed stopword set for overlap grading (deterministic). */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'and', 'or', 'is', 'are', 'as', 'to',
  'for', 'with', 'from', 'by', 'this', 'that', 'it', 'its', 'be', 'was',
]);

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

/** A free-text question grounded in one verified-claim flashcard. */
export function questionFromCard(card: Flashcard, mode: QuizMode = 'free-text'): QuizQuestion {
  if (mode === 'verify') {
    return {
      questionId: `quiz.verify.true.${card.cardId}`,
      structureId: card.structureId,
      displayName: card.displayName,
      claimId: card.claimId,
      mode: 'verify',
      prompt: `Is this statement supported by the verified record for ${card.displayName} (${card.laterality})? "${card.back.split('\n')[0]}"`,
      expectedStatement: card.back.split('\n')[0] ?? null,
      assertedTrue: true,
      source: card.source,
      citation: card.citation,
    };
  }
  return {
    questionId: `quiz.free.${card.cardId}`,
    structureId: card.structureId,
    displayName: card.displayName,
    claimId: card.claimId,
    mode: 'free-text',
    prompt: card.front,
    expectedStatement: card.back.split('\n')[0] ?? null,
    assertedTrue: null,
    source: card.source,
    citation: card.citation,
  };
}

/**
 * A verify-false question grounded in the record's OWN recorded gap:
 * "Is there a verified claim about {topic}?" Expected: no — NOT
 * REPRESENTED. The gap topic/reason come verbatim from the record; the
 * NOT REPRESENTED verdict is the record's own stance, not an invention.
 */
export function refusalQuestionForGap(
  structureId: string,
  displayName: string,
  gap: KnowledgeGap
): QuizQuestion {
  return {
    questionId: `quiz.verify.gap.${structureId}.${gap.topic}`,
    structureId,
    displayName,
    claimId: null,
    mode: 'verify',
    prompt: `Is there a verified claim about "${gap.topic}" for ${displayName}?`,
    expectedStatement: null,
    assertedTrue: false,
    source: 'Recorded knowledge gap (absence of evidence, not evidence)',
    citation: gap.reason,
  };
}

/**
 * UNKNOWN verdict carrier: where the layer has no usable claim, the engine
 * refuses to fabricate a question. Returns null (caller surfaces UNKNOWN)
 * instead of inventing content.
 */
export function questionForRecord(record: KnowledgeRecord, mode: QuizMode = 'free-text'): QuizQuestion | null {
  const built = generateFlashcards(record);
  if (built.cards.length === 0) return null;
  return questionFromCard(built.cards[0], mode);
}

/** Grade a free-text answer against the recorded statement. */
export function gradeFreeText(question: QuizQuestion, answer: string): QuizVerdict {
  if (question.expectedStatement === null) return 'UNKNOWN';
  if (typeof answer !== 'string' || answer.trim() === '') return 'UNKNOWN';
  const expected = new Set(normalizeTokens(question.expectedStatement));
  if (expected.size === 0) return 'UNKNOWN';
  const given = new Set(normalizeTokens(answer));
  if (given.size < 3) return 'INCORRECT';
  let overlap = 0;
  for (const token of given) {
    if (expected.has(token)) overlap += 1;
  }
  return overlap / expected.size >= 0.6 ? 'CORRECT' : 'INCORRECT';
}

/**
 * Grade a verify-mode answer. `answerTrue`: learner's true/false judgement,
 * or null/undefined when they decline (UNKNOWN). A verify-false item whose
 * record marks the topic as a gap grades a correct "false" as
 * NOT_REPRESENTED (the record's own verdict), not merely CORRECT.
 */
export function gradeVerify(question: QuizQuestion, answerTrue: boolean | null | undefined): QuizVerdict {
  if (question.mode !== 'verify') return 'UNKNOWN';
  if (answerTrue === null || answerTrue === undefined) return 'UNKNOWN';
  if (question.assertedTrue === false) {
    return answerTrue === false ? 'NOT_REPRESENTED' : 'INCORRECT';
  }
  if (question.assertedTrue === true) {
    if (question.expectedStatement === null) return 'UNKNOWN';
    return answerTrue === true ? 'CORRECT' : 'INCORRECT';
  }
  return 'UNKNOWN';
}

/**
 * In-session quiz session. Holds questions + score in instance memory only;
 * constructing a new engine always starts at zero (asserted in tests).
 */
export class QuizEngine {
  private questions: QuizQuestion[];
  private cursor = 0;
  private score: QuizScore = { asked: 0, correct: 0, incorrect: 0, unknown: 0, notRepresented: 0 };
  private revealed = false;

  constructor(questions: QuizQuestion[] = []) {
    this.questions = [...questions];
  }

  public getQuestionCount(): number {
    return this.questions.length;
  }

  public current(): QuizQuestion | null {
    if (this.cursor < 0 || this.cursor >= this.questions.length) return null;
    const question = this.questions[this.cursor];
    return question ?? null;
  }

  public reveal(): QuizQuestion | null {
    this.revealed = true;
    return this.current();
  }

  public isRevealed(): boolean {
    return this.revealed;
  }

  public answerFreeText(answer: string): QuizVerdict {
    const question = this.current();
    if (question === null || question.mode !== 'free-text') return 'UNKNOWN';
    const verdict = gradeFreeText(question, answer);
    this.tally(verdict);
    return verdict;
  }

  public answerVerify(answerTrue: boolean | null | undefined): QuizVerdict {
    const question = this.current();
    if (question === null || question.mode !== 'verify') return 'UNKNOWN';
    const verdict = gradeVerify(question, answerTrue);
    this.tally(verdict);
    return verdict;
  }

  private tally(verdict: QuizVerdict): void {
    this.score.asked += 1;
    if (verdict === 'CORRECT') this.score.correct += 1;
    else if (verdict === 'INCORRECT') this.score.incorrect += 1;
    else if (verdict === 'NOT_REPRESENTED') this.score.notRepresented += 1;
    else this.score.unknown += 1;
  }

  public next(): QuizQuestion | null {
    if (this.cursor < this.questions.length) this.cursor += 1;
    this.revealed = false;
    return this.current();
  }

  public getScore(): QuizScore {
    return { ...this.score };
  }

  /** Score is session-only: reset returns to zero, nothing persists. */
  public reset(): void {
    this.cursor = 0;
    this.revealed = false;
    this.score = { asked: 0, correct: 0, incorrect: 0, unknown: 0, notRepresented: 0 };
  }

  public dispose(): void {
    this.questions = [];
    this.reset();
  }
}
