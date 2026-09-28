/**
 * 3D Neuroanatomy Atlas: Phase 5.2 Posterior Records
 * Standard: AAS-2026-NEURO-V1
 *
 * Lean anatomy-only structure JSONs for RUNTIME_READY Phase 5.2 assets.
 * Ventricular spaces are recorded as CAVITIES (subtype ventricular_space),
 * never neural tissue (§27). Rejected assets get NO record.
 *
 * Thin wrapper over the shared record core (`batch_records.ts`): this file
 * owns the posterior field template only. Behaviour is unchanged.
 *
 * Usage: `npx tsx scripts/pipeline/write_posterior_records.ts` (repo-root CWD).
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { posteriorBatchItems } from './prepare_posterior_batch';
import { lateralityFromAssetId } from './asset_id_laterality';
import {
  writeRecords as writeBatchRecords,
  qaVolumeCm3,
  nameBlock,
  ontologyBlock,
  spatialBlock,
  representationBlock,
  assetProvenanceBlock,
  topographyBlock,
  provenanceBlock
} from './batch_records';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export function writePosteriorRecords(): string[] {
  return writeBatchRecords({
    projectRoot: PROJECT_ROOT,
    items: posteriorBatchItems(),
    qaLedgerRelativePath: 'data/phase52_batch_qa.json',
    assetIdOf: (item) => item.assetId,
    missingEntryMessage: (assetId) => `Manifest entry missing for ${assetId}.`,
    successLog: (count) => `[STRUCTURES] Wrote ${count} posterior records → data/structures/`,
    buildRecord: (item, ctx) => {
      const entry = ctx.entry;
      const ingest = ctx.ingest;
      const base = item.assetId.replace(/^mesh\./, '').replace(/\.(bilateral|midline)\.v1$/, '');
      // Laterality single source of truth: fail loudly on null rather than
      // guessing a value that contradicts the asset id.
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
        name: nameBlock(item.latinName, item.structureName),
        ontology: ontologyBlock(
          item.fmaId,
          'BodyParts3D distribution parts_list_e.txt (authoritative for files; NOT a live-ontology lookup)'
        ),
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
        spatial: spatialBlock({
          meshNodeName: `Mesh_${item.assetId.replace(/\./g, '_')}`,
          stlPath: path.join(ctx.projectRoot, 'assets/raw', item.assetId, `${item.fmaId}.stl`),
          sourceCoordinateSpace: ingest.source_coordinate_space,
          entry,
          volumeCm3: qaVolumeCm3(ctx.projectRoot, item.assetId),
          hexColor: isCavity ? '#7FB3D5' : '#C9AFA6'
        }),
        representations: [
          representationBlock({
            id: `rep.${base}.macroscopic_mesh`,
            representationType: isCavity ? 'cavity_cast' : 'macroscopic_mesh',
            assetId: item.assetId,
            topology: entry.topology_class
          })
        ],
        asset_id: item.assetId,
        asset_provenance: assetProvenanceBlock({
          assetId: item.assetId,
          ingest,
          fmaId: item.fmaId,
          resultingSha256: entry.resulting_sha256_hash,
          legalReviewNotes: `BodyParts3D Release 3.0 component ${item.fmaId} via fresh mirror download (Phase 5.2). Same license chain as production assets. Retroactivity UNRESOLVED - LEGAL_REVIEW_REQUIRED before commercial redistribution.`
        }),
        topography: topographyBlock(
          item.structureId,
          item.parentId,
          `BodyParts3D distribution segment ${item.fmaId}; containment follows the distribution taxonomy. No functional-connectivity claim.${isCavity ? ' Cavity, not tissue.' : ''}`
        ),
        geometry_state: 'RUNTIME_READY',
        created_at: new Date().toISOString(),
        provenance: provenanceBlock({
          authority: 'BodyParts3D distribution parts_list_e.txt (authoritative for files)',
          dataset: ingest.source_dataset,
          version: ingest.source_dataset_version,
          fmaId: item.fmaId
        })
      };
      return { outRelativePath: `data/structures/${base}_${laterality}.json`, record };
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writePosteriorRecords();
}
