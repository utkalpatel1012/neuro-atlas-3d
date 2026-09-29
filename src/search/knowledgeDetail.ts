/**
 * Phase 6 knowledge detail rendering: pure HTML builders (no DOM access).
 * Standard: AAS-2026-NEURO-V1
 *
 * `renderKnowledgeSectionHtml` extends the existing AnatomicalInfoPanel output
 * with the typed knowledge record (claim + source + evidence per line) plus
 * recorded gaps. `renderDocumentedDetailHtml` renders the full detail card for
 * DOCUMENTED (geometry-free) nodes: what is known vs what is not meshed.
 * Pure functions so they are headless-testable; the panel injects the strings.
 */

import { KnowledgeRecord } from './knowledgeIndex';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CLAIM_TYPE_LABEL: Record<string, string> = {
  DISTRIBUTION: 'DISTRIBUTION — name as listed in the BodyParts3D distribution',
  RECORD: 'RECORD — project structure record / catalog / QA measurement',
  ONTOLOGY: 'ONTOLOGY — verified identifier only; otherwise UNVERIFIED',
  LITERATURE: 'LITERATURE — real, checkable citation required',
};

function claimItem(claim: KnowledgeRecord['claims'][number]): string {
  const typeLabel = CLAIM_TYPE_LABEL[claim.claim_type] ?? claim.claim_type;
  return `
      <li class="knowledge-claim">
        <div class="knowledge-claim-type">${escapeHtml(claim.claim_type)} · ${escapeHtml(claim.evidence_level)}</div>
        <div class="knowledge-claim-text">${escapeHtml(claim.statement)}</div>
        <div class="knowledge-claim-source">Source: ${escapeHtml(claim.source)}</div>
        <div class="knowledge-claim-citation">Citation: ${escapeHtml(claim.citation)}</div>
        <div class="knowledge-claim-type-hint">${escapeHtml(typeLabel)}</div>
      </li>`;
}

function ontologyRow(label: string, entry: { value: string | null; verification: string; basis: string }): string {
  return `
      <div class="grid-label">${escapeHtml(label)}:</div>
      <div class="grid-value">${escapeHtml(entry.value ?? 'not recorded')} (${escapeHtml(entry.verification)}) — ${escapeHtml(entry.basis)}</div>`;
}

function gapsList(gaps: KnowledgeRecord['gaps']): string {
  return `
      <ul class="knowledge-gaps">
        ${gaps
          .map(
            (g) => `
        <li><strong>${escapeHtml(g.topic)}:</strong> ${escapeHtml(g.reason)}</li>`
          )
          .join('')}
      </ul>`;
}

/** Knowledge section appended to the existing structure detail card. */
export function renderKnowledgeSectionHtml(record: KnowledgeRecord): string {
  const aliases = record.clinical_aliases.length > 0 ? record.clinical_aliases.join('; ') : 'none recorded';
  const abbreviations = record.abbreviations.length > 0 ? record.abbreviations.join(', ') : 'none recorded';
  return `
    <div class="info-section knowledge-section">
      <h3 class="section-title">Anatomical Knowledge (Phase 6 — cited)</h3>
      <div class="info-grid">
        <div class="grid-label">Aliases:</div>
        <div class="grid-value">${escapeHtml(aliases)}</div>
        <div class="grid-label">Abbreviations:</div>
        <div class="grid-value">${escapeHtml(abbreviations)}</div>
        <div class="grid-label">Hierarchy:</div>
        <div class="grid-value">${escapeHtml(record.hierarchy_path.join(' › '))}</div>
        ${ontologyRow('FMA', record.ontology.fma_id)}
        ${ontologyRow('TA2', record.ontology.ta2_id)}
        ${ontologyRow('Uberon', record.ontology.uberon_id)}
      </div>
      <h4 class="knowledge-subtitle">Claims (type + source + evidence per line)</h4>
      <ul class="knowledge-claims">
        ${record.claims.map(claimItem).join('')}
      </ul>
      <h4 class="knowledge-subtitle">Recorded gaps (omitted, not silently absent)</h4>
      ${gapsList(record.gaps)}
    </div>`;
}

/** Full detail card for DOCUMENTED nodes: known vs not meshed. */
export function renderDocumentedDetailHtml(record: KnowledgeRecord): string {
  return `
    <div class="info-card">
      <div class="info-header">
        <div class="info-top-row">
          <span class="info-badge">DOCUMENTED — GEOMETRY-FREE</span>
          <span class="info-lat">${escapeHtml(record.laterality.toUpperCase())}</span>
        </div>
        <h2 class="info-title">${escapeHtml(record.display_name)}</h2>
        <div class="info-latin">No geometry in this atlas — catalog entry only. Nothing was synthesized.</div>
        <div class="info-path" style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">${escapeHtml(record.hierarchy_path.join(' › '))}</div>
      </div>
      <div class="info-section">
        <h3 class="section-title">What is known</h3>
        <ul class="knowledge-claims">
          ${record.claims.map(claimItem).join('')}
        </ul>
      </div>
      <div class="info-section">
        <h3 class="section-title">What is NOT meshed</h3>
        ${gapsList(record.gaps)}
      </div>
    </div>`;
}
