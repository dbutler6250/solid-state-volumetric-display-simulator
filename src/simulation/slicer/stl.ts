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

  for (const rawLine of lines) {
    const line = rawLine.trim();
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
    if (currentFacet.length === 3) {
      triangles.push([currentFacet[0], currentFacet[1], currentFacet[2]]);
      currentFacet = [];
    }
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

/** Returns a tiny sample mesh that exercises the slicer pipeline without a file upload. */
export function createSampleCubeMesh(): MeshGeometry {
  return {
    vertices: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    triangles: [
      [0, 1, 2],
      [0, 2, 3],
      [4, 6, 5],
      [4, 7, 6],
      [0, 4, 5],
      [0, 5, 1],
      [1, 5, 6],
      [1, 6, 2],
      [2, 6, 7],
      [2, 7, 3],
      [3, 7, 4],
      [3, 4, 0],
    ],
  };
}
