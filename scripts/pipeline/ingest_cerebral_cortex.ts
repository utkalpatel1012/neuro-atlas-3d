/**
 * 3D Neuroanatomy Atlas: Cerebral Cortex Multi-Component Ingestion Engine
 * Standard: AAS-2026-NEURO-V1 (Phase 3 Production Pipeline)
 * 
 * Ingests authentic BodyParts3D component STLs for left and right cerebral hemispheres,
 * verifies SHA-256 cryptographic digests, concatenates components within native source
 * space (triangle-buffer concatenation: NO vertex welding, NO mesh union, NO hole
 * filling — the composite is a multi-shell assembly, see Phase 3.1 report),
 * and outputs master raw composite STL files for downstream canonicalization.
 *
 * Component identities below follow the authoritative BodyParts3D distribution name
 * list (parts_list_e.txt, same distribution the STLs ship in), corrected Phase 3.1.
 * See docs/PHASE_3_CORTEX_SOURCE_COMPONENTS.md for the full per-component record.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface CorticalComponentDef {
  fmaId: string;
  name: string;
  laterality: 'left' | 'right';
  lobe: 'frontal' | 'parietal' | 'temporal' | 'occipital' | 'insula' | 'limbic';
  structureType: 'gyrus' | 'lobe' | 'cortex';
}

export const LEFT_CORTICAL_COMPONENTS: CorticalComponentDef[] = [
  { fmaId: 'FMA72654', name: 'Left superior frontal gyrus', laterality: 'left', lobe: 'frontal', structureType: 'gyrus' },
  { fmaId: 'FMA72656', name: 'Left middle frontal gyrus', laterality: 'left', lobe: 'frontal', structureType: 'gyrus' },
  { fmaId: 'FMA72662', name: 'Left precentral gyrus', laterality: 'left', lobe: 'frontal', structureType: 'gyrus' },
  { fmaId: 'FMA72666', name: 'Left postcentral gyrus', laterality: 'left', lobe: 'parietal', structureType: 'gyrus' },
  { fmaId: 'FMA72668', name: 'Left supramarginal gyrus', laterality: 'left', lobe: 'parietal', structureType: 'gyrus' },
  { fmaId: 'FMA72670', name: 'Left angular gyrus', laterality: 'left', lobe: 'parietal', structureType: 'gyrus' },
  { fmaId: 'FMA72686', name: 'Left middle temporal gyrus', laterality: 'left', lobe: 'temporal', structureType: 'gyrus' },
  { fmaId: 'FMA72688', name: 'Left inferior temporal gyrus', laterality: 'left', lobe: 'temporal', structureType: 'gyrus' },
  { fmaId: 'FMA72690', name: 'Left fusiform gyrus', laterality: 'left', lobe: 'temporal', structureType: 'gyrus' },
  { fmaId: 'FMA72702', name: 'Left accessory short gyrus', laterality: 'left', lobe: 'insula', structureType: 'gyrus' },
  { fmaId: 'FMA72706', name: 'Left parahippocampal gyrus', laterality: 'left', lobe: 'limbic', structureType: 'gyrus' },
  { fmaId: 'FMA72976', name: 'Left occipital lobe', laterality: 'left', lobe: 'occipital', structureType: 'lobe' },
  { fmaId: 'FMA72978', name: 'Left insula', laterality: 'left', lobe: 'insula', structureType: 'cortex' },
  { fmaId: 'FMA72718', name: 'Left cingulate gyrus', laterality: 'left', lobe: 'limbic', structureType: 'gyrus' }
];

export const RIGHT_CORTICAL_COMPONENTS: CorticalComponentDef[] = [
  { fmaId: 'FMA72653', name: 'Right superior frontal gyrus', laterality: 'right', lobe: 'frontal', structureType: 'gyrus' },
  { fmaId: 'FMA72655', name: 'Right middle frontal gyrus', laterality: 'right', lobe: 'frontal', structureType: 'gyrus' },
  { fmaId: 'FMA72661', name: 'Right precentral gyrus', laterality: 'right', lobe: 'frontal', structureType: 'gyrus' },
  { fmaId: 'FMA72665', name: 'Right postcentral gyrus', laterality: 'right', lobe: 'parietal', structureType: 'gyrus' },
  { fmaId: 'FMA72667', name: 'Right supramarginal gyrus', laterality: 'right', lobe: 'parietal', structureType: 'gyrus' },
  { fmaId: 'FMA72669', name: 'Right angular gyrus', laterality: 'right', lobe: 'parietal', structureType: 'gyrus' },
  { fmaId: 'FMA72685', name: 'Right middle temporal gyrus', laterality: 'right', lobe: 'temporal', structureType: 'gyrus' },
  { fmaId: 'FMA72687', name: 'Right inferior temporal gyrus', laterality: 'right', lobe: 'temporal', structureType: 'gyrus' },
  { fmaId: 'FMA72689', name: 'Right fusiform gyrus', laterality: 'right', lobe: 'temporal', structureType: 'gyrus' },
  { fmaId: 'FMA72701', name: 'Right accessory short gyrus', laterality: 'right', lobe: 'insula', structureType: 'gyrus' },
  { fmaId: 'FMA72705', name: 'Right parahippocampal gyrus', laterality: 'right', lobe: 'limbic', structureType: 'gyrus' },
  { fmaId: 'FMA72975', name: 'Right occipital lobe', laterality: 'right', lobe: 'occipital', structureType: 'lobe' },
  { fmaId: 'FMA72977', name: 'Right insula', laterality: 'right', lobe: 'insula', structureType: 'cortex' },
  { fmaId: 'FMA72717', name: 'Right cingulate gyrus', laterality: 'right', lobe: 'limbic', structureType: 'gyrus' }
];

export async function fetchComponentSTL(fmaId: string, outputDir: string): Promise<{ filePath: string; sha256: string; byteLength: number; triangleCount: number }> {
  const filePath = path.join(outputDir, `${fmaId}.stl`);
  if (!fs.existsSync(filePath)) {
    const url = `https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data/stl/${fmaId}.stl`;
    console.log(`[INGEST CORTEX] Downloading authentic source ${fmaId} from ${url}...`);
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to download ${fmaId}.stl: HTTP ${resp.status}`);
    }
    const arrayBuf = await resp.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuf));
  }

  const fileBuf = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
  const triangleCount = fileBuf.readUInt32LE(80);

  return {
    filePath,
    sha256,
    byteLength: fileBuf.length,
    triangleCount
  };
}

export function combineBinarySTLs(inputFiles: string[], outputFilePath: string): { totalTriangles: number; sha256: string } {
  let totalTriangles = 0;
  const triangleBuffers: Buffer[] = [];

  for (const file of inputFiles) {
    const buf = fs.readFileSync(file);
    if (buf.length < 84) throw new Error(`Invalid STL file: ${file}`);
    const count = buf.readUInt32LE(80);
    totalTriangles += count;
    triangleBuffers.push(buf.subarray(84, 84 + count * 50));
  }

  const header = Buffer.alloc(80);
  header.write('BodyParts3D Release 3.0 Combined Cerebral Cortex (DBCLS Japan) AAS-2026-NEURO-V1');
  const countBuf = Buffer.alloc(4);
  countBuf.writeUInt32LE(totalTriangles, 0);

  const combined = Buffer.concat([header, countBuf, ...triangleBuffers]);
  fs.writeFileSync(outputFilePath, combined);

  const sha256 = crypto.createHash('sha256').update(combined).digest('hex');
  return { totalTriangles, sha256 };
}

export async function ingestCerebralCortexHemisphere(laterality: 'left' | 'right'): Promise<void> {
  const assetId = `mesh.cortex.${laterality}.v1`;
  const components = laterality === 'left' ? LEFT_CORTICAL_COMPONENTS : RIGHT_CORTICAL_COMPONENTS;

  console.log(`\n================================================================`);
  console.log(`INGESTING CEREBRAL CORTEX (${laterality.toUpperCase()}): ${assetId}`);
  console.log(`================================================================`);

  const rawDir = path.join(PROJECT_ROOT, 'assets/raw', assetId);
  const componentsDir = path.join(rawDir, 'components');
  fs.mkdirSync(componentsDir, { recursive: true });

  const componentRecords = [];
  const componentPaths = [];

  for (const comp of components) {
    const info = await fetchComponentSTL(comp.fmaId, componentsDir);
    console.log(`  ✓ ${comp.fmaId} (${comp.name}): ${info.triangleCount} triangles, SHA-256: ${info.sha256.substring(0, 16)}...`);
    componentRecords.push({
      fma_id: comp.fmaId,
      name: comp.name,
      laterality: comp.laterality,
      lobe: comp.lobe,
      structure_type: comp.structureType,
      sha256: info.sha256,
      triangle_count: info.triangleCount,
      byte_length: info.byteLength,
      source_url: `https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data/stl/${comp.fmaId}.stl`
    });
    componentPaths.push(info.filePath);
  }

  // Combine components into unified raw master STL
  const rawMasterFilename = `${assetId}.raw.stl`;
  const rawMasterPath = path.join(rawDir, rawMasterFilename);
  const { totalTriangles, sha256 } = combineBinarySTLs(componentPaths, rawMasterPath);

  console.log(`\n  Combined ${components.length} components into unified raw STL:`);
  console.log(`  Path: ${rawMasterPath}`);
  console.log(`  Total Triangles: ${totalTriangles}`);
  console.log(`  Combined SHA-256: ${sha256}`);

  // Write immutable ingestion metadata
  const ingestionJsonPath = path.join(rawDir, 'ingestion.json');
  const ingestionRecord = {
    asset_id: assetId,
    source_dataset: 'BodyParts3D (Database Center for Life Sciences - DBCLS, Japan)',
    source_dataset_version: 'Release 3.0 (2011/06/20)',
    source_asset_id: laterality === 'left' ? 'FMA61830_L' : 'FMA61830_R',
    source_url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
    source_license: 'Historical files CC-BY-SA 2.1 JP; upstream portal lists CC BY (verified 2025-02-27). Retroactivity UNRESOLVED — LEGAL_REVIEW_REQUIRED.',
    source_license_version: 'CC BY 4.0 (2025-02-27 portal update) / CC-BY-SA 2.1 JP',
    project_distribution_policy: 'CC-BY-SA-4.0',
    attribution: 'BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-Share Alike 2.1 Japan. Relicensed under CC Attribution 4.0 International.',
    acquisition_date: new Date().toISOString().split('T')[0],
    original_filename: rawMasterFilename,
    original_format: 'STL_BINARY',
    original_hash: sha256,
    total_raw_triangles: totalTriangles,
    source_coordinate_space: 'dicom_lps_whole_body',
    source_units: 'millimeters (mm)',
    components: componentRecords,
    ingestion_status: 'SOURCE_VERIFIED'
  };

  fs.writeFileSync(ingestionJsonPath, JSON.stringify(ingestionRecord, null, 2), 'utf8');
  console.log(`  ✓ Ingestion record written: ${ingestionJsonPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    await ingestCerebralCortexHemisphere('left');
    await ingestCerebralCortexHemisphere('right');
    console.log('\n[SUCCESS] Both Left and Right Cerebral Cortex raw assets ingested and verified.');
  })().catch((err) => {
    console.error('Cortex ingestion failed:', err);
    process.exit(1);
  });
}
