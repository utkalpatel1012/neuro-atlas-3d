/**
 * Phase 6 knowledge-record + search-index builder.
 * Standard: AAS-2026-NEURO-V1
 *
 * Builds data/knowledge/ from ONLY traceable sources:
 *   - data/structures/*.json (63 structure records: identity, provenance,
 *     measured spatial facts)
 *   - data/anatomical_hierarchy.json (catalog: hierarchy paths, DOCUMENTED nodes)
 *
 * Citation-honesty rules (the whole phase):
 *   - Every claim carries claim_type + source + citation + evidence_level.
 *   - DISTRIBUTION: BodyParts3D segment identity from asset_provenance only.
 *   - RECORD: our own structure record / hierarchy catalog / QA measurement only.
 *   - ONTOLOGY: FMA VERIFIED only when the record's FMA number equals the
 *     distribution upstream segment number; everything else UNVERIFIED.
 *   - LITERATURE: none — there is no literature corpus in this repo. Zero
 *     LITERATURE claims are emitted, ever.
 *   - Anything untraceable (boundaries, neighbors, vascular relations,
 *     physiology/behavior roles, clinical associations, imaging, TA2/Uberon
 *     lookups) is OMITTED and recorded as an explicit gap, never asserted.
 *   - No psychiatry / RDoC / receptor / pharmacology / neuromodulation content
 *     anywhere (unauthorized-psychiatry hard stop; Phase 8 scope).
 *
 * Usage: npm.cmd run knowledge:build   (tsx scripts/knowledge/build_knowledge.ts)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const STRUCTURES_DIR = path.join(PROJECT_ROOT, 'data/structures');
const HIERARCHY_PATH = path.join(PROJECT_ROOT, 'data/anatomical_hierarchy.json');
const KNOWLEDGE_DIR = path.join(PROJECT_ROOT, 'data/knowledge');

type ClaimType = 'DISTRIBUTION' | 'RECORD' | 'ONTOLOGY' | 'LITERATURE';

interface Claim {
  claim_id: string;
  statement: string;
  claim_type: ClaimType;
  source: string;
  citation: string;
  evidence_level: string;
}

interface OntologyEntry {
  value: string | null;
  verification: 'VERIFIED' | 'UNVERIFIED';
  basis: string;
}

interface Gap {
  topic: string;
  reason: string;
}

interface KnowledgeRecord {
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
  claims: Claim[];
  ontology: {
    fma_id: OntologyEntry;
    ta2_id: OntologyEntry;
    uberon_id: OntologyEntry;
  };
  gaps: Gap[];
  generated_by: string;
  phase: string;
}

interface HierarchyNode {
  id: string;
  level: number;
  name: string;
  geometry_state: string;
  children?: string[];
  asset_id?: string;
  structure_record?: string;
}

function slug(id: string): string {
  return id
    .replace(/^(brain\.|knowledge\.)/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function fileStem(id: string): string {
  return id.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

function aliasesOf(rec: any): string[] {
  if (Array.isArray(rec.clinical_aliases) && rec.clinical_aliases.length > 0) return rec.clinical_aliases;
  if (Array.isArray(rec.name?.clinical_aliases)) return rec.name.clinical_aliases;
  return [];
}

function abbreviationsOf(rec: any): string[] {
  if (Array.isArray(rec.abbreviations) && rec.abbreviations.length > 0) return rec.abbreviations;
  if (Array.isArray(rec.name?.standard_abbreviations)) return rec.name.standard_abbreviations;
  return [];
}

function lateralityOf(id: string, name: string): string {
  const hay = `${id} ${name}`.toLowerCase();
  if (/(^|[^a-z])bilateral([^a-z]|$)/.test(hay)) return 'bilateral';
  if (/(^|[^a-z])midline([^a-z]|$)/.test(hay)) return 'midline';
  const hasLeft = /(^|[^a-z])left([^a-z]|$)/.test(hay);
  const hasRight = /(^|[^a-z])right([^a-z]|$)/.test(hay);
  if (hasLeft && !hasRight) return 'left';
  if (hasRight && !hasLeft) return 'right';
  return 'unspecified';
}

const COMMON_GAPS: Gap[] = [
  {
    topic: 'boundaries',
    reason:
      'Delimiting boundaries beyond the distribution segment surface are not stated in the structure record or hierarchy catalog; omitted (no checkable source).',
  },
  {
    topic: 'neighbors',
    reason:
      'Adjacent-structure relationships beyond recorded part_of containment are not stated in the indexed sources; omitted (no checkable source).',
  },
  {
    topic: 'vascular-relations',
    reason:
      'Arterial supply and venous drainage are not stated in the structure record or hierarchy catalog; omitted (no checkable source).',
  },
  {
    topic: 'role-in-behavior-or-physiology',
    reason:
      'Role in behavior or physiology is not stated in the indexed sources and is out of scope for Phase 6; reserved for a later evidenced layer. No functional claim is made or implied.',
  },
  {
    topic: 'clinical-associations',
    reason:
      'Clinical, diagnostic, and disorder-related associations are out of scope for Phase 6 (unauthorized without a later evidenced layer) and are omitted. No clinical claim is made or implied.',
  },
  {
    topic: 'imaging-appearance',
    reason:
      'Modality-specific imaging appearance is not stated in the indexed sources; omitted (no checkable source).',
  },
  {
    topic: 'microstructure',
    reason:
      'Histology, lamination, and subfield microstructure are not resolved in the indexed macroscopic sources; omitted (no checkable source).',
  },
];

const DOCUMENTED_EXTRA_GAPS: Gap[] = [
  {
    topic: 'geometry',
    reason:
      'No mesh exists for this catalog entry (geometry_state DOCUMENTED: identity known, no geometry). Nothing was synthesized; see NOT CURRENTLY REPRESENTED handling in the viewer.',
  },
  {
    topic: 'latin-name',
    reason: 'No Latin name is recorded for this catalog entry in the indexed sources; omitted (no checkable source).',
  },
  {
    topic: 'aliases-abbreviations',
    reason:
      'No aliases or abbreviations are recorded for this catalog entry in the indexed sources; none are indexed for search (no checkable source).',
  },
  {
    topic: 'measurements',
    reason: 'No measured spatial facts (volume, centroid, bounding box) exist for this catalog entry; omitted (no geometry to measure).',
  },
];

function unverified(value: string | null, basis: string): OntologyEntry {
  return { value, verification: 'UNVERIFIED', basis };
}

function buildAvailable(rec: any, file: string, hierarchyPath: string[], nodeName: string | null): KnowledgeRecord {
  const recordRef = `data/structures/${file}`;
  const s = slug(rec.id);
  const fmaId: string = rec.ontology?.fma_id ?? '';
  const fmaNum = fmaId.replace(/^FMA:/, '');
  const upstream: string = rec.asset_provenance?.upstream_asset_id ?? '';
  const upstreamNum = upstream.replace(/^FMA/, '');
  const fmaVerified = /^FMA:\d+$/.test(fmaId) && upstreamNum !== '' && fmaNum === upstreamNum;

  const dataset: string = rec.asset_provenance?.dataset_name ?? 'BodyParts3D (Database Center for Life Sciences - DBCLS, Japan)';
  const datasetVersion: string = rec.asset_provenance?.dataset_version ?? 'Release 3.0 (2011/06/20)';
  const sourceUrl: string = rec.asset_provenance?.source_url ?? 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html';
  const upstreamLicense: string = rec.asset_provenance?.upstream_license ?? 'UNRECORDED';

  const claims: Claim[] = [
    {
      claim_id: `p6.${s}.distribution-source`,
      statement: `Source segment ${upstream} from ${dataset} ${datasetVersion} is the distribution source for this structure.`,
      claim_type: 'DISTRIBUTION',
      source: `${dataset} ${datasetVersion} (parts_list_e.txt authority, via structure record asset_provenance)`,
      citation: `${recordRef} (asset_provenance.upstream_asset_id, dataset_name, dataset_version); upstream listing: ${sourceUrl}`,
      evidence_level: 'DISTRIBUTION_LISTING',
    },
    {
      claim_id: `p6.${s}.identity`,
      statement: `Official English name "${rec.name?.official_english ?? rec.canonical_name}" with Latin name "${rec.name?.official_latin ?? rec.latin_name ?? 'not recorded'}", as recorded in the structure record.`,
      claim_type: 'RECORD',
      source: `Project structure record ${recordRef}`,
      citation: `${recordRef} (name.official_english, name.official_latin, canonical_name, latin_name)`,
      evidence_level: 'PROJECT_RECORD',
    },
    {
      claim_id: `p6.${s}.hierarchy`,
      statement: `Catalogued under hierarchy path "${hierarchyPath.join(' › ')}"${nodeName ? ` (catalog node "${nodeName}")` : ''}; containment follows the recorded part_of relationship.`,
      claim_type: 'RECORD',
      source: 'Project hierarchy catalog + structure record hierarchy block',
      citation: `data/anatomical_hierarchy.json (node "${rec.id}" or catalog path); ${recordRef} (hierarchy.parent_id, hierarchy.groups)`,
      evidence_level: 'PROJECT_RECORD',
    },
    {
      claim_id: `p6.${s}.laterality`,
      statement: `Laterality "${rec.laterality}" with representation scope "${rec.representation_scope ?? 'not recorded'}", as recorded in the structure record.`,
      claim_type: 'RECORD',
      source: `Project structure record ${recordRef}`,
      citation: `${recordRef} (laterality, representation_scope)`,
      evidence_level: 'PROJECT_RECORD',
    },
    {
      claim_id: `p6.${s}.measurements`,
      statement: `Measured spatial facts: estimated volume ${rec.spatial?.estimated_volume_cm3 ?? 'not recorded'} cm3; registered centroid [${(rec.spatial?.stereotaxic_registration?.registered_centroid ?? []).join(', ')}] mm in ${rec.spatial?.stereotaxic_registration?.registered_coordinate_frame ?? 'canonical_atlas_ras'} (bounding-box center, NOT vertex mean); registration_status ${rec.spatial?.stereotaxic_registration?.registration_status ?? 'REGISTRATION_PENDING'} (no template registration computed).`,
      claim_type: 'RECORD',
      source: `Project QA measurement recorded in ${recordRef}`,
      citation: `${recordRef} (spatial.estimated_volume_cm3, spatial.stereotaxic_registration, spatial.bounding_box, spatial.centroid_convention)`,
      evidence_level: 'PROJECT_MEASUREMENT',
    },
    {
      claim_id: `p6.${s}.asset`,
      statement: `Servable asset "${rec.asset_id}" (validation ${rec.asset_provenance?.validation_status ?? rec.validation_status ?? 'recorded in manifest'}); upstream license ${upstreamLicense}; commercial redistribution LEGAL_REVIEW_REQUIRED (portal-listing retroactivity unresolved).`,
      claim_type: 'RECORD',
      source: `Project asset provenance in ${recordRef} + assets manifest`,
      citation: `${recordRef} (asset_id, asset_provenance.validation_status, asset_provenance.upstream_license, asset_provenance.legal_review_notes); assets/manifests/assets.manifest.json`,
      evidence_level: 'PROJECT_RECORD',
    },
  ];

  const ta2Raw: string | undefined = rec.ontology?.ta2_id;
  const uberonRaw: string | undefined = rec.ontology?.uberon_id;
  const ta2Unverified = !ta2Raw || ta2Raw.startsWith('UNVERIFIED');
  const uberonUnverified = !uberonRaw || uberonRaw.startsWith('UNVERIFIED');

  return {
    knowledge_id: `knowledge.${rec.id}`,
    structure_id: rec.id,
    structure_record: recordRef,
    geometry_state: 'AVAILABLE',
    asset_id: rec.asset_id ?? null,
    display_name: rec.name?.official_english ?? rec.canonical_name,
    latin_name: rec.name?.official_latin ?? rec.latin_name ?? null,
    clinical_aliases: aliasesOf(rec),
    abbreviations: abbreviationsOf(rec),
    laterality: rec.laterality ?? 'unspecified',
    representation_scope: rec.representation_scope ?? null,
    hierarchy_path: hierarchyPath,
    claims,
    ontology: {
      fma_id: fmaVerified
        ? {
            value: fmaId,
            verification: 'VERIFIED',
            basis: `Record FMA number equals distribution upstream segment number (${upstream}); distribution-verified via ${recordRef}.`,
          }
        : unverified(
            /^FMA:\d+$/.test(fmaId) ? fmaId : null,
            `FMA number does not equal the distribution upstream segment identifier (${upstream}); no live-ontology lookup performed — UNVERIFIED, never asserted as verified. Source: ${recordRef}.`
          ),
      ta2_id: unverified(
        ta2Unverified ? null : ta2Raw ?? null,
        ta2Unverified
          ? `No TA2 lookup performed (record states UNVERIFIED / lookup pass required); omitted as unverified. Source: ${recordRef}.`
          : `TA2 identifier asserted in structure record without a distribution or lookup trail; UNVERIFIED, never asserted as verified. Source: ${recordRef}.`
      ),
      uberon_id: unverified(
        uberonUnverified ? null : uberonRaw ?? null,
        uberonUnverified
          ? `No Uberon lookup performed (record states UNVERIFIED / lookup pass required); omitted as unverified. Source: ${recordRef}.`
          : `Uberon identifier asserted in structure record without a distribution or lookup trail; UNVERIFIED, never asserted as verified. Source: ${recordRef}.`
      ),
    },
    gaps: [
      ...COMMON_GAPS,
      {
        topic: 'ontology-lookups',
        reason:
          'TA2/Uberon identifiers stay UNVERIFIED (no lookup pass performed); FMA is VERIFIED only where the record number equals the distribution upstream segment number. No ontology identifier is invented.',
      },
    ],
    generated_by: 'scripts/knowledge/build_knowledge.ts',
    phase: '6',
  };
}

function buildDocumented(
  node: HierarchyNode,
  hierarchyPath: string[],
  parentName: string | null
): KnowledgeRecord {
  const s = slug(node.id);
  const claims: Claim[] = [
    {
      claim_id: `p6.${s}.catalog-state`,
      statement: `Catalogued in the project hierarchy as DOCUMENTED (identity known, no geometry) under "${parentName ?? 'Brain catalog root'}". No mesh exists and none was synthesized.`,
      claim_type: 'RECORD',
      source: 'Project hierarchy catalog',
      citation: `data/anatomical_hierarchy.json (node "${node.id}", geometry_state DOCUMENTED)`,
      evidence_level: 'CATALOG_ENTRY',
    },
    {
      claim_id: `p6.${s}.catalog-identity`,
      statement: `Catalog identity is the hierarchy node name "${node.name}" at level ${node.level} with laterality "${lateralityOf(node.id, node.name)}" derived from the node identifier and name.`,
      claim_type: 'RECORD',
      source: 'Project hierarchy catalog',
      citation: `data/anatomical_hierarchy.json (node "${node.id}": name, level)`,
      evidence_level: 'CATALOG_ENTRY',
    },
  ];
  const fmaMatch = node.name.match(/FMA\d+/);
  if (fmaMatch) {
    claims.push({
      claim_id: `p6.${s}.distribution-note`,
      statement: `The catalog note references BodyParts3D listing ${fmaMatch[0]} without servable geometry; the catalog states no geometry was fabricated for it.`,
      claim_type: 'DISTRIBUTION',
      source: 'Project hierarchy catalog note (BodyParts3D distribution listing reference)',
      citation: `data/anatomical_hierarchy.json (node "${node.id}" name text)`,
      evidence_level: 'DISTRIBUTION_LISTING',
    });
  }
  if ((node.children ?? []).length > 0) {
    claims.push({
      claim_id: `p6.${s}.catalog-children`,
      statement: `The catalog lists ${(node.children ?? []).length} child entr${(node.children ?? []).length === 1 ? 'y' : 'ies'} under this node; child entries carry their own DOCUMENTED/AVAILABLE states.`,
      claim_type: 'RECORD',
      source: 'Project hierarchy catalog',
      citation: `data/anatomical_hierarchy.json (node "${node.id}" children)`,
      evidence_level: 'CATALOG_ENTRY',
    });
  }
  return {
    knowledge_id: `knowledge.${node.id}`,
    structure_id: node.id,
    structure_record: null,
    geometry_state: 'DOCUMENTED',
    asset_id: null,
    display_name: node.name,
    latin_name: null,
    clinical_aliases: [],
    abbreviations: [],
    laterality: lateralityOf(node.id, node.name),
    representation_scope: null,
    hierarchy_path: hierarchyPath,
    claims,
    ontology: {
      fma_id: unverified(
        fmaMatch ? fmaMatch[0].replace('FMA', 'FMA:') : null,
        fmaMatch
          ? `Distribution listing reference from the catalog note only; no live-ontology lookup performed — UNVERIFIED. Source: data/anatomical_hierarchy.json (node "${node.id}").`
          : `No ontology identifier recorded for this catalog entry; omitted as unverified. Source: data/anatomical_hierarchy.json (node "${node.id}").`
      ),
      ta2_id: unverified(null, `No TA2 identifier recorded for this catalog entry; omitted as unverified. Source: data/anatomical_hierarchy.json (node "${node.id}").`),
      uberon_id: unverified(null, `No Uberon identifier recorded for this catalog entry; omitted as unverified. Source: data/anatomical_hierarchy.json (node "${node.id}").`),
    },
    gaps: [...COMMON_GAPS, ...DOCUMENTED_EXTRA_GAPS],
    generated_by: 'scripts/knowledge/build_knowledge.ts',
    phase: '6',
  };
}

function main(): void {
  const hierarchy = JSON.parse(fs.readFileSync(HIERARCHY_PATH, 'utf8'));
  const nodes: HierarchyNode[] = hierarchy.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = new Map<string, string>();
  for (const n of nodes) {
    for (const c of n.children ?? []) {
      if (!parentOf.has(c)) parentOf.set(c, n.id);
    }
  }
  const pathNames = (id: string): string[] => {
    const chain: string[] = [];
    let cur: string | undefined = id;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const n = byId.get(cur);
      if (!n) break;
      chain.unshift(n.name);
      cur = parentOf.get(cur);
    }
    return chain;
  };

  const recordByFile = new Map<string, string>();
  for (const n of nodes) {
    if (n.structure_record) recordByFile.set(n.structure_record, n.id);
  }

  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  // Clear previously generated records (builder-owned directory).
  for (const f of fs.readdirSync(KNOWLEDGE_DIR)) {
    if (f.endsWith('.json')) fs.unlinkSync(path.join(KNOWLEDGE_DIR, f));
  }

  const files = fs.readdirSync(STRUCTURES_DIR).filter((f) => f.endsWith('.json')).sort();
  const written: string[] = [];
  let availableCount = 0;

  for (const file of files) {
    const rec = JSON.parse(fs.readFileSync(path.join(STRUCTURES_DIR, file), 'utf8'));
    const nodeId = recordByFile.get(`data/structures/${file}`);
    let hierarchyPath: string[];
    let nodeName: string | null = null;
    if (nodeId) {
      hierarchyPath = pathNames(nodeId);
      nodeName = byId.get(nodeId)?.name ?? null;
    } else {
      // Composite assembly not in the hierarchy catalog (e.g. cortex L/R):
      // path is built from the record's own division/hemisphere fields plus
      // the matching catalog level names — RECORD-cited, nothing invented.
      const hemi = rec.hierarchy?.hemisphere === 'left' ? 'brain.telencephalon.left' : 'brain.telencephalon.right';
      hierarchyPath = [...pathNames(hemi), rec.name?.official_english ?? rec.canonical_name];
    }
    const knowledge = buildAvailable(rec, file, hierarchyPath, nodeName);
    const outName = `${fileStem(knowledge.structure_id)}.json`;
    fs.writeFileSync(path.join(KNOWLEDGE_DIR, outName), `${JSON.stringify(knowledge, null, 2)}\n`);
    written.push(outName);
    availableCount++;
  }

  const documented = nodes.filter((n) => n.geometry_state === 'DOCUMENTED');
  for (const n of documented) {
    const parent = parentOf.get(n.id);
    const knowledge = buildDocumented(n, pathNames(n.id), parent ? byId.get(parent)?.name ?? parent : null);
    const outName = `${fileStem(knowledge.structure_id)}.json`;
    if (written.includes(outName)) throw new Error(`filename collision: ${outName}`);
    fs.writeFileSync(path.join(KNOWLEDGE_DIR, outName), `${JSON.stringify(knowledge, null, 2)}\n`);
    written.push(outName);
  }

  // Search index artifact: names, aliases, abbreviations, Latin, hierarchy
  // paths, laterality tokens. Precision-first ranking lives in
  // src/search/knowledgeIndex.ts; this artifact is the indexed data only.
  const indexEntries = written
    .filter((f) => f !== 'search_index.json' && f !== 'build_meta.json')
    .map((f) => {
      const k: KnowledgeRecord = JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, f), 'utf8'));
      return {
        knowledge_id: k.knowledge_id,
        structure_id: k.structure_id,
        display_name: k.display_name,
        latin_name: k.latin_name,
        clinical_aliases: k.clinical_aliases,
        abbreviations: k.abbreviations,
        hierarchy_path: k.hierarchy_path,
        laterality: k.laterality,
        geometry_state: k.geometry_state,
        structure_record: k.structure_record,
        asset_id: k.asset_id,
      };
    })
    .sort((a, b) => a.structure_id.localeCompare(b.structure_id));

  fs.writeFileSync(
    path.join(KNOWLEDGE_DIR, 'search_index.json'),
    `${JSON.stringify(
      {
        phase: '6',
        generated_by: 'scripts/knowledge/build_knowledge.ts',
        entry_count: indexEntries.length,
        entries: indexEntries,
      },
      null,
      2
    )}\n`
  );

  fs.writeFileSync(
    path.join(KNOWLEDGE_DIR, 'build_meta.json'),
    `${JSON.stringify(
      {
        phase: '6',
        generated_by: 'scripts/knowledge/build_knowledge.ts',
        structure_files_indexed: files.length,
        available_records: availableCount,
        documented_records: documented.length,
        total_records: written.length,
        claim_types_used: ['DISTRIBUTION', 'RECORD', 'ONTOLOGY'],
        literature_claims: 0,
        sources: ['data/structures/*.json', 'data/anatomical_hierarchy.json'],
      },
      null,
      2
    )}\n`
  );

  console.log(`[knowledge:build] structures indexed: ${files.length}`);
  console.log(`[knowledge:build] AVAILABLE records: ${availableCount}`);
  console.log(`[knowledge:build] DOCUMENTED records: ${documented.length}`);
  console.log(`[knowledge:build] total records: ${written.length}`);
  console.log(`[knowledge:build] LITERATURE claims emitted: 0 (no corpus in repo)`);
}

main();
