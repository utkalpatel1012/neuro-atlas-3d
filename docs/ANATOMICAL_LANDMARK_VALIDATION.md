# Anatomical Landmark Validation Policy (Phase 3.2, Gate 1)

**Status:** policy ACTIVE; all 24 current anchors: SCHEMATIC (none verified).
**Rule (§3): a label in JSON is NOT evidence of correct representation. A coordinate
is NOT automatically a validated centroid. A mesh intersection is NOT automatically
an anatomical boundary.** Label guides may orient the viewer; they must never back
anatomical, clinical, or measurement claims.

## Validation levels (use exactly these; no competing system)

| Level | Meaning | Required evidence |
|---|---|---|
| UNVERIFIED | Default for hand-authored entries | None yet |
| SCHEMATIC | Hand-placed label guide, explicitly not a measurement | Author + date recorded; `validationState: 'SCHEMATIC_UNVALIDATED'` |
| SOURCE-VERIFIED | Identity confirmed against the anatomical source's own authority | Source name-list/ontology lookup with edition + access date |
| GEOMETRICALLY-LOCATED | Anchor projected onto / measured from the actual mesh surface | Recorded projection method + distance-to-surface + mesh asset hash |
| ANATOMY-VERIFIED | Position confirmed against an independent anatomical reference | Reference citation + overlay/method record |
| EXPERT-REVIEWED | Named neuroanatomist review with date + scope | Review record (reviewer, date, scope, verdict) |
| FUTURE | Concept reserved, no anchor authored | — |

Promotion rule: levels are earned in order (no skipping to EXPERT-REVIEWED without
the measurement trail). `validationState: 'EXPERT_VERIFIED'` in code requires a
review record; the phase31 TEST 10 gate fails otherwise.

## Current registry classification (all anchors, `src/types/semantic.ts`)

Canonical space reminder: +X Right, +Y Superior, +Z POSTERIOR. Left mesh bounds:
X[-65.10, 0.10], Y[-39.36, 71.38], Z[-104.58, 65.65]. No anchor is an independent
mesh; none is separately selectable (labels only, via LabelManager).

| # | Landmark ID | Category / Lat | Anchor (mm) | Class | Note |
|---|---|---|---|---|---|
| 1 | fissure.interhemispheric | FISSURE / mid | [0.65, 30.0, -15.0] | SCHEMATIC | X≈midline plausible; "fissure" is inter-piece gap, not validated biology |
| 2 | sulcus.central.left | SULCAL / L | [-38.0, 42.0, -12.0] | SCHEMATIC | Inside bounds; position unmeasured |
| 3 | fissure.sylvian.left | FISSURE / L | [-48.0, 10.0, -5.0] | SCHEMATIC | Lateral/inferior, plausible; unmeasured |
| 4 | sulcus.precentral.left | SULCAL / L | [-36.0, 40.0, 5.0] | SCHEMATIC | Relative order vs #5 INVERTED under measured axes (postcentral anchor sits anterior to precentral) — convention error, not moved per no-fabrication rule |
| 5 | sulcus.postcentral.left | SULCAL / L | [-40.0, 38.0, -32.0] | SCHEMATIC | See #4 |
| 6 | sulcus.parieto_occipital.left | SULCAL / L | [-10.0, 24.0, -70.0] | SCHEMATIC | MISPLACED: posterior structure anchored at anterior Z (wrong mesh end) |
| 7 | sulcus.calcarine.left | SULCAL / L | [-8.0, -10.0, -75.0] | SCHEMATIC | MISPLACED: sits near parahippocampal chunk, not occipital |
| 8–13 | right mirrors of #2–7 | (mirror) / R | mirrored | SCHEMATIC | Same defects mirrored |
| 14 | pole.frontal.left | POLE / L | [-18.0, 5.0, 62.0] | SCHEMATIC | SWAPPED: sits at mesh occipital end |
| 15 | pole.frontal.right | POLE / R | [19.0, 5.0, 62.0] | SCHEMATIC | SWAPPED |
| 16 | pole.occipital.left | POLE / L | [-14.0, -6.0, -102.0] | SCHEMATIC | SWAPPED: sits at mesh frontal end |
| 17 | pole.occipital.right | POLE / R | [15.0, -6.0, -102.0] | SCHEMATIC | SWAPPED |
| 18 | pole.temporal.left | POLE / L | [-36.0, -22.0, 18.0] | SCHEMATIC | Inferior position plausible (Y=-22); AP unvalidated |
| 19 | pole.temporal.right | POLE / R | [37.0, -22.0, 18.0] | SCHEMATIC | Same |
| 20 | gyrus.precentral.left | GYRAL / L | [-37.0, 48.0, -5.0] | SCHEMATIC | Superior mid-AP; unmeasured; pre/post pair order inverted (see #4) |
| 21 | gyrus.postcentral.left | GYRAL / L | [-41.0, 46.0, -22.0] | SCHEMATIC | See #20 |
| 22 | gyrus.superior_temporal.left | GYRAL / L | [-54.0, 4.0, -12.0] | SCHEMATIC | Refers to anatomy NOT in mesh (true STG absent; mesh holds middle/inferior temporal + fusiform) |
| 23 | gyrus.cuneus.left | GYRAL / L | [-10.0, 8.0, -78.0] | SCHEMATIC | Refers to anatomy NOT in mesh (FMA72702 = accessory short gyrus) + misplaced Z |
| 24 | gyrus.lingual.left | GYRAL / L | [-12.0, -24.0, -72.0] | SCHEMATIC | Refers to anatomy NOT in mesh (FMA72706 = parahippocampal) + misplaced Z |

Coverage gaps (documented, not errors): gyral anchors exist LEFT ONLY (no right
gyral entries); no insular/cingulate/fusiform anchors though those pieces exist in
mesh; lobe `canonicalCentroidMm` values are schematic guides at the same status.

## What Phase 4 may / may not use these for

MAY: screen-label placement, orientation aids, priority/culling logic (existing
LabelManager behavior, already tested). MUST NOT: landmark-grounded measurements,
sulcus-tracing validation, section-plane anchoring to named sulci, clinical claims,
or any assertion of the form "structure X is at coordinate C" until the anchor
reaches GEOMETRICALLY-LOCATED or higher with records.
