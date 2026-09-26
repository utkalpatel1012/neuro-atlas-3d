# Phase 3.2 Independent Review (Gate 5 — adversarial second pass)

**Reviewer stance:** did NOT write Phase 3.1; re-verified claims against code/assets,
hunted for what the first pass missed. Severity: CRITICAL (blocks) / MAJOR (must fix
or gate) / MINOR (fix opportunistically) / OBSERVATION (note only). No scores.

## Finding R5-01 — Stale +Z-anterior orientation references in SceneManager + origin name implying measured AC-PC point
- **Severity:** MAJOR → FIXED in this pass.
- **Evidence:** `src/engine/SceneManager.ts:99` comment "(RAS: +X Right, +Y Superior, +Z Anterior)"; `:111` "+Z Blue Anterior"; node `Ref_AC_PC_Origin` at origin implying a measured commissural point (origin is asserted approximation, L3); `Ref_RAS_Axes_30mm`.
- **Risk:** debug/reference overlay teaches the false convention inside the running app; origin name fabricates a stereotaxic landmark.
- **Required action:** correct comments; rename nodes to `Ref_Canonical_Axes_30mm` / `Ref_Canonical_Origin_Approx`.
- **Status:** FIXED (no code references to old names existed — grep-verified).

## Finding R5-02 — Shipped UI subtitle "Phase 3.0"
- **Severity:** MINOR → FIXED.
- **Evidence:** `index.html:18` brand subtitle.
- **Risk:** deployed app misstates its own phase.
- **Required action:** "Phase 3.1".
- **Status:** FIXED.

## Finding R5-03 — Dead machine-local `file:///` links across historical docs
- **Severity:** MINOR → FIXED.
- **Evidence:** `C:\Users\UTKAL PATEL\.gemini\antigravity\scratch\...` absolute links in PHASE_0_1_REPORT, PHASE_0_1_COMPLETION_CHECKLIST, PHASE_3_REPORT, ANATOMICAL_CATALOGUE_SPEC, ASSET_PROVENANCE_SCHEMA, `.agents/rules`, PROJECT_ARCHITECTURE root line.
- **Risk:** link rot on every other machine; looks like provenance until inspected.
- **Required action:** convert to repo-relative links (meaning-preserving).
- **Status:** FIXED (mechanical replacement; `PROJECT_ARCHITECTURE.md:6` reworded).

## Finding R5-04 — Gyral anchors exist LEFT ONLY; no insular/cingulate/fusiform anchors
- **Severity:** OBSERVATION (documented, not fixed — creating anchors would be fabrication).
- **Evidence:** registry has 5 left gyral entries, zero right; mesh contains insula/cingulate/fusiform pieces with no anchors.
- **Risk:** Phase 4 label-coverage asymmetry surprises.
- **Required action:** recorded in landmark policy doc §coverage gaps; future anchors need measurement trail.
- **Status:** DOCUMENTED.

## Finding R5-05 — `dist/` + `node_modules/` present locally, correctly ignored
- **Severity:** OBSERVATION.
- **Evidence:** `git check-ignore` covers both; `git ls-files dist` = 0; CI rebuilds.
- **Risk:** none currently; local staleness cannot reach Pages.
- **Status:** DOCUMENTED (no action).

## Finding R5-06 — Live Pages content predates Phase 3.1
- **Severity:** OBSERVATION (deployment mechanics verified working; content refresh follows this commit's deploy).
- **Evidence:** live manifest `generated_at 2026-09-26` with pre-3.1 wording; dual deploy mechanism source-of-truth UNKNOWN (L12).
- **Risk:** users see stale claims until redeploy.
- **Required action:** redeploy after this commit; then re-fetch live manifest and confirm corrected wording.
- **Status:** DOCUMENTED, PENDING redeploy (outside agent scope to trigger CI).

## Finding R5-07 — Hunted, NOT FOUND (negative results recorded)
Searched and cleared: HCP/Julich/BigBrain bytes in production paths (TEST 9 +
binary inventory: 32 STL = 28 components + 2 masters + 2 hippocampi; 36 GLB = 4×9 —
exact, no strays); uncommitted-secret patterns (.env/secrets/logs — none);
`getObjectByName` identity lookups (none); limbic-as-structural-parent (absent,
functional-only); phantom-script references in live records (gone; fixture labeled
synthetic); "zero leak" claims (invariant amended); RAS/MNI conflation in engine
comments (fixed R5-01; remaining mentions are historical-with-notice or type labels).

## Review conclusion
No CRITICAL findings. Two MAJOR-grade issues found, both fixed and tested in this
pass. Nothing found that contradicts the Phase 3.1 corrections; several were
independently re-derived (shell counts, adapter math, component identities).
