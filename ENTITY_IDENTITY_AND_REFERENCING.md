# Entity Identity & Referencing Specification

**Document Standard**: AAS-2026-NEURO-V1  
**Phase**: 0.1.1 Architectural Remediation  
**Status**: APPROVED & LOCKED  

---

## 1. Executive Summary & Core Mandate

In early medical 3D projects, entity identifiers are frequently conflated: a 3D mesh node name (`Hippocampus_L`), an atlas parcel label (`HCP_MMP1_Area46`), a clinical stimulation site (`Left DLPFC`), and a physical anatomical organ (`Hippocampus`) are casually treated as synonyms.

This produces catastrophic epistemic drift, false stereotaxic registrations, and unresolvable graph cycles.

In the **3D Neuroanatomy Atlas (AAS-2026-NEURO-V1)**, identity is partitioned into eight strictly distinguished URI namespaces. These IDs are **NEVER INTERCHANGEABLE**.

```
                           NEURO-KNOWLEDGE GRAPH IDENTIFIER TAXONOMY
                                               │
       ┌────────────────────────┬──────────────┴───────────────┬────────────────────────┐
       │                        │                              │                        │
       ▼                        ▼                              ▼                        ▼
Canonical Anatomy         Atlas Parcels               Physical Assets           Epistemic Claims
 `brain.*`                `parcel.*`                    `mesh.*` / `texture.*`   `claim.*`
 (Physical organ/nucleus)  (Cyto/functional boundary)    (3D geometry/texture)    (Scientific evidence)
       │                        │                              │                        │
       ▼                        ▼                              ▼                        ▼
Functional Networks       Neural Pathways             Clinical Targets          Lesion Models
 `network.*`              `pathway.*`                   `target.*`               `lesion.*`
 (Distributed sync)       (Synaptic loop)               (rTMS/DBS application)   (Vascular/tissue stroke)
```

---

## 2. Namespace Schemes & URI Syntax

Every entity in the atlas is assigned a deterministic, lowercase, dot-delimited canonical URI matching its specific domain.

### 2.1. Canonical Anatomical Structure (`brain.*`)
* **Scope**: Physical macroscopic and microscopic neural organs, gyri, sulci, subcortical nuclei, ventricles, cranial nerves, arteries, and veins.
* **Syntax**: `brain.<division>.<laterality>.<subsystem>.<structure_name>`
* **Examples**:
  * `brain.telencephalon.left.limbic.hippocampus`
  * `brain.telencephalon.right.frontal_lobe.precentral_gyrus`
  * `brain.diencephalon.bilateral.epithalamus.habenula`
  * `brain.mesencephalon.midline.tegmentum.substantia_nigra`
  * `brain.vascular.arterial.anterior_cerebral.a2_segment`
* **Ontological Anchors**: Must map to Terminologia Anatomica 2 (`TA2`), Foundational Model of Anatomy (`FMA`), or Uberon (`UBERON`).

### 2.2. Atlas Cortical Parcel (`parcel.*`)
* **Scope**: Geometric, cytoarchitectonic, or resting-state boundaries defined by specific standardized brain atlases. A parcel is an operational coordinate boundary, **not** an anatomical organ.
* **Syntax**: `parcel.<atlas_code>.<parcel_identifier>.<laterality>`
* **Examples**:
  * `parcel.hcp_mmp1.46_l` (Glasser et al. 2016 Nature Area 46, Left)
  * `parcel.brodmann.area_25.bilateral` (Classical cytoarchitectonic Brodmann Area 25)
  * `parcel.schaefer_2018.100parcels_17networks.Default_A_1.left`
  * `parcel.julich_brain.v3_0.area_ca1.left`
* **Surface Anchor**: Anchored to surface coordinate spaces (`hcp_fslr_32k`, `freesurfer_fsaverage`).

### 2.3. Physical 3D Asset (`mesh.*`, `texture.*`, `field.*`)
* **Scope**: Concrete binary files (`.glb`, `.ktx2`, `.nii.gz` displacement warps) managed in the asset pipeline and indexed in `assets/assets.manifest.json`.
* **Syntax**: `<asset_type>.<structure_or_label>.<laterality>.<version>`
* **Examples**:
  * `mesh.hippocampus.left.v1`
  * `mesh.caudate_nucleus.right.v1`
  * `texture.cortex_pbr.subsurface.v1`
  * `field.warp.native_to_mni152.asym2009c.v1`
* **Governance**: Must have full `AssetProvenance` including cryptographic SHA-256 hash (or `NOT_YET_GENERATED` for planned assets) and `validation_status`.

### 2.4. Scientific Evidence Claim (`claim.*`)
* **Scope**: Verifiable empirical statements grounding anatomical, functional, psychiatric, or neuromodulatory correlations.
* **Syntax**: `claim.<domain>.<target_concept>.<finding_slug>.<citation_key>`
* **Examples**:
  * `claim.clinical.hpc.volume_reduction.mdd.enigma2016`
  * `claim.mechanistic.hpc.neurogenesis_hypothesis.mdd`
  * `claim.anatomy.hpc.dg_tri_synaptic.snell2018`
  * `claim.neuromodulation.dlpfc.10hz_efficacy.george1995`
* **Epistemic Standards**: Requires `evidence_domain`, explicit `evidence_assessment_framework`, and verified peer-reviewed primary citation.

### 2.5. Functional Network (`network.*`)
* **Scope**: Distributed resting-state co-activation networks or task-based synchronization patterns.
* **Syntax**: `network.<network_name>`
* **Examples**:
  * `network.default_mode`
  * `network.salience`
  * `network.central_executive`
  * `network.dorsal_attention`
* **Representation**: Multi-focal, non-contiguous spatial hub collections; never a single contiguous organ mesh.

### 2.6. Neural Pathway / Circuit (`pathway.*`)
* **Scope**: Sequential chains of synaptic transmission with specified neurotransmitters and actions.
* **Syntax**: `pathway.<subsystem>.<pathway_name>`
* **Examples**:
  * `pathway.limbic.papez_circuit`
  * `pathway.cstc.affective`
  * `pathway.cstc.cognitive`
  * `pathway.mesolimbic.reward`
* **Structure**: Ordered sequence of synaptic nodes connecting canonical structures.

### 2.7. Neuromodulation Target (`target.*`)
* **Scope**: Physical stimulation targets for clinical interventional psychiatric procedures.
* **Syntax**: `target.<modality>.<anatomical_site>.<technique_variant>`
* **Examples**:
  * `target.rtms.left_dlpfc.f3` (rTMS targeting via Beam F3 method)
  * `target.dbs.subcallosal_cingulate.area25` (DBS targeting bilateral subgenual cingulate Area 25)
  * `target.ect.bitemporal.standard` (Bitemporal bifrontotemporal electrode application)
* **Relations**: References structures via `target_structure_ids` and parcels via `target_parcel_ids`; never substitutes for the underlying organ.

### 2.8. Lesion Model (`lesion.*`)
* **Scope**: Vascular stroke distributions, traumatic contusions, or surgical resections.
* **Syntax**: `lesion.<etiology>.<vessel_territory_or_syndrome>`
* **Examples**:
  * `lesion.ischemic.left_mca_inferior_division`
  * `lesion.ischemic.anterior_choroidal_infarct`
  * `lesion.surgical.bilateral_mesial_temporal_resection`

---

## 3. Separation of Concerns & Non-Interchangeability

| Scenario | INCORRECT Pattern (Anti-Pattern) | CORRECT Pattern (AAS-2026-NEURO-V1) | Rationale |
| :--- | :--- | :--- | :--- |
| **Referencing 3D Mesh** | `AnatomicalStructure.id = "mesh.hippocampus.left.glb"` | `AnatomicalStructure.id = "brain.telencephalon.left.limbic.hippocampus"`<br>`AnatomicalStructure.asset_id = "mesh.hippocampus.left.v1"` | The biological organ exists independent of whether a 3D geometry file has been rendered or replaced by a higher-resolution version. |
| **Referencing Parcellation** | Labeling Area 46 as an anatomical gyrus. | `parcel.hcp_mmp1.46_l` associated with `brain.telencephalon.left.frontal_lobe.middle_frontal_gyrus`. | Cytoarchitectonic and multimodal parcels overlap multiple gyri/sulci; they are operational coordinate partitions, not discrete organs. |
| **Referencing Treatment Target** | Treating Left DLPFC rTMS target as the Middle Frontal Gyrus. | `target.rtms.left_dlpfc.f3` has `target_structure_ids: ["brain.telencephalon.left.frontal_lobe.middle_frontal_gyrus"]`. | A clinical targeting protocol includes scalp montages, E-field profiles, and coil orientations distinct from the underlying brain tissue. |
| **Linking Scientific Claim** | Storing medical claim strings directly as structure properties without IDs. | `claim.clinical.hpc.volume_reduction.mdd.enigma2016` linked via `evidence_claim_ids`. | Claims must be reusable graph nodes with citations, GRADE evaluations, and contradictory evidence links. |

---

## 4. Graph Referencing Rules

1. **Foreign Key Integrity**: Every foreign key in an array (e.g., `target_structure_ids`, `associated_anatomical_structure_ids`, `evidence_claim_ids`) must strictly reference a valid ID matching the expected namespace.
2. **Bidirectional Referencing**: Relational links between entities must use `EntityRelationship` records containing `source_entity_id`, `relationship_type`, `target_entity_id`, and grounding `evidence_claim_ids`.
3. **No Dangling Pointers**: If an entity is deleted or renamed, all referencing entities must be synchronously updated via automated schema migration scripts.
