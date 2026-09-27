# Autonomous Development Roadmap (authoritative, forward-looking)

Supersedes the historical `DEVELOPMENT_ROADMAP.md` numbering for execution
(that file is preserved untouched as history). Machine authority:
`.opencode/workflow/PHASE_REGISTRY.json`. Completed: 3.x, 4.x, 5.0, 5.0.1,
5.0.2, 5.1 (31 production assets). Current: **5.2**.

## Remaining program

- **5.2 — Brainstem + cerebellum + ventricular system.** Gross midbrain/pons/
  medulla (continuous, no arbitrary splits), cerebellar hemispheres/vermis/
  gross lobules (no fabricated lobules/nuclei), ventricles as cavities with
  honest representation (no tissue rendering of spaces), foramina only where
  authoritative.
- **5.3 — White matter + major pathways.** Corpus callosum, internal capsule,
  corona radiata, then source-supported SLF/arcuate, uncinate, ILF, cingulum,
  commissures. WHITE_MATTER_STRUCTURE ≠ FUNCTIONAL_NETWORK ≠
  PSYCHIATRIC_CIRCUIT.
- **5.4 — Cranial nerves + vasculature.** Gross CN I–XII, Circle of Willis,
  ACA/MCA/PCA, vertebrobasilar + reliable branches. Own categories; no tiny
  branches; no cortical-mesh validation assumptions forced.
- **5.5 — Cortical completion.** Missing gyri/sulci/fissures; decide true
  continuous-representation need; never present pieces as continuous pia.
- **6 — Anatomical knowledge + search.** Typed, cited info layer +
  QUERY→STRUCTURE→SELECTION→DETAIL. No unauthorized psychiatric claims.
- **7 — Cortical parcellation.** Physical cortex separated from parcellation;
  source/version/license verified; HCP gate in force; no unregistered mapping.
- **8 — Psychiatry + neurobiology.** Evidenced layers only
  (STRUCTURE+FUNCTION/NETWORK+EVIDENCE+SOURCE+CERTAINTY); education only,
  never diagnosis automation.
- **9 — Clinical/study UI.** Annotations, occlusion, responsive + iPad touch,
  bookmarks, notes, flashcards, views, quizzes. No duplicated state.
- **10 — Offline PWA.** Budgeted service-worker/IndexedDB caching only.
- **11 — Grounded AI tutor.** Retrieval-grounded; refusals (UNKNOWN/NOT
  REPRESENTED/INSUFFICIENT EVIDENCE); never invents anatomy/citations.
- **12 — Final validation.** Full sweep; only this phase may declare
  FINAL_PROJECT_CERTIFIED.

## Standing constraints (all phases)

Source-authoritative identity; per-asset licenses with uncertainty explicit;
canonical space immutable; lazy loading + LOD + bounded memory (110 MB iPad
discipline); blur-fix preserved (buffer==CSS×DPR gate); MRI overlay stays
gated (REGISTRATION_PENDING); HCP gate; Julich/BigBrain quarantine; expert
review never impersonated; device claims need device evidence.
