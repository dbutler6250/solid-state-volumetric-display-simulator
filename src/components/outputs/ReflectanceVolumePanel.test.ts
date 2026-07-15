import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import { ensureInstancedMeshCapacity } from './reflectanceVolumeMesh';

describe('ensureInstancedMeshCapacity', () => {
  it('rebuilds the voxel mesh when the scene needs more instances than the current buffer allows', () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const originalMesh = new THREE.InstancedMesh(geometry, material, 1);
    const originalMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(0.25, -0.5, 0.75),
      new THREE.Quaternion(),
      new THREE.Vector3(0.2, 0.3, 0.4),
    );
    const originalColor = new THREE.Color(0.1, 0.2, 0.3);
    originalMesh.setMatrixAt(0, originalMatrix);
    originalMesh.setColorAt(0, originalColor);
    originalMesh.count = 1;
    const addSpy = vi.spyOn(scene, 'add');
    const removeSpy = vi.spyOn(scene, 'remove');
    const meshRef = { current: originalMesh } as MutableRefObject<THREE.InstancedMesh | null>;

    const rebuiltMesh = ensureInstancedMeshCapacity(scene, meshRef, 6);
    const copiedMatrix = new THREE.Matrix4();
    const copiedColor = new THREE.Color();
    rebuiltMesh.getMatrixAt(0, copiedMatrix);
    rebuiltMesh.getColorAt(0, copiedColor);

    expect(rebuiltMesh).not.toBe(originalMesh);
    expect(meshRef.current).toBe(rebuiltMesh);
    expect(rebuiltMesh.instanceMatrix.count).toBe(6);
    expect(rebuiltMesh.count).toBe(1);
    copiedMatrix.elements.forEach((value, index) => {
      expect(value).toBeCloseTo(originalMatrix.elements[index]);
    });
    expect(copiedColor.r).toBeCloseTo(originalColor.r);
    expect(copiedColor.g).toBeCloseTo(originalColor.g);
    expect(copiedColor.b).toBeCloseTo(originalColor.b);
    expect(removeSpy).toHaveBeenCalledWith(originalMesh);
    expect(addSpy).toHaveBeenCalledWith(rebuiltMesh);
  });
});
