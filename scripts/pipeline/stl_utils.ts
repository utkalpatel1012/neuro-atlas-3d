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
  connectedShellCount: number; // Measured disjoint triangle-connected shells (union-find on deduped
  // vertex indices). Edge-based watertightness cannot distinguish 1 continuous surface from N
  // closed shells; this count makes that distinction explicit. Added Phase 3.1.
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
  let uniqueCap = Math.min(numTriangles, 250000);
  let uniquePositions = new Float32Array(uniqueCap * 3);
  let uniqueCount = 0;
  const indices = new Uint32Array(numTriangles * 3);

  let zeroAreaFaces = 0;
  let surfaceAreaMm2 = 0;
  let signedVolumeSum = 0;

  const faceSet = new Set<string>();
  let duplicateFaces = 0;

  // Track edges using 64-bit integer packing: (min << 32) | max
  const edgeArray = new BigInt64Array(numTriangles * 3);

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let sumX = 0, sumY = 0, sumZ = 0;

  function getOrAddVertex(x: number, y: number, z: number): number {
    const kx = Math.round(x * 10000);
    const ky = Math.round(y * 10000);
    const kz = Math.round(z * 10000);
    const key = `${kx},${ky},${kz}`;
    let idx = vertexMap.get(key);
    if (idx === undefined) {
      idx = uniqueCount++;
      if (uniqueCount * 3 > uniquePositions.length) {
        const next = new Float32Array(uniquePositions.length * 2);
        next.set(uniquePositions);
        uniquePositions = next;
      }
      vertexMap.set(key, idx);
      uniquePositions[idx * 3] = x;
      uniquePositions[idx * 3 + 1] = y;
      uniquePositions[idx * 3 + 2] = z;

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

    const triIdx = i * 3;
    indices[triIdx] = i0;
    indices[triIdx + 1] = i1;
    indices[triIdx + 2] = i2;

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

    // Duplicate face detection without array allocations
    let fa = i0, fb = i1, fc = i2;
    if (fa > fb) { const t = fa; fa = fb; fb = t; }
    if (fb > fc) { const t = fb; fb = fc; fc = t; }
    if (fa > fb) { const t = fa; fa = fb; fb = t; }
    const sortedFaceKey = `${fa}:${fb}:${fc}`;
    if (faceSet.has(sortedFaceKey)) {
      duplicateFaces++;
    } else {
      faceSet.add(sortedFaceKey);
    }

    // Edges packed into 64-bit int: (min << 32) | max
    const e0min = i0 < i1 ? i0 : i1;
    const e0max = i0 < i1 ? i1 : i0;
    edgeArray[triIdx] = (BigInt(e0min) << 32n) | BigInt(e0max);

    const e1min = i1 < i2 ? i1 : i2;
    const e1max = i1 < i2 ? i2 : i1;
    edgeArray[triIdx + 1] = (BigInt(e1min) << 32n) | BigInt(e1max);

    const e2min = i2 < i0 ? i2 : i0;
    const e2max = i2 < i0 ? i0 : i2;
    edgeArray[triIdx + 2] = (BigInt(e2min) << 32n) | BigInt(e2max);
  }

  // Sort edges to analyze multiplicity in a single linear pass
  edgeArray.sort();

  let nonManifoldEdges = 0;
  let boundaryEdges = 0;
  let manifoldEdges = 0;

  if (edgeArray.length > 0) {
    let curEdge = edgeArray[0];
    let count = 1;
    for (let j = 1; j < edgeArray.length; j++) {
      if (edgeArray[j] === curEdge) {
        count++;
      } else {
        if (count === 2) {
          manifoldEdges++;
        } else if (count === 1) {
          boundaryEdges++;
        } else {
          nonManifoldEdges++;
        }
        curEdge = edgeArray[j];
        count = 1;
      }
    }
    if (count === 2) {
      manifoldEdges++;
    } else if (count === 1) {
      boundaryEdges++;
    } else {
      nonManifoldEdges++;
    }
  }

  const isWatertight = boundaryEdges === 0 && nonManifoldEdges === 0;
  const numUnique = uniqueCount;

  // Connected-shell analysis: union-find over triangle vertex adjacency.
  // Uses the FINAL deduplicated index buffer so coincident vertices shared across
  // concatenated components merge (tolerance: spatial-hash quantization at 1e-4 mm).
  const shellParent = new Int32Array(numUnique);
  for (let v = 0; v < numUnique; v++) shellParent[v] = v;
  function shellFind(a: number): number {
    let root = a;
    while (shellParent[root] !== root) root = shellParent[root];
    while (shellParent[a] !== root) { const nxt = shellParent[a]; shellParent[a] = root; a = nxt; }
    return root;
  }
  const triTotal = indices.length / 3;
  for (let t = 0; t < triTotal; t++) {
    const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2];
    const ra = shellFind(a), rb = shellFind(b), rc = shellFind(c);
    const root = Math.min(ra, rb, rc);
    shellParent[ra] = root; shellParent[rb] = root; shellParent[rc] = root;
  }
  const shellRoots = new Set<number>();
  for (let v = 0; v < numUnique; v++) shellRoots.add(shellFind(v));
  const connectedShellCount = shellRoots.size;

  const positions = uniquePositions.slice(0, numUnique * 3);
  const centroid: [number, number, number] = [
    sumX / numUnique,
    sumY / numUnique,
    sumZ / numUnique
  ];

  const finalIndices = numUnique <= 65535 ? new Uint16Array(indices) : indices;

  return {
    triangleCount: numTriangles,
    rawVertexCount: numTriangles * 3,
    uniqueVertexCount: numUnique,
    positions,
    indices: finalIndices,
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
    isWatertight,
    connectedShellCount
  };
}
