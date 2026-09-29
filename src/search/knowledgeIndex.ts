/**
 * Phase 6 knowledge search index: types + precision-first ranker.
 * Standard: AAS-2026-NEURO-V1
 *
 * Pure module (no DOM, no engine imports) so the ranker is headless-testable.
 * Precision over recall: a query never resolves to a structure the evidence
 * does not support — results come ONLY from the generated index
 * (data/knowledge/search_index.json), ranked exact > alias > substring, and
 * nonsense queries resolve to nothing. DOCUMENTED (geometry-free) entries are
 * searchable and flagged via `geometryFree`.
 */

export type KnowledgeClaimType = 'DISTRIBUTION' | 'RECORD' | 'ONTOLOGY' | 'LITERATURE';

export interface KnowledgeClaim {
  claim_id: string;
  statement: string;
  claim_type: KnowledgeClaimType;
  source: string;
  citation: string;
  evidence_level: string;
}

export interface KnowledgeOntologyEntry {
  value: string | null;
  verification: 'VERIFIED' | 'UNVERIFIED';
  basis: string;
}

export interface KnowledgeGap {
  topic: string;
  reason: string;
}

export interface KnowledgeRecord {
  knowledge_id: string;
  structure_id: string;
  structure_record: string | null;
  geometry_state: 'AVAILABLE' | 'DOCUMENTED';
  asset_id: string | null;
  display_name: string;
  latin_name: string | null;
  clinical_aliases: string[];
  abbreviations: string[];
  laterality: string;
  representation_scope: string | null;
  hierarchy_path: string[];
  claims: KnowledgeClaim[];
  ontology: {
    fma_id: KnowledgeOntologyEntry;
    ta2_id: KnowledgeOntologyEntry;
    uberon_id: KnowledgeOntologyEntry;
  };
  gaps: KnowledgeGap[];
  generated_by: string;
  phase: string;
}

export interface KnowledgeSearchEntry {
  knowledge_id: string;
  structure_id: string;
  display_name: string;
  latin_name: string | null;
  clinical_aliases: string[];
  abbreviations: string[];
  hierarchy_path: string[];
  laterality: string;
  geometry_state: 'AVAILABLE' | 'DOCUMENTED';
  structure_record: string | null;
  asset_id: string | null;
}

export interface RankedSearchResult {
  entry: KnowledgeSearchEntry;
  score: number;
  tier: 'exact' | 'alias' | 'prefix' | 'token' | 'substring' | 'hierarchy';
  geometryFree: boolean;
}

export const MAX_SEARCH_RESULTS = 25;

const LATERALITY_TOKENS = ['left', 'right', 'bilateral', 'midline'] as const;

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[''ʼ`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Display name minus laterality parentheticals, e.g. "Hippocampus (Left)" -> "hippocampus". */
export function baseName(value: string): string {
  return normalizeText(value.replace(/\s*\((left|right|bilateral|midline)[^)]*\)/gi, ' '));
}

function tokenize(value: string): string[] {
  const n = normalizeText(value);
  return n === '' ? [] : n.split(' ');
}

function extractLaterality(tokens: string[]): string | null {
  for (const t of tokens) {
    if ((LATERALITY_TOKENS as readonly string[]).includes(t)) return t;
  }
  return null;
}

interface ScoredEntry {
  entry: KnowledgeSearchEntry;
  score: number;
  tier: RankedSearchResult['tier'];
}

function scoreEntry(core: string, coreTokens: string[], entry: KnowledgeSearchEntry): ScoredEntry | null {
  if (core === '') return null;
  const display = normalizeText(entry.display_name);
  const displayBase = baseName(entry.display_name);
  const latin = entry.latin_name ? normalizeText(entry.latin_name) : '';
  const aliases = entry.clinical_aliases.map(normalizeText).filter((a) => a !== '');
  const abbreviations = entry.abbreviations.map(normalizeText).filter((a) => a !== '');
  const hierarchyText = normalizeText(entry.hierarchy_path.join(' '));

  // Tier 1: exact official name (full or laterality-stripped base).
  if (core === display || core === displayBase) {
    return { entry, score: 100, tier: 'exact' };
  }
  // Tier 2: exact alias / abbreviation / Latin match.
  if (aliases.includes(core) || abbreviations.includes(core) || (latin !== '' && core === latin)) {
    return { entry, score: 80, tier: 'alias' };
  }
  // Tier 3: prefix match on official name, base name, alias, or Latin.
  const prefixTargets = [display, displayBase, latin, ...aliases, ...abbreviations].filter((t) => t !== '');
  if (prefixTargets.some((t) => t.startsWith(core))) {
    return { entry, score: 60, tier: 'prefix' };
  }
  // Tier 4: every query token present in the name/alias/Latin token set.
  const nameTokens = new Set(
    [display, displayBase, latin, ...aliases, ...abbreviations].flatMap((t) => (t === '' ? [] : t.split(' ')))
  );
  if (coreTokens.length > 0 && coreTokens.every((tok) => nameTokens.has(tok))) {
    return { entry, score: 40, tier: 'token' };
  }
  // Tier 5: substring match on name/alias/Latin text (short tokens excluded).
  const nameText = [display, displayBase, latin, ...aliases, ...abbreviations].filter((t) => t !== '').join(' | ');
  if (core.length >= 3 && nameText.includes(core)) {
    return { entry, score: 20, tier: 'substring' };
  }
  if (coreTokens.length > 0 && coreTokens.every((tok) => tok.length < 3 || nameText.includes(tok))) {
    const meaningful = coreTokens.filter((tok) => tok.length >= 3);
    if (meaningful.length > 0 && meaningful.every((tok) => nameText.includes(tok))) {
      return { entry, score: 20, tier: 'substring' };
    }
  }
  // Tier 6: hierarchy-path match only (e.g. "telencephalon", "ventricular").
  if (core.length >= 3 && hierarchyText.includes(core)) {
    return { entry, score: 10, tier: 'hierarchy' };
  }
  return null;
}

/**
 * Rank index entries against a query. Precision-first:
 * exact official name > exact alias/abbreviation/Latin > prefix >
 * all-token > substring > hierarchy-path-only. A laterality token in the
 * query ("left"/"right") excludes the opposite lateralized entries; queries
 * without one return both sides. Returns at most MAX_SEARCH_RESULTS.
 */
export function rankSearch(query: string, entries: KnowledgeSearchEntry[]): RankedSearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const laterality = extractLaterality(tokens);
  const coreTokens = tokens.filter((t) => t !== laterality);
  const core = coreTokens.join(' ');
  if (core === '') return [];

  const scored: ScoredEntry[] = [];
  for (const entry of entries) {
    // Laterality gate: a "left" query never resolves a right-lateralized
    // structure and vice versa. Bilateral/midline/unspecified pass through.
    if (laterality === 'left' && entry.laterality === 'right') continue;
    if (laterality === 'right' && entry.laterality === 'left') continue;
    const hit = scoreEntry(core, coreTokens, entry);
    if (!hit) continue;
    let bonus = 0;
    if (laterality && entry.laterality === laterality) bonus = 5;
    scored.push({ ...hit, score: hit.score + bonus });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.structure_id.localeCompare(b.entry.structure_id);
  });

  return scored.slice(0, MAX_SEARCH_RESULTS).map((s) => ({
    entry: s.entry,
    score: s.score,
    tier: s.tier,
    geometryFree: s.entry.geometry_state === 'DOCUMENTED',
  }));
}

/** Browser loader for the generated artifact (mirrors HierarchyPanel fetch style). */
export async function loadSearchIndex(url = 'data/knowledge/search_index.json'): Promise<KnowledgeSearchEntry[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`search index HTTP ${res.status}`);
  const data = await res.json();
  return (data.entries ?? []) as KnowledgeSearchEntry[];
}

/**
 * Knowledge-record artifact path for a structure id. Deterministic rule shared
 * with scripts/knowledge/build_knowledge.ts (fileStem): non-alphanumerics to
 * underscores, lowercased.
 */
export function knowledgeFileFor(structureId: string): string {
  const stem = structureId
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `data/knowledge/${stem}.json`;
}
