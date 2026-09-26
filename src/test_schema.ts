import { AnatomicalStructure } from './types';
import hippocampusData from '../data/structures/hippocampus_left.json';

// Type assertion test: ensures the JSON conforms to the AnatomicalStructure interface
const structure: AnatomicalStructure = hippocampusData as unknown as AnatomicalStructure;

console.log('Type check passed for structure:', structure.id);
console.log('Entity Type:', structure.entity_type);
console.log('Registered Centroid:', structure.spatial.registered_centroid);
console.log('Evidence Claims count:', structure.evidence_claims.length);
