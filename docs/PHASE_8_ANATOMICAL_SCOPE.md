# Phase 8 Scope (psychiatry + neurobiology knowledge layer)

## Objective (registry)

RDoC/networks/pathways/circuits/receptors/pharmacology/neuromodulation as
STRUCTURE+FUNCTION/NETWORK+EVIDENCE+SOURCE+CERTAINTY. Academic education only;
never diagnosis/treatment automation from anatomy.

## The defining constraint

This project has no clinical corpus, no receptor-mapping dataset, no trial data, and
no expert review. Nearly every psychiatric/neurobiological claim a resident would
want (receptor localization, drug mechanisms, circuit→disorder causation) is
therefore **unsupportable here**. Phase 8 does NOT fill that gap with general
knowledge. It builds:

1. A **relationship schema** (STRUCTURE + FUNCTION/NETWORK + CLAIM + SOURCE +
   EVIDENCE LEVEL + CERTAINTY) with evidence levels that include
   INSUFFICIENT_EVIDENCE and NOT_REPRESENTED as first-class outcomes.
2. A ** systems registry** (CSTC, Papez, salience, default mode, central executive,
   reward, fear/threat) recorded as *named systems under study*, with membership
   listed ONLY where our own records support it — otherwise explicitly gapped.
3. **Educational-use-only guards**: every surface carrying Phase 8 content states
   academic-teaching-only, not diagnostic, not treatment-guiding.
4. **Refusal architecture**: queries about drug mechanisms, receptor localization,
   DSM criteria, or disorder causation return INSUFFICIENT_EVIDENCE / NOT
   REPRESENTED — never a synthesized answer.

## Hard prohibitions (registry hard stops are blockers, not aspirations)

- No causation leap (correlation ≠ causation, stated per relationship).
- No diagnostic automation or treatment recommendation output, ever.
- No uncited psychiatric claim; no invented citation.
- No receptor localization invented; no drug mechanism invented.
- No RDoC claim beyond naming the framework domains as study topics with sources.

## What success looks like

A resident can browse which systems implicate which atlas structures *at the level
our evidence supports* (mostly: named-system membership with low certainty and
explicit gaps), and the layer visibly refuses everything beyond that. The phase is
complete when the schema, the registry, the guards, the refusals, and the tests
exist — not when the atlas appears to explain psychiatry.
