/**
 * 3D Neuroanatomy Atlas: Phase 5.0 Batch-1 Structure Records
 * Standard: AAS-2026-NEURO-V1
 *
 * Generates lean anatomical structure JSONs (`data/structures/<base>_<lat>.json`)
 * for Batch-1 gyral assets from MEASURED pipeline outputs (manifest bounds,
 * QA volumes, raw-STL source centroids) + distribution-verified identity
 * (components record). Anatomy-only: NO functional/psychiatric/imaging
 * sections (§45–§47). Ontology: FMA distribution ID only; TA2/UBERON marked
 * UNVERIFIED (L5 — never asserted without a lookup pass).
 *
 * Thin wrapper over the shared record core (`batch_records.ts`): this file
 * owns the gyral field template only. Behaviour is unchanged.
 *
 * Usage: `npx tsx scripts/pipeline/write_structure_records.ts` (repo-root CWD).
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { batchItems } from './prepare_gyral_batch';
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

const LATIN: Record<string, string> = {
  superior_frontal_gyrus: 'Gyrus frontalis superior',
  middle_frontal_gyrus: 'Gyrus frontalis medius',
  precentral_gyrus: 'Gyrus precentralis',
  postcentral_gyrus: 'Gyrus postcentralis',
  supramarginal_gyrus: 'Gyrus supramarginalis',
  angular_gyrus: 'Gyrus angularis',
  middle_temporal_gyrus: 'Gyrus temporalis medius',
  cingulate_gyrus: 'Gyrus cinguli'
};

export function writeRecords(): string[] {
  return writeBatchRecords({
    projectRoot: PROJECT_ROOT,
    items: batchItems(),
    qaLedgerRelativePath: null,
    assetIdOf: (item) => item.assetId,
    missingEntryMessage: (assetId) => `Manifest entry missing for ${assetId}: run the batch pipeline first.`,
    successLog: (count) => `[STRUCTURES] Wrote ${count} records → data/structures/`,
    buildRecord: (item, ctx) => {
      const entry = ctx.entry;
      const ingest = ctx.ingest;
      const base = item.assetId.replace(/^mesh\./, '').replace(/\.(left|right)\.v1$/, '');
      // Parent is the lobe hierarchy node (e.g. brain.telencephalon.left.parietal_lobe).
      const parentId = `brain.telencephalon.${item.laterality}.${item.lobe}_lobe`;
      const shortName = item.structureName.replace(/ \((Left|Right)\)$/, '');
      const record = {
        id: item.structureId,
        entity_type: 'anatomical_structure',
        subtype: 'cortical_gyrus',
        canonical_name: item.structureName,
        latin_name: LATIN[base] || shortName,
        clinical_aliases: [] as string[],
        abbreviations: [] as string[],
        laterality: item.laterality,
        representation_scope: 'paired_separate',
        name: nameBlock(LATIN[base] || shortName, item.structureName),
        ontology: ontologyBlock(
          item.fmaId,
          'BodyParts3D distribution name list (authoritative for files; NOT a live-ontology lookup)'
        ),
        hierarchy: {
          anatomic_system: 'central_nervous_system_telencephalon',
          division: 'telencephalon',
          hemisphere: item.laterality,
          lobe: `${item.lobe}_lobe`,
          subsystem: item.lobe === 'limbic' ? 'limbic_system' : 'neocortex',
          parent_id: parentId,
          groups: ['division.cerebrum', `hemisphere.${item.laterality}`, `lobe.${item.lobe}`],
          children_ids: [] as string[]
        },
        spatial: spatialBlock({
          meshNodeName: `Mesh_${item.assetId.replace(/\./g, '_')}`,
          stlPath: path.join(ctx.projectRoot, 'assets/raw', item.assetId, `${item.fmaId}.stl`),
          sourceCoordinateSpace: ingest.source_coordinate_space,
          entry,
          volumeCm3: qaVolumeCm3(ctx.projectRoot, item.assetId),
          hexColor: '#C9BFA6'
        }),
        representations: [
          representationBlock({
            id: `rep.${base}.${item.laterality}.macroscopic_mesh`,
            representationType: 'macroscopic_mesh',
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
          derivedComponent: ingest.derived_component,
          legalReviewNotes: `BodyParts3D Release 3.0 component ${item.fmaId} via in-repo derivation from ${ingest.derived_component.parent_asset_id}. Same license chain as production cortex composites. Retroactivity UNRESOLVED - LEGAL_REVIEW_REQUIRED before commercial redistribution.`
        }),
        topography: topographyBlock(
          item.structureId,
          parentId,
          `BodyParts3D distribution segment ${item.fmaId} (${item.lobe} lobe); containment follows the distribution taxonomy. No functional-connectivity claim.`
        ),
        geometry_state: 'RUNTIME_READY',
        created_at: new Date().toISOString(),
        provenance: provenanceBlock({
          authority: 'BodyParts3D distribution name list + docs/PHASE_3_CORTEX_SOURCE_COMPONENTS.md (corrected 2026-09-27)',
          dataset: ingest.source_dataset,
          version: ingest.source_dataset_version,
          fmaId: item.fmaId
        })
      };
      return { outRelativePath: `data/structures/${base}_${item.laterality}.json`, record };
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeRecords();
}
