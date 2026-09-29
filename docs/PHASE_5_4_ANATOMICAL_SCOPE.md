# Phase 5.4 Anatomical Scope (cranial nerves + vasculature)

**Method:** same-source addition from the BodyParts3D distribution via the established
mirror. No new dataset. Availability checked against `parts_list_e.txt` and the served
STL index.

## Source reality (the defining fact of this phase)

The distribution contains **no cerebral vasculature**: no anterior/middle/posterior
cerebral arteries, no basilar artery, no vertebral cerebral segment, no anterior/
posterior communicating arteries, no Circle of Willis, no cerebellar arteries. It
contains **no cranial nerves** except the optic pathway (nerve segments, chiasm,
tracts — the tracts shipped in 5.3). BodyParts3D segments gross organs, not vessels
or nerves; fabricating either would violate the project's core prohibition.

## Planned batch (3 assets)

| Structure | Source FMA | Laterality |
|---|---|---|
| Optic nerve, right | FMA50875 (single) | right |
| Optic nerve, left | FMA50878 (single) | left |
| Optic chiasm | FMA62045 (single) | midline |

The whole optic nerve (FMA50863) is listed but has no mirror STL; only the paired
segments are servable.

## DOCUMENTED, not imported

- **All cerebral vasculature** (Circle of Willis, ACA, MCA, PCA, vertebrobasilar,
  all branches): absent from the distribution. DOCUMENTED with the reason.
- **CN I, III–XII** (olfactory, oculomotor, trochlear, trigeminal, abducens, facial,
  vestibulocochlear, glossopharyngeal, vagus, accessory, hypoglossal): absent.
  DOCUMENTED. CN II ships here as the optic nerve/chiasm; the optic tract shipped
  in 5.3.
- No tiny vessels or nerve branches are fabricated. Category-appropriate QA applies
  (solid cord-like structures; the M2 category path governs profile names).

This is deliberately a small phase. A small honest phase is preferable to an
invented vasculature.
