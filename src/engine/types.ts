/**
 * 3D Neuroanatomy Atlas: Rendering Engine Type Definitions
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Defines core contracts for the rendering engine, capability detection,
 * performance profiles, LOD management, and anatomical entity mappings.
 */

export type BackendType = 'webgpu' | 'webgl2' | 'webgl' | 'unsupported';

export interface DeviceAdapterInfo {
  vendor: string;
  architecture?: string;
  device?: string;
  description?: string;
}

export interface CapabilityReport {
  hasWebGPU: boolean;
  hasWebGL2: boolean;
  hasWebGL: boolean;
  preferredBackend: BackendType;
  activeBackend: BackendType;
  adapterInfo?: DeviceAdapterInfo;
  maxTextureSize: number;
  maxSamples: number;
  supportsFloatTextures: boolean;
  supportsMeshopt: boolean;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent: string;
}

export type PerformanceProfileType = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PerformanceProfile {
  id: PerformanceProfileType;
  maxPixelRatio: number;
  antialias: boolean;
  shadowsEnabled: boolean;
  lodDistanceMultiplier: number;
  maxResidentMeshes: number;
  targetFps: number;
}

export const PERFORMANCE_PROFILES: Record<PerformanceProfileType, PerformanceProfile> = {
  HIGH: {
    id: 'HIGH',
    maxPixelRatio: 2.0,
    antialias: true,
    shadowsEnabled: false, // Standard diffuse medical lighting; soft ambient
    lodDistanceMultiplier: 1.0,
    maxResidentMeshes: 200,
    targetFps: 60
  },
  MEDIUM: {
    id: 'MEDIUM',
    maxPixelRatio: 1.5,
    antialias: true,
    shadowsEnabled: false,
    lodDistanceMultiplier: 0.8, // Switches to lower LOD slightly sooner
    maxResidentMeshes: 100,
    targetFps: 60
  },
  LOW: {
    id: 'LOW',
    maxPixelRatio: 1.0,
    antialias: false,
    shadowsEnabled: false,
    lodDistanceMultiplier: 0.6,
    maxResidentMeshes: 50,
    targetFps: 30
  }
};

export type LODLevel = 'lod0' | 'lod1' | 'lod2' | 'lod3';
export type LODMode = 'AUTO' | 'LOD0' | 'LOD1' | 'LOD2' | 'LOD3';

export interface LODState {
  mode: LODMode;
  activeLevel: LODLevel;
  distanceMm: number;
  triangleCount: number;
}

export interface AnatomicalEntityRecord {
  entityId: string;
  assetId: string;
  name: string;
  officialLatin: string;
  laterality: 'left' | 'right' | 'midline' | 'bilateral';
  canonicalCentroidMm: [number, number, number];
  dimensionsMm: [number, number, number];
  volumeCm3: number;
  topologyClass: string;
  validationStatus: string;
  upstreamDataset: string;
  upstreamLicense: string;
  sourceDefinition: string;
  groups?: string[];
  status?: 'AVAILABLE' | 'UNAVAILABLE' | 'PENDING_INGESTION';
}

export type GroupCategory =
  | 'division'
  | 'hemisphere'
  | 'system'
  | 'lobe'
  | 'region'
  | 'tract_bundle'
  | 'parcellation';

export interface AnatomicalGroup {
  groupId: string;
  name: string;
  category: GroupCategory;
  parentGroupId?: string;
  childGroupIds: string[];
  memberEntityIds: string[];
  status: 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'UNAVAILABLE';
  description?: string;
}

export type AssetLoadingState =
  | 'NOT_LOADED'
  | 'LOADING'
  | 'LOADED'
  | 'FAILED'
  | 'UNLOADING'
  | 'CACHED';

export type VisibilityState = 'VISIBLE' | 'HIDDEN' | 'ISOLATED' | 'ANCESTOR_HIDDEN';

export type EntityVisualState =
  | 'DEFAULT'
  | 'HOVER'
  | 'SELECTED'
  | 'GROUP_SELECTED'
  | 'GHOSTED'
  | 'HIDDEN';

export interface MultiSelectionState {
  selectedEntityIds: Set<string>;
  selectedGroupIds: Set<string>;
  primaryEntityId: string | null;
  primaryGroupId: string | null;
}

export interface InteractionState {
  hoveredEntityId: string | null;
  selectedEntityId: string | null;
  selectedGroupIds: Set<string>;
  isolatedEntityId: string | null;
  isolatedGroupId: string | null;
  hiddenEntityIds: Set<string>;
  hiddenGroupIds: Set<string>;
}

export type CameraViewPreset =
  | 'isometric'
  | 'anterior'
  | 'posterior'
  | 'superior'
  | 'lateral_left'
  | 'medial_left';

export interface TelemetryMetrics {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  activeBackend: BackendType;
  activeLOD: LODLevel;
  residentAssets: number;
  cameraDistanceMm: number;
  pixelRatio: number;
  totalEntities?: number;
  loadedEntities?: number;
  failedEntities?: number;
  visibleEntities?: number;
  hiddenEntities?: number;
  selectedEntityName?: string | null;
  selectedGroupName?: string | null;
}
