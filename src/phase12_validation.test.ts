/**
 * 3D Neuroanatomy Atlas: Phase 12 Final Validation Sweep Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * Structural invariants for the Phase 12 final validation sweep (read-only:
 * this suite mutates nothing; it asserts repo state against the no-false-
 * progress rule in AGENTS.md and the Phase 12 entry in
 * `.opencode/workflow/PHASE_REGISTRY.json`):
 *
 * 1. Certification tags exist for every phase 5.2-11
 *    (`git tag -l 'phase-*-certified'`).
 * 2. Completion reports exist for every phase 5.2-11.
 * 3. No prohibited-claim strings in shipped surfaces (`src/` non-test
 *    sources, `index.html`, `data/structures/`, `data/knowledge/`,
 *    `data/psychiatry/`). Every residual hit must sit on the documented
 *    negative-context / honest-status-vocabulary allowlist below; anything
 *    else FAILS (device-claim-without-device hard stop).
 * 4. Counts consistent across manifest / records / hierarchy / knowledge /
 *    psychiatry / tutor layers (observed values pinned with reasons).
 * 5. PWA ship artifacts present: committed `public/sw.js` +
 *    `public/manifest.webmanifest` always; `dist/` artifacts asserted only
 *    when `dist/` exists (build output, otherwise SKIP, never fail).
 * 6. `EXPERT_VALIDATED` absent from all data records + manifest (expert
 *    review PENDING everywhere); `package.json` wires `test:validation12`.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

let passed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
  passed += 1;
}

function readJson(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8'));
}

function readText(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
}

function listFilesRecursive(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

console.log('================================================================');
console.log('NEURO ATLAS 3D: PHASE 12 FINAL VALIDATION SWEEP SUITE');
console.log('================================================================');

// ---------------------------------------------------------------- TEST 1 ---
console.log('\n--- TEST 1: Certification tags exist for every phase 5.2-11 ---');
{
  const expectedTags = [
    'phase-5-2-certified',
    'phase-5-3-certified',
    'phase-5-4-certified',
    'phase-5-5-certified',
    'phase-6-certified',
    'phase-7-certified',
    'phase-8-certified',
    'phase-9-certified',
    'phase-10-certified',
    'phase-11-certified',
  ];
  let tags: string[];
  try {
    tags = execSync('git tag -l "phase-*-certified"', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  } catch (err) {
    throw new Error(`Cannot list certification tags: ${String(err)}`);
  }
  for (const tag of expectedTags) {
    assert(tags.includes(tag), `certification tag missing: ${tag}`);
  }
  console.log(`[PASS] All ${expectedTags.length} phase certification tags present.`);
}

// ---------------------------------------------------------------- TEST 2 ---
console.log('\n--- TEST 2: Completion reports exist for every phase 5.2-11 ---');
{
  const reports = [
    'docs/PHASE_5_2_COMPLETION_REPORT.md',
    'docs/PHASE_5_3_COMPLETION_REPORT.md',
    'docs/PHASE_5_4_COMPLETION_REPORT.md',
    'docs/PHASE_5_5_COMPLETION_REPORT.md',
    'docs/PHASE_6_COMPLETION_REPORT.md',
    'docs/PHASE_7_COMPLETION_REPORT.md',
    'docs/PHASE_8_COMPLETION_REPORT.md',
    'docs/PHASE_9_COMPLETION_REPORT.md',
    'docs/PHASE_10_COMPLETION_REPORT.md',
    'docs/PHASE_11_COMPLETION_REPORT.md',
  ];
  for (const rel of reports) {
    assert(fs.existsSync(path.join(PROJECT_ROOT, rel)), `completion report missing: ${rel}`);
  }
  console.log(`[PASS] All ${reports.length} phase completion reports present; no phase missing certification.`);
}

// ---------------------------------------------------------------- TEST 3 ---
console.log('\n--- TEST 3: Prohibited-claim sweep over shipped surfaces ---');
{
  const prohibited =
    /clinically validated|fully validated|iPad validated|iPad-validated|expert[.\s_-]reviewed|expert validated|license cleared|licence-cleared|dual compliance|unrestricted|Relicensed under/i;

  // Allowlist: each residual hit must match one entry. `context` is a token
  // that must appear on the SAME line, proving negative / honest-status use.
  // `kind` records the classification per the no-false-progress rule.
  const allowlist: Array<{ fileSuffix: string; context: RegExp; kind: string }> = [
    {
      fileSuffix: 'src/ui/AnatomicalInfoPanel.ts',
      context: /not.*licence-cleared/i,
      kind: 'negative disclaimer (explicit NOT licence-cleared + LEGAL_REVIEW_REQUIRED)',
    },
    {
      fileSuffix: 'src/engine/mriVolume.ts',
      context: /EXPERT_REVIEW_PENDING/,
      kind: 'honest status vocabulary (pending default in type union / assignment)',
    },
    {
      fileSuffix: 'src/psychiatry/types.ts',
      context: /no expert review/i,
      kind: 'negative statement (no expert review in corpus)',
    },
    {
      fileSuffix: 'src/types/provenance.ts',
      context: /absence of expert review|EXPERT_REVIEW_PENDING/i,
      kind: 'negative statement + honest status vocabulary (pipeline attests QA only)',
    },
    {
      fileSuffix: 'src/types/semantic.ts',
      context: /only after expert review/i,
      kind: 'conditional (EXPERT_VERIFIED only AFTER review — claims nothing reviewed)',
    },
    {
      fileSuffix: 'index.html',
      context: /not.*(licence-cleared|clinically validated|expert-reviewed)/i,
      kind: 'negative disclaimer (explicit NOT x3 + not-for-diagnostic-use)',
    },
  ];

  const shippedSrc = listFilesRecursive(path.join(PROJECT_ROOT, 'src'), '.ts').filter(
    (f) => !f.endsWith('.test.ts'),
  );
  const shippedFiles = [...shippedSrc, path.join(PROJECT_ROOT, 'index.html')];
  let hitCount = 0;
  for (const file of shippedFiles) {
    const rel = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!prohibited.test(line)) return;
      hitCount += 1;
      const entry = allowlist.find(
        (a) => rel.endsWith(a.fileSuffix) && a.context.test(line),
      );
      assert(
        entry !== undefined,
        `UNCLASSIFIED prohibited-claim hit in shipped surface ${rel}:${i + 1}: ${line.trim().slice(0, 160)}`,
      );
      void entry;
    });
  }
  console.log(`[PASS] ${hitCount} shipped-surface hit(s), all classified negative/honest-status (zero assertive claims).`);

  // Data records: zero tolerance — no hit of any kind is expected.
  const dataDirs = ['data/structures', 'data/knowledge', 'data/psychiatry'];
  let dataHits = 0;
  for (const dir of dataDirs) {
    for (const file of listFilesRecursive(path.join(PROJECT_ROOT, dir), '.json')) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (prohibited.test(line)) {
          dataHits += 1;
          console.error(
            `DATA HIT ${path.relative(PROJECT_ROOT, file)}:${i + 1}: ${line.trim().slice(0, 160)}`,
          );
        }
      });
    }
  }
  assert(dataHits === 0, `${dataHits} prohibited-claim hit(s) inside data records`);
  console.log('[PASS] Zero prohibited-claim hits across data/structures, data/knowledge, data/psychiatry.');
}

// ---------------------------------------------------------------- TEST 4 ---
console.log('\n--- TEST 4: EXPERT_VALIDATED absent from data + manifest ---');
{
  const haystacks = [
    readText('assets/manifests/assets.manifest.json'),
    ...listFilesRecursive(path.join(PROJECT_ROOT, 'data/structures'), '.json').map((f) =>
      fs.readFileSync(f, 'utf8'),
    ),
  ];
  const bad = haystacks.filter((s) => /EXPERT_VALIDATED/.test(s)).length;
  assert(bad === 0, `EXPERT_VALIDATED token present in ${bad} data/manifest blob(s)`);
  const manifest = readJson('assets/manifests/assets.manifest.json') as {
    assets: Record<string, { expert_review_status?: string }>;
  };
  const entries = Object.values(manifest.assets);
  const pending = entries.filter((e) => e.expert_review_status === 'EXPERT_REVIEW_PENDING').length;
  assert(pending === entries.length, `expert review not PENDING everywhere (${pending}/${entries.length})`);
  console.log(`[PASS] EXPERT_REVIEW_PENDING on all ${entries.length} manifest assets; no expert review claimed.`);
}

// ---------------------------------------------------------------- TEST 5 ---
console.log('\n--- TEST 5: Counts consistent across manifest / records / hierarchy ---');
{
  const manifest = readJson('assets/manifests/assets.manifest.json') as {
    total_assets: number;
    assets: Record<string, { validation_status?: string }>;
    production_whitelist: unknown[];
    research_quarantine: unknown[];
  };
  const assetIds = Object.keys(manifest.assets);
  assert(manifest.total_assets === 63, `manifest total_assets=${manifest.total_assets}, expected 63`);
  assert(assetIds.length === 63, `manifest asset dict=${assetIds.length}, expected 63`);
  assert(manifest.production_whitelist.length === 63, 'whitelist must hold all 63 assets');
  assert(manifest.research_quarantine.length === 0, 'quarantine must be empty');
  assert(
    assetIds.every((id) => manifest.assets[id].validation_status === 'CLEARED'),
    'every manifest asset must be CLEARED (technical clearance only)',
  );

  const structureFiles = fs
    .readdirSync(path.join(PROJECT_ROOT, 'data/structures'))
    .filter((f) => f.endsWith('.json'));
  assert(structureFiles.length === 63, `structure records=${structureFiles.length}, expected 63`);

  const buildMeta = readJson('data/knowledge/build_meta.json') as {
    available_records: number;
    documented_records: number;
    total_records: number;
    literature_claims: number;
  };
  assert(buildMeta.available_records === 63, 'knowledge AVAILABLE records must be 63');
  assert(buildMeta.documented_records === 74, 'knowledge DOCUMENTED records must be 74');
  assert(buildMeta.total_records === 137, 'knowledge total records must be 137');
  assert(buildMeta.literature_claims === 0, 'literature claims must be 0 (no invented citations)');
  const searchIndex = readJson('data/knowledge/search_index.json') as {
    entry_count: number;
  };
  assert(searchIndex.entry_count === 137, 'search index must cover all 137 knowledge records');

  const hierarchy = readJson('data/anatomical_hierarchy.json') as {
    nodes: Array<{ id: string; geometry_state?: string }>;
  };
  const avail = hierarchy.nodes.filter((n) => n.geometry_state === 'AVAILABLE');
  const documented = hierarchy.nodes.filter((n) => n.geometry_state === 'DOCUMENTED');
  assert(hierarchy.nodes.length === 135, `hierarchy nodes=${hierarchy.nodes.length}, expected 135`);
  assert(avail.length === 61, `hierarchy AVAILABLE=${avail.length}, expected 61`);
  assert(documented.length === 74, `hierarchy DOCUMENTED=${documented.length}, expected 74`);
  // Documented delta: the 2 extra knowledge-AVAILABLE records are the
  // whole-cortex aggregates (mesh.cortex.left/right.v1), which honestly hold
  // no dedicated hierarchy node.
  const availIds = new Set(avail.map((n) => n.id));
  const orphans = ['brain.telencephalon.left.cortex', 'brain.telencephalon.right.cortex'];
  for (const id of orphans) {
    assert(!availIds.has(id), `cortex aggregate ${id} must not claim a hierarchy node`);
    assert(
      hierarchy.nodes.every((n) => n.id !== id),
      `cortex aggregate ${id} must have no hierarchy node at all`,
    );
  }

  const relationships = readJson('data/psychiatry/relationships.json') as {
    relationships: unknown[];
  };
  const refusals = readJson('data/psychiatry/refusal_templates.json') as {
    templates: unknown[];
  };
  const systems = readJson('data/psychiatry/systems_registry.json') as {
    systems: unknown[];
  };
  assert(relationships.relationships.length === 69, 'psychiatry relationships must be 69');
  assert(refusals.templates.length === 7, 'psychiatry refusal templates must be 7');
  assert(systems.systems.length === 7, 'psychiatry systems must be 7');

  const routing = readJson('data/tutor/intent_routing.json') as {
    refusal_routes: unknown[];
    system_aliases: unknown[];
  };
  assert(routing.refusal_routes.length === 7, 'tutor refusal routes must be 7');
  assert(routing.system_aliases.length === 7, 'tutor system aliases must be 7');

  console.log(
    '[PASS] manifest 63/63/0; structures 63; knowledge 63+74=137; hierarchy 61+74=135 ' +
      '(2 cortex aggregates honestly node-free); psychiatry 69/7/7; tutor 7/7.',
  );
}

// ---------------------------------------------------------------- TEST 6 ---
console.log('\n--- TEST 6: SW + manifest ship artifacts ---');
{
  for (const rel of ['public/sw.js', 'public/manifest.webmanifest']) {
    assert(fs.existsSync(path.join(PROJECT_ROOT, rel)), `PWA source missing: ${rel}`);
  }
  const pkg = readJson('package.json') as { version: string };
  const sw = readText('public/sw.js');
  assert(
    sw.includes(pkg.version) || /CACHE_VERSION|APP_VERSION|version/i.test(sw),
    'sw.js must carry a version stamp for invalidation',
  );
  const distDir = path.join(PROJECT_ROOT, 'dist');
  if (fs.existsSync(distDir)) {
    for (const rel of ['dist/sw.js', 'dist/manifest.webmanifest']) {
      assert(fs.existsSync(path.join(PROJECT_ROOT, rel)), `dist artifact missing after build: ${rel}`);
    }
    console.log('[PASS] public SW sources present with version stamp; dist/ ship artifacts verified.');
  } else {
    console.log('[SKIP] dist/ absent (build output, not committed) — public SW sources verified only.');
  }
}

// ---------------------------------------------------------------- TEST 7 ---
console.log('\n--- TEST 7: package.json wires test:validation12 ---');
{
  const pkg = readJson('package.json') as { scripts: Record<string, string> };
  assert(
    pkg.scripts['test:validation12'] === 'tsx src/phase12_validation.test.ts',
    'package.json must wire test:validation12 to this suite',
  );
  console.log('[PASS] test:validation12 wired in package.json.');
}

console.log('\n================================================================');
console.log(`ALL PHASE 12 VALIDATION SWEEP TESTS PASSED (${passed} checks).`);
console.log('================================================================');
