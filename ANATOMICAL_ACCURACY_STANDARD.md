# Anatomical Accuracy Standard & Scientific Policy

**Standard ID**: AAS-2026-NEURO-V1  
**Authority**: Senior Digital Neuroanatomy Specialist & Lead Clinical Architect  
**Scope**: All 3D meshes, coordinate spaces, metadata fields, circuit diagrams, and educational/clinical summaries in the 3D Neuroanatomy Atlas.

---

## 1. Core Scientific Principle

> **We are not building a visually artistic approximation of the brain. We are building a scientifically credible, rigorously sourced digital neuroanatomy atlas for clinical and academic use.**

Visual aesthetics must never take precedence over anatomical veracity. In every conflict between visual flair and scientific correctness, scientific correctness is the non-negotiable priority.

---

## 2. Prohibition of AI and Generative Hallucinations

1. **Zero Generative Geometry**:
   * No 3D meshes representing human neuroanatomy may be generated using ungrounded generative AI mesh tools, text-to-3D pipelines, or procedural noise algorithms that do not originate from an empirically acquired anatomical or neuroimaging source.
   * Every vertex, face, and boundary must trace its provenance to validated MRI/CT datasets, histological reconstructions, or expert anatomical dissections (e.g., Z-Anatomy / BodyParts3D, Human Connectome Project, FreeSurfer fsaverage).

2. **Zero Fabricated Anatomical Structures**:
   * No structure may be added to the scene graph or metadata database unless it is formally indexed in **Terminologia Anatomica 2 (TA2)**, **Terminologia Neuroanatomica (TNA)**, or the **Foundational Model of Anatomy (FMA)**.
   * The addition of hypothetical, speculative, or fictitious anatomical entities is strictly prohibited.

3. **No Invented Gyri, Sulci, or Fissures**:
   * Cortical folding patterns must adhere to human anatomical reality. Gyri and sulci must reflect authentic human morphology, including standard primary and secondary sulci:
     * Central sulcus (of Rolando) separating precentral (motor) and postcentral (somatosensory) gyri.
     * Lateral sulcus (Sylvian fissure) separating the frontal/parietal lobes from the temporal lobe.
     * Parieto-occipital sulcus and Calcarine sulcus on the medial surface.
     * Cingulate sulcus with marginal branch.
     * Precentral, superior frontal, inferior frontal, postcentral, intraparietal, superior temporal, and inferior temporal sulci.
   * Tertiary sulcal variability must either be explicitly represented as normative anatomical variations or standardized according to the MNI152/fsaverage consensus.

4. **No Invented Neural Tracts or Connections**:
   * Fiber pathways (projection, association, commissural) must represent empirically validated human white-matter pathways documented by diffusion spectrum imaging (DSI), high-angular resolution diffusion imaging (HARDI), or post-mortem Klingler fiber dissection.
   * Artificial or geometrically pleasing "streamlines" that do not correspond to authentic anatomical tracts (e.g., corticospinal tract, arcuate fasciculus, uncinate fasciculus, optic radiation, fornix, cingulum) are strictly prohibited.

---

## 3. Authoritative Source Hierarchy & Priority

All anatomical data, structural boundaries, and clinical assertions must derive from the following hierarchy of authority:

### Tier 1: Primary International Standards & Stereotaxic Atlases
1. **FIPAT**: *Terminologia Anatomica 2 (TA2)* and *Terminologia Neuroanatomica (TNA)* (2019/2020).
2. **Foundational Model of Anatomy (FMA)**: Structural Informatics Group, University of Washington.
3. **Human Connectome Project (HCP)**: Glasser Multi-Modal Parcellation (MMP 1.0, *Nature* 2016).
4. **MNI / ICBM Standards**: ICBM 152 Nonlinear 2009c Asymmetric Stereotaxic Coordinate Frame.

### Tier 2: Benchmark Clinical Neuroanatomy Textbooks & Atlases
1. **Snell's Clinical Neuroanatomy** (8th Edition, Ryan Splittgerber / Wolters Kluwer, 2018).
2. **Duvernoy's The Human Brain**: Surface, Three-Dimensional Sectional Anatomy with MRI, and Blood Supply (Henri Duvernoy et al., Springer).
3. **Principles of Neural Science** (6th Edition, Kandel, Koester, Mack, Siegelbaum / McGraw-Hill).
4. **The Human Central Nervous System** (4th Edition, Nieuwenhuys, Voogd, van Huijzen / Springer).
5. **Schmahmann's MRI Atlas of the Human Cerebellum** (Jeremy D. Schmahmann et al., Academic Press).
6. **Atlas of Functional Neuroanatomy** (Walter J. Hendelman, CRC Press).

### Tier 3: Benchmark Academic Psychiatry & Neuropsychiatry References
1. **DSM-5-TR**: *Diagnostic and Statistical Manual of Mental Disorders*, Fifth Edition, Text Revision (American Psychiatric Association, 2022).
2. **Stahl's Essential Psychopharmacology**: Neuroscientific Basis and Practical Applications (5th Edition, Stephen M. Stahl, Cambridge University Press).
3. **NIMH Research Domain Criteria (RDoC)**: Matrix of functional constructs, units of analysis, and neural circuits.
4. **The American Psychiatric Association Publishing Textbook of Neuropsychiatry and Clinical Neurosciences** (6th Edition, David B. Arciniegas et al.).
5. **Neurobiology of Mental Illness** (5th Edition, Charney, Nestler, Sklar, Buxbaum / Oxford University Press).

---

## 4. Handling Anatomical Terminology & Parcellation Divergences

Neuroanatomy is characterized by multiple coexisting nomenclature systems. To maintain absolute clinical precision, the atlas enforces the following disambiguation rules:

1. **Explicit Dual-Nomenclature Display**:
   * When classical descriptive anatomy and modern neuroimaging parcellations differ, both must be presented with clear contextual labeling:
     * *Example*: **Subgenual Anterior Cingulate Cortex** (Modern functional neuroimaging / Mayberg depression circuit) ↔ **Brodmann Area 25** (Cytoarchitectonics) ↔ **Gyrus subcallosus / Area subgenualis** (Classical TA2).
     * *Example*: **Striatum** (Functional/anatomical concept) = **Caudate Nucleus + Putamen + Ventral Striatum / Nucleus Accumbens**.
     * *Example*: **Lentiform Nucleus** (Gross morphological grouping) = **Putamen + Globus Pallidus (GPe + GPi)**.

2. **Distinction Between Established Findings and Research Hypotheses**:
   * Every psychiatric and functional correlation must be explicitly categorized under one of two evidentiary tiers:
     * **Established Clinical Consensus**: Replicated across multiple meta-analyses, proven in neurosurgical/stroke lesions, or validated in FDA-approved neuromodulation protocols (e.g., Left DLPFC hypoactivity in MDD; Basal Ganglia CSTC hyper-reactivity in OCD; Broca's area motor aphasia; Dopamine D2 antagonism in positive psychotic symptoms).
     * **Investigational / Research Hypothesis**: Emerging findings from exploratory neuroimaging, preclinical models, or preliminary clinical trials (e.g., adult human hippocampal neurogenesis; altered default mode network subsystem functional connectivity as a standalone diagnostic biomarker; specific ketamine mechanism via lateral habenula bursting).
   * Unverified hypotheses must never be stated as established anatomical or psychiatric facts.

---

## 5. Structural Completeness & Validation Checklist

Before any anatomical region is approved for production release, it must satisfy the following region-specific validation criteria:

### A. Telencephalon (Cortex & Basal Forebrain)
- [ ] Hemispheric symmetry and authentic asymmetry (e.g., typical left planum temporale enlargement).
- [ ] Precentral and postcentral gyri separated by a continuous, unbroken central sulcus reaching the superior medial border without crossing into the lateral fissure.
- [ ] Frontal lobe parcellation into superior, middle, and inferior frontal gyri, with distinct pars orbitalis, triangularis, and opercularis.
- [ ] Cingulate gyrus complete from subcallosal area through anterior, mid, and posterior cingulate to retrosplenial cortex.
- [ ] Insular cortex positioned deep within the Sylvian fissure, displaying anterior short gyri and posterior long gyri.

### B. Subcortical Nuclei & Diencephalon
- [ ] Caudate nucleus anatomically wrapping the lateral ventricle (head, body, tail terminating at the amygdala).
- [ ] Clear structural boundary between Putamen and Globus Pallidus (externa vs. interna).
- [ ] Nucleus Accumbens positioned at the junction of the head of the caudate and the anterior putamen, inferior to the anterior limb of the internal capsule.
- [ ] Thalamus accurately divided into major nuclear groups (Anterior, Mediodorsal, Pulvinar, Ventral lateral, Ventral anterior, VPL/VPM, LGN, MGN).
- [ ] Subthalamic Nucleus (STN) and Substantia Nigra positioned in authentic stereotaxic alignment with the cerebral peduncles and red nuclei.

### C. Limbic System & Hippocampal Formation
- [ ] Hippocampus displaying authentic longitudinal axis (head with digitations, body, tail) and transverse laminar architecture (Dentate Gyrus, CA3, CA1, Subiculum).
- [ ] Amygdala located anterior and superior to the temporal horn of the lateral ventricle and hippocampal head.
- [ ] Complete Fornix trajectory: Fimbria → Crura → Body beneath the corpus callosum → Columns arching downward to terminate in the mammillary bodies.

### D. Ventricular System
- [ ] Lateral ventricles possessing frontal horns, bodies, occipital horns, and temporal horns with authentic spatial dimensions.
- [ ] Bilateral Foramina of Monro connecting lateral ventricles to the slit-like third ventricle.
- [ ] Interthalamic adhesion (massa intermedia) passing through the third ventricle.
- [ ] Cerebral aqueduct traversing the midbrain beneath the tectum into the diamond-shaped fourth ventricle.
- [ ] Lateral foramina of Luschka and median foramen of Magendie opening into the subarachnoid cisterns.

### E. Brainstem & Cranial Nerves
- [ ] Midbrain: Distinct superior and inferior colliculi (tectal plate), cerebral peduncles (crura cerebri), interpeduncular fossa.
- [ ] Pons: Prominent transverse fibers, basilar sulcus, middle cerebellar peduncles entering cerebellar hemispheres.
- [ ] Medulla: Ventral pyramids with visible decussation, inferior olivary eminences, hypoglossal and post-olivary sulci.
- [ ] Cranial Nerves I through XII exiting at authentic neuroanatomical origins:
  - CN I: Olfactory bulb and tract along olfactory sulcus.
  - CN II: Optic nerve, chiasm, and optic tracts.
  - CN III: Oculomotor exiting medial aspect of cerebral peduncles in interpeduncular fossa.
  - CN IV: Trochlear exiting dorsal midbrain below inferior colliculi.
  - CN V: Trigeminal exiting anterolateral surface of mid-pons.
  - CN VI, VII, VIII: Exiting pontomedullary junction (VI medially, VII and VIII laterally at cerebellopontine angle).
  - CN IX, X, XI: Exiting retro-olivary sulcus of medulla.
  - CN XII: Exiting pre-olivary sulcus between pyramid and olive.

### F. Cerebellum
- [ ] Realistic foliation pattern (tightly spaced transverse ridges).
- [ ] Vermis clearly demarcated from lateral hemispheres.
- [ ] Superior, middle, and inferior cerebellar peduncles connecting precisely to midbrain, pons, and medulla.
- [ ] Deep cerebellar nuclei (Dentate, Emboliform, Globose, Fastigial) embedded correctly within cerebellar white matter (arbor vitae).

### G. White Matter Pathways
- [ ] Internal capsule with distinct anterior limb (separating caudate and lentiform), genu, and posterior limb (separating thalamus and lentiform).
- [ ] Corpus callosum displaying authentic sagittal curvature: rostrum, genu, body, and splenium.
- [ ] Major association bundles (Arcuate, SLF, ILF, Uncinate, Cingulum) demonstrating anatomically correct origins and terminations.

### H. Vasculature (Circle of Willis & Major Vessels)
- [ ] Anterior communicating artery joining bilateral A1 segments of Anterior Cerebral Arteries.
- [ ] Internal carotid artery bifurcating into ACA and MCA.
- [ ] Posterior communicating arteries connecting ICAs to Posterior Cerebral Arteries (P1/P2).
- [ ] Vertebral arteries uniting at pontomedullary junction to form the Basilar Artery.
- [ ] Major cerebellar branches: PICA, AICA, SCA arising at authentic levels.

---

## 6. Citation & Reference Requirements

* Every anatomical structure record in the database must include at least **two primary peer-reviewed or textbook references** (with PubMed PMID, DOI, or ISBN).
* Any functional or psychiatric claim must specify:
  1. The exact diagnostic or functional context (e.g., "Major Depressive Episode with melancholic features").
  2. The imaging modality or empirical methodology supporting the claim (e.g., "FDG-PET hypermetabolism", "Task-based fMRI hypoactivation", "Post-mortem stereological cell counting").
  3. Author and publication year (e.g., "Mayberg et al., 1999; Drevets et al., 2008").
