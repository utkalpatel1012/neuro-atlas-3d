/**
 * 3D Neuroanatomy Atlas: Tutor Question Parsing (Phase 11)
 * Standard: AAS-2026-NEURO-V1
 *
 * Intent detection reuses EXISTING machinery (imported, never reimplemented):
 * - Phase 6 `rankSearch` over the generated search index (QUERY→STRUCTURE).
 * - Phase 8 `isClinicalIntent` for clinical routing (diagnosis/treatment/
 *   prescribing/DSM/neuromodulation/receptor/drug content).
 * Tutor-owned routing data (data/tutor/intent_routing.json) adds ONLY
 * matchers: refusal-topic backstops, recorded system-id aliases, parcel
 * phrasing, and anatomical vocabulary. No claims live here.
 */

import {
  normalizeText,
  rankSearch,
  type KnowledgeSearchEntry,
} from '../search/knowledgeIndex';
import { isClinicalIntent } from '../psychiatry/index';
import routingDoc from '../../data/tutor/intent_routing.json';
import type { ParsedQuestion } from './types';

interface RoutingDoc {
  refusal_routes: Array<{
    route_id: string;
    refusal_topic: string;
    match_substrings: string[];
  }>;
  system_aliases: Array<{ system_id: string; match_substrings: string[] }>;
  parcel_substrings: string[];
  parcel_regexes: string[];
  anatomical_vocab: string[];
}

const ROUTING = routingDoc as unknown as RoutingDoc;

/** Match helper: short tokens (<=4 chars) match on word boundaries so
 *  e.g. "ect" never fires inside unrelated words; longer phrases match
 *  as case-insensitive substrings (input is already normalized). */
function matcherHits(normalized: string, matcher: string): boolean {
  const m = matcher.toLowerCase();
  if (m.length <= 4) {
    const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(normalized);
  }
  return normalized.includes(m);
}

/**
 * Parse a question into structure hits, system mentions, parcel phrasing,
 * clinical intent, and a refusal-topic backstop. Pure function: entries and
 * the recorded system list are injected (tests read them from disk; the
 * panel loads them through the existing data paths).
 */
export function parseQuestion(
  question: string,
  entries: KnowledgeSearchEntry[],
  systemIds: string[],
): ParsedQuestion {
  const raw = question;
  const normalized = normalizeText(question);
  const clinical = isClinicalIntent(question);
  const hits = rankSearch(question, entries).slice(0, 5);

  const systems: string[] = [];
  for (const alias of ROUTING.system_aliases) {
    if (!systemIds.includes(alias.system_id)) continue;
    if (alias.match_substrings.some((s) => matcherHits(normalized, s))) {
      systems.push(alias.system_id);
    }
  }

  const parcelSubHit = ROUTING.parcel_substrings.some((s) =>
    matcherHits(normalized, s),
  );
  let parcelRegexHit = false;
  for (const pattern of ROUTING.parcel_regexes) {
    try {
      if (new RegExp(pattern, 'i').test(normalized)) {
        parcelRegexHit = true;
        break;
      }
    } catch {
      continue;
    }
  }

  let refusalTopic: string | null = null;
  for (const route of ROUTING.refusal_routes) {
    if (route.match_substrings.some((s) => matcherHits(normalized, s))) {
      refusalTopic = route.refusal_topic;
      break;
    }
  }

  return {
    raw,
    normalized,
    clinical,
    hits,
    systems,
    parcelMention: parcelSubHit || parcelRegexHit,
    refusalTopic,
  };
}

/** Anatomical-vocabulary probe: distinguishes NOT_REPRESENTED (plausible
 *  anatomy with no indexed match) from UNKNOWN (no atlas concept at all). */
export function hasAnatomicalVocab(normalized: string): boolean {
  return (ROUTING.anatomical_vocab as string[]).some((word) =>
    matcherHits(normalized, word),
  );
}

/** Parcel phrasing probe (exported for tests and the panel status line). */
export function mentionsParcel(normalized: string): boolean {
  if (ROUTING.parcel_substrings.some((s) => matcherHits(normalized, s))) {
    return true;
  }
  return ROUTING.parcel_regexes.some((pattern) => {
    try {
      return new RegExp(pattern, 'i').test(normalized);
    } catch {
      return false;
    }
  });
}
