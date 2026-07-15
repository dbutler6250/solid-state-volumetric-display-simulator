import { MAX_STL_TRIANGLES } from './limits';
import type { MeshGeometry, MeshTriangle, MeshPoint3D } from './types';

/** Throws when an STL declares more triangles than the slicer supports. */
export function assertStlTriangleCountWithinLimit(triangleCount: number): void {
  if (!Number.isFinite(triangleCount) || Math.round(triangleCount) !== triangleCount) {
    throw new Error('The STL file declares an invalid triangle count.');
  }
  if (triangleCount > MAX_STL_TRIANGLES) {
    throw new Error(`The STL file contains more than ${MAX_STL_TRIANGLES} triangles.`);
  }
}

/** Parses STL file bytes into a reusable mesh geometry, supporting ASCII and binary inputs. */
export function parseStlBytes(bytes: ArrayBuffer): MeshGeometry {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.byteLength, 2048)));
  if (text.trimStart().startsWith('solid')) {
    try {
      return parseAsciiStl(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
    } catch {
      // Fall through to binary parsing when an ASCII-looking file is malformed.
    }
  }

  return parseBinaryStl(bytes);
}

/** Parses a first-pass ASCII STL string into a reusable mesh geometry. */
export function parseAsciiStl(text: string): MeshGeometry {
  const vertices: MeshPoint3D[] = [];
  const triangles: MeshTriangle[] = [];
  const vertexLookup = new Map<string, number>();

  const lines = text.split(/\r?\n/);
  let currentFacet: number[] = [];
  let facetVertexCount = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('solid') || line.startsWith('endsolid') || line.startsWith('facet') || line.startsWith('endfacet') || line.startsWith('outer loop') || line.startsWith('endloop')) {
      continue;
    }
    if (!line.startsWith('vertex ')) continue;

    const parts = line.split(/\s+/);
    if (parts.length !== 4) {
      throw new Error('The STL file contains a malformed vertex line.');
    }

    const x = Number(parts[1]);
    const y = Number(parts[2]);
    const z = Number(parts[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error('The STL file contains a non-finite vertex coordinate.');
    }

    const key = `${x}:${y}:${z}`;
    let index = vertexLookup.get(key);
    if (index === undefined) {
      index = vertices.length;
      vertices.push([x, y, z]);
      vertexLookup.set(key, index);
    }

    currentFacet.push(index);
    facetVertexCount += 1;
    if (currentFacet.length === 3) {
      triangles.push([currentFacet[0], currentFacet[1], currentFacet[2]]);
      assertStlTriangleCountWithinLimit(triangles.length);
      currentFacet = [];
    }
  }

  if (facetVertexCount > 0 && currentFacet.length !== 0) {
    throw new Error('The STL file ended before a facet had three vertices.');
  }
  if (facetVertexCount > 0 && facetVertexCount % 3 !== 0) {
    throw new Error('The STL file contained an incomplete facet.');
  }
  if (vertices.length === 0 || triangles.length === 0) {
    throw new Error('The STL file did not contain any triangles.');
  }

  validateMeshTopology({ vertices, triangles });

  return { vertices, triangles };
}

function parseBinaryStl(bytes: ArrayBuffer): MeshGeometry {
  const view = new DataView(bytes);
  if (view.byteLength < 84) {
    throw new Error('The STL file is too small to be valid.');
  }

  const triangleCount = view.getUint32(80, true);
  assertStlTriangleCountWithinLimit(triangleCount);
  const expectedLength = 84 + triangleCount * 50;
  if (view.byteLength < expectedLength) {
    throw new Error('The binary STL file is truncated.');
  }
  if (view.byteLength > expectedLength) {
    throw new Error('The binary STL file contains unexpected trailing bytes.');
  }

  const vertices: MeshPoint3D[] = [];
  const triangles: MeshTriangle[] = [];
  const vertexLookup = new Map<string, number>();
  let offset = 84;
  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    offset += 12;
    const indices: number[] = [];
    for (let vertexIndex = 0; vertexIndex < 3; vertexIndex += 1) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);
      offset += 12;
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        throw new Error('The binary STL file contains a non-finite vertex coordinate.');
      }
      const key = `${x}:${y}:${z}`;
      let index = vertexLookup.get(key);
      if (index === undefined) {
        index = vertices.length;
        vertices.push([x, y, z]);
        vertexLookup.set(key, index);
      }
      indices.push(index);
    }
    triangles.push([indices[0], indices[1], indices[2]]);
    offset += 2;
  }

  if (vertices.length === 0 || triangles.length === 0) {
    throw new Error('The STL file did not contain any triangles.');
  }

  validateMeshTopology({ vertices, triangles });

  return { vertices, triangles };
}

/** Returns a small hollow sphere approximation that produces more dynamic slice previews. */
export function createSampleHollowSphereMesh(): MeshGeometry {
  const latitudeBands = 6;
  const longitudeBands = 12;
  const outerRadius = 0.48;
  const innerRadius = 0.28;
  const vertices: MeshPoint3D[] = [];
  const triangles: MeshTriangle[] = [];

  const addSphereShell = (radius: number, reverseWinding: boolean) => {
    const baseIndex = vertices.length;
    const northPoleIndex = vertices.length;
    vertices.push([0, 0, radius]);

    const ringCount = latitudeBands - 1;
    for (let lat = 1; lat < latitudeBands; lat += 1) {
      const theta = (lat * Math.PI) / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      for (let lon = 0; lon < longitudeBands; lon += 1) {
        const phi = (lon * 2 * Math.PI) / longitudeBands;
        vertices.push([
          radius * Math.cos(phi) * sinTheta,
          radius * Math.sin(phi) * sinTheta,
          radius * cosTheta,
        ]);
      }
    }

    const southPoleIndex = vertices.length;
    vertices.push([0, 0, -radius]);

    const ringStride = longitudeBands;
    const firstRingStart = baseIndex + 1;
    for (let lon = 0; lon < longitudeBands; lon += 1) {
      const nextLon = (lon + 1) % longitudeBands;
      const a = northPoleIndex;
      const b = firstRingStart + lon;
      const c = firstRingStart + nextLon;
      triangles.push(reverseWinding ? [a, c, b] : [a, b, c]);
    }

    for (let ring = 0; ring < ringCount - 1; ring += 1) {
      const ringStart = firstRingStart + ring * ringStride;
      const nextRingStart = ringStart + ringStride;
      for (let lon = 0; lon < longitudeBands; lon += 1) {
        const nextLon = (lon + 1) % longitudeBands;
        const a = ringStart + lon;
        const b = nextRingStart + lon;
        const c = nextRingStart + nextLon;
        const d = ringStart + nextLon;
        if (reverseWinding) {
          triangles.push([a, c, b]);
          triangles.push([a, d, c]);
        } else {
          triangles.push([a, b, c]);
          triangles.push([a, c, d]);
        }
      }
    }

    const lastRingStart = firstRingStart + (ringCount - 1) * ringStride;
    for (let lon = 0; lon < longitudeBands; lon += 1) {
      const nextLon = (lon + 1) % longitudeBands;
      const a = lastRingStart + lon;
      const b = southPoleIndex;
      const c = lastRingStart + nextLon;
      triangles.push(reverseWinding ? [a, b, c] : [a, c, b]);
    }
  };

  addSphereShell(outerRadius, false);
  addSphereShell(innerRadius, true);

  validateMeshTopology({ vertices, triangles });
  return { vertices, triangles };
}

function validateMeshTopology(mesh: MeshGeometry): void {
  const seenTriangles = new Set<string>();
  for (const triangle of mesh.triangles) {
    const [ia, ib, ic] = triangle;
    if (ia === ib || ib === ic || ia === ic) {
      throw new Error('The STL file contains a degenerate triangle.');
    }
    if (ia < 0 || ib < 0 || ic < 0 || ia >= mesh.vertices.length || ib >= mesh.vertices.length || ic >= mesh.vertices.length) {
      throw new Error('The STL file contains an out-of-range triangle reference.');
    }

    const a = mesh.vertices[ia];
    const b = mesh.vertices[ib];
    const c = mesh.vertices[ic];
    const areaSquared = squaredTriangleArea(a, b, c);
    if (areaSquared <= 1e-14) {
      throw new Error('The STL file contains a zero-area triangle.');
    }

    const key = [ia, ib, ic].slice().sort((left, right) => left - right).join(':');
    if (seenTriangles.has(key)) {
      throw new Error('The STL file contains duplicated triangle topology.');
    }
    seenTriangles.add(key);
  }
}

function squaredTriangleArea(a: MeshPoint3D, b: MeshPoint3D, c: MeshPoint3D): number {
  const ab: MeshPoint3D = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac: MeshPoint3D = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const crossProduct: MeshPoint3D = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  return crossProduct[0] ** 2 + crossProduct[1] ** 2 + crossProduct[2] ** 2;
}
