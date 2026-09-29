/**
 * 3D Neuroanatomy Atlas: Phase 5.5 Cortical-Completion Records
 * Standard: AAS-2026-NEURO-V1
 *
 * Lean anatomy-only structure JSONs for RUNTIME_READY Phase 5.5 assets.
 * Gyral segments are recorded as cortical_gyrus; the insula and the occipital
 * lobe as cortical_structure — both subtypes already members of
 * AnatomicalStructureSubtype, preferred over any new union member (no union
 * change). Rejected assets get NO record.
 *
 * Continuity honesty (registry hard stop: false-continuity-claim): every
 * record's guard states these are DISCONNECTED distribution segments that
 * form no continuous pial surface — gaps are not bridged, seams not smoothed,
 * joining not implied. Surface-vs-parcel distinction (registry hard stop:
 * parcel-conflation): records describe surface-derived segments only; no
 * atlas parcel was mapped onto these meshes and none is claimed. The denial
 * sentences live in the guard fields (`anatomy_only_scope`, topography
 * notes) exactly as prior phases isolate denials from the scannable record.
 *
 * Thin wrapper over the shared record core (`batch_records.ts`): this file
 * owns the cortical-5.5 field template only. Behaviour follows the
 * gyral/tract/nerve wrappers exactly.
 *
 * Usage: `npx tsx scripts/pipeline/write_cortical55_records.ts` (repo-root CWD).
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { cortical55BatchItems } from './prepare_cortical55_batch';
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

export function writeCortical55Records(): string[] {
  return writeBatchRecords({
    projectRoot: PROJECT_ROOT,
    items: cortical55BatchItems(),
    qaLedgerRelativePath: 'data/phase55_batch_qa.json',
    assetIdOf: (item) => item.assetId,
    missingEntryMessage: (assetId) => `Manifest entry missing for ${assetId}.`,
    successLog: (count) => `[STRUCTURES] Wrote ${count} cortical-5.5 records → data/structures/`,
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
      // No union change: gyri reuse cortical_gyrus; insula and occipital lobe
      // reuse cortical_structure (both already in AnatomicalStructureSubtype).
      const subtype = item.lobe === 'insular' || item.lobe === 'occipital' ? 'cortical_structure' : 'cortical_gyrus';
      const record = {
        id: item.structureId,
        entity_type: 'anatomical_structure',
        subtype,
        canonical_name: item.structureName,
        latin_name: item.latinName,
        clinical_aliases: [] as string[],
        abbreviations: [] as string[],
        laterality,
        representation_scope: 'paired_separate',
        // Anatomy-only guard (Phase 5.5 hard stops: false-continuity-claim,
        // parcel-conflation, plus the standard functional-conflation guard).
        // Denial sentences live HERE (and in topography notes); the suite
        // scans the record with these guard fields removed, so honest denials
        // can name what is denied without tripping the vocabulary scan.
        anatomy_only_scope: 'Anatomy only: cortical surface-derived segment. This mesh is one DISCONNECTED distribution segment; it does not form a continuous pial surface with any other segment — gaps are not bridged, seams are not smoothed, and no joined or single-continuous-surface claim is made or implied. No atlas parcellation (no Brodmann area, no HCP MMP parcel, no parcel boundary) was mapped onto this mesh and none is claimed. No functional-network membership, no RDoC association, no circuit or pathway claim, no receptor or pharmacology mapping, no psychiatric claim is made or implied.',
        expert_review_status: 'EXPERT_REVIEW_PENDING',
        name: nameBlock(item.latinName, item.structureName),
        ontology: ontologyBlock(
          item.fmaId,
          'BodyParts3D distribution parts_list_e.txt (authoritative for files; NOT a live-ontology lookup)'
        ),
        hierarchy: {
          anatomic_system: 'central_nervous_system_telencephalon',
          division: 'telencephalon',
          hemisphere: laterality,
          lobe: `${item.lobe}_lobe`,
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
          hexColor: '#C9BFA6'
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
          legalReviewNotes: `BodyParts3D Release 3.0 component ${item.fmaId} via fresh mirror download (Phase 5.5). Same license chain as production assets. Retroactivity UNRESOLVED - LEGAL_REVIEW_REQUIRED before commercial redistribution.`
        }),
        topography: topographyBlock(
          item.structureId,
          item.parentId,
          `BodyParts3D distribution segment ${item.fmaId}; containment follows the distribution taxonomy. DISCONNECTED segment: no continuous-surface or pial-continuity claim; no atlas-parcel mapping (surface vs parcel distinction preserved).`
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
  writeCortical55Records();
}
