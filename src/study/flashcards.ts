/**
 * 3D Neuroanatomy Atlas: Phase 9 flashcard generator (verified claims only).
 * Standard: AAS-2026-NEURO-V1
 *
 * Generates study cards ONLY from Phase 6 `data/knowledge/` verified claims.
 * - Front: structure name/laterality recall prompt (fixed phrasing per claim
 *   type — phrasing is presentation, never anatomical content).
 * - Back: the claim statement verbatim + source + citation + evidence level.
 * - A structure with zero usable claims produces NO card: the refusal is
 *   explicit and counted in `skipped` (never invented content, never
 *   invented distractors).
 * - Gaps (`gaps[]`) NEVER become cards: they record absence of evidence and
 *   are asserted separately in tests.
 *
 * Pure module (no DOM, no engine, no storage): headless-testable.
 * Bounded: generateDeck caps output at MAX_DECK_CARDS (unbounded-memory-ui).
 */

import type { KnowledgeClaim, KnowledgeRecord } from '../search/knowledgeIndex';

export interface Flashcard {
  cardId: string;
  structureId: string;
  displayName: string;
  laterality: string;
  claimId: string;
  claimType: string;
  evidenceLevel: string;
  front: string;
  back: string;
  source: string;
  citation: string;
}

export interface SkippedStructure {
  structureId: string;
  displayName: string;
  reason: string;
}

export interface DeckBuildResult {
  cards: Flashcard[];
  skipped: SkippedStructure[];
}

/** Bounded deck output (registry: unbounded-memory-ui hard stop). */
export const MAX_DECK_CARDS = 500;

/** Fixed front-prompt phrasing per claim type (presentation only). */
const FRONT_PROMPTS: Record<string, string> = {
  DISTRIBUTION: 'Which distribution source is recorded for this structure?',
  RECORD: 'State the recorded fact for this structure.',
  ONTOLOGY: 'Which verified ontology identifier is recorded for this structure?',
  LITERATURE: 'State the literature-supported fact recorded for this structure.',
};

function frontPromptFor(claimType: string): string {
  return FRONT_PROMPTS[claimType] ?? 'State the verified recorded fact for this structure.';
}

/**
 * A claim is usable for study cards iff it carries a non-empty statement,
 * source, citation, and evidence level. Anything less is not a verified
 * claim and must not produce a card.
 */
export function isUsableClaim(claim: KnowledgeClaim): boolean {
  if (!claim || typeof claim !== 'object') return false;
  const hasStatement = typeof claim.statement === 'string' && claim.statement.trim() !== '';
  const hasSource = typeof claim.source === 'string' && claim.source.trim() !== '';
  const hasCitation = typeof claim.citation === 'string' && claim.citation.trim() !== '';
  const hasEvidence = typeof claim.evidence_level === 'string' && claim.evidence_level.trim() !== '';
  const hasType = typeof claim.claim_type === 'string' && claim.claim_type.trim() !== '';
  return hasStatement && hasSource && hasCitation && hasEvidence && hasType;
}

function cardForClaim(record: KnowledgeRecord, claim: KnowledgeClaim): Flashcard {
  const laterality = typeof record.laterality === 'string' && record.laterality !== '' ? record.laterality : 'unspecified';
  const front = `${record.display_name} (${laterality}) — ${frontPromptFor(claim.claim_type)}`;
  // Back is verbatim record content only: statement + source + citation +
  // evidence. Nothing is paraphrased, nothing added.
  const back = `${claim.statement.trim()}\nSource: ${claim.source.trim()}\nCitation: ${claim.citation.trim()}\nEvidence: ${claim.evidence_level.trim()}`;
  return {
    cardId: `card.${record.structure_id}.${claim.claim_id}`,
    structureId: record.structure_id,
    displayName: record.display_name,
    laterality,
    claimId: claim.claim_id,
    claimType: claim.claim_type,
    evidenceLevel: claim.evidence_level,
    front,
    back,
    source: claim.source,
    citation: claim.citation,
  };
}

/** Cards for one record, or exactly one counted skip when nothing is usable. */
export function generateFlashcards(record: KnowledgeRecord): DeckBuildResult {
  if (!record || typeof record.structure_id !== 'string' || record.structure_id.trim() === '') {
    return { cards: [], skipped: [{ structureId: '(missing)', displayName: '(missing)', reason: 'Record has no structure id; no card generated.' }] };
  }
  const claims = Array.isArray(record.claims) ? record.claims : [];
  const usable = claims.filter(isUsableClaim);
  if (usable.length === 0) {
    return {
      cards: [],
      skipped: [
        {
          structureId: record.structure_id,
          displayName: record.display_name ?? record.structure_id,
          reason: `No verified claim indexed for this structure (${claims.length} claim(s) present, 0 usable); no card generated (explicit skip, not invention).`,
        },
      ],
    };
  }
  return { cards: usable.map((claim) => cardForClaim(record, claim)), skipped: [] };
}

/** Deck across many records. Output is capped (bounded memory); skips counted. */
export function generateDeck(records: KnowledgeRecord[]): DeckBuildResult {
  const cards: Flashcard[] = [];
  const skipped: SkippedStructure[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    const built = generateFlashcards(record);
    for (const card of built.cards) {
      if (seen.has(card.cardId)) continue;
      seen.add(card.cardId);
      if (cards.length >= MAX_DECK_CARDS) {
        skipped.push({
          structureId: record.structure_id,
          displayName: record.display_name ?? record.structure_id,
          reason: `Deck cap reached (${MAX_DECK_CARDS} cards); further cards omitted (bounded memory, explicit skip).`,
        });
        break;
      }
      cards.push(card);
    }
    // If the cap truncated this record's cards, its remaining skips are
    // already represented by the cap entry above; still record claim-level
    // skips for honesty.
    for (const skip of built.skipped) skipped.push(skip);
  }
  return { cards, skipped };
}
