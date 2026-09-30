/**
 * 3D Neuroanatomy Atlas: Parcellation Module Barrel (Phase 7)
 * Standard: AAS-2026-NEURO-V1
 */

export {
  VERIFIED_PARCEL_MAPPINGS,
  isMappingAllowed,
  assertMappingAllowed,
  guardParcelRender,
  ParcelMappingBlockedError,
} from './mappingGate';
export type { VerifiedParcelMapping } from './mappingGate';
