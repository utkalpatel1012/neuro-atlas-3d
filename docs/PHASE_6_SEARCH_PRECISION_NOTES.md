# Phase 6 Search-Precision Notes

Precision over recall: a query must never resolve to a structure the evidence
does not support. Ranker: `src/search/knowledgeIndex.ts` (`rankSearch`, pure,
headless-tested). Index data: `data/knowledge/search_index.json` (137 entries).

## Ranking tiers (score)

| Tier | Score | Rule |
|---|---|---|
| exact | 100 | normalized query equals official name or laterality-stripped base name |
| alias | 80 | equals a clinical alias, abbreviation, or Latin name |
| prefix | 60 | official/alias/Latin string starts with the query |
| token | 40 | every query token present in the name/alias/Latin token set |
| substring | 20 | query (≥3 chars) contained in name/alias/Latin text |
| hierarchy | 10 | query (≥3 chars) matches hierarchy-path text only |

Laterality bonus +5 when the query's laterality token matches the entry.
Ties break by structure id (deterministic). Results capped at 25.

## Laterality gating

A `left` query excludes all right-lateralized entries and vice versa.
Bilateral/midline/unspecified entries pass through (they are not the opposite
side). A bare laterality token (`left`) or empty query resolves to nothing:
laterality alone is not a structure.

## Observed resolution table (suite-asserted)

| Query | Resolves to | Tier / note |
|---|---|---|
| `hippocampus` | left + right hippocampus | exact (base name) |
| `left hippocampus` | left hippocampus top; zero right entries | exact + gate |
| `right thalamus` | `brain.diencephalon.right.thalamus` | exact |
| `Ammon's Horn` | hippocampus L/R | alias (apostrophe-insensitive) |
| `Hpc` / `CA` | hippocampus L/R | alias (exact abbreviation) |
| `CTX-L` | left cortex assembly | alias |
| `Chiasma opticum` | optic chiasm | alias (Latin) |
| `optic chiasm` | optic chiasm, AVAILABLE | exact |
| `middle cerebral artery` | vasculature MCA node, DOCUMENTED | prefix, geometry-free |
| `telencephalon` | `brain.telencephalon` top | prefix; rest hierarchy-only |
| `xyzzyqr` / `""` / `left` | nothing | — |
| `depression` / `serotonin` | nothing | no psychiatry/receptor content indexed |
| `MCA` | nothing | no invented abbreviation index for DOCUMENTED nodes |

## Deliberate precision limits (honesty over convenience)

- DOCUMENTED nodes index official names + hierarchy paths only. Abbreviations
  such as MCA/ACA/CN are NOT synthesized for them: asserting an abbreviation
  mapping without a source record would be an uncited claim. They remain
  findable by full official name (`middle cerebral artery`).
- Only 4 of 63 structure records carry aliases/abbreviations
  (hippocampus L/R, cortex assemblies); alias search covers exactly those.
- No fuzzy matching: misspellings resolve to nothing rather than to a nearby
  structure. A wrong answer is worse than no answer.
- Substring tier requires ≥3 characters; 1–2 character queries match only on
  exact alias/abbreviation (e.g. `CA`).
- Parahippocampal/hippocampal-family collisions verified absent: `hippocampus`
  matches only the two hippocampus records (substring `hippocampus` is not
  contained in `parahippocampal`/`hippocampal`).

## Selection routing

AVAILABLE result → on-demand load through the existing CLEARED-gated path
(refused when not AVAILABLE+CLEARED) → `selectEntity` + `focusEntity`.
DOCUMENTED result → knowledge detail card (known vs not meshed), no 3D
selection, no camera move, prior selection untouched. Nonsense → inert.
