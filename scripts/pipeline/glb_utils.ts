/**
 * 3D Neuroanatomy Atlas: glTF 2.0 Binary (GLB) Generator & Parser Utility
 * Standard: AAS-2026-NEURO-V1
 * 
 * Provides deterministic, dependency-free binary glTF 2.0 (.glb) serialization
 * and deserialization for canonical master meshes and LOD derivatives.
 */

import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

export interface MeshGeometryData {
  positions: Float32Array; // 3 floats per vertex (x, y, z)
  normals: Float32Array;   // 3 floats per vertex (nx, ny, nz)
  indices: Uint16Array | Uint32Array; // 3 indices per triangle
  nodeName?: string;
  meshName?: string;
}

export interface BoundingVolume {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  dimensions: [number, number, number];
  radius: number;
}

/**
 * Calculates bounding box, centroid, dimensions, and bounding sphere radius.
 */
export function computeBoundingVolume(positions: Float32Array): BoundingVolume {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const center: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  ];

  const dimensions: [number, number, number] = [
    maxX - minX,
    maxY - minY,
    maxZ - minZ
  ];

  let maxRadiusSq = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - center[0];
    const dy = positions[i + 1] - center[1];
    const dz = positions[i + 2] - center[2];
    const rSq = dx * dx + dy * dy + dz * dz;
    if (rSq > maxRadiusSq) maxRadiusSq = rSq;
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center,
    dimensions,
    radius: Math.sqrt(maxRadiusSq)
  };
}

/**
 * Computes area-weighted vertex normals from positions and triangle indices.
 */
export function computeVertexNormals(positions: Float32Array, indices: Uint16Array | Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  const numTriangles = indices.length / 3;

  for (let i = 0; i < numTriangles; i++) {
    const i0 = indices[i * 3];
    const i1 = indices[i * 3 + 1];
    const i2 = indices[i * 3 + 2];

    const ax = positions[i0 * 3];
    const ay = positions[i0 * 3 + 1];
    const az = positions[i0 * 3 + 2];

    const bx = positions[i1 * 3];
    const by = positions[i1 * 3 + 1];
    const bz = positions[i1 * 3 + 2];

    const cx = positions[i2 * 3];
    const cy = positions[i2 * 3 + 1];
    const cz = positions[i2 * 3 + 2];

    // Vector ab = b - a
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;

    // Vector ac = c - a
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;

    // Cross product ab x ac
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    // Accumulate weighted normals to vertices
    normals[i0 * 3] += nx;
    normals[i0 * 3 + 1] += ny;
    normals[i0 * 3 + 2] += nz;

    normals[i1 * 3] += nx;
    normals[i1 * 3 + 1] += ny;
    normals[i1 * 3 + 2] += nz;

    normals[i2 * 3] += nx;
    normals[i2 * 3 + 1] += ny;
    normals[i2 * 3 + 2] += nz;
  }

  // Normalize all vertex normals
  const numVerts = positions.length / 3;
  for (let i = 0; i < numVerts; i++) {
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-8) {
      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    } else {
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 1;
      normals[i * 3 + 2] = 0;
    }
  }

  return normals;
}

/**
 * Creates an uncompressed standard glTF 2.0 Binary (.glb) buffer.
 */
export function buildGLB(mesh: MeshGeometryData): Buffer {
  const nodeName = mesh.nodeName || 'AnatomicalMesh';
  const meshName = mesh.meshName || nodeName;
  const numVerts = mesh.positions.length / 3;
  const numIndices = mesh.indices.length;
  const bounds = computeBoundingVolume(mesh.positions);

  const isUint32 = mesh.indices instanceof Uint32Array || numVerts > 65535;
  const indexComponentType = isUint32 ? 5125 : 5123; // 5125 = UNSIGNED_INT, 5123 = UNSIGNED_SHORT
  const indexByteLength = isUint32 ? numIndices * 4 : numIndices * 2;

  // Align byte offsets to 4-byte boundaries
  const posOffset = 0;
  const posByteLength = mesh.positions.byteLength; // numVerts * 12

  const normOffset = posOffset + posByteLength;
  const normByteLength = mesh.normals.byteLength; // numVerts * 12

  const idxOffset = normOffset + normByteLength;
  const idxByteLength = indexByteLength;

  let totalBinLength = idxOffset + idxByteLength;
  const padding = (4 - (totalBinLength % 4)) % 4;
  totalBinLength += padding;

  const binBuffer = Buffer.alloc(totalBinLength);

  // Copy positions
  Buffer.from(mesh.positions.buffer, mesh.positions.byteOffset, mesh.positions.byteLength).copy(binBuffer, posOffset);

  // Copy normals
  Buffer.from(mesh.normals.buffer, mesh.normals.byteOffset, mesh.normals.byteLength).copy(binBuffer, normOffset);

  // Copy indices
  if (isUint32) {
    const uint32Array = mesh.indices instanceof Uint32Array ? mesh.indices : new Uint32Array(mesh.indices);
    Buffer.from(uint32Array.buffer, uint32Array.byteOffset, uint32Array.byteLength).copy(binBuffer, idxOffset);
  } else {
    const uint16Array = mesh.indices instanceof Uint16Array ? mesh.indices : new Uint16Array(mesh.indices);
    Buffer.from(uint16Array.buffer, uint16Array.byteOffset, uint16Array.byteLength).copy(binBuffer, idxOffset);
  }

  const gltf = {
    asset: {
      version: '2.0',
      generator: 'NeuroAtlas3D Canonical Asset Pipeline v1.0'
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: nodeName, mesh: 0 }],
    meshes: [
      {
        name: meshName,
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1
            },
            indices: 2,
            mode: 4 // TRIANGLES
          }
        ]
      }
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: numVerts,
        type: 'VEC3',
        min: bounds.min,
        max: bounds.max
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: numVerts,
        type: 'VEC3'
      },
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: indexComponentType,
        count: numIndices,
        type: 'SCALAR'
      }
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: posOffset,
        byteLength: posByteLength,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: normOffset,
        byteLength: normByteLength,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: idxOffset,
        byteLength: idxByteLength,
        target: 34963 // ELEMENT_ARRAY_BUFFER
      }
    ],
    buffers: [
      {
        byteLength: totalBinLength
      }
    ]
  };

  const jsonString = JSON.stringify(gltf);
  let jsonBuffer = Buffer.from(jsonString, 'utf8');
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  if (jsonPadding > 0) {
    const padBuf = Buffer.alloc(jsonPadding, 0x20); // Pad with spaces per glTF 2.0 spec
    jsonBuffer = Buffer.concat([jsonBuffer, padBuf]);
  }

  const totalGlbLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const glb = Buffer.alloc(totalGlbLength);

  // GLB Header (12 bytes)
  glb.writeUInt32LE(0x46546c67, 0); // magic: "glTF"
  glb.writeUInt32LE(2, 4);          // version: 2
  glb.writeUInt32LE(totalGlbLength, 8); // total file length

  // Chunk 0: JSON Chunk
  glb.writeUInt32LE(jsonBuffer.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16); // "JSON"
  jsonBuffer.copy(glb, 20);

  // Chunk 1: BIN Chunk
  const binHeaderOffset = 20 + jsonBuffer.length;
  glb.writeUInt32LE(binBuffer.length, binHeaderOffset);
  glb.writeUInt32LE(0x004e4942, binHeaderOffset + 4); // "BIN\0"
  binBuffer.copy(glb, binHeaderOffset + 8);

  return glb;
}

/**
 * Parses an uncompressed glTF 2.0 Binary (.glb) buffer back into MeshGeometryData.
 */
export function parseGLB(glbBuffer: Buffer): { gltf: any; geometry: MeshGeometryData; bounds: BoundingVolume } {
  const magic = glbBuffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    throw new Error('Invalid GLB magic number. Expected 0x46546C67 ("glTF").');
  }
  const version = glbBuffer.readUInt32LE(4);
  if (version !== 2) {
    throw new Error(`Unsupported GLB version ${version}. Expected version 2.`);
  }
  const totalLength = glbBuffer.readUInt32LE(8);
  if (totalLength !== glbBuffer.length) {
    throw new Error(`GLB totalLength header ${totalLength} does not match buffer length ${glbBuffer.length}.`);
  }

  // Chunk 0
  const jsonLength = glbBuffer.readUInt32LE(12);
  const jsonType = glbBuffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) {
    throw new Error('Expected Chunk 0 to be JSON.');
  }
  const jsonBytes = glbBuffer.subarray(20, 20 + jsonLength);
  const gltf = JSON.parse(jsonBytes.toString('utf8'));

  // Chunk 1
  const binOffset = 20 + jsonLength;
  const binLength = glbBuffer.readUInt32LE(binOffset);
  const binType = glbBuffer.readUInt32LE(binOffset + 4);
  if (binType !== 0x004e4942) {
    throw new Error('Expected Chunk 1 to be BIN.');
  }
  const binBytes = glbBuffer.subarray(binOffset + 8, binOffset + 8 + binLength);

  // Accessors
  const posAccessor = gltf.accessors[0];
  const normAccessor = gltf.accessors[1];
  const idxAccessor = gltf.accessors[2];

  const posView = gltf.bufferViews[posAccessor.bufferView];
  const normView = gltf.bufferViews[normAccessor.bufferView];
  const idxView = gltf.bufferViews[idxAccessor.bufferView];

  const posStart = posView.byteOffset || 0;
  const normStart = normView.byteOffset || 0;
  const idxStart = idxView.byteOffset || 0;

  const positions = new Float32Array(binBytes.buffer, binBytes.byteOffset + posStart, posAccessor.count * 3);
  const normals = new Float32Array(binBytes.buffer, binBytes.byteOffset + normStart, normAccessor.count * 3);

  let indices: Uint16Array | Uint32Array;
  if (idxAccessor.componentType === 5125) {
    indices = new Uint32Array(binBytes.buffer, binBytes.byteOffset + idxStart, idxAccessor.count);
  } else {
    indices = new Uint16Array(binBytes.buffer, binBytes.byteOffset + idxStart, idxAccessor.count);
  }

  const geometry: MeshGeometryData = {
    positions,
    normals,
    indices,
    nodeName: gltf.nodes?.[0]?.name,
    meshName: gltf.meshes?.[0]?.name
  };

  const bounds = computeBoundingVolume(positions);

  return { gltf, geometry, bounds };
}

/**
 * Creates a Meshopt-compressed glTF 2.0 Binary (.glb) buffer using EXT_meshopt_compression.
 */
export async function buildMeshoptGLB(mesh: MeshGeometryData): Promise<Buffer> {
  await MeshoptEncoder.ready;

  const nodeName = mesh.nodeName || 'AnatomicalMesh';
  const meshName = mesh.meshName || nodeName;
  const numVerts = mesh.positions.length / 3;
  const numIndices = mesh.indices.length;
  const bounds = computeBoundingVolume(mesh.positions);

  const isUint32 = mesh.indices instanceof Uint32Array || numVerts > 65535;
  const indexComponentType = isUint32 ? 5125 : 5123;
  const indexByteStride = isUint32 ? 4 : 2;

  const posBytes = Buffer.from(mesh.positions.buffer, mesh.positions.byteOffset, mesh.positions.byteLength);
  const normBytes = Buffer.from(mesh.normals.buffer, mesh.normals.byteOffset, mesh.normals.byteLength);
  const idxBytes = Buffer.from(mesh.indices.buffer, mesh.indices.byteOffset, mesh.indices.byteLength);

  const encPos = MeshoptEncoder.encodeGltfBuffer(posBytes, numVerts, 12, 'ATTRIBUTES');
  const encNorm = MeshoptEncoder.encodeGltfBuffer(normBytes, numVerts, 12, 'ATTRIBUTES');
  const encIdx = MeshoptEncoder.encodeGltfBuffer(idxBytes, numIndices, indexByteStride, 'TRIANGLES');

  // Pack encoded chunks into BIN with 4-byte padding
  const posOffset = 0;
  const posPad = (4 - (encPos.length % 4)) % 4;
  const posTotal = encPos.length + posPad;

  const normOffset = posOffset + posTotal;
  const normPad = (4 - (encNorm.length % 4)) % 4;
  const normTotal = encNorm.length + normPad;

  const idxOffset = normOffset + normTotal;
  const idxPad = (4 - (encIdx.length % 4)) % 4;
  const idxTotal = encIdx.length + idxPad;

  const totalBinLength = idxOffset + idxTotal;
  const binBuffer = Buffer.alloc(totalBinLength);

  Buffer.from(encPos.buffer, encPos.byteOffset, encPos.byteLength).copy(binBuffer, posOffset);
  Buffer.from(encNorm.buffer, encNorm.byteOffset, encNorm.byteLength).copy(binBuffer, normOffset);
  Buffer.from(encIdx.buffer, encIdx.byteOffset, encIdx.byteLength).copy(binBuffer, idxOffset);

  const gltf = {
    asset: {
      version: '2.0',
      generator: 'NeuroAtlas3D Meshopt Runtime Pipeline v1.0'
    },
    extensionsUsed: ['EXT_meshopt_compression'],
    extensionsRequired: ['EXT_meshopt_compression'],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: nodeName, mesh: 0 }],
    meshes: [
      {
        name: meshName,
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1
            },
            indices: 2,
            mode: 4
          }
        ]
      }
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: numVerts,
        type: 'VEC3',
        min: bounds.min,
        max: bounds.max
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: numVerts,
        type: 'VEC3'
      },
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: indexComponentType,
        count: numIndices,
        type: 'SCALAR'
      }
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: mesh.positions.byteLength,
        byteStride: 12,
        target: 34962,
        extensions: {
          EXT_meshopt_compression: {
            buffer: 0,
            byteOffset: posOffset,
            byteLength: encPos.length,
            byteStride: 12,
            mode: 'ATTRIBUTES',
            count: numVerts
          }
        }
      },
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: mesh.normals.byteLength,
        byteStride: 12,
        target: 34962,
        extensions: {
          EXT_meshopt_compression: {
            buffer: 0,
            byteOffset: normOffset,
            byteLength: encNorm.length,
            byteStride: 12,
            mode: 'ATTRIBUTES',
            count: numVerts
          }
        }
      },
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: mesh.indices.byteLength,
        target: 34963,
        extensions: {
          EXT_meshopt_compression: {
            buffer: 0,
            byteOffset: idxOffset,
            byteLength: encIdx.length,
            byteStride: indexByteStride,
            mode: 'TRIANGLES',
            count: numIndices
          }
        }
      }
    ],
    buffers: [
      {
        byteLength: totalBinLength
      }
    ]
  };

  const jsonString = JSON.stringify(gltf);
  let jsonBuffer = Buffer.from(jsonString, 'utf8');
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  if (jsonPadding > 0) {
    const padBuf = Buffer.alloc(jsonPadding, 0x20);
    jsonBuffer = Buffer.concat([jsonBuffer, padBuf]);
  }

  const totalGlbLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const glb = Buffer.alloc(totalGlbLength);

  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(totalGlbLength, 8);

  glb.writeUInt32LE(jsonBuffer.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  jsonBuffer.copy(glb, 20);

  const binHeaderOffset = 20 + jsonBuffer.length;
  glb.writeUInt32LE(binBuffer.length, binHeaderOffset);
  glb.writeUInt32LE(0x004e4942, binHeaderOffset + 4);
  binBuffer.copy(glb, binHeaderOffset + 8);

  return glb;
}

/**
 * Parses a Meshopt-compressed glTF 2.0 Binary (.glb) buffer back into MeshGeometryData.
 */
export async function parseMeshoptGLB(glbBuffer: Buffer): Promise<{ gltf: any; geometry: MeshGeometryData; bounds: BoundingVolume }> {
  await MeshoptDecoder.ready;

  const magic = glbBuffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    throw new Error('Invalid GLB magic number.');
  }

  const jsonLength = glbBuffer.readUInt32LE(12);
  const jsonBytes = glbBuffer.subarray(20, 20 + jsonLength);
  const gltf = JSON.parse(jsonBytes.toString('utf8'));

  const binOffset = 20 + jsonLength;
  const binLength = glbBuffer.readUInt32LE(binOffset);
  const binBytes = glbBuffer.subarray(binOffset + 8, binOffset + 8 + binLength);

  const posAccessor = gltf.accessors[0];
  const normAccessor = gltf.accessors[1];
  const idxAccessor = gltf.accessors[2];

  const posView = gltf.bufferViews[posAccessor.bufferView];
  const normView = gltf.bufferViews[normAccessor.bufferView];
  const idxView = gltf.bufferViews[idxAccessor.bufferView];

  const posExt = posView.extensions?.EXT_meshopt_compression;
  const normExt = normView.extensions?.EXT_meshopt_compression;
  const idxExt = idxView.extensions?.EXT_meshopt_compression;

  if (!posExt || !normExt || !idxExt) {
    throw new Error('GLB does not contain valid EXT_meshopt_compression extension data.');
  }

  // Decompress positions
  const rawPos = new Uint8Array(posView.byteLength);
  const compPos = binBytes.subarray(posExt.byteOffset, posExt.byteOffset + posExt.byteLength);
  MeshoptDecoder.decodeGltfBuffer(rawPos, posExt.count, posExt.byteStride, compPos, posExt.mode);
  const positions = new Float32Array(rawPos.buffer, rawPos.byteOffset, posExt.count * 3);

  // Decompress normals
  const rawNorm = new Uint8Array(normView.byteLength);
  const compNorm = binBytes.subarray(normExt.byteOffset, normExt.byteOffset + normExt.byteLength);
  MeshoptDecoder.decodeGltfBuffer(rawNorm, normExt.count, normExt.byteStride, compNorm, normExt.mode);
  const normals = new Float32Array(rawNorm.buffer, rawNorm.byteOffset, normExt.count * 3);

  // Decompress indices
  const rawIdx = new Uint8Array(idxView.byteLength);
  const compIdx = binBytes.subarray(idxExt.byteOffset, idxExt.byteOffset + idxExt.byteLength);
  MeshoptDecoder.decodeGltfBuffer(rawIdx, idxExt.count, idxExt.byteStride, compIdx, idxExt.mode);

  let indices: Uint16Array | Uint32Array;
  if (idxAccessor.componentType === 5125) {
    indices = new Uint32Array(rawIdx.buffer, rawIdx.byteOffset, idxExt.count);
  } else {
    indices = new Uint16Array(rawIdx.buffer, rawIdx.byteOffset, idxExt.count);
  }

  const geometry: MeshGeometryData = {
    positions,
    normals,
    indices,
    nodeName: gltf.nodes?.[0]?.name,
    meshName: gltf.meshes?.[0]?.name
  };

  const bounds = computeBoundingVolume(positions);

  return { gltf, geometry, bounds };
}
