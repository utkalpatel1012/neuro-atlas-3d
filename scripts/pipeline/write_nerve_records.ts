/**
 * 3D Neuroanatomy Atlas: Phase 5.4 Cranial-Nerve Records
 * Standard: AAS-2026-NEURO-V1
 *
 * Lean anatomy-only structure JSONs for RUNTIME_READY Phase 5.4 assets.
 * Cranial-nerve segments are recorded as SOLID cord-like substrate
 * (subtype cranial_nerve — already a member of AnatomicalStructureSubtype,
 * preferred over any new union member), never as vessels, functional
 * networks, circuits, visual-pathway physiology, or tractography streamlines
 * (§5.4 scope: CRANIAL_NERVE ≠ VASCULATURE ≠ FUNCTIONAL_NETWORK ≠
 * PSYCHIATRIC_CIRCUIT; BodyParts3D is a segmentation atlas, not
 * tractography). Rejected assets get NO record.
 *
 * Thin wrapper over the shared record core (`batch_records.ts`): this file
 * owns the nerve field template only. Behaviour follows the tract wrapper
 * exactly.
 *
 * Usage: `npx tsx scripts/pipeline/write_nerve_records.ts` (repo-root CWD).
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { nerveBatchItems } from './prepare_nerve_batch';
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

export function writeNerveRecords(): string[] {
  return writeBatchRecords({
    projectRoot: PROJECT_ROOT,
    items: nerveBatchItems(),
    qaLedgerRelativePath: 'data/phase54_batch_qa.json',
    assetIdOf: (item) => item.assetId,
    missingEntryMessage: (assetId) => `Manifest entry missing for ${assetId}.`,
    successLog: (count) => `[STRUCTURES] Wrote ${count} nerve records → data/structures/`,
    buildRecord: (item, ctx) => {
      const entry = ctx.entry;
      const ingest = ctx.ingest;
      const base = item.assetId.replace(/^mesh\./, '').replace(/\.(left|right|bilateral|midline)\.v1$/, '');
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
      const record = {
        id: item.structureId,
        entity_type: 'anatomical_structure',
        subtype: 'cranial_nerve',
        canonical_name: laterality === 'midline' ? `${item.structureName} (midline)` : item.structureName,
        latin_name: item.latinName,
        clinical_aliases: [] as string[],
        abbreviations: [] as string[],
        laterality,
        representation_scope: laterality === 'left' || laterality === 'right' ? 'paired_separate' : 'single_midline_mesh',
        // Anatomy-only guard (Phase 5.4 hard stops: functional-conflation,
        // wrong-category-validation). This record describes substrate geometry
        // only: a solid cranial-nerve segment, not a vessel, not a visual or
        // conduction claim, not tractography.
        anatomy_only_scope: 'Anatomy only: cranial-nerve substrate (CRANIAL_NERVE). No vessel or Circle-of-Willis membership, no functional-network membership, no RDoC association, no circuit or pathway claim, no visual-function or conduction claim, no receptor or pharmacology mapping, no psychiatric claim is made or implied. BodyParts3D is a segmentation atlas, not tractography: no streamlines were generated.',
        expert_review_status: 'EXPERT_REVIEW_PENDING',
        name: nameBlock(item.latinName, item.structureName),
        ontology: ontologyBlock(
          item.fmaId,
          'BodyParts3D distribution parts_list_e.txt (authoritative for files; NOT a live-ontology lookup)'
        ),
        hierarchy: {
          anatomic_system: 'central_nervous_system',
          division: 'cranial_nerves',
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
          hexColor: '#E8D9A8'
        }),
        representations: [
          representationBlock({
            id: `rep.${base}.macroscopic_mesh`,
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
          legalReviewNotes: `BodyParts3D Release 3.0 component ${item.fmaId} via fresh mirror download (Phase 5.4). Same license chain as production assets. Retroactivity UNRESOLVED - LEGAL_REVIEW_REQUIRED before commercial redistribution.`
        }),
        topography: topographyBlock(
          item.structureId,
          item.parentId,
          `BodyParts3D distribution segment ${item.fmaId}; containment follows the distribution taxonomy. Cranial-nerve substrate only: paired segments plus chiasm, no whole-nerve subdivision fabricated, no functional-connectivity claim.`
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
  writeNerveRecords();
}
