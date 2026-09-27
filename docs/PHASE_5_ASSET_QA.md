# Phase 5.0 Asset QA Report (Batch 1: 8 bilateral gyral pairs)

**Method:** `prepare_gyral_batch.ts` (hash-pinned staging) → `run_gyral_batch.ts`
(license/coordinate pre-checks → measured topology → profile → 6-stage
pipeline) → per-asset verdicts in `data/phase5_batch1_qa.json`. All values
below MEASURED. Verdicts: 16 RUNTIME_READY, 0 REVIEW_REQUIRED, 0 REJECTED.

**Shared provenance (all 16):** BodyParts3D Release 3.0 via in-repo derivation
from `mesh.cortex.{left,right}.v1` components (input hashes pinned to the
cortex ingestion record); historical files CC-BY-SA 2.1 JP, portal lists CC BY
(2025-02-27), derivatives CC-BY-SA-4.0, retroactivity UNRESOLVED
(LEGAL_REVIEW_REQUIRED pre-commercial). Source space asserted-LPS whole-body,
units mm; canonical adapter Xc=−Xs, Yc=Zs−1561.7, Zc=Ys+70.1 (unchanged).
Laterality: source-metadata pairing + mirror-sign geometry check (all L X<0,
all R X>0). LOD0–3 QEM (identity-preserving, monotonic) + meshopt runtime.

| Asset | Structure | Lobe | Source FMA | Tris | Shells | Boundary | Profile | Runtime |
|---|---|---|---|---|---|---|---|---|
| mesh.superior_frontal_gyrus.left.v1 | Superior frontal gyrus (L) | frontal | FMA72654 | 30450 | 2 | 0 | composite-cortical-assembly | READY |
| mesh.superior_frontal_gyrus.right.v1 | Superior frontal gyrus (R) | frontal | FMA72653 | 30448 | 2 | 0 | composite-cortical-assembly | READY |
| mesh.middle_frontal_gyrus.left.v1 | Middle frontal gyrus (L) | frontal | FMA72656 | 15544 | 1 | 0 | closed-pial-surface | READY |
| mesh.middle_frontal_gyrus.right.v1 | Middle frontal gyrus (R) | frontal | FMA72655 | 15558 | 1 | 0 | closed-pial-surface | READY |
| mesh.precentral_gyrus.left.v1 | Precentral gyrus (L) | frontal | FMA72662 | 18836 | 1 | 0 | closed-pial-surface | READY |
| mesh.precentral_gyrus.right.v1 | Precentral gyrus (R) | frontal | FMA72661 | 18838 | 1 | 0 | closed-pial-surface | READY |
| mesh.postcentral_gyrus.left.v1 | Postcentral gyrus (L) | parietal | FMA72666 | 16858 | 1 | 0 | closed-pial-surface | READY |
| mesh.postcentral_gyrus.right.v1 | Postcentral gyrus (R) | parietal | FMA72665 | 16862 | 1 | 0 | closed-pial-surface | READY |
| mesh.supramarginal_gyrus.left.v1 | Supramarginal gyrus (L) | parietal | FMA72668 | 9778 | 1 | 0 | closed-pial-surface | READY |
| mesh.supramarginal_gyrus.right.v1 | Supramarginal gyrus (R) | parietal | FMA72667 | 9782 | 1 | 0 | closed-pial-surface | READY |
| mesh.angular_gyrus.left.v1 | Angular gyrus (L) | parietal | FMA72669 | 13164 | 1 | 0 | closed-pial-surface | READY |
| mesh.angular_gyrus.right.v1 | Angular gyrus (R) | parietal | FMA72669 | 13172 | 1 | 0 | closed-pial-surface | READY |
| mesh.middle_temporal_gyrus.left.v1 | Middle temporal gyrus (L) | temporal | FMA72686 | 12918 | 1 | 0 | closed-pial-surface | READY |
| mesh.middle_temporal_gyrus.right.v1 | Middle temporal gyrus (R) | temporal | FMA72685 | 12926 | 1 | 0 | closed-pial-surface | READY |
| mesh.cingulate_gyrus.left.v1 | Cingulate gyrus (L) | limbic | FMA72718 | 11724 | 1 | 0 | closed-pial-surface | READY |
| mesh.cingulate_gyrus.right.v1 | Cingulate gyrus (R) | limbic | FMA72717 | 11716 | 1 | 0 | closed-pial-surface | READY |

**Known limitations (batch):** superior frontal pair carries 2 watertight
shells each (inherited segmentation, recorded as composite topology — same
class of limitation as L1, not a defect); gyral pieces are BodyParts3D
segments with inter-piece gaps (sulci exist only as gaps, L1 applies);
TA2/UBERON IDs UNVERIFIED (L5 — FMA distribution IDs only); structure records
are anatomy-only (no functional/psychiatric/imaging sections by design);
remaining 12 components stay DOCUMENTED (Batch 2 candidates); deep/brainstem/
cerebellum/ventricle/nerves/vasculature geometry absent (DOCUMENTED only).
