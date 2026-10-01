/**
 * 3D Neuroanatomy Atlas: Tutor Retrieval (Phase 11)
 * Standard: AAS-2026-NEURO-V1
 *
 * Retrieves ONLY recorded layer content, with citations:
 * - Phase 6 knowledge records (claims + gaps + geometry state),
 * - Phase 8 relationships (with evidence grades) + refusal templates,
 * - Phase 7 deferral states (mapping gate CLOSED, per-atlas reasons).
 * Every clinical-intent question is routed through the Phase 8 guard
 * (guardClinicalQuery) and returns a refusal — never a relationship.
 * Anything unsupported returns an explicit unknown/not-represented/
 * insufficient-evidence state. Nothing is synthesized, paraphrased beyond
 * template slots, or invented.
 */

import {
  guardClinicalQuery,
  type PsychRefusal,
} from '../psychiatry/index';
import deferralDoc from '../../data/parcellation/deferral_record.json';
import atlasDoc from '../../data/parcellation/atlas_registry.json';
import { hasAnatomicalVocab } from './parseQuestion';
import type { ParsedQuestion, RetrievedEvidence, TutorContext } from './types';

interface DeferralDoc {
  outcome: string;
  mapping_gate: string;
  deferrals: Array<{
    atlas: string;
    rendering_state: string;
    reason: string;
    unblocks: string[];
  }>;
}

interface AtlasDoc {
  atlases: Array<{
    atlas: string;
    display_name: string;
    status: string;
    mapping_state: string;
  }>;
}

const DEFERRAL = deferralDoc as unknown as DeferralDoc;
const ATLASES = (atlasDoc as unknown as AtlasDoc).atlases;

function atlasDisplay(atlas: string): string {
  return ATLASES.find((a) => a.atlas === atlas)?.display_name ?? atlas;
}

/**
 * Retrieve recorded evidence for a parsed question. Priority is a safety
 * order, not a relevance ranking: clinical guard first, then the closed
 * parcel gate, then explicit refusal topics, then anatomy, then named
 * systems, then unknown/not-represented.
 */
export async function retrieve(
  parsed: ParsedQuestion,
  ctx: TutorContext,
): Promise<RetrievedEvidence> {
  // 1. Clinical intent: ALWAYS guard + refusal, even when an anatomy hit or
  //    a recorded relationship exists. Diagnostic/treatment output is a
  //    registry hard stop.
  if (parsed.clinical) {
    const guarded = guardClinicalQuery(parsed.raw);
    const refusal: PsychRefusal =
      guarded.refusal ?? ({
        status: 'INSUFFICIENT_EVIDENCE',
        topic: 'clinical_intent',
        reason:
          'Clinical-intent question refused: this teaching layer holds no clinical evidence base. No clinical answer is synthesized.',
        refusal_id: null,
      } satisfies PsychRefusal);
    return { kind: 'clinical-refusal', guard: guarded.guard, refusal };
  }

  // 2. Parcel/atlas phrasing: the Phase 7 mapping gate is CLOSED — no parcel
  //    geometry exists and none is mapped. Report the recorded deferral.
  if (parsed.parcelMention) {
    return {
      kind: 'parcel-deferral',
      atlases: DEFERRAL.deferrals.map(
        (d) => `${d.atlas} (${atlasDisplay(d.atlas)}): ${d.rendering_state}`,
      ),
      reasons: DEFERRAL.deferrals.map((d) => `${d.atlas}: ${d.reason}`),
      unblocks: DEFERRAL.deferrals.flatMap((d) =>
        d.unblocks.map((u) => `${d.atlas}: ${u}`),
      ),
    };
  }

  // 3. Explicit refusal-topic backstop (receptor/drug/DSM/diagnosis/
  //    treatment/neuromodulation phrasing not already caught by the guard).
  if (parsed.refusalTopic !== null) {
    const template = ctx.refusalForTopic(parsed.refusalTopic);
    if (template !== null) {
      return { kind: 'topic-refusal', template };
    }
    // Unknown topic id: refuse generically rather than inventing content.
    return {
      kind: 'unknown',
      entryCount: ctx.entryCount,
      reason:
        `A refusal route matched ("${parsed.refusalTopic}") but no recorded refusal template ` +
        `exists for that topic. No answer is synthesized.`,
    };
  }

  // 4. Anatomy: top Phase 6 ranker hit, answered ONLY from its recorded
  //    knowledge record (claims + gaps + citations as recorded).
  if (parsed.hits.length > 0) {
    const top = parsed.hits[0];
    const record = await ctx.readKnowledge(top.entry.structure_id);
    if (record !== null && record.structure_id === top.entry.structure_id) {
      return { kind: 'anatomy', entry: top.entry, record };
    }
    return {
      kind: 'unknown',
      entryCount: ctx.entryCount,
      reason:
        `The search index matched "${top.entry.display_name}" (${top.entry.structure_id}) ` +
        `but its recorded knowledge file could not be read. No answer is synthesized beyond readable records.`,
    };
  }

  // 5. Named systems: enumerate RECORDED members only (relationship ids +
  //    evidence as recorded), with guard + disclaimer attached at render.
  if (parsed.systems.length > 0) {
    const systemId = parsed.systems[0];
    const system = ctx.systems.find((s) => s.system_id === systemId);
    if (system !== undefined) {
      const members = ctx.relationships.filter((r) => r.system_id === systemId);
      if (members.length > 0) {
        return { kind: 'system-members', system, members };
      }
    }
    return {
      kind: 'not-represented',
      entryCount: ctx.entryCount,
      reason:
        `No supportable relationship is recorded for named system "${systemId}" ` +
        `in this layer. No answer is synthesized for unrecorded systems.`,
    };
  }

  // 6. No hit, no system, no refusal route: plausible anatomy without an
  //    indexed match is NOT REPRESENTED; non-atlas input is UNKNOWN.
  if (parsed.normalized.trim() === '') {
    return {
      kind: 'unknown',
      entryCount: ctx.entryCount,
      reason:
        'The question is empty: it resolves to no indexed structure, system, or recorded topic. No answer is synthesized.',
    };
  }
  if (hasAnatomicalVocab(parsed.normalized)) {
    return {
      kind: 'not-represented',
      entryCount: ctx.entryCount,
      reason:
        `No indexed structure matches "${parsed.raw.trim()}". ` +
        `It is not currently represented in this atlas index (${ctx.entryCount} structures searched); ` +
        `nothing is generated to fill the gap.`,
    };
  }
  return {
    kind: 'unknown',
    entryCount: ctx.entryCount,
    reason:
      `The question resolves to no indexed structure, named system, or recorded topic ` +
      `(${ctx.entryCount} structures searched). No answer is synthesized.`,
  };
}
