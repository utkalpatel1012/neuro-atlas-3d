# Phase 3 Cortex Source Components — Authoritative Per-Component Record

**Date:** 2026-09-27 (Phase 3.1)
**Authority for names:** BodyParts3D distribution name list (`parts_list_e.txt`, same
distribution the STLs ship in) + positional cross-check of measured component centroids.
**Authority for counts/hashes:** `assets/raw/mesh.cortex.{left,right}.v1/ingestion.json`
(names/lobes corrected 2026-09-27; geometry, hashes, triangle counts byte-identical).
**Method:** 14 component STLs per hemisphere, SHA-256 verified, triangle buffers
concatenated (`combineBinarySTLs` — NO welding, NO union). Composite: L 198,230 tris
(`a1950fea0df718e7230d88b21b7145fd0bd0f4357d9289e00bcb8ed5f9ba6c13`),
R 198,310 tris (`5bd9ad3d53eeb4a6750d484ad254c7484ffa6a3e0673782fc41148fa2f327037`).
Measured disjoint shells: **16/side** (union-find over deduplicated vertices;
FMA72654 + FMA72702 contain 2 shells each).

> Pre-3.1 records mislabeled 5 components/side (temporal-series shift + cuneus/lingual/
> parahippocampal misassignments). Corrected names below are the ONLY valid ones.
> The composite therefore contains NO superior temporal gyrus, NO cuneus, and NO lingual
> gyrus as separate pieces; it DOES contain middle/inferior temporal, fusiform, insular
> accessory short gyri, parahippocampal, and cingulate pieces. The mesh is a PARTIAL
> cortical covering (no inferior frontal, superior parietal/precuneus, orbitofrontal,
> medial frontal, or true superior temporal pieces) — NOT a whole-cortex surface.

## Left hemisphere (`mesh.cortex.left.v1`)

| # | Component name (corrected) | FMA ID | Lobe | Triangles | SHA-256 |
|---|---|---|---|---|---|
| 1 | Left superior frontal gyrus | FMA72654 | frontal | 30450 | `54aa6966cf6dee412cd16f2fc9ba4222a47910c59cc7a147dbac87d62689a13d` |
| 2 | Left middle frontal gyrus | FMA72656 | frontal | 15544 | `e97ef0b0a99f9d5b76d96363555cc27dca101c0f39ec340f38517e106a68d05b` |
| 3 | Left precentral gyrus | FMA72662 | frontal | 18836 | `533692c92294c4f5ad4158a51ab681cfefb4bd0f729a70df2e983693a1b51b2b` |
| 4 | Left postcentral gyrus | FMA72666 | parietal | 16858 | `30fd9c050762f100770d42a71c64976cce10c49440f03e991702fe8514ebceb3` |
| 5 | Left supramarginal gyrus | FMA72668 | parietal | 9778 | `ac0d7b383407477f53f13304de628ec848e8273f41b9ca5895a34697834e6f1b` |
| 6 | Left angular gyrus | FMA72670 | parietal | 13164 | `206507829901707be007389c3ebdbae07ebb942ec983d4582c3c2b76fef6ae34` |
| 7 | Left middle temporal gyrus | FMA72686 | temporal | 12918 | `b7e58d0f86e4dd335eabf01b5459526f6a7fe66821b03ccb43d879ba70d56332` |
| 8 | Left inferior temporal gyrus | FMA72688 | temporal | 13040 | `fe75592f16a8c604c07f17e788e22f34801467f14f4a1e9d1066da3759a7616f` |
| 9 | Left fusiform gyrus | FMA72690 | temporal | 6148 | `f7573954276f752193fe5b80b2ebab8e717d0e6c2b11f8ccea12c632c8abea3a` |
| 10 | Left accessory short gyrus | FMA72702 | insula | 15330 | `68aec4cd4cb4a7c28c9f28e2056b64fd202237281012faba38736b03ab951d7a` |
| 11 | Left parahippocampal gyrus | FMA72706 | limbic | 3452 | `fa2679accd8a5134422e3d06012d30ac7db37cac3dcccba5526b9c9c3c55438b` |
| 12 | Left occipital lobe | FMA72976 | occipital | 18746 | `8f718a0c60a316c7e6b60fa440909865927de819d2229c2c513f9dee97644a0a` |
| 13 | Left insula | FMA72978 | insula | 12242 | `8ab8b6fdee006cf8776db3b3c9857dd10aa9d60cd1851c2e7975eb7978c8d57b` |
| 14 | Left cingulate gyrus | FMA72718 | limbic | 11724 | `e83fc7ef26bafad285d81a236a5651132bd7eb1232f488ebb01f14202bffd927` |

## Right hemisphere (`mesh.cortex.right.v1`)

| # | Component name (corrected) | FMA ID | Lobe | Triangles | SHA-256 |
|---|---|---|---|---|---|
| 1 | Right superior frontal gyrus | FMA72653 | frontal | 30448 | `bfdfb291520f28f3243e5b6969449e9d0ce70fcbe7f2e1862629cea21110eb94` |
| 2 | Right middle frontal gyrus | FMA72655 | frontal | 15558 | `3996b19ea6ddce123eb1c41798cfff26f8af125fa63492a98454c6ea994bf26e` |
| 3 | Right precentral gyrus | FMA72661 | frontal | 18838 | `136dc5cab4297753d7d26af60990c9e94b78997d6bf6a61d2beea08c726fd497` |
| 4 | Right postcentral gyrus | FMA72665 | parietal | 16862 | `26aa859a22bed7bb4165f41b456f532ace9de8e7583754f894ec239615558829` |
| 5 | Right supramarginal gyrus | FMA72667 | parietal | 9782 | `babd989df0c238866ab1ae6c9e94d1fb3ec5b7d457ee25576a31a120831e9f97` |
| 6 | Right angular gyrus | FMA72669 | parietal | 13172 | `8d269ad9da1d34453e23ac41ce4cf1e94734f48023373b7f2502beaed17cfeb1` |
| 7 | Right middle temporal gyrus | FMA72685 | temporal | 12926 | `a39ee61dc99086d7d1be44c42157de54e04f9defa85074c63dc43b0bd1ef028f` |
| 8 | Right inferior temporal gyrus | FMA72687 | temporal | 13056 | `ec04eabe123163d811f4eb4cbca8baf6cfc018ee5994bfe48b04a6b1991ad479` |
| 9 | Right fusiform gyrus | FMA72689 | temporal | 6150 | `5f7263b7768b54a4ef8b8e31a1d0ef7a7d8f72ccce5011fcbfce66b36a27ad58` |
| 10 | Right accessory short gyrus | FMA72701 | insula | 15346 | `dae4a0cd8dbeeb27170af29c1f03a7626fa5fbb3c21748c71f07ab67177dafc3` |
| 11 | Right parahippocampal gyrus | FMA72705 | limbic | 3454 | `fd317edc429ea14f0cc4398198bfb5a6f3a06d1ab9b2b24e5d41a63756899e0a` |
| 12 | Right occipital lobe | FMA72975 | occipital | 18762 | `1ce0984b5f92adef2278d7adb2d6eada578f20da6d00ce642eb085af60711138` |
| 13 | Right insula | FMA72977 | insula | 12240 | `2586b9df7a37d40d5082b0fa212856e285c6cbebb0bac3c7cbf1af06678f949a` |
| 14 | Right cingulate gyrus | FMA72717 | limbic | 11716 | `052c22b760864144c50cc50077a3bdb111d7ed57e5f025ed9c061829b353b5dc` |

(Triangle counts sum exactly to composite totals: L 198,230 / R 198,310. Per-component
mirror URLs: `ingestion.json` in each raw asset folder; mirrored into the manifest's
`source_components`.)

## Provenance chain (D2)

`manifest.source_components[]` (FMA ID, corrected name, lobe, SHA-256, triangles,
per-component mirror URL) → `assets/raw/<assetId>/ingestion.json#components`
(authority) → mirror STL bytes (hash-pinned) → DBCLS BodyParts3D Release 3.0
(`parts_list_e.txt` name authority) → Mitsuhashi et al. 2009 (NAR, PMID 18835852).
Downstream chain (canonical GLB → LODs → meshopt runtime) is hash-linked in the manifest.
No component identity is dropped at any stage.
