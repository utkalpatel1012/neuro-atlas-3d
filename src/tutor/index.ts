/**
 * 3D Neuroanatomy Atlas: Grounded Tutor Module Barrel (Phase 11)
 * Standard: AAS-2026-NEURO-V1
 *
 * Local retrieval + templated responder. No LLM backend: no model weights,
 * no keys, no remote endpoints, no external calls anywhere in this module.
 */

import { parseQuestion } from './parseQuestion';
import { respond } from './respond';
import { retrieve } from './retrieve';
import type { TutorContext, TutorResponse } from './types';

export { parseQuestion, hasAnatomicalVocab, mentionsParcel } from './parseQuestion';
export { retrieve } from './retrieve';
export { respond } from './respond';
export type {
  KnowledgeReader,
  ParsedQuestion,
  RetrievedEvidence,
  TutorAction3D,
  TutorContext,
  TutorEvidenceItem,
  TutorResponse,
  TutorStatus,
} from './types';

/**
 * Answer one question end to end: parse (existing Phase 6 ranker + Phase 8
 * clinical-intent detector) → retrieve (recorded layers only) → respond
 * (fixed templates). Pure orchestration over the injected context.
 */
export async function answerQuestion(
  question: string,
  ctx: TutorContext,
): Promise<TutorResponse> {
  const systemIds = ctx.systems.map((s) => s.system_id);
  const parsed = parseQuestion(question, ctx.entries, systemIds);
  const evidence = await retrieve(parsed, ctx);
  return respond(evidence);
}
