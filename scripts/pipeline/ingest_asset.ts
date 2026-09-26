/**
 * 3D Neuroanatomy Atlas: Asset Ingestion Pipeline Stage
 * Standard: AAS-2026-NEURO-V1
 * 
 * Fetches authoritative raw assets, calculates SHA-256 digests,
 * and writes immutable ingestion metadata records.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface IngestionOptions {
  assetId: string;
  sourceDataset: string;
  sourceDatasetVersion: string;
  sourceAssetId: string;
  sourceUrl: string;
  sourceLicense: string;
  sourceLicenseVersion: string;
  attribution: string;
  originalFilename: string;
  originalFormat: string;
  sourceCoordinateSpace: string;
  sourceUnits: string;
  sourceMetadata: Record<string, any>;
}

export async function ingestAsset(optionsOrId: IngestionOptions | string): Promise<{ rawFilePath: string; ingestionJsonPath: string; sha256: string }> {
  let options: IngestionOptions;
  if (typeof optionsOrId === 'string') {
    if (optionsOrId === 'mesh.hippocampus.left.v1') {
      options = HIPPOCAMPUS_LEFT_INGESTION_CONFIG;
    } else if (optionsOrId === 'mesh.hippocampus.right.v1') {
      options = HIPPOCAMPUS_RIGHT_INGESTION_CONFIG;
    } else {
      const rawDir = path.join(PROJECT_ROOT, 'assets/raw', optionsOrId);
      const ingJson = path.join(rawDir, 'ingestion.json');
      if (fs.existsSync(ingJson)) {
        options = JSON.parse(fs.readFileSync(ingJson, 'utf8'));
      } else {
        throw new Error(`Unknown assetId ${optionsOrId} without registered ingestion options.`);
      }
    }
  } else {
    options = optionsOrId;
  }

  console.log(`[INGEST] Ingesting asset: ${options.assetId} from ${options.sourceUrl}`);

  const rawDir = path.join(PROJECT_ROOT, 'assets/raw', options.assetId);
  fs.mkdirSync(rawDir, { recursive: true });

  const rawFilePath = path.join(rawDir, options.originalFilename);
  const ingestionJsonPath = path.join(rawDir, 'ingestion.json');

  let fileBuffer: Buffer;

  if (fs.existsSync(rawFilePath)) {
    console.log(`[INGEST] Local raw file already cached at: ${rawFilePath}`);
    fileBuffer = fs.readFileSync(rawFilePath);
    const existingHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check if ingestion.json already exists with an established hash
    if (fs.existsSync(ingestionJsonPath)) {
      const existingIngestion = JSON.parse(fs.readFileSync(ingestionJsonPath, 'utf8'));
      if (existingIngestion.original_hash && existingIngestion.original_hash !== existingHash) {
        throw new Error(
          `[RAW IMMUTABILITY VIOLATION] Raw asset file ${rawFilePath} hash (${existingHash}) does not match recorded ingestion hash (${existingIngestion.original_hash}). Raw assets are strictly immutable!`
        );
      }
      console.log(`[INGEST] Immutable raw asset verified: ${rawFilePath} (SHA-256: ${existingHash})`);
      return { rawFilePath, ingestionJsonPath, sha256: existingHash };
    }
  } else if (options.sourceUrl.startsWith('http://') || options.sourceUrl.startsWith('https://')) {
    const response = await fetch(options.sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch source asset from ${options.sourceUrl}: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } else {
    // Local path
    const localPath = path.resolve(PROJECT_ROOT, options.sourceUrl);
    fileBuffer = fs.readFileSync(localPath);
  }

  // Calculate cryptographic SHA-256 hash
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Write raw file atomically with exclusive flag 'wx' to enforce immutability
  if (!fs.existsSync(rawFilePath)) {
    fs.writeFileSync(rawFilePath, fileBuffer, { flag: 'wx' });
  }

  const acquisitionDate = new Date().toISOString().split('T')[0];

  const ingestionRecord = {
    asset_id: options.assetId,
    source_dataset: options.sourceDataset,
    source_dataset_version: options.sourceDatasetVersion,
    source_asset_id: options.sourceAssetId,
    source_url: options.sourceUrl,
    source_license: options.sourceLicense,
    source_license_version: options.sourceLicenseVersion,
    attribution: options.attribution,
    acquisition_date: acquisitionDate,
    original_filename: options.originalFilename,
    original_format: options.originalFormat,
    original_hash: sha256,
    source_coordinate_space: options.sourceCoordinateSpace,
    source_units: options.sourceUnits,
    source_metadata: options.sourceMetadata,
    ingestion_status: 'SOURCE_VERIFIED'
  };

  fs.writeFileSync(ingestionJsonPath, JSON.stringify(ingestionRecord, null, 2), 'utf8');

  console.log(`[INGEST SUCCESS] Raw file written: ${rawFilePath} (${fileBuffer.length} bytes)`);
  console.log(`[INGEST SUCCESS] Cryptographic SHA-256: ${sha256}`);
  console.log(`[INGEST SUCCESS] Ingestion record: ${ingestionJsonPath}`);

  return { rawFilePath, ingestionJsonPath, sha256 };
}

// Left Hippocampus Ingestion Configuration
export const HIPPOCAMPUS_LEFT_INGESTION_CONFIG: IngestionOptions = {
  assetId: 'mesh.hippocampus.left.v1',
  sourceDataset: 'BodyParts3D (Database Center for Life Sciences - DBCLS, Japan)',
  sourceDatasetVersion: 'Release 3.0 (2011/06/20)',
  sourceAssetId: 'FMA72714',
  sourceUrl: 'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/master/assets/BodyParts3D_data/stl/FMA72714.stl',
  sourceLicense: 'CC-BY-SA 2.1 Japan / CC BY 4.0 International (Dual compliance)',
  sourceLicenseVersion: '2.1 JP / 4.0 Intl (DBCLS updated 2025-02-27)',
  attribution: 'BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-ShareAlike 2.1 Japan. Relicensed under CC Attribution 4.0 International.',
  originalFilename: 'FMA72714.stl',
  originalFormat: 'STL_BINARY',
  sourceCoordinateSpace: 'dicom_lps_whole_body',
  sourceUnits: 'millimeters (mm)',
  sourceMetadata: {
    fma_id: 'FMA72714',
    fma_name: 'left hippocampus',
    organ_type: 'central_nervous_system',
    polygon_reduction_rate: '95%',
    reference_atlases: [
      'The Human Central Nervous System 4th edition',
      'Atlas of the Human Brain, Third Edition',
      'Gray\'s Anatomy 40th edition',
      'SPL-PNL Brain Atlas 2008'
    ]
  }
};

// Right Hippocampus Ingestion Configuration (BodyParts3D Release 3.0)
export const HIPPOCAMPUS_RIGHT_INGESTION_CONFIG: IngestionOptions = {
  assetId: 'mesh.hippocampus.right.v1',
  sourceDataset: 'BodyParts3D (Database Center for Life Sciences - DBCLS, Japan)',
  sourceDatasetVersion: 'Release 3.0 (2011/06/20)',
  sourceAssetId: 'FMA72713',
  sourceUrl: 'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/master/assets/BodyParts3D_data/stl/FMA72713.stl',
  sourceLicense: 'CC-BY-SA 2.1 Japan / CC BY 4.0 International (Dual compliance)',
  sourceLicenseVersion: '2.1 JP / 4.0 Intl (DBCLS updated 2025-02-27)',
  attribution: 'BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-ShareAlike 2.1 Japan. Relicensed under CC Attribution 4.0 International.',
  originalFilename: 'FMA72713.stl',
  originalFormat: 'STL_BINARY',
  sourceCoordinateSpace: 'dicom_lps_whole_body',
  sourceUnits: 'millimeters (mm)',
  sourceMetadata: {
    fma_id: 'FMA72713',
    fma_name: 'right hippocampus',
    organ_type: 'central_nervous_system',
    polygon_reduction_rate: '95%',
    reference_atlases: [
      'The Human Central Nervous System 4th edition',
      'Atlas of the Human Brain, Third Edition',
      'Gray\'s Anatomy 40th edition',
      'SPL-PNL Brain Atlas 2008'
    ]
  }
};

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const targetConfig = process.argv[2]?.includes('right')
    ? HIPPOCAMPUS_RIGHT_INGESTION_CONFIG
    : HIPPOCAMPUS_LEFT_INGESTION_CONFIG;

  ingestAsset(targetConfig).catch((err) => {
    console.error('Ingestion failed:', err);
    process.exit(1);
  });
}
