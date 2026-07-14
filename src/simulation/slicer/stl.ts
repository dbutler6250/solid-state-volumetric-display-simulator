import type { MeshGeometry, MeshTriangle, MeshPoint3D } from './types';

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

  return { vertices, triangles };
}

function parseBinaryStl(bytes: ArrayBuffer): MeshGeometry {
  const view = new DataView(bytes);
  if (view.byteLength < 84) {
    throw new Error('The STL file is too small to be valid.');
  }

  const triangleCount = view.getUint32(80, true);
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

  return { vertices, triangles };
}

/** Returns a small hollow sphere approximation that produces more dynamic slice previews. */
export function createSampleHollowSphereMesh(): MeshGeometry {
  const outerRadius = 0.5;
  const innerRadius = 0.28;
  const outerVertices: MeshPoint3D[] = [
    [0, 0, outerRadius],
    [0, 0, -outerRadius],
    [outerRadius, 0, 0],
    [-outerRadius, 0, 0],
    [0, outerRadius, 0],
    [0, -outerRadius, 0],
  ];
  const innerVertices: MeshPoint3D[] = [
    [0, 0, innerRadius],
    [0, 0, -innerRadius],
    [innerRadius, 0, 0],
    [-innerRadius, 0, 0],
    [0, innerRadius, 0],
    [0, -innerRadius, 0],
  ];

  return {
    vertices: [...outerVertices, ...innerVertices],
    triangles: [
      // Outer octahedron shell.
      [0, 2, 4],
      [0, 4, 3],
      [0, 3, 5],
      [0, 5, 2],
      [1, 4, 2],
      [1, 3, 4],
      [1, 5, 3],
      [1, 2, 5],
      // Inner octahedron shell with reversed winding so the cavity stays hollow.
      [6, 10, 8],
      [6, 9, 10],
      [6, 11, 9],
      [6, 8, 11],
      [7, 8, 10],
      [7, 10, 9],
      [7, 9, 11],
      [7, 11, 8],
    ],
  };
}
