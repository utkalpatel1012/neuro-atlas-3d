# ChatGPT Consultation Dossier: 3D Interactive Neuroanatomy Atlas for Psychiatry

> **Instructions for the User**:
> You can use this dossier in two easy ways with ChatGPT:
> 1. **Option 1 (Quick Review / Copy-Paste)**: Copy the prompt and sections below directly into ChatGPT.
> 2. **Option 2 (Direct File / Zip Upload)**: Upload the generated [`neuro-atlas-3d-consultation.zip`](file:///C:/Users/UTKAL%20PATEL/.gemini/antigravity/scratch/neuro-atlas-3d/neuro-atlas-3d-consultation.zip) or this markdown file directly into ChatGPT (ChatGPT Plus/Team/Enterprise parses `.zip` and `.md` files natively).

---

## Ready-to-Use Consultation Prompt for ChatGPT

```text
Act as a Principal Medical Informatics Architect, Senior WebGL/WebGPU 3D Graphics Engineer, and Academic Neuroanatomy & Neuropsychiatry Specialist.

I am collaborating with an AI architect to design a scientifically rigorous, medically accurate, interactive 3D human brain atlas engineered specifically for the academic and clinical training of psychiatry residents and neuropsychiatrists.

Before writing the complete application code, we completed Phase 0 (Research, Technical Architecture, Schema Design, Licensing Strategy, and Roadmap).

Please review the architectural foundation detailed below and provide an expert critique:
1. Architecture & Tech Stack: Evaluate Three.js WebGPURenderer (TSL) with WebGL2 fallback, Meshopt compression vs Draco, KTX2 Basis Universal textures, BatchedMesh, and BVH raycasting. Are there any hidden bottlenecks, especially regarding iPadOS Safari memory limits (384MB-1GB) or WebGL context loss?
2. Anatomical Provenance & Licensing: Evaluate our Dual-Pillar strategy: Z-Anatomy (CC-BY-SA 4.0) for macroscopic/subcortical/cranial meshes + HCP Glasser MMP 1.0 for cortical parcellations, while strictly isolating EBRAINS Julich-Brain (CC-BY-NC-SA 4.0) to research/validation to avoid Non-Commercial license contagion. Is this legal interpretation sound?
3. Data Schema & Psychiatry Grounding: Review our TypeScript anatomical schema and Left Hippocampus exemplar. Does it sufficiently capture RDoC domains, DSM-5-TR pathophysiology, psychopharmacology receptor profiles, neuromodulation targets (rTMS, DBS, ECT), and neurological lesion bedside tests?
4. Interactive Features: Assess our approaches for Order-Independent Transparency (blue-noise dithered screen-door), stencil-capped cross-sectional clipping planes, progressive 8-stage layer peels, and radial centroid explosion views.
5. Missing Considerations & Blindspots: What potential pitfalls, edge cases, or optimizations should we address before starting Phase 1 (3D asset pipeline)?
```

---

## Project Specification & Technical Summary

### 1. Executive Overview & Target Audience
* **Purpose**: An interactive browser-based 3D digital neuroanatomy atlas for psychiatry residents, clinical neuroscientists, and medical trainees.
* **Core Philosophy**: Zero tolerance for geometric or clinical hallucination. Scientific veracity takes precedence over artificial aesthetics.
* **Target Platforms**: Desktop workstations (Chrome, Edge, Safari, Firefox) and high-end touch tablets (iPad Pro/Air with Apple Pencil/touch gestures), functioning 100% offline as a Progressive Web App (PWA).

---

### 2. Technology Stack Selection & Rationales

| Layer | Chosen Technology | Rationale & Trade-offs |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Industry standard, concurrent rendering for high-density clinical panels and search dialogs. |
| **Language** | **TypeScript 5.x (Strict)** | Strong compile-time typing for 500+ anatomical structures, relations, and psychiatric metadata. |
| **3D Engine** | **Three.js (r172+) with `WebGPURenderer`** | Forward-looking WebGPU engine with automatic `WebGLBackend` fallback. Unified Three Shading Language (TSL). |
| **3D Architecture** | **Hybrid React Three Fiber (R3F) + Imperative Three.js Core** | Declarative scene lifecycle and automatic WebGL resource cleanup, paired with imperative refs inside `useFrame` for zero-allocation 60 FPS animation loops. |
| **3D File Format** | **glTF 2.0 Binary (`.glb`)** | ISO standard packaging node hierarchies, mesh primitives, and material definitions. |
| **Mesh Compression** | **Meshopt (`EXT_meshopt_compression`)** | 10x–50x faster CPU decompression than Draco via SIMD/WASM; eliminates main-thread UI jank during multi-mesh loading and pre-optimizes GPU vertex cache. |
| **Texture Format** | **KTX2 / Basis Universal (`KHR_texture_basisu`)** | Transcodes on a worker thread to native GPU formats (ASTC for iOS, BC7 for desktop); saves 75% VRAM compared to PNG/JPEG. |
| **Raycast Acceleration** | **`three-mesh-bvh`** | Accelerates raycasting from O(N) to O(log N); hover latency < 0.1 ms over 500,000+ polygons. |
| **State Management** | **Zustand** | Lightweight (<1.5 KB), unopinionated, transient subscriptions outside the React render cycle. |
| **Client-Side Search** | **MiniSearch** | Sub-millisecond prefix and fuzzy search across Latin/English names, clinical acronyms (DLPFC, OFC, NAc), and Brodmann areas. |
| **Persistence** | **Dexie.js (IndexedDB) + Cache API** | Offline storage for user bookmarks, private study notes, and binary 3D assets. |
| **PWA Engine** | **Vite PWA (Workbox)** | Aggressive `CacheFirst` asset caching for complete offline hospital/clinical use. |
| **Testing** | **Vitest + Playwright + `gltf-validator`** | High-speed schema unit tests, headless WebGL canvas E2E testing, and 3D asset spec compliance. |

---

### 3. Anatomical Foundation & Provenance Matrix

| Source / Resource | Formats | Granularity & Coverage | License | Role in Project |
| :--- | :--- | :--- | :--- | :--- |
| **Z-Anatomy** | `.blend`, `.glb` | ~500+ discrete structures: cerebral gyri, basal ganglia, brainstem, cerebellum, ventricles, cranial nerves I–XII, vasculature. | **CC-BY-SA 4.0** | **Primary Geometry Foundation** (Macroscopic, subcortical, nerves, vessels). |
| **HCP / Glasser MMP 1.0** | GIfTI (`.surf.gii`) | 180 multi-modal areas/hemisphere in MNI152 / `fs_LR_32k` space (~64,984 vertices). | **HCP Open Access Terms** | **Primary Cortical Parcellation Foundation**. |
| **OpenNeuro / fsaverage** | FreeSurfer pial/white | Standard stereotaxic coordinate frame (MNI152). | **CC0 / BSD** | **Baseline Coordinate Reference Mesh**. |
| **EBRAINS / Julich-Brain** | NIfTI, GIfTI | Microscopic cytoarchitectonic probabilistic maps (>250 areas). | **CC-BY-NC-SA 4.0** | **Academic Validation Benchmark ONLY** (Strictly kept out of distributable assets to prevent Non-Commercial license contagion). |
| **Allen Human Brain Atlas** | NIfTI, CSV | Microarray transcriptomics & receptor maps. | **Allen Institute Terms** | **Receptor & Gene Expression Knowledge Source**. |

---

### 4. Canonical ID Standard & Ontological Cross-Indexing

Every anatomical structure has a deterministic, dot-delimited URI:
```text
brain.<division>.<hemisphere>.<subsystem_or_lobe>.<structure>.<subpart>
```
* **Examples**:
  * `brain.telencephalon.left.frontal_lobe.precentral_gyrus`
  * `brain.telencephalon.left.limbic.hippocampus.ca1`
  * `brain.telencephalon.right.basal_ganglia.caudate_nucleus.head`
  * `brain.diencephalon.bilateral.epithalamus.habenula.lateral_nucleus`
  * `brain.mesencephalon.bilateral.tegmentum.substantia_nigra.pars_compacta`
  * `brain.tract.bilateral.commissural.corpus_callosum.genu`
* **Ontology Mappings**:
  * `ta2_id`: Terminologia Anatomica 2 / Terminologia Neuroanatomica (e.g., `TA2:5488`)
  * `fma_id`: Foundational Model of Anatomy (e.g., `FMA:275020`)
  * `uberon_id`: Uber-anatomy cross-species ontology (e.g., `UBERON:0001954`)
  * `neuronaes_id`: NeuroNames index
  * `brodmann_areas`: Cytoarchitectonic areas (e.g., `[28, 34, 35, 36]`)

---

### 5. TypeScript Data Model Schema (`src/types/anatomy.ts`)

```typescript
export type EmbryologicalDivision =
  | 'telencephalon'
  | 'diencephalon'
  | 'mesencephalon'
  | 'metencephalon'
  | 'myelencephalon'
  | 'peripheral_nervous_system';

export type Hemisphere = 'left' | 'right' | 'bilateral' | 'midline';

export type AnatomicalClassification =
  | 'cortical'
  | 'subcortical_gray'
  | 'diencephalic'
  | 'brainstem'
  | 'cerebellar'
  | 'ventricular'
  | 'white_matter_tract'
  | 'cranial_nerve'
  | 'cerebral_artery'
  | 'cerebral_vein'
  | 'meningeal';

export type EvidenceLevel = 'established_consensus' | 'investigational';

export type RDoCDomain =
  | 'negative_valence'
  | 'positive_valence'
  | 'cognitive_systems'
  | 'social_processes'
  | 'arousal_regulatory';

export type NeuromodulationModality = 'rTMS' | 'DBS' | 'ECT' | 'tDCS' | 'VNS';

export interface Citation {
  title: string;
  authors: string[];
  journal_or_book: string;
  year: number;
  pmid?: string;
  doi?: string;
  isbn?: string;
}

export interface PsychiatricCorrelate {
  disorder: string;
  pathophysiology_summary: string;
  evidence_level: EvidenceLevel;
  associated_symptoms: string[];
  references: Citation[];
}

export interface PsychopharmacologyMapping {
  neurotransmitter_system: 'dopamine' | 'serotonin' | 'norepinephrine' | 'gaba' | 'glutamate' | 'acetylcholine' | 'opioid';
  predominant_receptors: string[];
  mechanism_summary: string;
  clinical_agents: string[];
}

export interface NeuromodulationTarget {
  modality: NeuromodulationModality;
  target_name: string;
  stereotaxic_mni_coordinates?: [number, number, number];
  clinical_indication: string;
  clinical_trials_or_fda_status: string;
}

export interface NeurologicalDeficit {
  syndrome_or_lesion_name: string;
  clinical_manifestation: string;
  bedside_examination_test: string;
}

export interface NeuroimagingFeatures {
  t1_intensity: 'hypointense' | 'isointense' | 'hyperintense';
  t2_flair_intensity: 'hypointense' | 'isointense' | 'hyperintense';
  radiological_landmarks: string;
}

export interface AnatomicalStructure {
  id: string;
  name: {
    official_latin: string;
    official_english: string;
    clinical_aliases: string[];
    standard_abbreviations: string[];
  };
  ontology: {
    ta2_id: string;
    fma_id?: string;
    uberon_id?: string;
    neuronaes_id?: string;
    brodmann_areas: number[];
  };
  hierarchy: {
    division: EmbryologicalDivision;
    hemisphere: Hemisphere;
    lobe?: string;
    subsystem: string;
    parent_id?: string;
    children_ids: string[];
    layer_peel_index: number;
  };
  spatial: {
    mesh_node_name: string;
    centroid_mni: [number, number, number];
    bounding_box: { min: [number, number, number]; max: [number, number, number] };
    estimated_volume_cm3?: number;
    default_color_hex: string;
  };
  classification: AnatomicalClassification;
  topography: {
    boundaries: {
      superior?: string;
      inferior?: string;
      anterior?: string;
      posterior?: string;
      medial?: string;
      lateral?: string;
    };
    adjacent_structure_ids: string[];
  };
  circuitry: {
    major_afferents: string[];
    major_efferents: string[];
    traversing_tract_ids: string[];
  };
  vasculature: {
    arterial_supply: string[];
    venous_drainage: string[];
  };
  functional_neuroanatomy: {
    primary_functions: string[];
    rdoc_domains: RDoCDomain[];
  };
  psychiatric_relevance: {
    disorders: PsychiatricCorrelate[];
    psychopharmacology: PsychopharmacologyMapping[];
    neuromodulation_targets: NeuromodulationTarget[];
    clinical_pearls: string[];
  };
  neurological_deficits: NeurologicalDeficit[];
  imaging: NeuroimagingFeatures;
  provenance: {
    source_dataset: string;
    source_mesh_id: string;
    license: string;
    modification_log: string[];
  };
  references: Citation[];
}
```

---

### 6. Clinical Data Exemplar: Left Hippocampus (`data/structures/hippocampus_left.json`)

```json
{
  "id": "brain.telencephalon.left.limbic.hippocampus",
  "name": {
    "official_latin": "Hippocampus",
    "official_english": "Hippocampus (Left)",
    "clinical_aliases": ["Ammon's Horn", "Cornu Ammonis", "Hippocampal Formation"],
    "standard_abbreviations": ["Hpc", "HIP", "CA"]
  },
  "ontology": {
    "ta2_id": "TA2:5488",
    "fma_id": "FMA:275020",
    "uberon_id": "UBERON:0001954",
    "neuronaes_id": "NN:196",
    "brodmann_areas": [28, 34, 35, 36]
  },
  "hierarchy": {
    "division": "telencephalon",
    "hemisphere": "left",
    "lobe": "temporal_lobe",
    "subsystem": "limbic_system",
    "parent_id": "brain.telencephalon.left.limbic",
    "children_ids": [
      "brain.telencephalon.left.limbic.hippocampus.dentate_gyrus",
      "brain.telencephalon.left.limbic.hippocampus.ca1",
      "brain.telencephalon.left.limbic.hippocampus.ca2",
      "brain.telencephalon.left.limbic.hippocampus.ca3",
      "brain.telencephalon.left.limbic.hippocampus.subiculum"
    ],
    "layer_peel_index": 5
  },
  "spatial": {
    "mesh_node_name": "Mesh_Hippocampus_L",
    "centroid_mni": [-26.2, -20.8, -16.4],
    "bounding_box": {
      "min": [-35.0, -38.0, -25.0],
      "max": [-18.0, -5.0, -8.0]
    },
    "estimated_volume_cm3": 3.8,
    "default_color_hex": "#D4A373"
  },
  "classification": "subcortical_gray",
  "topography": {
    "boundaries": {
      "superior": "Temporal horn of lateral ventricle (ventral floor) and amygdala (anterosuperior)",
      "inferior": "Subiculum and parahippocampal gyrus",
      "anterior": "Amygdaloid complex (separated by uncal recess of temporal horn)",
      "posterior": "Splenium of corpus callosum, continuing as indusium griseum",
      "medial": "Ambient cistern and midbrain crus cerebri",
      "lateral": "Collateral eminence of temporal horn"
    },
    "adjacent_structure_ids": [
      "brain.telencephalon.left.limbic.amygdala",
      "brain.telencephalon.left.ventricles.lateral_ventricle.temporal_horn",
      "brain.telencephalon.left.temporal_lobe.parahippocampal_gyrus",
      "brain.telencephalon.left.tract.fornix.fimbria"
    ]
  },
  "circuitry": {
    "major_afferents": [
      "Perforant path from Entorhinal Cortex layer II/III",
      "Cholinergic projections from Medial Septal Nuclei via Fornix",
      "Noradrenergic inputs from Locus Coeruleus",
      "Serotonergic inputs from Median Raphe Nucleus"
    ],
    "major_efferents": [
      "Fimbria-fornix to Mammillary Bodies and Anterior Thalamic Nucleus (Papez circuit)",
      "Direct subicular projections to Entorhinal Cortex, Prefrontal Cortex, and Ventral Striatum"
    ],
    "traversing_tract_ids": [
      "brain.telencephalon.left.tract.fornix",
      "brain.telencephalon.left.tract.alveus"
    ]
  },
  "vasculature": {
    "arterial_supply": [
      "Anterior choroidal artery (branch of internal carotid artery)",
      "Posterior cerebral artery (hippocampal arteries from P2 segment)"
    ],
    "venous_drainage": [
      "Inferior ventricular vein",
      "Basal vein of Rosenthal"
    ]
  },
  "functional_neuroanatomy": {
    "primary_functions": [
      "Declarative episodic and semantic memory encoding and consolidation",
      "Spatial navigation and cognitive mapping",
      "Stress response regulation (negative feedback to Hypothalamic-Pituitary-Adrenal HPA axis)",
      "Contextual fear conditioning and extinction modulation"
    ],
    "rdoc_domains": [
      "cognitive_systems",
      "negative_valence",
      "arousal_regulatory"
    ]
  },
  "psychiatric_relevance": {
    "disorders": [
      {
        "disorder": "Major Depressive Disorder (MDD)",
        "pathophysiology_summary": "Volume reduction documented across repeated volumetric MRI meta-analyses. Driven by chronic glucocorticoid neurotoxicity, decreased BDNF signaling, dendritic atrophy in CA3 pyramidal neurons, and suppressed subgranular zone neurogenesis.",
        "evidence_level": "established_consensus",
        "associated_symptoms": ["Anhedonia", "Depressed mood", "Impaired declarative memory recall", "Excessive HPA axis activation"],
        "references": [
          {
            "title": "Subcortical brain volume abnormalities in 2028 patients with major depressive disorder from the ENIGMA MDD working group",
            "authors": ["Schmaal L", "Veltman DJ", "van Erp TG", "et al."],
            "journal_or_book": "Molecular Psychiatry",
            "year": 2016,
            "pmid": "26122586",
            "doi": "10.1038/mp.2015.69"
          }
        ]
      },
      {
        "disorder": "Post-Traumatic Stress Disorder (PTSD)",
        "pathophysiology_summary": "Decreased bilateral hippocampal volume and impaired contextual encoding. Results in failure to differentiate safe contexts from traumatic cues, leading to generalization of conditioned fear and intrusive flashback recollections.",
        "evidence_level": "established_consensus",
        "associated_symptoms": ["Intrusive trauma memories", "Hyperarousal", "Contextual fear generalization"],
        "references": [
          {
            "title": "Structural and functional neuroimaging findings in posttraumatic stress disorder",
            "authors": ["Rauch SL", "Shin LM", "Phelps EA"],
            "journal_or_book": "Journal of Clinical Psychiatry",
            "year": 2006,
            "pmid": "16602811"
          }
        ]
      },
      {
        "disorder": "Schizophrenia",
        "pathophysiology_summary": "Anterior hippocampal hyperactivity and parvalbumin-positive interneuron NMDA receptor hypofunction. Drives excess downstream dopamine efflux in the striatum via subicular projections to the nucleus accumbens, producing positive psychotic symptoms.",
        "evidence_level": "established_consensus",
        "associated_symptoms": ["Delusions", "Hallucinations", "Formal thought disorder", "Working memory impairment"],
        "references": [
          {
            "title": "Hippocampal dysfunction and dopamine system hyperactivity in schizophrenia",
            "authors": ["Grace AA"],
            "journal_or_book": "Trends in Neurosciences",
            "year": 2010,
            "pmid": "20434778",
            "doi": "10.1016/j.tins.2010.03.003"
          }
        ]
      }
    ],
    "psychopharmacology": [
      {
        "neurotransmitter_system": "serotonin",
        "predominant_receptors": ["5-HT1A (somatodendritic and postsynaptic)", "5-HT2A", "5-HT4"],
        "mechanism_summary": "Postsynaptic 5-HT1A activation stimulates CREB phosphorylation and increases local BDNF transcription, mediating long-term neurogenic and neuroprotective antidepressant actions of SSRIs.",
        "clinical_agents": ["Escitalopram", "Sertraline", "Vilazodone", "Vortioxetine"]
      },
      {
        "neurotransmitter_system": "glutamate",
        "predominant_receptors": ["NMDA (GluN2A, GluN2B)", "AMPA (GluA1, GluA2)"],
        "mechanism_summary": "Excessive extrasynaptic NMDA activation promotes excitotoxic calcium influx and dendritic pruning under chronic stress. Low-dose ketamine/esketamine induces transient glutamate surge, activating synaptic AMPA receptors and triggering rapid mTORC1 signaling and synaptogenesis.",
        "clinical_agents": ["Esketamine", "Memantine", "Ketamine"]
      }
    ],
    "neuromodulation_targets": [
      {
        "modality": "ECT",
        "target_name": "Medial Temporal Lobe / Hippocampus",
        "clinical_indication": "Severe Treatment-Resistant Depression, Acute Suicidality, Catatonia",
        "clinical_trials_or_fda_status": "FDA Cleared. Induces robust bilateral hippocampal volume expansion and neuroplasticity via high electrical field induction across temporal lobes."
      }
    ],
    "clinical_pearls": [
      "The hippocampus is exquisitely vulnerable to hypoxic-ischemic injury (Sommer sector / CA1 pyramidal neurons), causing dense anterograde amnesia.",
      "Korsakoff syndrome causes memory retrieval failure due to damage in the mammillary bodies and anterior thalamus, structures directly connected to the hippocampus via the fornix."
    ]
  },
  "neurological_deficits": [
    {
      "syndrome_or_lesion_name": "Bilateral Hippocampal Lesion (e.g., Patient H.M. / Herpes Simplex Encephalitis)",
      "clinical_manifestation": "Severe, irreversible anterograde amnesia for episodic and semantic facts, with preserved working memory, remote childhood memories, and procedural skill learning.",
      "bedside_examination_test": "3-word or 5-word delayed recall test after 5 and 10 minutes with intervening distraction."
    }
  ],
  "imaging": {
    "t1_intensity": "isointense",
    "t2_flair_intensity": "isointense",
    "radiological_landmarks": "Coronal T1/T2 perpendicular to the long axis of the temporal lobe: Identifies hippocampal head digitations, subiculum, hippocampal fissure remnant, and temporal horn."
  },
  "provenance": {
    "source_dataset": "Z-Anatomy (Blender neuro collection)",
    "source_mesh_id": "Hippocampus_L_ZAnat_v2",
    "license": "CC-BY-SA 4.0",
    "modification_log": [
      "Extracted from Z-Anatomy Nervous System Collection",
      "Origin centered on anatomical centroid (-26.2, -20.8, -16.4)",
      "Non-manifold boundary edges welded; Taubin smoothing applied",
      "QEM decimation to 3,240 triangles",
      "Meshopt compressed via gltfpack -cc"
    ]
  },
  "references": [
    {
      "title": "Snell's Clinical Neuroanatomy, 8th Edition",
      "authors": ["Splittgerber R"],
      "journal_or_book": "Wolters Kluwer",
      "year": 2018,
      "isbn": "9781496346759"
    }
  ]
}
```

---

### 7. Interactive Dissection & Visualization Features
1. **Raycast Hover & Selection**: Powered by `three-mesh-bvh` (<0.1 ms latency). Selection outlines via depth-stencil silhouettes and emissive edge illumination.
2. **Order-Independent Transparency (OIT)**: Screen-door dithered alpha using a blue-noise mask, eliminating WebGL triangle-sorting glitches when peeling translucent cortex to expose deep basal ganglia.
3. **Sectional Cutaways & Stencil Capping**: Real-time axial, coronal, and sagittal clipping planes with dual-sided `StencilPass` capping, rendering solid internal brain tissue textures instead of hollow polygon hulls.
4. **8-Stage Progressive Layer Peel**: Vasculature (0) → Cortex (1) → White Matter (2) → Ventricles (3) → Basal Ganglia (4) → Limbic (5) → Brainstem/Cerebellum (6) → Cranial Nerves (7).
5. **Explode View & Hemisphere Split**: Radial expansion along centroid vectors and independent X-axis translation of left/right hemispheres to expose the third ventricle and corpus callosum.
6. **3D Spatial Annotations**: `CSS2DRenderer` DOM vector labels with leader lines and occlusion testing against the depth buffer.

---

### 8. Development Roadmap Overview

* **Phase 0**: Research, Technical Architecture, Schema Design & Environment Setup *(COMPLETED)*.
* **Phase 1**: 3D Anatomical Asset Pipeline & Geometry Optimization (Z-Anatomy ingestion, Blender cleanup, Meshopt compression).
* **Phase 2**: High-Performance 3D Viewport Engine (Three.js WebGPURenderer, TSL shaders, BVH raycaster, camera controls).
* **Phase 3**: Interactive Dissection Engine (Peel, isolate, blue-noise transparency, explode, hemisphere split).
* **Phase 4**: Sectional Neuroanatomy & Stencil Clipping Planes (3-axis clipping, solid caps, MNI152 coordinate readout).
* **Phase 5**: Anatomical Metadata Core & Fast Search Engine (Zod validation, MiniSearch indexing, detail drawer).
* **Phase 6**: Advanced Psychiatry Knowledge Layer (CSTC loops, Papez, RDoC domains, receptor maps, TMS/DBS targets).
* **Phase 7**: UI/UX, Spatial Annotations & Offline PWA (CSS2D labels, iPad touch gestures, Dexie.js IndexedDB, Workbox cache).
* **Phase 8**: Grounded AI Tutor & Academic Resident Validation (RAG clinical tutor, peer-review verification).
