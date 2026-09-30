/**
 * 3D Neuroanatomy Atlas: Psychiatry Knowledge Module (Phase 8)
 * Standard: AAS-2026-NEURO-V1
 *
 * Read-only query + guard layer over data/psychiatry/*.json. This module:
 * - returns supportable structure→system relationships, or explicit refusals
 *   (never synthesized answers);
 * - renders the educational-use guard on every Phase 8 surface;
 * - routes ALL clinical-intent queries (diagnosis, treatment, prescribing,
 *   DSM criteria, neuromodulation indications) to guard + refusal, so Phase 8
 *   content is REFUSED for clinical-intent queries at the lookup entry point (queryRelationship) and guarded on every render surface. No consumer path returns clinical guidance; future consumers MUST pass query text through so the entry-point refusal fires.
 *
 * This module does not import the engine, the anatomy records, or any
 * clinical/receptor/pharmacology content: it is separated from the Phase 6
 * anatomy layer by construction.
 */

import type {
  PsychRefusal,
  PsychRelationship,
  PsychSystem,
  RefusalTemplate,
  RelationshipsDoc,
  RefusalTemplatesDoc,
  RelationshipQueryResult,
  SystemsRegistryDoc,
} from './types';
import { EDUCATIONAL_USE_GUARD } from './types';
import relationshipsDocRaw from '../../data/psychiatry/relationships.json';
import registryDocRaw from '../../data/psychiatry/systems_registry.json';
import refusalsDocRaw from '../../data/psychiatry/refusal_templates.json';

export type {
  PsychRefusal,
  PsychRelationship,
  PsychSystem,
  RefusalStatus,
  RefusalTemplate,
  RelationshipQueryResult,
} from './types';
export { CAUSATION_DISCLAIMER, EDUCATIONAL_USE_GUARD } from './types';

const RELATIONSHIPS = (relationshipsDocRaw as RelationshipsDoc).relationships;
const SYSTEMS = (registryDocRaw as SystemsRegistryDoc).systems;
const TEMPLATES = (refusalsDocRaw as RefusalTemplatesDoc).templates;

/** All Phase 8 relationships (read-only view). */
export function getRelationships(): readonly PsychRelationship[] {
  return RELATIONSHIPS;
}

/** All Phase 8 named systems under study (read-only view). */
export function getSystems(): readonly PsychSystem[] {
  return SYSTEMS;
}

/** All refusal templates (read-only view). */
export function getRefusalTemplates(): readonly RefusalTemplate[] {
  return TEMPLATES;
}

/** The educational-use guard string rendered on every Phase 8 surface. */
export function educationalUseGuard(): string {
  return EDUCATIONAL_USE_GUARD;
}

/**
 * Structure→system lookup. Returns the recorded relationship when the pair
 * is supported by our own atlas records, otherwise an explicit refusal:
 * - unknown system id → NOT_REPRESENTED (no such system in this layer);
 * - known system, unrecorded pair → INSUFFICIENT_EVIDENCE (never guessed).
 *
 * Phase 8 repair (architecture review: guard was bypassable): when the caller's
 * original query text is provided and carries clinical intent (diagnosis, treatment,
 * drugs, dosage, prognosis, self-harm, ...), the lookup REFUSES even for recorded
 * pairs instead of returning a co-location that could be misread as clinical
 * guidance. The guard is now enforcing at the query entry point, not merely
 * available for consumers to route through. Callers without query text (e.g.
 * educational browsing) receive recorded LOW-certainty co-locations as before.
 */
export function queryRelationship(
  structureId: string,
  systemId: string,
  queryText?: string,
): RelationshipQueryResult {
  if (typeof queryText === 'string' && isClinicalIntent(queryText)) {
    const guarded = guardClinicalQuery(queryText);
    return {
      kind: 'refusal',
      refusal: {
        status: 'INSUFFICIENT_EVIDENCE',
        topic: 'clinical_intent',
        reason:
          `Clinical-intent query refused at the lookup entry point: ${guarded.guard} ` +
          `No anatomical co-location is returned for clinical questions.`,
        refusal_id: null,
      },
    };
  }
  const system = SYSTEMS.find((s) => s.system_id === systemId);
  if (system === undefined) {
    return {
      kind: 'refusal',
      refusal: {
        status: 'NOT_REPRESENTED',
        topic: 'unknown_system',
        reason:
          `No named system "${systemId}" is represented in the Phase 8 layer. ` +
          `Represented systems: ${SYSTEMS.map((s) => s.system_id).join(', ')}. ` +
          `No answer is synthesized for unrepresented systems.`,
        refusal_id: null,
      },
    };
  }
  const rel = RELATIONSHIPS.find(
    (r) => r.structure_id === structureId && r.system_id === systemId,
  );
  if (rel === undefined) {
    const gap = system.member_gaps.find((g) =>
      structureId.toLowerCase().includes(g.classical_member.toLowerCase().split(' ')[0]),
    );
    return {
      kind: 'refusal',
      refusal: {
        status: gap?.status ?? 'INSUFFICIENT_EVIDENCE',
        topic: 'unrecorded_pair',
        reason:
          `No supportable relationship is recorded between structure "${structureId}" ` +
          `and system "${systemId}". ` +
          (gap !== undefined ? `Recorded gap: ${gap.reason} ` : '') +
          `No answer is synthesized beyond the recorded layer.`,
        refusal_id: null,
      },
    };
  }
  return { kind: 'relationship', relationship: rel };
}

/** All relationships recorded for one named system. */
export function getRelationshipsForSystem(systemId: string): readonly PsychRelationship[] {
  return RELATIONSHIPS.filter((r) => r.system_id === systemId);
}

/** Refusal template by machine-stable topic id (null when no template). */
export function refusalForTopic(topic: string): RefusalTemplate | null {
  return TEMPLATES.find((t) => t.topic === topic) ?? null;
}

// clinical-vocab: intent-detection patterns below name refused clinical answer classes
// clinical-vocab (cont.): diagnosis/treatment/prescribing/DSM/neuromodulation/receptor/drug route to guard + refusal, never asserted answers.
const CLINICAL_INTENT_PATTERNS: readonly RegExp[] = [
  /\bdiagnos(is|ed|ing|tic|e)\b/i,
  /\btreat(ment|ments|s|ed|ing)?\b/i,
  /\btherap(y|eutic)\b/i,
  /\bprescri(be|ption|bing)\b/i,
  /\bdos(e|age|ing)\b/i,
  /\bdsm\b/i,
  /\bcriteri(a|on)\b/i,
  /\bdisorder\b/i,
  /\bschizophreni|depress(ed|ion)|bipolar|anxiet|ptsd|adhd|autis|ocd\b/i,
  /\bdrug\b/i,
  /\bssri\b/i,
  /\bsnri\b/i,
  /\bantidepressant\b/i,
  /\bantipsychotic\b/i,
  /\breceptor\b/i,
  /\bserotonin\b/i,
  /\bdopamine\b/i,
  /\bmechanism of action\b/i,
  /\bect\b/i,
  /\btms\b/i,
  /\bdbs\b/i,
  /\bstimulati(on|ng)\b/i,
  /\bprognos(is|tic)\b/i,
  /\bshould i\b/i,
  /\bwhat (drug|dose|medication|diagnosis)\b/i,
];

/** True when free text asks for clinical, pharmacological, receptor-level,
 * disorder-level, or neuromodulation content — all refused in Phase 8. */
export function isClinicalIntent(text: string): boolean {
  return CLINICAL_INTENT_PATTERNS.some((re) => re.test(text));
}

export interface ClinicalGuardResult {
  guard: string;
  /** Non-null refusal for clinical-intent queries; null otherwise. */
  refusal: PsychRefusal | null;
}

/**
 * Render guard: surfaces the educational-use-only notice on every Phase 8 render. Entry-point refusal (queryRelationship with query text) is what prevents
 * diagnostic or treatment output. For clinical-intent queries this function
 * ALWAYS returns the educational guard plus an explicit refusal — never a
 * relationship, never a synthesized answer.
 */
export function guardClinicalQuery(text: string): ClinicalGuardResult {
  if (!isClinicalIntent(text)) {
    return { guard: EDUCATIONAL_USE_GUARD, refusal: null };
  }
  // The refusal wording lives in the refusal templates (data/psychiatry/
  // refusal_templates.json), not inline here: this function only routes.
  const template = refusalForTopic('treatment_request') ?? refusalForTopic('diagnosis_request');
  return {
    guard: EDUCATIONAL_USE_GUARD,
    refusal: {
      status: template?.status ?? 'INSUFFICIENT_EVIDENCE',
      topic: 'clinical_intent',
      reason:
        (template?.template ?? 'Clinical questions cannot be answered from this teaching layer.') +
        ' No clinical answer is synthesized. Please consult qualified clinical supervision.',
      refusal_id: template?.refusal_id ?? null,
    },
  };
}

/** Minimal HTML escaping for overlay rendering. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Overlay renderer for a recorded relationship. ALWAYS prefixes the
 * educational-use guard and ALWAYS includes the causation disclaimer,
 * evidence level, certainty, and checkable source — the overlay-rendering
 * half of the allowed Phase 8 scope.
 */
export function renderPhase8OverlayHtml(relationship: PsychRelationship): string {
  const out: string[] = [];
  out.push('<section class="phase8-overlay" data-phase="8">');
  out.push(`<p class="phase8-guard">${escapeHtml(EDUCATIONAL_USE_GUARD)}</p>`);
  out.push(`<h3>${escapeHtml(relationship.function_or_network)}</h3>`);
  out.push(`<p class="phase8-claim">${escapeHtml(relationship.claim_text)}</p>`);
  out.push('<dl class="phase8-meta">');
  out.push(`<dt>Structure</dt><dd>${escapeHtml(relationship.structure_id)}</dd>`);
  out.push(`<dt>Evidence</dt><dd>${escapeHtml(relationship.evidence_level)}</dd>`);
  out.push(
    `<dt>Certainty</dt><dd>${escapeHtml(relationship.certainty)} — ${escapeHtml(relationship.certainty_reason)}</dd>`,
  );
  out.push(`<dt>Source</dt><dd>${escapeHtml(relationship.source)}</dd>`);
  out.push(`<dt>Citation</dt><dd>${escapeHtml(relationship.citation)}</dd>`);
  out.push('</dl>');
  out.push(`<p class="phase8-disclaimer">${escapeHtml(relationship.causation_disclaimer)}</p>`);
  out.push('</section>');
  return out.join('\n');
}

/**
 * Overlay renderer for a refusal. ALWAYS prefixes the educational-use guard
 * and states the refusal status + reason — refusals are visible surfaces too.
 */
export function renderRefusalHtml(refusal: PsychRefusal): string {
  return [
    '<section class="phase8-overlay phase8-refusal" data-phase="8">',
    `<p class="phase8-guard">${escapeHtml(EDUCATIONAL_USE_GUARD)}</p>`,
    `<p class="phase8-status">Status: ${escapeHtml(refusal.status)}</p>`,
    `<p class="phase8-reason">${escapeHtml(refusal.reason)}</p>`,
    '</section>',
  ].join('\n');
}
