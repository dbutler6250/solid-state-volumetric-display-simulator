import { describe, expect, it } from 'vitest';
import { createSampleCubeMesh, parseAsciiStl, parseStlBytes } from './stl';

describe('parseAsciiStl', () => {
  it('parses a simple ASCII STL into a mesh', () => {
    const mesh = parseAsciiStl(`solid cube
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid cube`);

    expect(mesh.vertices).toHaveLength(3);
    expect(mesh.triangles).toHaveLength(1);
  });

  it('parses STL bytes using the shared upload path', () => {
    const mesh = parseStlBytes(new TextEncoder().encode(`solid cube
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid cube`).buffer);

    expect(mesh.triangles).toHaveLength(1);
  });

  it('rejects empty STL content', () => {
    expect(() => parseAsciiStl('solid empty\nendsolid empty')).toThrow('did not contain any triangles');
  });

  it('rejects incomplete ASCII facets', () => {
    expect(() =>
      parseAsciiStl(`solid cube
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
  endloop
endfacet
endsolid cube`),
    ).toThrow('three vertices');
  });
});

describe('createSampleCubeMesh', () => {
  it('returns a reusable sample mesh', () => {
    const mesh = createSampleCubeMesh();
    expect(mesh.vertices).toHaveLength(8);
    expect(mesh.triangles).toHaveLength(12);
  });
});
