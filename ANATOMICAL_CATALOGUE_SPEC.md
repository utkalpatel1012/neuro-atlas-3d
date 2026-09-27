# Machine-Readable Anatomical Catalogue Specification

**Document Version**: 1.1.0 (Phase 0.1.1 Remediation Pass)  
**Authority**: Senior Digital Neuroanatomy Specialist & Lead Technical Architect  
**Standard**: AAS-2026-NEURO-V1  
**Target Registry**: `data/catalogue/anatomy.catalogue.json`  

---

## 1. Purpose & Core Mandate

> **The anatomical master catalogue is a machine-readable, version-controlled registry that tracks every anatomical structure from initial academic planning to production certification.**  
> Maintaining structure lists only in Markdown documentation risks inconsistencies between the UI, the 3D scene graph, and the metadata database. The master catalogue enforces strict state-machine transitions, preventing unverified or placeholder geometry from leaking into production.

---

## 2. Validation State Machine

Every structure in the catalogue progresses through a strict 7-stage lifecycle:

```
[PLANNED] 
    │  TA2 / TNA ID verified & canonical name established
    ▼
[RESEARCHED] 
    │  Ontology mappings, boundaries, and evidence claims documented
    ▼
[SOURCE_IDENTIFIED] 
    │  Candidate open-access 3D mesh located in verified repository
    ▼
[MESH_AVAILABLE] 
    │  Mesh repaired, pivot centered, weighted normals applied in Blender
    ▼
[METADATA_VALIDATED] 
    │  Automated TypeScript/Zod schema validation passes with 0 errors
    ▼
[ANATOMY_VALIDATED] 
    │  Academic audit and clinical sign-off by neuroanatomy specialist
    ▼
 [PRODUCTION_READY] 
     │  Meshopt compressed, BVH tested, listed in assets.manifest.json
    ▼
 (Compiled into Public Production Web Release)
```

### Stage Definitions & Promotion Criteria

| Lifecycle State | Promotion Criteria & Mandatory Artifacts | Verification Method |
| :--- | :--- | :--- |
| **`PLANNED`** | Structure indexed with official Latin and English names from Terminologia Anatomica 2 (TA2/TNA). | Cross-check against FIPAT TA2 database. |
| **`RESEARCHED`** | FMA ID, UBERON ID, anatomical boundaries, vascular supply, and at least two peer-reviewed citations documented. | Automated schema validator (`npm test`). |
| **`SOURCE_IDENTIFIED`** | Source asset repository URL, upstream node ID, and applicable open license verified. | Provenance record audit in `assets.manifest.json`. |
| **`MESH_AVAILABLE`** | Geometry extracted into Blender 4.x; manifold topology repaired (0 non-manifold edges); pivot placed at center-of-mass. | Python CLI mesh audit script (`scripts/audit_mesh.py`). |
| **`METADATA_VALIDATED`** | Complete JSON file created in `data/structures/`; passes strict TypeScript type assertions and schema tests. | Build-time schema compiler test (`npm test`). |
| **`ANATOMY_VALIDATED`** | Visual and morphological inspection against anatomical benchmarks (*Snell*, *Duvernoy*, *Schmahmann*); boundary sign-off. | Specialist review documented in validation transition log. |
| **`PRODUCTION_READY`** | Geometry compressed with `gltfpack -cc -kn -tc`; BVH acceleration tree generated; total memory verified within budget. | `gltf-validator` pass + memory profiling. |

---

## 3. Catalogue JSON Structure (`data/catalogue/anatomy.catalogue.json`)

The catalogue is typed according to [`src/types/catalogue.ts`](./src/types/catalogue.ts).

### Exemplar Structure Entry
```json
{
  "id": "brain.telencephalon.left.limbic.hippocampus",
  "canonical_name": "Hippocampus (Left)",
  "official_latin": "Hippocampus",
  "synonyms": ["Cornu Ammonis", "Ammon's Horn", "Hippocampus Proper"],
  "structure_subtype": "subcortical_nucleus",
  "laterality": "left",
  "representation_scope": "paired_separate",
  "parent_id": "brain.telencephalon.left.limbic.hippocampal_formation",
  "ta2_id": "TA2:5488",
  "fma_id": "FMA:275020",
  "uberon_id": "UBERON:0001954",
  "visibility_groups": ["limbic_circuitry", "cortex_allocortex"],
  "source_asset_id": "mesh.hippocampus.left.v1",
  "validation_state": "ANATOMY_VALIDATED",
  "validation_history": [
    {
      "previous_state": "PLANNED",
      "new_state": "RESEARCHED",
      "timestamp": "2026-09-26T12:00:00Z",
      "reviewer_name_or_agent": "Lead_Architect",
      "audit_notes": "TA2:5488, FMA:275020, boundaries and citations documented."
    },
    {
      "previous_state": "RESEARCHED",
      "new_state": "SOURCE_IDENTIFIED",
      "timestamp": "2026-09-26T12:30:00Z",
      "reviewer_name_or_agent": "Lead_Architect",
      "audit_notes": "Z-Anatomy CC-BY-SA 4.0 upstream mesh candidate identified."
    },
    {
      "previous_state": "SOURCE_IDENTIFIED",
      "new_state": "METADATA_VALIDATED",
      "timestamp": "2026-09-26T14:00:00Z",
      "reviewer_name_or_agent": "TypeScript_Validator",
      "audit_notes": "TypeScript schema compilation passed with 0 errors."
    },
    {
      "previous_state": "METADATA_VALIDATED",
      "new_state": "ANATOMY_VALIDATED",
      "timestamp": "2026-09-26T15:30:00Z",
      "reviewer_name_or_agent": "Senior_Neuroanatomy_Specialist",
      "audit_notes": "Verified separation of Cornu Ammonis from Dentate Gyrus and Subiculum; decoupled from BA28."
    }
  ]
}
```
