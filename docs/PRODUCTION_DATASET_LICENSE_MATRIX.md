# Production Dataset License Matrix (Phase 3.2, Gate 4)

**Rule:** exact terms + verification status only. No legal advice. Nothing here
declares commercial safety beyond what license texts support. Statuses: VERIFIED
(terms confirmed from authoritative source + date) or LEGAL_REVIEW_REQUIRED.

| Dataset | Version | Asset type | Prod? | Research? | License | Attribution | Share-alike? | Commercial restriction | Redistribution | Source URL | Verification | Legal review |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BodyParts3D files (used: FMA72713/72714 + 28 cortical component STLs via mirror) | Release 3.0 (2011/06/20) | Binary STL mesh geometry | YES (current basis) | YES | CC-BY-SA 2.1 JP (historical file license) | BodyParts3D / LSIDC notice required | YES under 2.1-JP reading | UNRESOLVED (see below) | With attribution; SA under 2.1-JP reading | dbarchive portal + mirror repo | VERIFIED (hashes pinned; portal CC BY listing seen 2025-02-27) | REQUIRED (retroactivity) |
| DBCLS portal listing | Portal state 2025-02-27 | License statement, not data | N/A | N/A | CC BY (as listed) | Per portal notice | NO under CC BY reading | UNRESOLVED | Per CC BY | LSDB archive pages | VERIFIED (listing observed; relicensing mechanics not audited) | REQUIRED (same question) |
| Mirror repo (Kevin-Mattheus-Moerman/BodyParts3D) | main (OBJ→STL conversion) | Distribution channel | N/A (conduit) | N/A | 3D files remain CC-BY-SA 2.1 JP per mirror LICENSE_content | Upstream + mirror | Inherits upstream | Inherits upstream | Inherits upstream | github mirror | VERIFIED (acquisition point; conversion noted) | See above |
| Project derivatives (canonical/LOD/meshopt GLBs) | v1 (this repo) | Derived meshes | YES | YES | CC-BY-SA 4.0 (project distribution policy) | BodyParts3D / LSIDC in app notices + UI | YES (project imposes) | See LEGAL_REVIEW_REQUIRED | Under CC-BY-SA 4.0 | This repo (derived) | VERIFIED (manifest-pinned) | REQUIRED (inherits upstream question) |
| HCP (MMP/surfaces) | 1200 / MMP 1.0 | Parcels, surfaces | NO | DEFERRED | HCP Open Access Data Use Terms | NIH grant acknowledgment per terms | Under identical HCP terms | LEGAL REVIEW per terms | Permitted under terms | HCP database | VERIFIED (terms exist; no data imported) | REQUIRED before any import |
| Julich-Brain | v3.0.2 | Cytoarchitectonic volumes | NO (quarantined) | YES (offline only) | CC-BY-NC-SA 4.0 | Amunts et al. + EBRAINS | YES + NC | PROHIBITED (NC) | NC-barred from product | EBRAINS | VERIFIED | N/A (excluded) |
| BigBrain | 2015 20µm | Histological volume | NO (quarantined) | YES (offline only) | CC-BY-NC-SA 4.0 | Amunts et al. | YES + NC | PROHIBITED (NC) | NC-barred from product | EBRAINS | VERIFIED | N/A (excluded) |
| FreeSurfer (fsaverage — candidate) | v7.4.1 | Surfaces/template | NO | DEFERRED | FreeSurfer license (custom) | Per license | Per license | UNKNOWN | UNKNOWN | FreeSurfer | NOT VERIFIED | REQUIRED |
| MNI152 2009c (candidate) | ICBM 2009c NLin Asym | Template MRI | NO | DEFERRED | Version/package-dependent | Per source | Per source | UNKNOWN | UNKNOWN | FSL/SPM/NITRC ecosystems | NOT VERIFIED | REQUIRED |
| Z-Anatomy | v2024.1.0 | Evaluated, never ingested | NO | Reference only | CC-BY-SA 4.0 | Contributors + BodyParts3D | YES | None beyond SA | With SA | Z-Anatomy project | VERIFIED (evaluated, unused) | Not applicable |
| Application source code | This repo | Code | YES | YES | CONFLICT: package.json CC-BY-SA-4.0 vs Apache-2.0 claim; no LICENSE file | TBD | TBD | TBD | TBD | This repo | CONFLICT DOCUMENTED (L8) | REQUIRED (resolve + add LICENSE) |

**Bottom line:** production geometry rests on exactly one lineage (BodyParts3D
Rel. 3.0 → mirror → derivatives) with one open legal question (retroactivity).
Everything else is quarantined, deferred, or conflict-flagged. No item above was
upgraded to justify progress.
