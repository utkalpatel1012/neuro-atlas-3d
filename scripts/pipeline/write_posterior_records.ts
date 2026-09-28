/**
 * 3D Neuroanatomy Atlas: Phase 5.2 Posterior Records
 * Standard: AAS-2026-NEURO-V1
 *
 * Lean anatomy-only structure JSONs for RUNTIME_READY Phase 5.2 assets.
 * Ventricular spaces are recorded as CAVITIES (subtype ventricular_space),
 * never neural tissue (§27). Rejected assets get NO record.
 *
 * Usage: `npx tsx scripts/pipeline/write_posterior_records.ts` (repo-root CWD).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { posteriorBatchItems } from './prepare_posterior_batch';
import { lateralityFromAssetId } from './asset_id_laterality';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

function qaVolumeCm3(assetId: string): number | null {
  try {
    const qa = JSON.parse(
      fs.readFileSync(path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.geometry_qa.json`), 'utf8')
    );
    const mm3 = qa?.analysis?.estimatedVolumeMm3;
    return typeof mm3 === 'number' && Number.isFinite(mm3) ? Number((mm3 / 1000).toFixed(3)) : null;
  } catch {
    return null;
  }
}

function sourceCentroidMm(stlPath: string): [number, number, number] {
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
      if (![x, y, z].every(Number.isFinite)) throw new Error(`Non-finite vertex in ${stlPath}.`);
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

export function writePosteriorRecords(): string[] {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'assets/manifests/assets.manifest.json'), 'utf8')
  );
  const qa = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'data/phase52_batch_qa.json'), 'utf8'));
  const ready = new Set(qa.verdicts.filter((v: any) => v.state === 'RUNTIME_READY').map((v: any) => v.assetId));
  const written: string[] = [];
  for (const item of posteriorBatchItems()) {
    if (!ready.has(item.assetId)) continue; // REJECTED assets get no record.
    const entry = manifest.assets?.[item.assetId];
    if (!entry) throw new Error(`Manifest entry missing for ${item.assetId}.`);
    const ingest = JSON.parse(
      fs.readFileSync(path.join(PROJECT_ROOT, 'assets/raw', item.assetId, 'ingestion.json'), 'utf8')
    );
    const base = item.assetId.replace(/^mesh\./, '').replace(/\.(bilateral|midline)\.v1$/, '');
    // Phase 5.2 architecture M3: this was a two-way guess on the id string that would
    // silently label any future `.left.`/`.right.` item `midline`, contradicting the
    // project's own laterality single source of truth. That module exists precisely to
    // stop this class of divergent derivation, so use it and fail loudly on null.
    const derivedLaterality = lateralityFromAssetId(item.assetId);
    if (derivedLaterality === null) {
      throw new Error(
        `Unrecognised laterality in asset id "${item.assetId}". Refusing to guess. ` +
        `Expected mesh.<base>.<bilateral|left|right|midline>.v1.`
      );
    }
    const laterality = derivedLaterality;
    const isCavity = item.category === 'VENTRICULAR_SPACE';
    const record = {
      id: item.structureId,
      entity_type: 'anatomical_structure',
      subtype: isCavity ? 'ventricular_space' : item.category === 'CEREBELLUM' ? 'cerebellar_structure' : 'brainstem_structure',
      canonical_name: item.structureName + (laterality === 'bilateral' ? ' (bilateral)' : ' (midline)'),
      latin_name: item.latinName,
      clinical_aliases: [] as string[],
      abbreviations: [] as string[],
      laterality,
      representation_scope: laterality === 'bilateral' ? 'paired_combined' : 'single_midline_mesh',
      cavity_note: isCavity ? 'Cerebrospinal-fluid space, NOT neural tissue. Rendered and described as a cavity.' : undefined,
      name: {
        official_latin: item.latinName,
        official_english: item.structureName,
        clinical_aliases: [] as string[],
        standard_abbreviations: [] as string[]
      },
      ontology: {
        ta2_id: 'UNVERIFIED (lookup pass required; see L5)',
        fma_id: `FMA:${item.fmaId.replace(/^FMA/, '')}`,
        uberon_id: 'UNVERIFIED (lookup pass required; see L5)',
        fma_authority: 'BodyParts3D distribution parts_list_e.txt (authoritative for files; NOT a live-ontology lookup)'
      },
      hierarchy: {
        anatomic_system: 'central_nervous_system',
        division: item.subsystem === 'brainstem' ? 'brainstem' : item.subsystem === 'cerebellum' ? 'cerebellum' : 'ventricular_system',
        hemisphere: laterality,
        lobe: null,
        subsystem: item.subsystem,
        parent_id: item.parentId,
        groups: item.groups,
        children_ids: [] as string[]
      },
      spatial: {
        mesh_node_name: `Mesh_${item.assetId.replace(/\./g, '_')}`,
        source_centroid: sourceCentroidMm(
          path.join(PROJECT_ROOT, 'assets/raw', item.assetId, `${item.fmaId}.stl`)
        ),
        source_coordinate_frame: ingest.source_coordinate_space,
        stereotaxic_registration: {
          registered_centroid: entry.centroid_mm,
          registered_coordinate_frame: 'canonical_atlas_ras',
          registration_status: 'REGISTRATION_PENDING',
          registration: {
            registration_method: 'not_registered',
            registration_source: 'scripts/pipeline/canonicalize_mesh.ts (rigid adapter only; coordinate conversion, NOT template registration)'
          }
        },
        bounding_box: {
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
        },
        estimated_volume_cm3: qaVolumeCm3(item.assetId),
        default_hex_color: isCavity ? '#7FB3D5' : '#C9AFA6',
        centroid_convention: 'bounding-box center (NOT vertex mean).'
      },
      representations: [
        {
          id: `rep.${base}.macroscopic_mesh`,
          representation_type: isCavity ? 'cavity_cast' : 'macroscopic_mesh',
          level_of_detail: 'LOD0-LOD3',
          asset_reference: item.assetId,
          coordinate_frame: 'canonical_atlas_ras',
          is_canonical: true,
          metadata: { format: 'glb_meshopt', topology: entry.topology_class }
        }
      ],
      asset_id: item.assetId,
      asset_provenance: {
        asset_id: item.assetId,
        dataset_name: ingest.source_dataset,
        dataset_version: ingest.source_dataset_version,
        source_url: ingest.source_url,
        upstream_asset_id: item.fmaId,
        upstream_license: 'CC_BY_SA_2_1_JP',
        attribution_text_required: ingest.attribution,
        acquisition_date: ingest.acquisition_date,
        resulting_sha256_hash: entry.resulting_sha256_hash,
        resulting_license: 'CC-BY-SA 4.0',
        project_distribution_policy: 'CC-BY-SA-4.0',
        production_eligibility: 'PRODUCTION_ALLOWED',
        // Phase 5.2: was 'PERMITTED', contradicting this record's own LEGAL_REVIEW_REQUIRED
  // note. The conservative posture is the honest one; AGENTS.md forbids labelling
  // anything CLEARED while it remains LEGAL_REVIEW_REQUIRED.
  commercial_redistribution: 'LEGAL_REVIEW_REQUIRED',
        restrictions_and_covenants: [
          'Must attribute BodyParts3D / DBCLS in application notices and UI',
          'Derived 3D meshes distributed under CC-BY-SA 4.0.',
          'Conservative licensing posture (Phase 3.1 section 19): historical files CC-BY-SA 2.1 JP; upstream portal lists CC BY (2025-02-27); derivatives distributed CC-BY-SA 4.0. Whether the portal listing retroactively extinguishes the 2.1-JP ShareAlike condition is UNRESOLVED - LEGAL_REVIEW_REQUIRED before commercial redistribution.'
        ],
        validation_status: 'CLEARED',
        legal_review_notes: `BodyParts3D Release 3.0 component ${item.fmaId} via fresh mirror download (Phase 5.2). Same license chain as production assets. Retroactivity UNRESOLVED - LEGAL_REVIEW_REQUIRED before commercial redistribution.`
      },
      topography: {
        relationships: [
          {
            source_entity_id: item.structureId,
            target_entity_id: item.parentId,
            relationship_type: 'part_of',
            semantic_class: 'STRUCTURAL_CONTAINMENT',
            evidence_claim_ids: [] as string[],
            notes: `BodyParts3D distribution segment ${item.fmaId}; containment follows the distribution taxonomy. No functional-connectivity claim.${isCavity ? ' Cavity, not tissue.' : ''}`
          }
        ]
      },
      geometry_state: 'RUNTIME_READY',
      created_at: new Date().toISOString(),
      provenance: {
        source_authority: 'BodyParts3D distribution parts_list_e.txt (authoritative for files)',
        dataset_name: ingest.source_dataset,
        dataset_version: ingest.source_dataset_version,
        ontology_reference: `FMA:${item.fmaId.replace(/^FMA/, '')} (distribution-verified)`,
        last_reviewed: new Date().toISOString().split('T')[0]
      }
    };
    const outPath = path.join(PROJECT_ROOT, 'data/structures', `${base}_${laterality}.json`);
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2), 'utf8');
    written.push(outPath);
  }
  console.log(`[STRUCTURES] Wrote ${written.length} posterior records → data/structures/`);
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writePosteriorRecords();
}
