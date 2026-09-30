/**
 * 3D Neuroanatomy Atlas: Cortical Parcellation Data Model (Phase 7)
 * Standard: AAS-2026-NEURO-V1
 *
 * Phase 7 outcome is DOCUMENTED DEFERRAL (see docs/PHASE_7_ANATOMICAL_SCOPE.md):
 * the parcellation data model exists with rendering MAPPING_PENDING throughout.
 * NO parcel geometry is ingested, NO parcel is mapped, NO parcel is rendered.
 *
 * Core invariant (AGENTS.md / ENTITY_IDENTITY_AND_REFERENCING.md):
 * anatomical entity != atlas parcel. `ParcelRecord` carries the discriminant
 * `entity_type: 'cortical_parcel'`, which is NOT assignable to or from
 * `AnatomicalStructure` (`entity_type: 'anatomical_structure'`). No code path
 * may join parcels to physical-cortex geometry without a verified mapping
 * record (see src/parcellation/mappingGate.ts — none exists).
 */

import type { ProductionEligibility } from './provenance';

/**
 * Atlas identity. HCP_MMP1 and Brodmann are the only named atlases in scope;
 * the `(string & {})` tail keeps the union extensible for future VERIFIED
 * atlases (e.g. Schaefer_2018, Desikan_Killiany) without widening to `string`
 * (which would collapse the known literals). No new atlas may be added
 * without a verified source/version/license triple.
 */
export type KnownParcelAtlas = 'HCP_MMP1' | 'Brodmann';
export type ParcelAtlas = KnownParcelAtlas | (string & {});

/**
 * Mapping state. EXACTLY these two values exist. Nothing ships as
 * MAPPED_VERIFIED: there is no verified registration/mapping method and no
 * parcel geometry in the repo, so every record is MAPPING_PENDING.
 */
export type MappingState = 'MAPPING_PENDING' | 'MAPPED_VERIFIED';

/**
 * License posture for a parcel atlas entry. Reuses the project-wide
 * ProductionEligibility vocabulary; SOURCE_UNVERIFIED records the Brodmann
 * condition (no verified source release with a clean license chain).
 */
export type ParcelLicensePosture = ProductionEligibility | 'SOURCE_UNVERIFIED';

/**
 * Parcel identity record: atlas membership, version, license posture, and
 * mapping state. Bibliographic identity only — this record NEVER carries
 * geometry (no vertex indices, no label arrays, no mesh references).
 */
export interface ParcelRecord {
  /** Discriminant. Distinct from AnatomicalStructure's 'anatomical_structure'. */
  readonly entity_type: 'cortical_parcel';
  /** Stable parcel identity (e.g. 'parcel.hcp_mmp1.UNMAPPED'). */
  readonly id: string;
  readonly atlas: ParcelAtlas;
  /**
   * Exact upstream dataset version, or null when no dataset was acquired.
   * HCP MMP 1.0: null (no version pinned because no dataset was acquired).
   * Brodmann: null (no verified source release established).
   */
  readonly atlas_version: string | null;
  readonly license_posture: ParcelLicensePosture;
  /** Always 'MAPPING_PENDING' until a verified mapping record exists. */
  readonly mapping_state: MappingState;
  /**
   * Geometry shipment marker. Always 'NONE' in Phase 7: no parcel mesh bytes
   * exist anywhere in assets/ or data/.
   */
  readonly geometry_bytes: 'NONE';
}

/** Type guard: true only for the parcel side of the entity/parcel divide. */
export function isParcelRecord(value: { entity_type: string }): value is ParcelRecord {
  return value.entity_type === 'cortical_parcel';
}

/** Type guard: true only for the physical-anatomy side of the divide. */
export function isAnatomicalStructureRecord(value: {
  entity_type: string;
}): value is { entity_type: 'anatomical_structure' } {
  return value.entity_type === 'anatomical_structure';
}
