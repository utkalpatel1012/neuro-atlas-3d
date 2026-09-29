/**
 * Phase 6 search → selection → detail wiring.
 * Standard: AAS-2026-NEURO-V1
 *
 * DOM-free helper implementing QUERY → STRUCTURE → SELECTION → DETAIL over a
 * minimal host interface. The browser SearchPanel implements the host with the
 * existing selection/focus pipeline (AnatomicalAssemblyManager.selectEntity +
 * AtlasApplication.focusEntity; DOCUMENTED nodes have no 3D entity so they
 * resolve to a geometry-free detail state with no camera move). Headless tests
 * drive the same helper with a fake host.
 */

import { KnowledgeSearchEntry, RankedSearchResult, rankSearch } from './knowledgeIndex';

export type SearchSelectOutcome =
  | { kind: 'selected-focused'; structureId: string; result: RankedSearchResult }
  | { kind: 'geometry-free'; structureId: string; result: RankedSearchResult }
  | { kind: 'no-match'; query: string };

export interface SearchSelectionHost {
  isLoaded(structureId: string): boolean;
  /** Load an AVAILABLE structure through the existing entity pipeline, then resolve true. Must throw when unloadable. */
  ensureLoaded(structureId: string): Promise<boolean>;
  selectLoaded(structureId: string): void;
  focusLoaded(structureId: string): void;
  showDocumented(structureId: string): void;
}

export function topResult(query: string, entries: KnowledgeSearchEntry[]): RankedSearchResult | null {
  const ranked = rankSearch(query, entries);
  return ranked.length > 0 ? ranked[0] : null;
}

/**
 * Resolve a query to the top-ranked index entry and route it:
 * AVAILABLE → ensure loaded, select + focus the 3D entity;
 * DOCUMENTED → geometry-free detail (no selection, no camera move).
 * Never resolves to a structure outside the index.
 */
export async function selectSearchResult(
  query: string,
  entries: KnowledgeSearchEntry[],
  host: SearchSelectionHost
): Promise<SearchSelectOutcome> {
  const result = topResult(query, entries);
  if (!result) return { kind: 'no-match', query };
  return routeEntry(result, host, query);
}

/** Route an already-ranked entry to selection/focus or geometry-free detail. */
export async function routeEntry(
  result: RankedSearchResult,
  host: SearchSelectionHost,
  queryForNoMatch = ''
): Promise<SearchSelectOutcome> {
  if (result.geometryFree) {
    host.showDocumented(result.entry.structure_id);
    return { kind: 'geometry-free', structureId: result.entry.structure_id, result };
  }
  const loaded = host.isLoaded(result.entry.structure_id) ? true : await host.ensureLoaded(result.entry.structure_id);
  if (!loaded) return { kind: 'no-match', query: queryForNoMatch };
  host.selectLoaded(result.entry.structure_id);
  host.focusLoaded(result.entry.structure_id);
  return { kind: 'selected-focused', structureId: result.entry.structure_id, result };
}
