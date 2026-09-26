/**
 * 3D Neuroanatomy Atlas: STL Binary Parser and Geometric Topology Auditor
 * Standard: AAS-2026-NEURO-V1
 */

export interface STLMeshAnalysis {
  triangleCount: number;
  rawVertexCount: number;
  uniqueVertexCount: number;
  positions: Float32Array; // 3 floats per unique vertex
  indices: Uint16Array | Uint32Array; // 3 indices per triangle
  minBounds: [number, number, number];
  maxBounds: [number, number, number];
  centroid: [number, number, number];
  dimensions: [number, number, number];
  surfaceAreaMm2: number;
  estimatedVolumeMm3: number;
  zeroAreaFaces: number;
  duplicateFaces: number;
  nonManifoldEdges: number;
  boundaryEdges: number;
  manifoldEdges: number;
  isWatertight: boolean;
}

/**
 * Parses binary STL buffer and performs rigorous topological and geometric audit.
 */
export function parseAndAuditSTL(stlBuffer: Buffer): STLMeshAnalysis {
  if (stlBuffer.length < 84) {
    throw new Error('STL buffer is too small to be a valid binary STL file.');
  }

  const numTriangles = stlBuffer.readUInt32LE(80);
  const expectedSize = 84 + numTriangles * 50;
  if (stlBuffer.length < expectedSize) {
    throw new Error(`STL buffer size mismatch. Expected at least ${expectedSize} bytes, got ${stlBuffer.length}.`);
  }

  // Map unique vertices using spatial hash
  const vertexMap = new Map<string, number>();
  const uniquePositions: number[] = [];
  const indicesList: number[] = [];

  let zeroAreaFaces = 0;
  let surfaceAreaMm2 = 0;
  let signedVolumeSum = 0;

  // Track edges for manifoldness: key = "minIdx:maxIdx", value = count of sharing triangles
  const edgeCountMap = new Map<string, number>();
  const faceSet = new Set<string>();
  let duplicateFaces = 0;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let sumX = 0, sumY = 0, sumZ = 0;

  function getOrAddVertex(x: number, y: number, z: number): number {
    // Quantize to 0.0001 mm (0.1 micron) for welding exact duplicate vertices
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    let idx = vertexMap.get(key);
    if (idx === undefined) {
      idx = uniquePositions.length / 3;
      vertexMap.set(key, idx);
      uniquePositions.push(x, y, z);

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;

      sumX += x;
      sumY += y;
      sumZ += z;
    }
    return idx;
  }

  for (let i = 0; i < numTriangles; i++) {
    const offset = 84 + i * 50;

    // Read vertices (offset + 12 to offset + 48)
    const v0x = stlBuffer.readFloatLE(offset + 12);
    const v0y = stlBuffer.readFloatLE(offset + 16);
    const v0z = stlBuffer.readFloatLE(offset + 20);

    const v1x = stlBuffer.readFloatLE(offset + 24);
    const v1y = stlBuffer.readFloatLE(offset + 28);
    const v1z = stlBuffer.readFloatLE(offset + 32);

    const v2x = stlBuffer.readFloatLE(offset + 36);
    const v2y = stlBuffer.readFloatLE(offset + 40);
    const v2z = stlBuffer.readFloatLE(offset + 44);

    const i0 = getOrAddVertex(v0x, v0y, v0z);
    const i1 = getOrAddVertex(v1x, v1y, v1z);
    const i2 = getOrAddVertex(v2x, v2y, v2z);

    indicesList.push(i0, i1, i2);

    // Calculate face area via cross product
    const abx = v1x - v0x, aby = v1y - v0y, abz = v1z - v0z;
    const acx = v2x - v0x, acy = v2y - v0y, acz = v2z - v0z;

    const crossX = aby * acz - abz * acy;
    const crossY = abz * acx - abx * acz;
    const crossZ = abx * acy - aby * acx;

    const area = 0.5 * Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
    surfaceAreaMm2 += area;
    if (area < 1e-7) {
      zeroAreaFaces++;
    }

    // Divergence theorem signed volume tetrahedron sum
    // V = (1/6) * |v0 . (v1 x v2)|
    const det = v0x * (v1y * v2z - v1z * v2y) - v0y * (v1x * v2z - v1z * v2x) + v0z * (v1x * v2y - v1y * v2x);
    signedVolumeSum += det;

    // Duplicate face detection
    const sortedFaceKey = [i0, i1, i2].sort((a, b) => a - b).join(':');
    if (faceSet.has(sortedFaceKey)) {
      duplicateFaces++;
    } else {
      faceSet.add(sortedFaceKey);
    }

    // Edges
    const edges = [
      i0 < i1 ? `${i0}:${i1}` : `${i1}:${i0}`,
      i1 < i2 ? `${i1}:${i2}` : `${i2}:${i1}`,
      i2 < i0 ? `${i2}:${i0}` : `${i0}:${i2}`
    ];
    for (const e of edges) {
      edgeCountMap.set(e, (edgeCountMap.get(e) || 0) + 1);
    }
  }

  let nonManifoldEdges = 0;
  let boundaryEdges = 0;
  let manifoldEdges = 0;

  for (const count of edgeCountMap.values()) {
    if (count === 2) {
      manifoldEdges++;
    } else if (count === 1) {
      boundaryEdges++;
    } else {
      nonManifoldEdges++;
    }
  }

  const isWatertight = boundaryEdges === 0 && nonManifoldEdges === 0;
  const numUnique = uniquePositions.length / 3;
  const centroid: [number, number, number] = [
    sumX / numUnique,
    sumY / numUnique,
    sumZ / numUnique
  ];

  const positions = new Float32Array(uniquePositions);
  const isUint32 = numUnique > 65535;
  const indices = isUint32 ? new Uint32Array(indicesList) : new Uint16Array(indicesList);

  return {
    triangleCount: numTriangles,
    rawVertexCount: numTriangles * 3,
    uniqueVertexCount: numUnique,
    positions,
    indices,
    minBounds: [minX, minY, minZ],
    maxBounds: [maxX, maxY, maxZ],
    centroid,
    dimensions: [maxX - minX, maxY - minY, maxZ - minZ],
    surfaceAreaMm2,
    estimatedVolumeMm3: Math.abs(signedVolumeSum / 6.0),
    zeroAreaFaces,
    duplicateFaces,
    nonManifoldEdges,
    boundaryEdges,
    manifoldEdges,
    isWatertight
  };
}
