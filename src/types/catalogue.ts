/**
 * 3D Neuroanatomy Atlas: Machine-Readable Anatomical Catalogue Schema
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandate:
 * Tracks every structure's lifecycle from initial planning to production readiness.
 * Prevents unvalidated or placeholder anatomy from leaking into production.
 */

import { AnatomicalStructureSubtype, Laterality, RepresentationScope } from './entity';
import { SemanticVisibilityGroup } from './presentation';

export type StructureValidationState =
  | 'PLANNED'              // Structure indexed from Terminologia Anatomica 2
  | 'RESEARCHED'           // Ontological mappings, boundaries, and citations documented
  | 'SOURCE_IDENTIFIED'    // Candidate 3D geometry identified in verified open source
  | 'MESH_AVAILABLE'       // 3D mesh cleaned, manifold verified, and pivot centered in Blender
  | 'METADATA_VALIDATED'   // Complete TypeScript/JSON schema record passed automated validation
  | 'ANATOMY_VALIDATED'    // Anatomical accuracy audited and signed off by specialist
  | 'PRODUCTION_READY';    // Meshopt compressed, BVH tested, listed in assets.manifest.json

export interface ValidationTransitionEvent {
  previous_state: StructureValidationState;
  new_state: StructureValidationState;
  timestamp: string;
  reviewer_name_or_agent: string;
  audit_notes: string;
}

export interface CatalogueStructureEntry {
  id: string; // e.g., 'brain.telencephalon.left.limbic.hippocampus'
  canonical_name: string;
  official_latin: string;
  synonyms: string[];
  structure_subtype: AnatomicalStructureSubtype;
  laterality: Laterality;
  representation_scope?: RepresentationScope;
  parent_id?: string;
  ta2_id: string;
  fma_id?: string;
  uberon_id?: string;
  visibility_groups: SemanticVisibilityGroup[];
  source_asset_id?: string;
  validation_state: StructureValidationState;
  validation_history: ValidationTransitionEvent[];
}

export interface AnatomyCatalogue {
  catalogue_version: string;
  generated_at: string;
  total_structures_count: number;
  by_validation_state: Record<StructureValidationState, number>;
  structures: Record<string, CatalogueStructureEntry>;
}
