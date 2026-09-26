import { AnatomicalStructure } from './types';
import hippocampusData from '../data/structures/hippocampus_left.json';

// Type assertion test: ensures the JSON conforms to the AnatomicalStructure interface
const structure: AnatomicalStructure = hippocampusData as unknown as AnatomicalStructure;

console.log('Type check passed for structure:', structure.id);
console.log('Entity Type:', structure.entity_type);
console.log('Registered Centroid:', structure.spatial?.stereotaxic_registration?.registered_centroid);
console.log('Registration Method:', structure.spatial?.stereotaxic_registration?.registration.registration_method);
console.log('Evidence Claims count:', structure.evidence_claims.length);
console.log('Entity Provenance Source Authority:', structure.provenance.source_authority);
console.log('Asset ID:', structure.asset_id);
console.log('Asset Status:', structure.asset_provenance?.validation_status);
