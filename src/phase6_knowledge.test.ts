/**
 * 3D Neuroanatomy Atlas: Phase 6 Knowledge + Search Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Covers the Phase 6 info layer against REAL outputs: claim-typing
 * completeness (every claim has type/source/citation/evidence), no invented
 * citations (every repo-relative citation resolves to a file on disk; every
 * LITERATURE claim resolves to a named checkable source), anatomy-function
 * separation (no psychiatry vocabulary in any knowledge record's assertive
 * content; omissions recorded as explicit gaps), search precision (exact >
 * alias > substring; laterality-gated; nonsense resolves to nothing; never
 * resolves outside the index), selection→detail wiring (QUERY→STRUCTURE→
 * SELECTION→DETAIL through the existing assembly pipeline), DOCUMENTED-node
 * handling (searchable, geometry-free, known-vs-not-meshed detail).
 *
 * Hard stops enforced: uncited-claim, invented-citation,
 * anatomy-function-conflation, unauthorized-psychiatry.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AnatomicalAssemblyManager } from './engine/AnatomicalAssemblyManager';
import { AnatomicalEntityRecord } from './engine/types';
import {
  KnowledgeRecord,
  KnowledgeSearchEntry,
  knowledgeFileFor,
  rankSearch,
} from './search/knowledgeIndex';
import {
  renderDocumentedDetailHtml,
  renderKnowledgeSectionHtml,
} from './search/knowledgeDetail';
import {
  SearchSelectionHost,
  selectSearchResult,
} from './search/searchSelect';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

function readJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8'));
}

function readKnowledgeFile(structureId: string): KnowledgeRecord {
  const rel = knowledgeFileFor(structureId);
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8'));
}

/** Mirrors the renderer escaping in src/search/knowledgeDetail.ts. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Psychiatry / RDoC / receptor / pharmacology / neuromodulation vocabulary,
// plus function-conflation terms (memory/emotion/cognition/...) that would
// merge anatomical entities with functional roles. Scanned over ASSERTIVE
// content only (names, aliases, hierarchy paths, claim statements, ontology
// values): gaps[] by design NAME omitted topics with explicit denials, and
// are asserted separately to exist (TEST 4b) rather than scanned here.
const PSYCHIATRY_VOCAB = [
  'psychiatr', 'rdoc', '\\bdsm\\b', 'dsm-', 'disorder', 'depress', 'schizo',
  'psychos', 'psychot', '\\bbipolar\\b', 'anxiet', '\\bptsd\\b', '\\badhd\\b',
  'autism', 'anhedonia', '\\bmania\\b', '\\bmanic\\b', 'receptor',
  'pharmacolog', 'dopamine', 'serotonin', 'glutamat', '\\bgaba\\b',
  'neurotransmitter', '\\bdrug\\b', '\\bect\\b', '\\bdbs\\b', '\\btms\\b',
  'rtms', 'neuromodulat', 'antidepressant', 'antipsychotic', 'anxiolytic',
  'psychotherapy', '\\bmemory\\b', 'memories', 'emotion', '\\bfear\\b',
  'cogniti', '\\bmood\\b', 'hallucinat', 'delusion', '\\btrauma\\b',
  'dementia', '\\bstress\\b', 'epilep',
];
const PSYCHIATRY_RE = new RegExp(PSYCHIATRY_VOCAB.join('|'), 'i');

function assertiveText(k: KnowledgeRecord): string {
  return [
    k.display_name,
    k.latin_name ?? '',
    ...k.clinical_aliases,
    ...k.abbreviations,
    ...k.hierarchy_path,
    ...k.claims.map((c) => `${c.statement} ${c.source} ${c.citation}`),
    k.ontology.fma_id.value ?? '',
    k.ontology.ta2_id.value ?? '',
    k.ontology.uberon_id.value ?? '',
  ].join(' | ');}

/** Repo-relative citation targets must exist on disk (anti-invention check). */
function citedRepoPaths(citation: string): string[] {
  // External URLs (e.g. mirror raw URLs containing "/stl/FMA....stl") are
  // checkable remote sources, not repo paths — strip them first so only
  // genuinely repo-relative references are resolved against disk.
  const withoutUrls = citation.replace(/https?:\/\/\S+/g, ' ');
  const hits: string[] = [];
  const re = /((?:data|assets|scripts)\/[A-Za-z0-9_.\-/]+(?:\.json|\.ts|\.md|\.txt|\.html)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(withoutUrls)) !== null) hits.push(m[1]);
  return hits;
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 6 KNOWLEDGE + SEARCH TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  const meta = readJson('data/knowledge/build_meta.json');
  const indexDoc = readJson('data/knowledge/search_index.json');
  const entries: KnowledgeSearchEntry[] = indexDoc.entries;
  const hierarchy = readJson('data/anatomical_hierarchy.json');
  const nodes: any[] = hierarchy.nodes;
  const availableNodes = nodes.filter((n) => n.geometry_state === 'AVAILABLE');
  const documentedNodes = nodes.filter((n) => n.geometry_state === 'DOCUMENTED');
  const structureFiles: string[] = fs
    .readdirSync(path.join(PROJECT_ROOT, 'data/structures'))
    .filter((f) => f.endsWith('.json'))
    .sort();

  // ---------------------------------------------------------------- TEST 1
  console.log('--- TEST 1: Record coverage (63 structure records + DOCUMENTED nodes) ---');
  assert(structureFiles.length === 63, `63 structure files indexed, got ${structureFiles.length}`);
  passed++;
  assert(meta.structure_files_indexed === 63, 'build meta records 63 indexed structure files');
  passed++;
  assert(meta.available_records === 63, 'build meta records 63 AVAILABLE knowledge records');
  passed++;
  assert(meta.documented_records === documentedNodes.length, 'DOCUMENTED record count matches hierarchy catalog');
  passed++;
  assert(meta.literature_claims === 0, 'zero LITERATURE claims (no corpus in repo)');
  passed++;
  assert(indexDoc.entry_count === entries.length, 'index entry_count matches entries');
  passed++;
  assert(entries.length === 63 + documentedNodes.length, `index holds 63 + ${documentedNodes.length} entries`);
  passed++;

  const knowledgeIds = new Set<string>();
  const structureIds = new Set<string>();
  for (const e of entries) {
    assert(!knowledgeIds.has(e.knowledge_id), `knowledge_id unique: ${e.knowledge_id}`);
    knowledgeIds.add(e.knowledge_id);
    passed++;
    assert(!structureIds.has(e.structure_id), `structure_id unique: ${e.structure_id}`);
    structureIds.add(e.structure_id);
    passed++;
    assert(e.geometry_state === 'AVAILABLE' || e.geometry_state === 'DOCUMENTED', `${e.structure_id}: valid geometry_state`);
    passed++;
    // Every index entry resolves to an existing knowledge artifact (never unsupported).
    assert(fs.existsSync(path.join(PROJECT_ROOT, knowledgeFileFor(e.structure_id))), `${e.structure_id}: knowledge artifact exists`);
    passed++;
  }

  for (const n of availableNodes) {
    assert(structureIds.has(n.id), `AVAILABLE hierarchy node has a knowledge record: ${n.id}`);
    passed++;
  }
  for (const f of structureFiles) {
    const rec = readJson(`data/structures/${f}`);
    assert(structureIds.has(rec.id), `structure file has a knowledge record: ${f} (${rec.id})`);
    passed++;
  }

  // Manifest + structure bytes untouched by Phase 6 (no new structures).
  const manifest = readJson('assets/manifests/assets.manifest.json');
  assert(Object.keys(manifest.assets).length === 63, `manifest still holds 63 assets, got ${Object.keys(manifest.assets).length}`);
  passed++;
  console.log(`[PASS] Coverage: 63 AVAILABLE + ${documentedNodes.length} DOCUMENTED knowledge records; manifest untouched at 63.`);
  passed++;

  // ---------------------------------------------------------------- TEST 2
  console.log('\n--- TEST 2: Claim-typing completeness ---');
  const CLAIM_TYPES = ['DISTRIBUTION', 'RECORD', 'ONTOLOGY', 'LITERATURE'];
  const claimIds = new Set<string>();
  let literatureCount = 0;
  for (const e of entries) {
    const k = readKnowledgeFile(e.structure_id);
    assert(k.knowledge_id === e.structure_id.replace(/^/, 'knowledge.'), `${e.structure_id}: knowledge_id matches`);
    passed++;
    assert(k.claims.length > 0, `${e.structure_id}: at least one typed claim`);
    passed++;
    for (const c of k.claims) {
      assert(CLAIM_TYPES.includes(c.claim_type), `${c.claim_id}: known claim type`);
      passed++;
      assert(c.source.trim() !== '', `${c.claim_id}: non-empty source`);
      passed++;
      assert(c.citation.trim() !== '', `${c.claim_id}: non-empty citation`);
      passed++;
      assert(c.evidence_level.trim() !== '', `${c.claim_id}: non-empty evidence level`);
      passed++;
      assert(!claimIds.has(c.claim_id), `claim_id unique: ${c.claim_id}`);
      claimIds.add(c.claim_id);
      passed++;
      if (c.claim_type === 'LITERATURE') {
        literatureCount++;
        assert(/https?:\/\/|doi:|pmid:|isbn:|TA2:|FMA:|UBERON:/i.test(c.citation), `${c.claim_id}: LITERATURE claim resolves to a named checkable source`);
        passed++;
      }
    }
    for (const key of ['fma_id', 'ta2_id', 'uberon_id'] as const) {
      const o = k.ontology[key];
      assert(o.verification === 'VERIFIED' || o.verification === 'UNVERIFIED', `${e.structure_id}.${key}: verification state`);
      passed++;
      assert(o.basis.trim() !== '', `${e.structure_id}.${key}: verification basis recorded`);
      passed++;
    }
    assert(k.gaps.length > 0, `${e.structure_id}: omissions recorded as explicit gaps`);
    passed++;
  }
  assert(literatureCount === meta.literature_claims, 'LITERATURE count matches build meta (0: no corpus, nothing invented)');
  passed++;
  console.log(`[PASS] Claim typing complete over ${claimIds.size} claims; LITERATURE count ${literatureCount}.`);
  passed++;

  // ---------------------------------------------------------------- TEST 3
  console.log('\n--- TEST 3: No invented citations ---');
  let citationTargets = 0;
  for (const e of entries) {
    const k = readKnowledgeFile(e.structure_id);
    for (const c of k.claims) {
      for (const target of citedRepoPaths(c.citation)) {
        assert(fs.existsSync(path.join(PROJECT_ROOT, target)), `${c.claim_id}: cited repo path exists: ${target}`);
        passed++;
        citationTargets++;
      }
      for (const target of citedRepoPaths(c.source)) {
        assert(fs.existsSync(path.join(PROJECT_ROOT, target)), `${c.claim_id}: source repo path exists: ${target}`);
        passed++;
        citationTargets++;
      }
    }
  }
  assert(citationTargets > 0, 'citation-resolution check actually exercised repo paths');
  passed++;
  // Ontology honesty: FMA VERIFIED only where the record number equals the
  // distribution upstream segment number (59); mismatches stay UNVERIFIED (4).
  let fmaVerified = 0;
  let fmaUnverified = 0;
  for (const e of entries) {
    const k = readKnowledgeFile(e.structure_id);
    if (k.geometry_state !== 'AVAILABLE') continue;
    if (k.ontology.fma_id.verification === 'VERIFIED') {
      fmaVerified++;
      assert(/upstream segment/i.test(k.ontology.fma_id.basis), `${e.structure_id}: VERIFIED basis names the upstream segment`);
      passed++;
    } else {
      fmaUnverified++;
    }
  }
  assert(fmaVerified === 59, `59 distribution-verified FMA claims, got ${fmaVerified}`);
  passed++;
  assert(fmaUnverified === 4, `4 UNVERIFIED FMA claims (hippocampus L/R, cortex assemblies), got ${fmaUnverified}`);
  passed++;
  console.log(`[PASS] ${citationTargets} cited repo paths resolve; FMA ${fmaVerified} VERIFIED / ${fmaUnverified} UNVERIFIED.`);
  passed++;

  // ---------------------------------------------------------------- TEST 4
  console.log('\n--- TEST 4: Anatomy-function separation (no psychiatry vocabulary) ---');
  for (const e of entries) {
    const k = readKnowledgeFile(e.structure_id);
    const text = assertiveText(k);
    const hit = text.match(PSYCHIATRY_RE);
    assert(!hit, `${e.structure_id}: psychiatry vocabulary in assertive content: "${hit?.[0]}"`);
    passed++;
  }
  // Every record explicitly gaps the out-of-scope layers (omission recorded, never silent).
  const REQUIRED_GAP_TOPICS = [
    'boundaries',
    'neighbors',
    'vascular-relations',
    'role-in-behavior-or-physiology',
    'clinical-associations',
    'imaging-appearance',
    'microstructure',
  ];
  for (const e of entries) {
    const k = readKnowledgeFile(e.structure_id);
    const topics = k.gaps.map((g) => g.topic);
    for (const t of REQUIRED_GAP_TOPICS) {
      assert(topics.includes(t), `${e.structure_id}: gap recorded for omitted topic "${t}"`);
      passed++;
    }
    if (e.geometry_state === 'DOCUMENTED') {
      assert(topics.includes('geometry'), `${e.structure_id}: DOCUMENTED gap records missing geometry`);
      passed++;
    }
  }
  console.log('[PASS] No psychiatry vocabulary in assertive content; omissions recorded as gaps.');
  passed++;

  // ---------------------------------------------------------------- TEST 5
  console.log('\n--- TEST 5: Search precision ---');
  const top = (q: string) => rankSearch(q, entries)[0] ?? null;
  const all = (q: string) => rankSearch(q, entries);

  let r = top('hippocampus');
  assert(r !== null && r.tier === 'exact', '"hippocampus" resolves at exact tier');
  passed++;
  const hippo = all('hippocampus').filter((x) => x.entry.structure_id.includes('hippocampus') && x.entry.geometry_state === 'AVAILABLE');
  assert(hippo.length === 2, '"hippocampus" resolves to left + right hippocampus');
  passed++;

  r = top('left hippocampus');
  assert(r !== null && r.entry.laterality === 'left', '"left hippocampus" top result is left-lateralized');
  passed++;
  assert(all('left hippocampus').every((x) => x.entry.laterality !== 'right'), '"left hippocampus" never resolves a right structure');
  passed++;
  r = top('right thalamus');
  assert(r !== null && r.entry.structure_id === 'brain.diencephalon.right.thalamus', '"right thalamus" resolves exactly');
  passed++;

  r = top("Ammon's Horn");
  assert(r !== null && r.tier === 'alias' && r.entry.structure_id.includes('hippocampus'), 'alias "Ammon\'s Horn" resolves to hippocampus');
  passed++;
  r = top('Hpc');
  assert(r !== null && r.entry.structure_id.includes('hippocampus'), 'abbreviation "Hpc" resolves to hippocampus');
  passed++;
  r = top('CTX-L');
  assert(r !== null && r.entry.structure_id === 'brain.telencephalon.left.cortex', 'abbreviation "CTX-L" resolves to left cortex assembly');
  passed++;
  r = top('Chiasma opticum');
  assert(r !== null && r.entry.structure_id === 'brain.cranial_nerves.optic_chiasm', 'Latin "Chiasma opticum" resolves to optic chiasm');
  passed++;

  r = top('optic chiasm');
  assert(r !== null && r.entry.structure_id === 'brain.cranial_nerves.optic_chiasm' && !r.geometryFree, '"optic chiasm" resolves to the AVAILABLE chiasm');
  passed++;
  r = top('middle cerebral artery');
  assert(r !== null && r.geometryFree && r.entry.structure_id === 'brain.vasculature.middle_cerebral_artery', '"middle cerebral artery" resolves to the DOCUMENTED node, marked geometry-free');
  passed++;

  assert(all('xyzzyqr').length === 0, 'nonsense query resolves to nothing');
  passed++;
  assert(all('').length === 0 && all('   ').length === 0, 'empty query resolves to nothing');
  passed++;
  assert(all('depression').length === 0, '"depression" resolves to nothing (no psychiatry content indexed)');
  passed++;
  assert(all('serotonin').length === 0, '"serotonin" resolves to nothing (no receptor content indexed)');
  passed++;
  assert(all('MCA').length === 0, '"MCA" resolves to nothing (no invented abbreviation index for DOCUMENTED nodes)');
  passed++;
  assert(all('left').length === 0, 'bare laterality token resolves to nothing (laterality alone is not a structure)');
  passed++;

  // Every result is an indexed structure (never unsupported) with a valid state.
  for (const q of ['hippocampus', 'ventricle', 'gyrus', 'commissure', 'telencephalon', 'insula', 'cortex']) {
    const res = all(q);
    assert(res.length > 0 && res.length <= 25, `"${q}": bounded non-empty results`);
    passed++;
    for (const x of res) {
      assert(structureIds.has(x.entry.structure_id), `"${q}": result is an indexed structure`);
      passed++;
      assert(x.entry.geometry_state === 'AVAILABLE' || x.entry.geometry_state === 'DOCUMENTED', 'valid geometry state');
      passed++;
      assert(x.geometryFree === (x.entry.geometry_state === 'DOCUMENTED'), 'geometry-free flag matches state');
      passed++;
    }
    for (let i = 1; i < res.length; i++) {
      assert(res[i - 1].score >= res[i].score, `"${q}": ranked by descending score`);
      passed++;
    }
  }
  console.log('[PASS] Search precision: exact > alias > substring; laterality-gated; nonsense resolves to nothing.');
  passed++;

  // ---------------------------------------------------------------- TEST 6
  console.log('\n--- TEST 6: Selection-to-detail wiring (QUERY→STRUCTURE→SELECTION→DETAIL) ---');
  const assembly = new AnatomicalAssemblyManager();
  const hippocampusLeft: AnatomicalEntityRecord = {
    entityId: 'brain.telencephalon.left.limbic.hippocampus',
    assetId: 'mesh.hippocampus.left.v1',
    name: 'Hippocampus (Left)',
    officialLatin: 'Hippocampus',
    laterality: 'left',
    canonicalCentroidMm: [-25.07, -13.89, -20.7],
    dimensionsMm: [18.9, 20.78, 40.55],
    volumeCm3: 1.87,
    topologyClass: '2-manifold',
    validationStatus: 'APPROVED',
    upstreamDataset: 'BodyParts3D Release 3.0',
    upstreamLicense: 'CC_BY_SA_2_1_JP',
    sourceDefinition: 'FMA72714',
    groups: [],
  };
  assembly.registerEntity(hippocampusLeft);
  const calls: string[] = [];
  const host: SearchSelectionHost = {
    isLoaded: (id) => (assembly.getEntity(id) ?? null) !== null,
    ensureLoaded: async (id) => {
      calls.push(`ensure:${id}`);
      return (assembly.getEntity(id) ?? null) !== null;
    },
    selectLoaded: (id) => {
      calls.push(`select:${id}`);
      assembly.selectEntity(id);
    },
    focusLoaded: (id) => {
      calls.push(`focus:${id}`);
    },
    showDocumented: (id) => {
      calls.push(`documented:${id}`);
    },
  };

  const sel = await selectSearchResult('left hippocampus', entries, host);
  assert(sel.kind === 'selected-focused', 'AVAILABLE query selects + focuses');
  passed++;
  assert(sel.kind === 'selected-focused' && sel.structureId === 'brain.telencephalon.left.limbic.hippocampus', 'selected structure is left hippocampus');
  passed++;
  assert(assembly.getPrimarySelectedEntity()?.entityId === 'brain.telencephalon.left.limbic.hippocampus', 'assembly primary selection routed through the existing pipeline');
  passed++;
  assert(calls.includes('focus:brain.telencephalon.left.limbic.hippocampus'), 'focus invoked on the selected 3D entity');
  passed++;

  const doc = await selectSearchResult('middle cerebral artery', entries, host);
  assert(doc.kind === 'geometry-free', 'DOCUMENTED query resolves geometry-free');
  passed++;
  assert(calls.includes('documented:brain.vasculature.middle_cerebral_artery'), 'DOCUMENTED query shows knowledge detail');
  passed++;
  assert(!calls.some((c) => c.startsWith('select:brain.vasculature')), 'DOCUMENTED query selects no 3D entity');
  passed++;
  assert(assembly.getPrimarySelectedEntity()?.entityId === 'brain.telencephalon.left.limbic.hippocampus', 'DOCUMENTED query leaves prior 3D selection untouched');
  passed++;

  const none = await selectSearchResult('xyzzyqr', entries, host);
  assert(none.kind === 'no-match', 'nonsense query is a no-match with no side effects');
  passed++;
  console.log('[PASS] Wiring: AVAILABLE selects+focuses; DOCUMENTED shows detail without 3D selection; nonsense is inert.');
  passed++;

  // ---------------------------------------------------------------- TEST 7
  console.log('\n--- TEST 7: DOCUMENTED-node handling ---');
  const docEntry = entries.find((e) => e.structure_id === 'brain.vasculature.middle_cerebral_artery');
  assert(docEntry !== undefined && docEntry.geometry_state === 'DOCUMENTED', 'DOCUMENTED entry indexed');
  passed++;
  const docRecord = readKnowledgeFile('brain.vasculature.middle_cerebral_artery');
  assert(docRecord.structure_record === null && docRecord.asset_id === null, 'DOCUMENTED record carries no structure record or asset');
  passed++;
  assert(docRecord.latin_name === null, 'DOCUMENTED record asserts no Latin name');
  passed++;
  const docHtml = renderDocumentedDetailHtml(docRecord);
  assert(docHtml.includes('GEOMETRY-FREE'), 'DOCUMENTED detail marked geometry-free');
  passed++;
  assert(docHtml.includes('NOT meshed') || docHtml.includes('not meshed'), 'DOCUMENTED detail states what is not meshed');
  passed++;
  assert(docHtml.includes('What is known'), 'DOCUMENTED detail separates what is known');
  passed++;
  for (const c of docRecord.claims) {
    assert(docHtml.includes(escapeHtml(c.statement)) && docHtml.includes(escapeHtml(c.source)) && docHtml.includes(escapeHtml(c.evidence_level)), 'DOCUMENTED detail shows claim + source + evidence per line');
    passed++;
  }
  console.log('[PASS] DOCUMENTED nodes searchable, geometry-free, known-vs-not-meshed.');
  passed++;

  // ---------------------------------------------------------------- TEST 8
  console.log('\n--- TEST 8: Detail panel knowledge section ---');
  const availRecord = readKnowledgeFile('brain.telencephalon.left.limbic.hippocampus');
  const sectionHtml = renderKnowledgeSectionHtml(availRecord);
  for (const c of availRecord.claims) {
    assert(sectionHtml.includes(escapeHtml(c.statement)), 'knowledge section shows the claim');
    passed++;
    assert(sectionHtml.includes(escapeHtml(c.source)), 'knowledge section shows the source');
    passed++;
    assert(sectionHtml.includes(escapeHtml(c.evidence_level)), 'knowledge section shows the evidence level');
    passed++;
    assert(sectionHtml.includes(escapeHtml(c.claim_type)), 'knowledge section shows the claim type');
    passed++;
  }
  assert(sectionHtml.includes('UNVERIFIED') || sectionHtml.includes('VERIFIED'), 'knowledge section shows ontology verification states');
  passed++;
  assert(sectionHtml.includes('Recorded gaps'), 'knowledge section shows recorded gaps');
  passed++;
  console.log('[PASS] Knowledge section renders typed claims with source + evidence per line.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 6 KNOWLEDGE TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 6 knowledge test execution failed:\n', err);
  process.exit(1);
});
