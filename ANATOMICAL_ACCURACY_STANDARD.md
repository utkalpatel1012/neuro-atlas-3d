# Anatomical Accuracy Standard & Scientific Policy

**Standard ID**: AAS-2026-NEURO-V2 (Remediated in Phase 0.1 & Phase 0.1.1)  
**Authority**: Senior Digital Neuroanatomy Specialist & Lead Clinical Architect  
**Scope**: All 3D meshes, coordinate spaces, parcellation mappings, metadata fields, circuit diagrams, and clinical correlations in the 3D Neuroanatomy Atlas.  

---

## 1. Core Scientific Principle

> **We are not building a visually artistic approximation of the brain. We are building a scientifically credible, rigorously sourced digital neuroanatomy atlas for clinical and academic use.**  
> Visual aesthetics must never take precedence over anatomical veracity. In every conflict between visual flair and scientific correctness, scientific correctness is the non-negotiable priority.

---

## 2. Explicit Scientific Prohibitions

1. **PROHIBITION: Zero Generative or Fabricated Geometry**:
   * No 3D meshes representing human neuroanatomy may be generated using ungrounded generative AI mesh tools, text-to-3D pipelines, or procedural noise algorithms that do not originate from an empirically acquired anatomical or neuroimaging source.
   * Every vertex, face, and boundary must trace its provenance to validated MRI/CT datasets, histological reconstructions, or expert anatomical dissections (e.g., Z-Anatomy / BodyParts3D, Human Connectome Project, FreeSurfer fsaverage).

2. **PROHIBITION: No Invented Gyri, Sulci, Fissures, or Nuclei**:
   * Cortical folding patterns must adhere strictly to human anatomical reality. Gyri and sulci must reflect authentic human morphology, including standard primary and secondary sulci.
   * No structure may be added to the scene graph or metadata database unless it is formally indexed in **Terminologia Anatomica 2 (TA2)**, **Terminologia Neuroanatomica (TNA)**, or the **Foundational Model of Anatomy (FMA)**.

3. **PROHIBITION: No Conflation of Physical Anatomy with Atlas Parcellations**:
   * Physical anatomical structures (e.g., precentral gyrus, hippocampus proper) must never be conflated with atlas-defined partitions (e.g., Brodmann Areas 4, 28, or HCP Area 46).
   * Allocortical/archicortical structures (such as Ammon's horn) must not be assigned neocortical Brodmann numbers directly. Relationships to parcels must be documented explicitly as topological associations (`associated_with_parcel`) or spatial adjacencies (`adjacent_to`).

4. **PROHIBITION: No Invented White-Matter Pathways or Connections**:
   * Fiber pathways (projection, association, commissural) must represent empirically validated human white-matter pathways documented by diffusion spectrum imaging (DSI), high-angular resolution diffusion imaging (HARDI), or post-mortem Klingler fiber dissection.
   * Artificial or geometrically pleasing "streamlines" that do not correspond to authentic anatomical tracts are strictly prohibited.

5. **PROHIBITION: No Unsupported Receptor Localization**:
   * Neurotransmitter receptor distributions (e.g., 5-HT1A, 5-HT2A, D1, D2, NMDA, GABA-A) must not be assigned to anatomical structures based on generic assumptions.
   * Every molecular mapping must cite autoradiographic, PET radiotracer, or transcriptomic (e.g., Allen Human Brain Atlas) documentation specifying lamina distribution and cell-type expression.

6. **PROHIBITION: Conflation of Association with Causation**:
   * Observational correlations (e.g., reduced hippocampal volume in MDD, altered resting-state functional connectivity) must **never** be described as direct causal mechanisms unless demonstrated by rigorous interventional or lesion-deficit evidence.

7. **PROHIBITION: Conflation of Mechanistic Hypotheses with Clinical Consensus**:
   * Theoretical translational models (e.g., adult hippocampal neurogenesis in depression, ketamine lateral habenula bursting models, Grace dopamine hyperactivity model in schizophrenia) must be explicitly classified as `theoretical_mechanistic_hypothesis` and domain-appropriate frameworks, never as established clinical facts.

8. **PROHIBITION: Treating Coordinate Systems as Interchangeable**:
   * Raw mesh coordinates (`native_mesh` / `blender_world`) must never be assumed to be in MNI152 or Talairach space.
   * Every spatial coordinate must declare its coordinate frame, registration method, and uncertainty bounds. Decoupling registered coordinates from target frames and registration metadata is impossible under the type schema.

9. **PROHIBITION: No Fake or Simulated Provenance Hashes**:
   * Pre-pipeline assets must declare `resulting_sha256_hash: "NOT_YET_GENERATED"`. Generating placeholder SHA-256 strings or dummy commit IDs in production metadata is strictly prohibited.

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

### Tier 3: Benchmark Academic Psychiatry & Neuropsychiatry References
1. **DSM-5-TR**: *Diagnostic and Statistical Manual of Mental Disorders*, Fifth Edition, Text Revision (American Psychiatric Association, 2022).
2. **Stahl's Essential Psychopharmacology**: Neuroscientific Basis and Practical Applications (5th Edition, Stephen M. Stahl, Cambridge University Press).
3. **NIMH Research Domain Criteria (RDoC)**: Matrix of functional constructs, units of analysis, and neural circuits (including 2019 Sensorimotor domain).
4. **The American Psychiatric Association Publishing Textbook of Neuropsychiatry and Clinical Neurosciences** (6th Edition, David B. Arciniegas et al.).

---

## 4. Evidence Certainty & Epistemic Labeling

Every scientific claim in the metadata must be classified according to its specific `evidence_domain` and corresponding assessment framework (`src/types/evidence.ts`):
* **`GRADE` (Clinical Domain)**:
  * `GRADE_HIGH`: Replicated across multiple large-scale meta-analyses (e.g., ENIGMA MDD consortium) or proven by focal human neurological lesions.
  * `GRADE_MODERATE`: High-quality observational neuroimaging or controlled clinical trials.
  * `GRADE_LOW`: Small-cohort exploratory studies or indirect findings.
  * `GRADE_VERY_LOW`: Uncontrolled case series or animal models with uncertain human translation.
* **`QUALITATIVE_ANATOMICAL_CONSENSUS` (Anatomical Domain)**:
  * Established macroscopic and microscopic structural morphology documented by consensus textbooks (Snell, Netter) and international nomenclature (FIPAT TA2).
* **`COMPUTATIONAL_THEORETICAL` / `PRECLINICAL` (Mechanistic Domain)**:
  * Translational hypotheses (e.g., neurogenesis model) labeled `NOT_APPLICABLE_NON_CLINICAL` under GRADE and evaluated with narrative certainty summaries.

Claims lacking verified primary literature backing must be flagged with `verification_status: "NEEDS_SOURCE_VERIFICATION"`.

---

## 5. 3D Anatomical Geometry & Mesh Quality Assurance Standard

All 3D anatomical meshes ingested and processed through the asset pipeline (`Phase 1.0+`) must satisfy rigorous mathematical and topological standards defined in [`docs/MESH_VALIDATION_STANDARD.md`](./docs/MESH_VALIDATION_STANDARD.md) and [`docs/ANATOMICAL_ASSET_QA.md`](./docs/ANATOMICAL_ASSET_QA.md):

1. **Topological Manifold Integrity**:
   * Exactly 0 non-manifold edges (no edge shared by $> 2$ polygons).
   * Exactly 0 duplicate or coincident faces.
   * Exactly 0 zero-area or degenerate triangles.
   * Watertight 2-manifold surface with 0 boundary edges.
2. **Coordinate Space Canonicalization**:
   * All meshes must be canonicalized into the internal canonical space ($+X$ Right, $+Y$ Superior, $+Z$ POSTERIOR — Phase 3.1 measured; NOT RAS-ordered, NOT MNI; the `canonical_atlas_ras` identifier is retained for stability) in millimeter units ($1.0 = 1.0\text{ mm}$).
   * In canonical coordinates, left-hemisphere structures must have negative $X$ centroids ($\text{Centroid}_X < 0$), and right-hemisphere structures must have positive $X$ centroids ($\text{Centroid}_X > 0$). Centroid sign is a NECESSARY but NOT SUFFICIENT laterality check — the full source→transform→canonical chain must be verified (Phase 3.1 D5).
   * Edge-based watertight accounting is per-shell: report measured `connectedShellCount` and never classify a multi-shell composite as `CLOSED_SURFACE` (Phase 3.1 D1/D7).
3. **Decoupled Identity & Epistemic Traceability**:
   * Physical asset IDs (`mesh.<structure>.<laterality>.<version>`) and semantic entity IDs (`brain.<division>.<laterality>.<subdivision>.<structure>`) must remain decoupled.
   * Every physical asset must record genuine cryptographic SHA-256 digests and upstream provenance in `assets/manifests/assets.manifest.json`.
4. **Automated Audit Enforcement**:
   * Every asset must pass automated CI verification (`npm run asset:validate -- <asset_id>`) and the 10-invariant pipeline regression test suite (`src/pipeline_regression.test.ts`) before being cleared for production bundling.
