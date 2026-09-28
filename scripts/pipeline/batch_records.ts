/**
 * 3D Neuroanatomy Atlas: shared structure-record core (Phase 5.x consolidation)
 * Standard: AAS-2026-NEURO-V1
 *
 * ONE generic record loop shared by `write_structure_records.ts`,
 * `write_deep_records.ts` and `write_posterior_records.ts`. Each caller keeps
 * its own item table plus a spec (QA gating, laterality mapping, field
 * template) and delegates manifest/QA loading, the RUNTIME_READY gate, the
 * per-item entry/ingestion reads, and the file writes to `writeRecords(spec)`.
 * Pure refactor: anatomy-only records, no functional/psychiatric/imaging
 * content, ontology honesty (FMA distribution IDs; TA2/UBERON UNVERIFIED),
 * and the conservative licensing posture are all preserved exactly.
 *
 * Licensing posture note: commercial redistribution stays
 * LEGAL_REVIEW_REQUIRED everywhere (the upstream retroactivity question is
 * UNRESOLVED). Nothing here clears anything for unrestricted use.
 */

import * as fs from 'fs';
import * as path from 'path';

export const MANIFEST_RELATIVE_PATH = 'assets/manifests/assets.manifest.json';

/** Measured QA volume in cm³ (null when the QA report is absent). */
export function qaVolumeCm3(projectRoot: string, assetId: string): number | null {
  try {
    const qa = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'assets/validation', `${assetId}.geometry_qa.json`), 'utf8')
    );
    const mm3 = qa?.analysis?.estimatedVolumeMm3;
    return typeof mm3 === 'number' && Number.isFinite(mm3) ? Number((mm3 / 1000).toFixed(3)) : null;
  } catch {
    return null;
  }
}

/** Measured source-frame bbox center from raw STL vertices (mm, source units). */
export function sourceCentroidMm(stlPath: string): [number, number, number] {
  const buf = fs.readFileSync(stlPath);
  const tris = buf.readUInt32LE(80);
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50;
    for (let v = 0; v < 3; v++) {
      const x = buf.readFloatLE(base + 12 + v * 12);
      const y = buf.readFloatLE(base + 16 + v * 12);
      const z = buf.readFloatLE(base + 20 + v * 12);
      if (![x, y, z].every(Number.isFinite)) {
        throw new Error(`Non-finite vertex in ${stlPath} triangle ${t}.`);
      }
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  const r = (v: number): number => Number(v.toFixed(2));
  return [r((minX + maxX) / 2), r((minY + maxY) / 2), r((minZ + maxZ) / 2)];
}

/** `FMA72654` → `FMA:72654` (record ontology reference form). */
export function fmaRef(fmaId: string): string {
  return `FMA:${fmaId.replace(/^FMA/, '')}`;
}

export function nameBlock(latin: string, english: string): {
  official_latin: string;
  official_english: string;
  clinical_aliases: string[];
  standard_abbreviations: string[];
} {
  return {
    official_latin: latin,
    official_english: english,
    clinical_aliases: [],
    standard_abbreviations: []
  };
}

export function ontologyBlock(fmaId: string, fmaAuthority: string): {
  ta2_id: string;
  fma_id: string;
  uberon_id: string;
  fma_authority: string;
} {
  return {
    ta2_id: 'UNVERIFIED (lookup pass required; see L5)',
    fma_id: fmaRef(fmaId),
    uberon_id: 'UNVERIFIED (lookup pass required; see L5)',
    fma_authority: fmaAuthority
  };
}

export function registrationBlock(entry: any): {
  registered_centroid: number[];
  registered_coordinate_frame: string;
  registration_status: string;
  registration: { registration_method: string; registration_source: string };
} {
  return {
    registered_centroid: entry.centroid_mm,
    registered_coordinate_frame: 'canonical_atlas_ras',
    registration_status: 'REGISTRATION_PENDING',
    registration: {
      registration_method: 'not_registered',
      registration_source: 'scripts/pipeline/canonicalize_mesh.ts (rigid adapter only; coordinate conversion, NOT template registration)'
    }
  };
}

export function boundingBoxBlock(entry: any): {
  min: number[];
  max: number[];
  coordinate_frame: string;
  derivation: string;
} {
  return {
    min: [
      Number((entry.centroid_mm[0] - entry.dimensions_mm[0] / 2).toFixed(2)),
      Number((entry.centroid_mm[1] - entry.dimensions_mm[1] / 2).toFixed(2)),
      Number((entry.centroid_mm[2] - entry.dimensions_mm[2] / 2).toFixed(2))
    ],
    max: [
      Number((entry.centroid_mm[0] + entry.dimensions_mm[0] / 2).toFixed(2)),
      Number((entry.centroid_mm[1] + entry.dimensions_mm[1] / 2).toFixed(2)),
      Number((entry.centroid_mm[2] + entry.dimensions_mm[2] / 2).toFixed(2))
    ],
    coordinate_frame: 'canonical_atlas_ras',
    derivation: 'reconstructed from manifest centroid + dimensions (bbox-center convention)'
  };
}

export interface SpatialBlockArgs {
  meshNodeName: string;
  stlPath: string;
  sourceCoordinateSpace: string;
  entry: any;
  volumeCm3: number | null;
  hexColor: string;
}

export function spatialBlock(args: SpatialBlockArgs): {
  mesh_node_name: string;
  source_centroid: [number, number, number];
  source_coordinate_frame: string;
  stereotaxic_registration: ReturnType<typeof registrationBlock>;
  bounding_box: ReturnType<typeof boundingBoxBlock>;
  estimated_volume_cm3: number | null;
  default_hex_color: string;
  centroid_convention: string;
} {
  return {
    mesh_node_name: args.meshNodeName,
    source_centroid: sourceCentroidMm(args.stlPath),
    source_coordinate_frame: args.sourceCoordinateSpace,
    stereotaxic_registration: registrationBlock(args.entry),
    bounding_box: boundingBoxBlock(args.entry),
    estimated_volume_cm3: args.volumeCm3,
    default_hex_color: args.hexColor,
    centroid_convention: 'bounding-box center (NOT vertex mean).'
  };
}

export interface RepresentationBlockArgs {
  id: string;
  representationType: string;
  assetId: string;
  topology: string;
}

export function representationBlock(args: RepresentationBlockArgs): {
  id: string;
  representation_type: string;
  level_of_detail: string;
  asset_reference: string;
  coordinate_frame: string;
  is_canonical: boolean;
  metadata: { format: string; topology: string };
} {
  return {
    id: args.id,
    representation_type: args.representationType,
    level_of_detail: 'LOD0-LOD3',
    asset_reference: args.assetId,
    coordinate_frame: 'canonical_atlas_ras',
    is_canonical: true,
    metadata: { format: 'glb_meshopt', topology: args.topology }
  };
}

/** The three distribution covenants recorded on every structure record. */
export function standardCovenants(): string[] {
  return [
    'Must attribute BodyParts3D / DBCLS in application notices and UI',
    'Derived 3D meshes distributed under CC-BY-SA 4.0.',
    'Conservative licensing posture (Phase 3.1 section 19): historical files CC-BY-SA 2.1 JP; upstream portal lists CC BY (2025-02-27); derivatives distributed CC-BY-SA 4.0. Whether the portal listing retroactively extinguishes the 2.1-JP ShareAlike condition is UNRESOLVED - LEGAL_REVIEW_REQUIRED before commercial redistribution.'
  ];
}

export interface AssetProvenanceArgs {
  assetId: string;
  ingest: any;
  fmaId: string;
  /** Manifest pipeline output hash (NOT the ingestion record: ingest carries
   *  the source hash as `original_hash`; the resulting-asset hash is recorded
   *  by the pipeline in the manifest entry). */
  resultingSha256: string;
  /** Present only for in-repo derivations (gyral batch). */
  derivedComponent?: unknown;
  legalReviewNotes: string;
}

export function assetProvenanceBlock(args: AssetProvenanceArgs): Record<string, unknown> {
  return {
    asset_id: args.assetId,
    dataset_name: args.ingest.source_dataset,
    dataset_version: args.ingest.source_dataset_version,
    source_url: args.ingest.source_url,
    upstream_asset_id: args.fmaId,
    upstream_license: 'CC_BY_SA_2_1_JP',
    attribution_text_required: args.ingest.attribution,
    acquisition_date: args.ingest.acquisition_date,
    ...(args.derivedComponent !== undefined ? { derived_component: args.derivedComponent } : {}),
    resulting_sha256_hash: args.resultingSha256,
    resulting_license: 'CC-BY-SA 4.0',
    project_distribution_policy: 'CC-BY-SA-4.0',
    production_eligibility: 'PRODUCTION_ALLOWED',
    // Conservative posture: the record's own notes leave retroactivity
    // UNRESOLVED, so commercial redistribution stays gated for legal review.
    commercial_redistribution: 'LEGAL_REVIEW_REQUIRED',
    restrictions_and_covenants: standardCovenants(),
    validation_status: 'CLEARED',
    legal_review_notes: args.legalReviewNotes
  };
}

export function topographyBlock(sourceId: string, targetId: string, notes: string): {
  relationships: Array<{
    source_entity_id: string;
    target_entity_id: string;
    relationship_type: string;
    semantic_class: string;
    evidence_claim_ids: string[];
    notes: string;
  }>;
} {
  return {
    relationships: [
      {
        source_entity_id: sourceId,
        target_entity_id: targetId,
        relationship_type: 'part_of',
        semantic_class: 'STRUCTURAL_CONTAINMENT',
        evidence_claim_ids: [],
        notes
      }
    ]
  };
}

export interface ProvenanceBlockArgs {
  authority: string;
  dataset: string;
  version: string;
  fmaId: string;
}

export function provenanceBlock(args: ProvenanceBlockArgs): {
  source_authority: string;
  dataset_name: string;
  dataset_version: string;
  ontology_reference: string;
  last_reviewed: string;
} {
  return {
    source_authority: args.authority,
    dataset_name: args.dataset,
    dataset_version: args.version,
    ontology_reference: `${fmaRef(args.fmaId)} (distribution-verified)`,
    last_reviewed: new Date().toISOString().split('T')[0]
  };
}

/** Per-item inputs the shared loop hands to the spec's record template. */
export interface RecordBuildContext {
  projectRoot: string;
  entry: any;
  ingest: any;
}

export interface BatchRecordSpec<TItem> {
  projectRoot: string;
  items: readonly TItem[];
  /** Repo-relative QA ledger gating RUNTIME_READY, or null to write every item. */
  qaLedgerRelativePath: string | null;
  assetIdOf: (item: TItem) => string;
  /** Historical missing-manifest-entry error text of the owning wrapper. */
  missingEntryMessage: (assetId: string) => string;
  /** Historical summary log line of the owning wrapper. */
  successLog: (count: number) => string;
  /** The spec's record template: laterality mapping, subtype, division,
   *  representation fields and output path for one item. */
  buildRecord: (item: TItem, ctx: RecordBuildContext) => { outRelativePath: string; record: unknown };
}

/**
 * Shared record loop: manifest load, optional RUNTIME_READY gate, per-item
 * entry/ingestion reads, spec template, file writes, summary logging.
 * Rejected (non-ready) assets get no record.
 */
export function writeRecords<TItem>(spec: BatchRecordSpec<TItem>): string[] {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(spec.projectRoot, MANIFEST_RELATIVE_PATH), 'utf8')
  );
  let ready: Set<string> | null = null;
  if (spec.qaLedgerRelativePath !== null) {
    const qa = JSON.parse(fs.readFileSync(path.join(spec.projectRoot, spec.qaLedgerRelativePath), 'utf8'));
    ready = new Set(qa.verdicts.filter((v: any) => v.state === 'RUNTIME_READY').map((v: any) => v.assetId));
  }
  const written: string[] = [];
  for (const item of spec.items) {
    const assetId = spec.assetIdOf(item);
    if (ready !== null && !ready.has(assetId)) continue;
    const entry = manifest.assets?.[assetId];
    if (!entry) {
      throw new Error(spec.missingEntryMessage(assetId));
    }
    const ingest = JSON.parse(
      fs.readFileSync(path.join(spec.projectRoot, 'assets/raw', assetId, 'ingestion.json'), 'utf8')
    );
    const built = spec.buildRecord(item, { projectRoot: spec.projectRoot, entry, ingest });
    const outPath = path.join(spec.projectRoot, built.outRelativePath);
    fs.writeFileSync(outPath, JSON.stringify(built.record, null, 2), 'utf8');
    written.push(outPath);
  }
  console.log(spec.successLog(written.length));
  return written;
}
