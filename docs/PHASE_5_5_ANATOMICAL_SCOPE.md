# Phase 5.5 Anatomical Scope (cortical completion)

**Method:** same-source addition from the BodyParts3D distribution via the established
mirror. No new dataset. Availability checked against `parts_list_e.txt` and the served
STL index.

## Planned batch (14 assets, all lateralised pairs)

| Structure | Right FMA | Left FMA |
|---|---|---|
| Inferior temporal gyrus | FMA72687 | FMA72688 |
| Fusiform gyrus | FMA72689 | FMA72690 |
| Parahippocampal gyrus | FMA72705 | FMA72706 |
| Superior temporal gyrus, anterior part | FMA72800 | FMA72801 |
| Superior temporal gyrus, posterior part | FMA72804 | FMA72805 |
| Insula | FMA72977 | FMA72978 |
| Occipital lobe | FMA72975 | FMA72976 |

## DOCUMENTED, not imported

- **Inferior frontal, orbitofrontal, medial frontal gyri; superior/inferior parietal
  lobules; cuneus; lingual gyrus; major sulci/fissures as separate segments:** absent
  from the distribution. DOCUMENTED.
- **Superior parietal / precuneus (BP48/49/50):** listed under non-standard `BP`
  identifiers, not FMA. Source identity is uncertain, so these are NOT imported
  (uncertain-source-identity hard stop). DOCUMENTED with the reason.
- The whole-cortex assemblies (5.0) plus these gyri remain **disconnected segments**,
  honestly recorded as such. No claim is made that they form a continuous pial
  surface. A true continuous cortical representation would require verified source
  geometry and is explicitly out of scope.

## Continuity decision (registry requirement)

Disconnected pieces are NOT presented as a continuous surface. Each gyrus is a
separate validated mesh; the atlas does not bridge gaps, smooth seams, or imply
continuity. This decision is recorded here rather than implemented in geometry.
