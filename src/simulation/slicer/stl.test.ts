import { describe, expect, it } from 'vitest';
import { createSampleHollowSphereMesh, parseAsciiStl, parseStlBytes } from './stl';

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

  it('rejects degenerate triangle geometry', () => {
    expect(() =>
      parseAsciiStl(`solid flat
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 0 0 0
    vertex 1 0 0
  endloop
endfacet
endsolid flat`),
    ).toThrow('degenerate triangle');
  });

  it('rejects duplicate triangle topology', () => {
    expect(() =>
      parseAsciiStl(`solid dup
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid dup`),
    ).toThrow('duplicated triangle topology');
  });
});

describe('createSampleHollowSphereMesh', () => {
  it('returns a reusable hollow sphere approximation', () => {
    const mesh = createSampleHollowSphereMesh();
    expect(mesh.vertices).toHaveLength(124);
    expect(mesh.triangles).toHaveLength(240);
  });
});
