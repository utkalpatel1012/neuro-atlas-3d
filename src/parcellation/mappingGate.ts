/**
 * 3D Neuroanatomy Atlas: Parcellation Mapping Gate (Phase 7)
 * Standard: AAS-2026-NEURO-V1
 *
 * Enforcement point for the Phase 7 hard stops (unverified-parcel-source,
 * hcp-gate-breach, unregistered-parcel-mapping, license-uncertain-ingestion).
 *
 * The gate is CLOSED: no verified mapping record exists (no verified
 * registration/mapping method, no parcel geometry, HCP legal review pending,
 * Brodmann source unverified — see data/parcellation/deferral_record.json).
 * `isMappingAllowed()` returns false unconditionally until a verified mapping
 * record is registered here. Any future parcel render path MUST call
 * `guardParcelRender()` first; it throws while the gate is closed.
 */

import type { ParcelAtlas } from '../types/parcellation';

/** A verified mapping record joining parcels to physical-cortex geometry. */
export interface VerifiedParcelMapping {
  readonly atlas: ParcelAtlas;
  readonly atlas_version: string;
  readonly registration_method: string;
  readonly qa_report_path: string;
}

/**
 * Registry of verified mappings. EMPTY: none exists. Entries may only be
 * added with (1) a verified source/version/license triple, (2) a validated
 * registration method, and (3) a QA report on disk — the exact unblock
 * conditions in data/parcellation/deferral_record.json.
 */
export const VERIFIED_PARCEL_MAPPINGS: readonly VerifiedParcelMapping[] = [];

/** Mapping gate. Always false while VERIFIED_PARCEL_MAPPINGS is empty. */
export function isMappingAllowed(): boolean {
  return VERIFIED_PARCEL_MAPPINGS.length > 0;
}

/** Error thrown when a parcel operation hits the closed mapping gate. */
export class ParcelMappingBlockedError extends Error {
  readonly atlas: string;
  constructor(atlas: string) {
    super(
      `Parcel rendering for atlas "${atlas}" is MAPPING_PENDING: no verified ` +
        `mapping record exists (see data/parcellation/deferral_record.json). ` +
        `Mapping parcels onto anatomy without a verified registration method ` +
        `is prohibited.`,
    );
    this.name = 'ParcelMappingBlockedError';
    this.atlas = atlas;
  }
}

/**
 * Gate for any future parcel→anatomy join. Throws while closed.
 * (`_atlas` is intentionally unused: no atlas is currently mappable.)
 */
export function assertMappingAllowed(_atlas: ParcelAtlas): void {
  if (!isMappingAllowed()) {
    throw new ParcelMappingBlockedError(String(_atlas));
  }
}

/**
 * Guard for any future parcel render path. MUST be called before sampling,
 * coloring, or drawing any parcel boundary. Throws while the gate is closed,
 * so parcels cannot reach the screen without a verified mapping.
 */
export function guardParcelRender(atlas: ParcelAtlas): never {
  throw new ParcelMappingBlockedError(String(atlas));
}
