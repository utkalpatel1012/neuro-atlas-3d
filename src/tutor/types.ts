/**
 * 3D Neuroanatomy Atlas: Grounded Tutor Types (Phase 11)
 * Standard: AAS-2026-NEURO-V1
 *
 * The tutor is LOCAL retrieval + fixed templates over the verified layers
 * (Phase 6 anatomy knowledge, Phase 8 relationships with evidence grades,
 * Phase 7 deferral states). No LLM backend exists or is added: this module
 * never generates prose, never paraphrases beyond filling template
 * placeholders with RECORDED values, and performs no network calls.
 */

import type {
  KnowledgeRecord,
  KnowledgeSearchEntry,
  RankedSearchResult,
} from '../search/knowledgeIndex';
import type {
  PsychRelationship,
  PsychRefusal,
  PsychSystem,
  RefusalTemplate,
} from '../psychiatry/types';

/** Fixed response statuses. ANSWER only when a recorded layer supports it. */
export type TutorStatus =
  | 'ANSWER'
  | 'UNKNOWN'
  | 'NOT_REPRESENTED'
  | 'INSUFFICIENT_EVIDENCE';

/** Structured parse of a free-text question. Intent detection reuses the
 *  EXISTING Phase 6 ranker and Phase 8 clinical-intent detector (imported,
 *  never reimplemented). */
export interface ParsedQuestion {
  raw: string;
  normalized: string;
  /** True when the Phase 8 clinical-intent detector fires. */
  clinical: boolean;
  /** Top Phase 6 ranker hits (may be empty). */
  hits: RankedSearchResult[];
  /** Recorded Phase 8 system ids mentioned (may be empty). */
  systems: string[];
  /** True when parcel/atlas phrasing is detected (Phase 7 deferral). */
  parcelMention: boolean;
  /** Recorded Phase 8 refusal topic from the tutor routing table (if any). */
  refusalTopic: string | null;
}

/** Synchronous or asynchronous knowledge-record reader. Tests inject an
 *  fs-backed reader; the browser panel injects a local-data reader. The
 *  tutor core itself performs no I/O. */
export type KnowledgeReader = (
  structureId: string,
) => KnowledgeRecord | null | Promise<KnowledgeRecord | null>;

/** Everything retrieve() may consult. All answer content comes from here. */
export interface TutorContext {
  entries: KnowledgeSearchEntry[];
  readKnowledge: KnowledgeReader;
  relationships: readonly PsychRelationship[];
  systems: readonly PsychSystem[];
  refusalForTopic: (topic: string) => RefusalTemplate | null;
  /** Number of indexed structures (for UNKNOWN/NOT_REPRESENTED citations). */
  entryCount: number;
}

/** Retrieval outcome: recorded evidence OR an explicit refusal state.
 *  Nothing is ever synthesized. */
export type RetrievedEvidence =
  | { kind: 'anatomy'; entry: KnowledgeSearchEntry; record: KnowledgeRecord }
  | { kind: 'system-members'; system: PsychSystem; members: PsychRelationship[] }
  | { kind: 'clinical-refusal'; guard: string; refusal: PsychRefusal }
  | { kind: 'topic-refusal'; template: RefusalTemplate }
  | { kind: 'parcel-deferral'; atlases: string[]; reasons: string[]; unblocks: string[] }
  | { kind: 'unknown'; reason: string; entryCount: number }
  | { kind: 'not-represented'; reason: string; entryCount: number };

/** One recorded evidence item (a Phase 6 claim or a Phase 8 relationship). */
export interface TutorEvidenceItem {
  statement: string;
  source: string;
  citation: string;
  evidence_level: string;
  record_id: string;
}

/** 3D action attached to a response. Camera-moving actions reference
 *  AVAILABLE-geometry entities ONLY. DOCUMENTED entries resolve to a
 *  geometry-free detail state; refusals/parcels/unknowns carry no action. */
export type TutorAction3D =
  | { kind: 'select-focus'; structureId: string }
  | { kind: 'show-documented'; structureId: string }
  | { kind: 'none'; structureId: null };

/** Fully rendered templated response. */
export interface TutorResponse {
  status: TutorStatus;
  /** Fixed-template text with placeholders filled from recorded values only. */
  text: string;
  /** Deduped checkable citation strings (recorded verbatim). */
  citations: string[];
  /** Recorded evidence items (empty for refusals). */
  evidence: TutorEvidenceItem[];
  /** AVAILABLE-or-DOCUMENTED structure ids referenced (all index-backed). */
  structureIds: string[];
  action: TutorAction3D;
  /** Educational-use guard, ALWAYS the verbatim Phase 8 string. */
  guard: string;
  /** Human-readable reason: answer basis or refusal rationale. */
  reason: string;
}
