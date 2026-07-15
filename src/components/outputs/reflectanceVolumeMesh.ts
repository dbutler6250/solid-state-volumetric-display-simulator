import type { MutableRefObject } from 'react';
import * as THREE from 'three';

/** Ensures a Three.js instanced mesh can hold the requested number of instances. */
export function ensureInstancedMeshCapacity(
  scene3d: THREE.Scene,
  meshRef: MutableRefObject<THREE.InstancedMesh | null>,
  requiredCount: number,
): THREE.InstancedMesh {
  const currentMesh = meshRef.current;
  if (!currentMesh) {
    throw new Error('The voxel mesh has not been initialized.');
  }

  if (currentMesh.instanceMatrix.count >= requiredCount) {
    return currentMesh;
  }

  const nextMesh = new THREE.InstancedMesh(
    currentMesh.geometry,
    currentMesh.material,
    Math.max(1, requiredCount),
  );
  nextMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  nextMesh.visible = currentMesh.visible;
  nextMesh.count = currentMesh.count;

  const preservedCount = Math.min(currentMesh.count, currentMesh.instanceMatrix.count);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let index = 0; index < preservedCount; index += 1) {
    currentMesh.getMatrixAt(index, matrix);
    nextMesh.setMatrixAt(index, matrix);
    if (currentMesh.instanceColor) {
      currentMesh.getColorAt(index, color);
      nextMesh.setColorAt(index, color);
    }
  }

  if (preservedCount > 0) {
    nextMesh.instanceMatrix.needsUpdate = true;
    if (nextMesh.instanceColor) nextMesh.instanceColor.needsUpdate = true;
  }

  scene3d.remove(currentMesh);
  scene3d.add(nextMesh);
  meshRef.current = nextMesh;
  return nextMesh;
}
