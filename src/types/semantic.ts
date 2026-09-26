/**
 * 3D Neuroanatomy Atlas: Semantic Macroanatomy & Landmark Registry
 * Standard: AAS-2026-NEURO-V1 (Phase 3 Cerebral Macroanatomy)
 * 
 * Formalizes semantic neuroanatomy:
 * - Major lobes (Frontal, Parietal, Temporal, Occipital, Insular, Limbic)
 * - Major sulcal and fissural landmarks
 * - Major gyral landmarks
 * 
 * CORE PRINCIPLE:
 * Lobe != physical mesh boundary.
 * Semantic regions and landmark references are distinct from physical surface representations.
 */

export type LobeIdentifier =
  | 'frontal'
  | 'parietal'
  | 'temporal'
  | 'occipital'
  | 'insula'
  | 'limbic';

export type LandmarkCategory =
  | 'SULCAL_LANDMARK'
  | 'FISSURE'
  | 'GYRAL_LANDMARK'
  | 'CORTICAL_POLE'
  | 'ANATOMICAL_BORDER';

export interface SemanticLobeDefinition {
  lobeId: string;
  name: string;
  officialLatin: string;
  laterality: 'left' | 'right' | 'bilateral';
  description: string;
  fmaId: string;
  ta2Id: string;
  canonicalCentroidMm: [number, number, number];
  primaryFunctions: string[];
  associatedSulci: string[];
  associatedGyri: string[];
}

export interface AnatomicalLandmark {
  landmarkId: string;
  name: string;
  officialLatin: string;
  category: LandmarkCategory;
  laterality: 'left' | 'right' | 'midline' | 'bilateral';
  associatedLobe?: LobeIdentifier;
  worldPositionMm: [number, number, number]; // canonical_atlas_ras (mm)
  normalVector?: [number, number, number];
  priority: number; // 1 (highest - whole brain) to 4 (deep closeup)
  description: string;
  anatomicalSignificance: string;
  // Phase 3.1 (D7): explicit anchor validation state. An anchor becomes
  // 'EXPERT_VERIFIED' only after expert review against the actual mesh surface.
  // Until then it is SCHEMATIC (hand-placed label guide, NOT a measured localization).
  validationState?: 'SCHEMATIC_UNVALIDATED' | 'EXPERT_VERIFIED';
}

export interface LandmarkRegistry {
  landmarks: AnatomicalLandmark[];
  lobes: SemanticLobeDefinition[];
}

/**
 * Authoritative Canonical Landmark Registry for Human Cerebral Macroanatomy
 * Grounded in canonical_atlas_ras coordinate space.
 *
 * PHASE 3.1 CORRECTION (D7 — read before using worldPositionMm):
 * Every anchor below is SCHEMATIC_UNVALIDATED: hand-placed label guides with NO
 * measurement provenance against the mesh surface. They must NOT be presented as
 * verified sulcal/gyral localizations, and must NOT back clinical claims.
 * Measured audit 2026-09-27 further showed the anchors were authored under the
 * false "+Z Anterior" convention: pole anchors (frontal Z=+62, occipital Z=-102)
 * sit at the OPPOSITE ends of the actual mesh (frontal chunks at low Z, occipital
 * chunk at high Z), and pre/postcentral relative order is inverted vs the mesh.
 * Anchors stay byte-identical until expert re-anchoring (Part 4 entry criterion);
 * moving them by auditor judgment would itself be fabrication. An anchor may set
 * validationState: 'EXPERT_VERIFIED' only after documented expert-vs-mesh review.
 */
export const CEREBRAL_LANDMARKS: AnatomicalLandmark[] = [
  // ==========================================
  // MIDLINE / FISSURAL LANDMARKS
  // ==========================================
  {
    landmarkId: 'landmark.fissure.interhemispheric',
    name: 'Longitudinal (Interhemispheric) Fissure',
    officialLatin: 'Fissura longitudinalis cerebri',
    category: 'FISSURE',
    laterality: 'midline',
    worldPositionMm: [0.65, 30.0, -15.0],
    normalVector: [0.0, 1.0, 0.0],
    priority: 1,
    description: 'Deep sagittal cleft separating the left and right cerebral hemispheres',
    anatomicalSignificance: 'Houses the falx cerebri and anterior cerebral arteries; defines hemispheric laterality.'
  },

  // ==========================================
  // LEFT HEMISPHERE SULCI & FISSURES
  // ==========================================
  {
    landmarkId: 'landmark.sulcus.central.left',
    name: 'Central Sulcus (Left / Rolando)',
    officialLatin: 'Sulcus centralis sinister',
    category: 'SULCAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'frontal',
    worldPositionMm: [-38.0, 42.0, -12.0],
    normalVector: [-0.65, 0.45, -0.61],
    priority: 1,
    description: 'Major transverse sulcus separating frontal (precentral) and parietal (postcentral) lobes',
    anatomicalSignificance: 'Fundamental landmark separating primary motor cortex (M1 / BA4) from primary somatosensory cortex (S1 / BA3,1,2).'
  },
  {
    landmarkId: 'landmark.fissure.sylvian.left',
    name: 'Lateral Sulcus / Sylvian Fissure (Left)',
    officialLatin: 'Sulcus lateralis sinister',
    category: 'FISSURE',
    laterality: 'left',
    associatedLobe: 'temporal',
    worldPositionMm: [-48.0, 10.0, -5.0],
    normalVector: [-0.85, -0.32, 0.41],
    priority: 1,
    description: 'Deep lateral cleft dividing the frontal and parietal lobes superiorly from the temporal lobe inferiorly',
    anatomicalSignificance: 'Contains middle cerebral artery (MCA) branches (M2) and overlies the insular cortex.'
  },
  {
    landmarkId: 'landmark.sulcus.precentral.left',
    name: 'Precentral Sulcus (Left)',
    officialLatin: 'Sulcus precentralis sinister',
    category: 'SULCAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'frontal',
    worldPositionMm: [-36.0, 40.0, 5.0],
    normalVector: [-0.62, 0.51, 0.59],
    priority: 2,
    description: 'Sulcus running parallel and anterior to the central sulcus',
    anatomicalSignificance: 'Anterior boundary of precentral gyrus (primary motor strip); separates premotor cortex from M1.'
  },
  {
    landmarkId: 'landmark.sulcus.postcentral.left',
    name: 'Postcentral Sulcus (Left)',
    officialLatin: 'Sulcus postcentralis sinister',
    category: 'SULCAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'parietal',
    worldPositionMm: [-40.0, 38.0, -32.0],
    normalVector: [-0.68, 0.42, -0.60],
    priority: 2,
    description: 'Sulcus running parallel and posterior to the central sulcus',
    anatomicalSignificance: 'Posterior boundary of postcentral gyrus (primary somatosensory cortex).'
  },
  {
    landmarkId: 'landmark.sulcus.parieto_occipital.left',
    name: 'Parieto-Occipital Sulcus (Left)',
    officialLatin: 'Sulcus parietooccipitalis sinister',
    category: 'SULCAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'occipital',
    worldPositionMm: [-10.0, 24.0, -70.0],
    normalVector: [-0.25, 0.65, -0.71],
    priority: 2,
    description: 'Deep sulcus on medial surface separating the parietal (precuneus) and occipital (cuneus) lobes',
    anatomicalSignificance: 'Major medial landmark delineating parietal from occipital lobe.'
  },
  {
    landmarkId: 'landmark.sulcus.calcarine.left',
    name: 'Calcarine Sulcus (Left)',
    officialLatin: 'Sulcus calcarinus sinister',
    category: 'SULCAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'occipital',
    worldPositionMm: [-8.0, -10.0, -75.0],
    normalVector: [-0.20, -0.35, -0.91],
    priority: 2,
    description: 'Deep horizontal sulcus on medial occipital lobe',
    anatomicalSignificance: 'Primary visual cortex (V1 / striate cortex / Brodmann area 17) banks on upper and lower lips.'
  },

  // ==========================================
  // RIGHT HEMISPHERE SULCI & FISSURES
  // ==========================================
  {
    landmarkId: 'landmark.sulcus.central.right',
    name: 'Central Sulcus (Right / Rolando)',
    officialLatin: 'Sulcus centralis dexter',
    category: 'SULCAL_LANDMARK',
    laterality: 'right',
    associatedLobe: 'frontal',
    worldPositionMm: [39.0, 42.0, -12.0],
    normalVector: [0.65, 0.45, -0.61],
    priority: 1,
    description: 'Major transverse sulcus separating right frontal and parietal lobes',
    anatomicalSignificance: 'Delineates right primary motor and somatosensory cortices.'
  },
  {
    landmarkId: 'landmark.fissure.sylvian.right',
    name: 'Lateral Sulcus / Sylvian Fissure (Right)',
    officialLatin: 'Sulcus lateralis dexter',
    category: 'FISSURE',
    laterality: 'right',
    associatedLobe: 'temporal',
    worldPositionMm: [49.0, 10.0, -5.0],
    normalVector: [0.85, -0.32, 0.41],
    priority: 1,
    description: 'Deep lateral cleft dividing the right frontal/parietal lobes from temporal lobe',
    anatomicalSignificance: 'Overlies the right insular cortex; trajectory of right MCA branch network.'
  },
  {
    landmarkId: 'landmark.sulcus.precentral.right',
    name: 'Precentral Sulcus (Right)',
    officialLatin: 'Sulcus precentralis dexter',
    category: 'SULCAL_LANDMARK',
    laterality: 'right',
    associatedLobe: 'frontal',
    worldPositionMm: [37.0, 40.0, 5.0],
    normalVector: [0.62, 0.51, 0.59],
    priority: 2,
    description: 'Sulcus running parallel and anterior to right central sulcus',
    anatomicalSignificance: 'Anterior boundary of right motor strip.'
  },
  {
    landmarkId: 'landmark.sulcus.postcentral.right',
    name: 'Postcentral Sulcus (Right)',
    officialLatin: 'Sulcus postcentralis dexter',
    category: 'SULCAL_LANDMARK',
    laterality: 'right',
    associatedLobe: 'parietal',
    worldPositionMm: [41.0, 38.0, -32.0],
    normalVector: [0.68, 0.42, -0.60],
    priority: 2,
    description: 'Sulcus running parallel and posterior to right central sulcus',
    anatomicalSignificance: 'Posterior boundary of right somatosensory cortex.'
  },
  {
    landmarkId: 'landmark.sulcus.parieto_occipital.right',
    name: 'Parieto-Occipital Sulcus (Right)',
    officialLatin: 'Sulcus parietooccipitalis dexter',
    category: 'SULCAL_LANDMARK',
    laterality: 'right',
    associatedLobe: 'occipital',
    worldPositionMm: [11.0, 24.0, -70.0],
    normalVector: [0.25, 0.65, -0.71],
    priority: 2,
    description: 'Deep sulcus on right medial surface separating parietal and occipital lobes',
    anatomicalSignificance: 'Medial landmark delineating right parietal from occipital lobe.'
  },
  {
    landmarkId: 'landmark.sulcus.calcarine.right',
    name: 'Calcarine Sulcus (Right)',
    officialLatin: 'Sulcus calcarinus dexter',
    category: 'SULCAL_LANDMARK',
    laterality: 'right',
    associatedLobe: 'occipital',
    worldPositionMm: [9.0, -10.0, -75.0],
    normalVector: [0.20, -0.35, -0.91],
    priority: 2,
    description: 'Deep horizontal sulcus on right medial occipital lobe',
    anatomicalSignificance: 'Right primary visual cortex (V1 / BA17).'
  },

  // ==========================================
  // CORTICAL POLES
  // ==========================================
  {
    landmarkId: 'landmark.pole.frontal.left',
    name: 'Frontal Pole (Left)',
    officialLatin: 'Polus frontalis sinister',
    category: 'CORTICAL_POLE',
    laterality: 'left',
    associatedLobe: 'frontal',
    worldPositionMm: [-18.0, 5.0, 62.0],
    normalVector: [-0.25, 0.10, 0.96],
    priority: 2,
    description: 'Most anterior extremity of the left cerebral hemisphere',
    anatomicalSignificance: 'Anterior-most aspect of Brodmann area 10 (frontopolar prefrontal cortex).'
  },
  {
    landmarkId: 'landmark.pole.frontal.right',
    name: 'Frontal Pole (Right)',
    officialLatin: 'Polus frontalis dexter',
    category: 'CORTICAL_POLE',
    laterality: 'right',
    associatedLobe: 'frontal',
    worldPositionMm: [19.0, 5.0, 62.0],
    normalVector: [0.25, 0.10, 0.96],
    priority: 2,
    description: 'Most anterior extremity of the right cerebral hemisphere',
    anatomicalSignificance: 'Anterior-most aspect of Brodmann area 10.'
  },
  {
    landmarkId: 'landmark.pole.occipital.left',
    name: 'Occipital Pole (Left)',
    officialLatin: 'Polus occipitalis sinister',
    category: 'CORTICAL_POLE',
    laterality: 'left',
    associatedLobe: 'occipital',
    worldPositionMm: [-14.0, -6.0, -102.0],
    normalVector: [-0.15, -0.10, -0.98],
    priority: 2,
    description: 'Most posterior extremity of the left cerebral hemisphere',
    anatomicalSignificance: 'Corresponds to foveal representation of primary visual field.'
  },
  {
    landmarkId: 'landmark.pole.occipital.right',
    name: 'Occipital Pole (Right)',
    officialLatin: 'Polus occipitalis dexter',
    category: 'CORTICAL_POLE',
    laterality: 'right',
    associatedLobe: 'occipital',
    worldPositionMm: [15.0, -6.0, -102.0],
    normalVector: [0.15, -0.10, -0.98],
    priority: 2,
    description: 'Most posterior extremity of the right cerebral hemisphere',
    anatomicalSignificance: 'Foveal representation of contralateral hemifield.'
  },
  {
    landmarkId: 'landmark.pole.temporal.left',
    name: 'Temporal Pole (Left)',
    officialLatin: 'Polus temporalis sinister',
    category: 'CORTICAL_POLE',
    laterality: 'left',
    associatedLobe: 'temporal',
    worldPositionMm: [-36.0, -22.0, 18.0],
    normalVector: [-0.60, -0.45, 0.66],
    priority: 2,
    description: 'Most anterior extremity of the left temporal lobe',
    anatomicalSignificance: 'Brodmann area 38; socio-emotional processing and semantic memory hub.'
  },
  {
    landmarkId: 'landmark.pole.temporal.right',
    name: 'Temporal Pole (Right)',
    officialLatin: 'Polus temporalis dexter',
    category: 'CORTICAL_POLE',
    laterality: 'right',
    associatedLobe: 'temporal',
    worldPositionMm: [37.0, -22.0, 18.0],
    normalVector: [0.60, -0.45, 0.66],
    priority: 2,
    description: 'Most anterior extremity of the right temporal lobe',
    anatomicalSignificance: 'Brodmann area 38.'
  },

  // ==========================================
  // MAJOR GYRAL LANDMARKS
  // ==========================================
  {
    landmarkId: 'landmark.gyrus.precentral.left',
    name: 'Precentral Gyrus (Left / Motor Strip)',
    officialLatin: 'Gyrus precentralis sinister',
    category: 'GYRAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'frontal',
    worldPositionMm: [-37.0, 48.0, -5.0],
    normalVector: [-0.61, 0.63, 0.48],
    priority: 2,
    description: 'Primary motor cortex strip (M1 / BA4) executing voluntary motor movements',
    anatomicalSignificance: 'Somatotopic motor homunculus (face lateral, arm middle, leg medial).'
  },
  {
    landmarkId: 'landmark.gyrus.postcentral.left',
    name: 'Postcentral Gyrus (Left / Sensory Strip)',
    officialLatin: 'Gyrus postcentralis sinister',
    category: 'GYRAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'parietal',
    worldPositionMm: [-41.0, 46.0, -22.0],
    normalVector: [-0.65, 0.62, -0.44],
    priority: 2,
    description: 'Primary somatosensory cortex strip (S1 / BA3,1,2) receiving cutaneous and proprioceptive inputs',
    anatomicalSignificance: 'Somatotopic sensory homunculus.'
  },
  {
    landmarkId: 'landmark.gyrus.superior_temporal.left',
    name: 'Superior Temporal Gyrus (Left)',
    officialLatin: 'Gyrus temporalis superior sinister',
    category: 'GYRAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'temporal',
    worldPositionMm: [-54.0, 4.0, -12.0],
    normalVector: [-0.92, 0.20, 0.34],
    priority: 2,
    description: 'Lateral temporal gyrus containing primary auditory cortex (A1) and posterior Wernicke area',
    anatomicalSignificance: 'Speech perception and phonological processing in dominant hemisphere.'
  },
  {
    landmarkId: 'landmark.gyrus.cuneus.left',
    name: 'Cuneus (Left)',
    officialLatin: 'Cuneus sinister',
    category: 'GYRAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'occipital',
    worldPositionMm: [-10.0, 8.0, -78.0],
    normalVector: [-0.22, 0.45, -0.86],
    priority: 3,
    description: 'Wedge-shaped lobule on medial surface of occipital lobe above calcarine sulcus',
    anatomicalSignificance: 'Visual processing of lower contralateral visual field.'
  },
  {
    landmarkId: 'landmark.gyrus.lingual.left',
    name: 'Lingual Gyrus (Left)',
    officialLatin: 'Gyrus lingualis sinister',
    category: 'GYRAL_LANDMARK',
    laterality: 'left',
    associatedLobe: 'occipital',
    worldPositionMm: [-12.0, -24.0, -72.0],
    normalVector: [-0.25, -0.65, -0.71],
    priority: 3,
    description: 'Tongue-shaped medial occipitotemporal structure below calcarine sulcus',
    anatomicalSignificance: 'Visual processing of upper contralateral visual field and complex visual word forms.'
  }
];

/**
 * Semantic Lobar Organization
 *
 * PHASE 3.1 NOTE: canonicalCentroidMm values are schematic regional guides
 * (same unvalidated status as landmark anchors above), NOT measured lobar
 * centroids. FMA/TA2 IDs below are ontology references for the lobe concepts;
 * several (like cortical FMA IDs) are UNVERIFIED against the FMA — see
 * docs/KNOWN_ANATOMICAL_LIMITATIONS.md. Do not present these numbers as measurements.
 */
export const SEMANTIC_LOBES: SemanticLobeDefinition[] = [
  {
    lobeId: 'lobe.frontal',
    name: 'Frontal Lobe (Bilateral)',
    officialLatin: 'Lobus frontalis',
    laterality: 'bilateral',
    description: 'Anterior-most cerebral lobe extending from frontal pole to central sulcus',
    fmaId: 'FMA:61824',
    ta2Id: 'TA2:5420',
    canonicalCentroidMm: [0.0, 32.0, 22.0],
    primaryFunctions: [
      'Voluntary motor control (M1 / BA4)',
      'Motor planning and execution (SMA, PMA / BA6)',
      'Executive function, working memory, inhibitory control (DLPFC / BA9,46)',
      'Expressive language (Broca area / BA44,45 in left hemisphere)',
      'Social cognition and reward valuation (OFC / BA11,47)'
    ],
    associatedSulci: ['landmark.sulcus.central.left', 'landmark.sulcus.precentral.left', 'landmark.fissure.sylvian.left'],
    associatedGyri: ['landmark.gyrus.precentral.left']
  },
  {
    lobeId: 'lobe.parietal',
    name: 'Parietal Lobe (Bilateral)',
    officialLatin: 'Lobus parietalis',
    laterality: 'bilateral',
    description: 'Middle cerebral lobe bounded anteriorly by central sulcus and posteriorly by parieto-occipital sulcus',
    fmaId: 'FMA:61825',
    ta2Id: 'TA2:5440',
    canonicalCentroidMm: [0.0, 38.0, -38.0],
    primaryFunctions: [
      'Primary somatosensory sensation (S1 / BA3,1,2)',
      'Visuospatial attention and coordinate transformations (IPL, SPL)',
      'Sensorimotor integration and reaching/grasping networks',
      'Numerical cognition and reading (Angular and supramarginal gyri)'
    ],
    associatedSulci: ['landmark.sulcus.central.left', 'landmark.sulcus.postcentral.left', 'landmark.sulcus.parieto_occipital.left'],
    associatedGyri: ['landmark.gyrus.postcentral.left']
  },
  {
    lobeId: 'lobe.temporal',
    name: 'Temporal Lobe (Bilateral)',
    officialLatin: 'Lobus temporalis',
    laterality: 'bilateral',
    description: 'Inferolateral cerebral lobe positioned below lateral sulcus',
    fmaId: 'FMA:61826',
    ta2Id: 'TA2:5450',
    canonicalCentroidMm: [0.0, -14.0, -18.0],
    primaryFunctions: [
      'Primary and secondary auditory processing (Heschl gyrus / A1 / BA41,42)',
      'Receptive language comprehension (Wernicke area / BA22)',
      'Episodic memory encoding and retrieval (Medial temporal hippocampal formation)',
      'High-level ventral visual object recognition (ITG, FFA)'
    ],
    associatedSulci: ['landmark.fissure.sylvian.left'],
    associatedGyri: ['landmark.gyrus.superior_temporal.left']
  },
  {
    lobeId: 'lobe.occipital',
    name: 'Occipital Lobe (Bilateral)',
    officialLatin: 'Lobus occipitalis',
    laterality: 'bilateral',
    description: 'Posterior-most cerebral lobe resting on the tentorium cerebelli',
    fmaId: 'FMA:61827',
    ta2Id: 'TA2:5460',
    canonicalCentroidMm: [0.0, -6.0, -82.0],
    primaryFunctions: [
      'Primary visual reception and retinotopic mapping (V1 / BA17 / striate cortex)',
      'Extrastriate visual processing (V2, V3, V4, V5/MT)',
      'Motion, color, and depth perception'
    ],
    associatedSulci: ['landmark.sulcus.calcarine.left', 'landmark.sulcus.parieto_occipital.left'],
    associatedGyri: ['landmark.gyrus.cuneus.left', 'landmark.gyrus.lingual.left']
  },
  {
    lobeId: 'lobe.insula',
    name: 'Insular Cortex (Bilateral)',
    officialLatin: 'Lobus insularis',
    laterality: 'bilateral',
    description: 'Invaginated cortical structure buried deep within the lateral sulcus beneath frontal, parietal, and temporal opercula',
    fmaId: 'FMA:61828',
    ta2Id: 'TA2:5470',
    canonicalCentroidMm: [0.0, 6.0, 1.0],
    primaryFunctions: [
      'Interoception and visceral sensory representation',
      'Salience network hub and homeostatic regulation',
      'Gustatory perception and pain processing'
    ],
    associatedSulci: ['landmark.fissure.sylvian.left'],
    associatedGyri: []
  },
  {
    lobeId: 'lobe.limbic',
    name: 'Limbic Lobe (Bilateral)',
    officialLatin: 'Lobus limbicus',
    laterality: 'bilateral',
    description: 'Ring (limbus) of allocortical and periallocortical gyri encircling the corpus callosum and brainstem junction',
    fmaId: 'FMA:61829',
    ta2Id: 'TA2:5480',
    canonicalCentroidMm: [0.0, 8.0, -10.0],
    primaryFunctions: [
      'Emotional valuation and affective regulation',
      'Autonomic integration and stress response',
      'Spatial navigation and declarative memory consolidation'
    ],
    associatedSulci: [],
    associatedGyri: []
  }
];
