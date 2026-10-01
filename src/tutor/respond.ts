/**
 * 3D Neuroanatomy Atlas: Tutor Templated Responder (Phase 11)
 * Standard: AAS-2026-NEURO-V1
 *
 * Fixed templates ONLY (frames from data/tutor/response_templates.json).
 * Placeholders are filled exclusively with RECORDED values: claim/record
 * statements, sources, citations, evidence levels, relationship ids,
 * deferral reasons, refusal-template text. No prose is generated, no
 * paraphrase beyond the slots, no invented citations. Every response —
 * answer or refusal — carries the verbatim educational-use guard.
 * 3D actions reference AVAILABLE-geometry entities ONLY: DOCUMENTED
 * entries resolve to a geometry-free detail state, and refusals, parcel
 * questions, unknowns, and system lists carry no camera action.
 */

import { EDUCATIONAL_USE_GUARD } from '../psychiatry/types';
import { knowledgeFileFor } from '../search/knowledgeIndex';
import templatesDoc from '../../data/tutor/response_templates.json';
import type { RetrievedEvidence, TutorResponse } from './types';

interface TemplatesDoc {
  answer_anatomy: Record<string, string>;
  answer_system: Record<string, string>;
  refusal_clinical: Record<string, string>;
  refusal_topic: Record<string, string>;
  refusal_parcel: Record<string, string | string[]>;
  unknown: Record<string, string>;
  not_represented: Record<string, string>;
}

const T = templatesDoc as unknown as TemplatesDoc;

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : `{${key}}`,
  );
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter((v) => v !== ''))];
}

/** Render retrieved evidence into a fixed-template response. Pure. */
export function respond(evidence: RetrievedEvidence): TutorResponse {
  switch (evidence.kind) {
    case 'anatomy': {
      const { entry, record } = evidence;
      const available = entry.geometry_state === 'AVAILABLE';
      const lines: string[] = [];
      lines.push(T.answer_anatomy['header']);
      lines.push(
        fill(T.answer_anatomy['structure_line'], {
          display_name: record.display_name,
          structure_id: record.structure_id,
          geometry_note: available
            ? T.answer_anatomy['geometry_available']
            : T.answer_anatomy['geometry_documented'],
        }),
      );
      lines.push(
        fill(T.answer_anatomy['claims_intro'], {
          claim_count: String(record.claims.length),
        }),
      );
      for (const claim of record.claims) {
        lines.push(
          fill(T.answer_anatomy['claim_line'], {
            statement: claim.statement,
            evidence_level: claim.evidence_level,
            source: claim.source,
          }),
        );
      }
      lines.push(T.answer_anatomy['citations_intro']);
      const citations = dedupe([
        knowledgeFileFor(record.structure_id),
        ...record.claims.map((c) => c.citation),
      ]);
      for (const citation of citations) {
        lines.push(fill(T.answer_anatomy['citation_line'], { citation }));
      }
      if (record.gaps.length > 0) {
        lines.push(T.answer_anatomy['gaps_intro']);
        for (const gap of record.gaps) {
          lines.push(
            fill(T.answer_anatomy['gap_line'], {
              topic: gap.topic,
              reason: gap.reason,
            }),
          );
        }
      }
      lines.push(
        available
          ? fill(T.answer_anatomy['action_available'], {
              structure_id: record.structure_id,
            })
          : T.answer_anatomy['action_documented'],
      );
      return {
        status: 'ANSWER',
        text: lines.join('\n'),
        citations,
        evidence: record.claims.map((c) => ({
          statement: c.statement,
          source: c.source,
          citation: c.citation,
          evidence_level: c.evidence_level,
          record_id: c.claim_id,
        })),
        structureIds: [record.structure_id],
        action: available
          ? { kind: 'select-focus', structureId: record.structure_id }
          : { kind: 'show-documented', structureId: record.structure_id },
        guard: EDUCATIONAL_USE_GUARD,
        reason: `Answered from the recorded Phase 6 knowledge record for ${record.structure_id} (${record.claims.length} claims, all cited).`,
      };
    }

    case 'system-members': {
      const { system, members } = evidence;
      const lines: string[] = [];
      lines.push(T.answer_system['header']);
      lines.push(
        fill(T.answer_system['system_line'], {
          display_name: system.display_name,
          system_id: system.system_id,
          certainty: system.overall_certainty,
        }),
      );
      lines.push(
        fill(T.answer_system['members_intro'], {
          member_count: String(members.length),
        }),
      );
      for (const m of members) {
        lines.push(
          fill(T.answer_system['member_line'], {
            structure_id: m.structure_id,
            relationship_id: m.relationship_id,
            evidence_level: m.evidence_level,
            certainty: m.certainty,
          }),
        );
      }
      lines.push(T.answer_system['causation_pointer']);
      lines.push(T.answer_system['action_note']);
      return {
        status: 'ANSWER',
        text: lines.join('\n'),
        citations: dedupe(members.map((m) => m.citation)),
        evidence: members.map((m) => ({
          statement: m.claim_text,
          source: m.source,
          citation: m.citation,
          evidence_level: m.evidence_level,
          record_id: m.relationship_id,
        })),
        structureIds: dedupe(members.map((m) => m.structure_id)),
        action: { kind: 'none', structureId: null },
        guard: EDUCATIONAL_USE_GUARD,
        reason: `Answered by enumerating the ${members.length} recorded member relationships for system ${system.system_id} (evidence as recorded; correlation only).`,
      };
    }

    case 'clinical-refusal': {
      const { refusal } = evidence;
      const lines: string[] = [];
      lines.push(T.refusal_clinical['header']);
      lines.push(fill(T.refusal_clinical['reason_line'], { reason: refusal.reason }));
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        text: lines.join('\n'),
        citations:
          refusal.refusal_id !== null
            ? [
                fill(T.refusal_clinical['citation_line'], {
                  refusal_id: refusal.refusal_id,
                }),
              ]
            : [],
        evidence: [],
        structureIds: [],
        action: { kind: 'none', structureId: null },
        guard: evidence.guard,
        reason: refusal.reason,
      };
    }

    case 'topic-refusal': {
      const { template } = evidence;
      const lines: string[] = [];
      lines.push(T.refusal_topic['header']);
      lines.push(fill(T.refusal_topic['reason_line'], { reason: template.reason }));
      lines.push(
        fill(T.refusal_topic['template_line'], {
          refusal_id: template.refusal_id,
          template: template.template,
        }),
      );
      return {
        status: template.status,
        text: lines.join('\n'),
        citations: [
          fill(T.refusal_topic['citation_line'], {
            refusal_id: template.refusal_id,
          }),
        ],
        evidence: [],
        structureIds: [],
        action: { kind: 'none', structureId: null },
        guard: EDUCATIONAL_USE_GUARD,
        reason: template.reason,
      };
    }

    case 'parcel-deferral': {
      const lines: string[] = [];
      lines.push(String(T.refusal_parcel['header']));
      for (const atlasState of evidence.atlases) {
        lines.push(
          fill(String(T.refusal_parcel['atlas_line']), { atlas_state: atlasState }),
        );
      }
      for (const reason of evidence.reasons) {
        lines.push(
          fill(String(T.refusal_parcel['reason_line']), { reason }),
        );
      }
      lines.push(String(T.refusal_parcel['unblocks_intro']));
      for (const condition of evidence.unblocks) {
        lines.push(
          fill(String(T.refusal_parcel['unblock_line']), { condition }),
        );
      }
      for (const citation of T.refusal_parcel['citation_lines'] as string[]) {
        lines.push(citation);
      }
      lines.push(String(T.refusal_parcel['action_note']));
      return {
        status: 'NOT_REPRESENTED',
        text: lines.join('\n'),
        citations: [...(T.refusal_parcel['citation_lines'] as string[])],
        evidence: [],
        structureIds: [],
        action: { kind: 'none', structureId: null },
        guard: EDUCATIONAL_USE_GUARD,
        reason: `Parcel rendering is MAPPING_PENDING for every atlas (${evidence.atlases.join('; ')}). No parcel geometry exists in this atlas.`,
      };
    }

    case 'not-represented': {
      const lines: string[] = [];
      lines.push(T.not_represented['header']);
      lines.push(
        fill(T.not_represented['reason_line'], { reason: evidence.reason }),
      );
      return {
        status: 'NOT_REPRESENTED',
        text: lines.join('\n'),
        citations: [
          fill(T.not_represented['citation_line'], {
            entry_count: String(evidence.entryCount),
          }),
        ],
        evidence: [],
        structureIds: [],
        action: { kind: 'none', structureId: null },
        guard: EDUCATIONAL_USE_GUARD,
        reason: evidence.reason,
      };
    }

    case 'unknown':
    default: {
      const reason =
        evidence.kind === 'unknown'
          ? evidence.reason
          : 'Unsupported retrieval state. No answer is synthesized.';
      // Phase 11 review fix: the fallback hardcoded the knowledge-base size, which
      // would silently go stale. Derive it; fall back to an honest "unknown" count.
      const entryCount =
        evidence.kind === 'unknown' && typeof evidence.entryCount === 'number'
          ? String(evidence.entryCount)
          : 'unknown';
      const lines: string[] = [];
      lines.push(T.unknown['header']);
      lines.push(fill(T.unknown['reason_line'], { reason }));
      return {
        status: 'UNKNOWN',
        text: lines.join('\n'),
        citations: [fill(T.unknown['citation_line'], { entry_count: entryCount })],
        evidence: [],
        structureIds: [],
        action: { kind: 'none', structureId: null },
        guard: EDUCATIONAL_USE_GUARD,
        reason,
      };
    }
  }
}
