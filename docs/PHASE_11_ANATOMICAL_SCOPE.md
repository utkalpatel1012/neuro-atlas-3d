# Phase 11 Scope (grounded AI tutor)

## Objective (registry)

Retrieval + source-grounded responses + 3D entity refs/selection/highlight +
teaching/quiz. Tutor asserts ONLY verified-layer claims; UNKNOWN/NOT REPRESENTED/
INSUFFICIENT EVIDENCE otherwise. Never invents anatomy/citations/mechanisms/
criteria/evidence.

## Architecture honesty

There is no LLM backend in this repo and none is added. The tutor is a LOCAL
retrieval + templated grounded responder over the verified layers (Phase 6 anatomy
knowledge, Phase 8 relationships with their evidence grades, Phase 7 deferral
states). It:

- Parses a question for structure/system/parcel/psychiatry intent using the Phase 6
  search index + Phase 8 clinical-intent patterns (existing code, no new NLP claims).
- Retrieves ONLY recorded claims, refusals, and gaps.
- Responds in fixed templates: direct answer with citations (when the layer
  supports it), or explicit UNKNOWN / NOT REPRESENTED / INSUFFICIENT EVIDENCE with
  the reason and the educational guard.
- Emits 3D actions (entity ids to select/highlight/focus) ONLY for AVAILABLE
  structures with geometry; DOCUMENTED/unmapped targets produce no camera action.
- Routes every clinical-intent question through the Phase 8 guard (refusal, never
  a relationship).

It does not generate prose, does not paraphrase beyond templates, does not call any
external model, and contains no model weights/keys/endpoints. Calling it "AI" refers
to the retrieval-grounded Q&A role, stated plainly in the UI.

## Hard stops (registry)

Ungrounded assertion, invented citation, diagnostic output. Any question the layer
cannot support returns a refusal template — the suite asserts refusal rates on
adversarial batteries (receptors, mechanisms, DSM, diagnosis, treatment, parcels,
unrepresented structures).
