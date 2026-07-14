import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { SimulationDocument, SimulationResult } from '../../types/simulation';
import type { ResolvedStructure } from '../../simulation/structures/structureResolver';
import {
  buildReflectanceVolumeScene,
  type ReflectanceVolumeDisplayMode,
  type ReflectanceVolumeOverlayMode,
} from '../../visualization/reflectanceVolumeScene';

type ReflectanceVolumePanelProps = {
  document: SimulationDocument;
  resolvedStructure: ResolvedStructure;
  result: SimulationResult;
};

type ViewerStatus = 'loading' | 'ready' | 'error';
type PlaneMotionMode = 'sweep' | 'manual';

const DEFAULT_SLICE = 3;
const DEFAULT_PLANE_PHASE = 0.35;
const DEFAULT_PLANE_SPEED = 0.35;
const PRESET_CAMERA_VIEWS = {
  front: { theta: 0.7, phi: 1.05, radius: 4.2 },
  side: { theta: Math.PI / 2, phi: 1.05, radius: 4.2 },
  top: { theta: 0.7, phi: 0.45, radius: 4.2 },
} as const;

/** Renders the proxy 3D reflectance view for the active resolved stack. */
export function ReflectanceVolumePanel({ document, resolvedStructure, result }: ReflectanceVolumePanelProps) {
  const [mode, setMode] = useState<ReflectanceVolumeDisplayMode>('volume');
  const [overlayMode, setOverlayMode] = useState<ReflectanceVolumeOverlayMode>('ghosted-stack');
  const [sliceIndex, setSliceIndex] = useState(DEFAULT_SLICE);
  const [threshold, setThreshold] = useState(0.2);
  const [clipFraction, setClipFraction] = useState(0.35);
  const [freezeAnimation, setFreezeAnimation] = useState(false);
  const [planeMotionMode, setPlaneMotionMode] = useState<PlaneMotionMode>('sweep');
  const [planePhase, setPlanePhase] = useState(DEFAULT_PLANE_PHASE);
  const [planeSpeed, setPlaneSpeed] = useState(DEFAULT_PLANE_SPEED);
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mediumMeshRef = useRef<THREE.Mesh | null>(null);
  const mediumMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const edgesRef = useRef<THREE.LineSegments | null>(null);
  const shellMeshRef = useRef<THREE.Mesh | null>(null);
  const voxelMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const planeMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const clipPlaneRef = useRef<THREE.Mesh | null>(null);
  const frameRef = useRef<number | null>(null);
  const freezeRef = useRef(false);
  const planeMotionModeRef = useRef<PlaneMotionMode>('sweep');
  const planePhaseRef = useRef(DEFAULT_PLANE_PHASE);
  const planeSpeedRef = useRef(DEFAULT_PLANE_SPEED);
  const previousFrameRef = useRef<number | null>(null);
  const controlsRef = useRef({
    theta: 0.8,
    phi: 1.1,
    radius: 4.2,
    panX: 0,
    panY: 0,
    pointerDown: false,
    panMode: false,
    lastX: 0,
    lastY: 0,
  });

  const scene = useMemo(
    () =>
      buildReflectanceVolumeScene(document, resolvedStructure, result, {
        mode,
        overlayMode,
        sliceIndex,
        threshold,
        clipFraction,
      }),
    [document, resolvedStructure, result, mode, overlayMode, sliceIndex, threshold, clipFraction],
  );
  const interactionHint = 'Drag to orbit, Shift-drag to pan, scroll to zoom.';
  const sceneBadge =
    status === 'error'
      ? 'WebGL fallback'
      : mode === 'plane'
        ? 'Plane mode'
        : 'Volume mode';
  const sliceLabel = `${sliceIndex}/${Math.max(0, scene.field.depth - 1)}`;
  const overlayDescription =
    overlayMode === 'ghosted-stack'
      ? 'Ghosted stack shows the internal proxy geometry behind a faint glass shell.'
      : overlayMode === 'transparent-medium'
        ? 'Transparent medium keeps the glass shell and internal proxy color, but removes the ghosted stack overlay.'
        : 'No overlay leaves the glass shell only, with the faintest outline and no internal stack hint.';

  useEffect(() => {
    if (scene.field.depth === 0) return;
    setSliceIndex((current) => Math.min(Math.max(0, current), scene.field.depth - 1));
  }, [scene.field.depth]);

  useEffect(() => {
    freezeRef.current = freezeAnimation;
  }, [freezeAnimation]);

  useEffect(() => {
    planeMotionModeRef.current = planeMotionMode;
  }, [planeMotionMode]);

  useEffect(() => {
    planePhaseRef.current = planePhase;
  }, [planePhase]);

  useEffect(() => {
    planeSpeedRef.current = planeSpeed;
  }, [planeSpeed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    try {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      renderer.localClippingEnabled = true;
      container.replaceChildren(renderer.domElement);
      rendererRef.current = renderer;

      const scene3d = new THREE.Scene();
      scene3d.background = new THREE.Color(0x101720);
      sceneRef.current = scene3d;

      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(2.7, 2.1, 4.8);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      scene3d.add(new THREE.AmbientLight(0xffffff, 1.15));
      const directional = new THREE.DirectionalLight(0xe8f4ff, 1.8);
      directional.position.set(4, 5, 6);
      scene3d.add(directional);

      const mediumGeometry = new THREE.BoxGeometry(2, 2, 2);
      const mediumMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x88bbff,
        transparent: true,
        opacity: Math.min(scene.medium.opacity, 0.08),
        roughness: 0.03,
        metalness: 0,
        transmission: 0.92,
        thickness: 1.1,
        clearcoat: 0.55,
        clearcoatRoughness: 0.04,
        clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 0, -1), clipDistance(scene.medium.clipFraction))],
      });
      mediumMaterialRef.current = mediumMaterial;
      const mediumMesh = new THREE.Mesh(mediumGeometry, mediumMaterial);
      mediumMeshRef.current = mediumMesh;
      scene3d.add(mediumMesh);

      const edgeGeometry = new THREE.EdgesGeometry(mediumGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xd0edf8, transparent: true, opacity: 0.14 });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgesRef.current = edges;
      scene3d.add(edges);

      const shellGeometry = new THREE.BoxGeometry(2.02, 2.02, 2.02);
      const shellMaterial = new THREE.MeshBasicMaterial({
        color: 0xdff5ff,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const shellMesh = new THREE.Mesh(shellGeometry, shellMaterial);
      shellMeshRef.current = shellMesh;
      scene3d.add(shellMesh);

      const voxelGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const voxelMaterial = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 0, -1), clipDistance(scene.medium.clipFraction))],
      });
      const voxelMesh = new THREE.InstancedMesh(voxelGeometry, voxelMaterial, 1);
      voxelMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      voxelMeshRef.current = voxelMesh;
      scene3d.add(voxelMesh);

      const planeGeometry = new THREE.BoxGeometry(1.6, 1.6, 0.05);
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffc871,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 0, -1), clipDistance(scene.medium.clipFraction))],
      });
      const planeMesh = new THREE.InstancedMesh(planeGeometry, planeMaterial, 1);
      planeMeshRef.current = planeMesh;
      scene3d.add(planeMesh);

      const clipPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({
          color: 0xf0bf58,
          transparent: true,
          opacity: 0.05,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      clipPlane.position.z = 1 - scene.medium.clipFraction * 2;
      clipPlaneRef.current = clipPlane;
      scene3d.add(clipPlane);

      const resizeObserver = new ResizeObserver(() => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        cameraRef.current.aspect = clientWidth / Math.max(1, clientHeight);
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(clientWidth, clientHeight, false);
      });
      resizeObserver.observe(container);

      const handlePointerDown = (event: PointerEvent) => {
        controlsRef.current.pointerDown = true;
        controlsRef.current.panMode = event.shiftKey || event.button === 2;
        controlsRef.current.lastX = event.clientX;
        controlsRef.current.lastY = event.clientY;
      };
      const handlePointerUp = () => {
        controlsRef.current.pointerDown = false;
        controlsRef.current.panMode = false;
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (!controlsRef.current.pointerDown) return;
        const deltaX = event.clientX - controlsRef.current.lastX;
        const deltaY = event.clientY - controlsRef.current.lastY;
        if (controlsRef.current.panMode) {
          controlsRef.current.panX += deltaX * 0.0016;
          controlsRef.current.panY -= deltaY * 0.0016;
        } else {
          controlsRef.current.theta += deltaX * 0.005;
          controlsRef.current.phi = Math.min(
            Math.PI - 0.2,
            Math.max(0.25, controlsRef.current.phi + deltaY * 0.005),
          );
        }
        controlsRef.current.lastX = event.clientX;
        controlsRef.current.lastY = event.clientY;
      };
      const handleWheel = (event: WheelEvent) => {
        controlsRef.current.radius = Math.min(
          8,
          Math.max(2.2, controlsRef.current.radius + event.deltaY * 0.002),
        );
      };

      container.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('wheel', handleWheel, { passive: true });

      const animate = () => {
        if (disposed) return;
        const now = performance.now();
        const deltaSeconds =
          previousFrameRef.current === null ? 0 : Math.min(0.05, (now - previousFrameRef.current) / 1000);
        previousFrameRef.current = now;
        if (!freezeRef.current) {
          setPhase((current) => (current + scene.medium.phaseRate * 0.01) % 1);
        }
        if (planeMotionModeRef.current === 'sweep' && !freezeRef.current) {
          planePhaseRef.current = (planePhaseRef.current + deltaSeconds * planeSpeedRef.current) % 1;
          setPlanePhase(planePhaseRef.current);
        }
        const rendererInstance = rendererRef.current;
        const cameraInstance = cameraRef.current;
        if (rendererInstance && cameraInstance && sceneRef.current) {
          const { theta, phi, radius } = controlsRef.current;
          cameraInstance.position.set(
            radius * Math.sin(phi) * Math.cos(theta) + controlsRef.current.panX,
            radius * Math.cos(phi) + controlsRef.current.panY,
            radius * Math.sin(phi) * Math.sin(theta),
          );
          cameraInstance.lookAt(controlsRef.current.panX, controlsRef.current.panY, 0);
          rendererInstance.render(sceneRef.current, cameraInstance);
        }
        frameRef.current = window.requestAnimationFrame(animate);
      };

      frameRef.current = window.requestAnimationFrame(animate);
      setStatus('ready');
      setError(null);

      return () => {
        disposed = true;
        resizeObserver.disconnect();
        container.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('wheel', handleWheel);
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
        }
        previousFrameRef.current = null;
        renderer.dispose();
        mediumGeometry.dispose();
        edgeGeometry.dispose();
        shellGeometry.dispose();
        voxelGeometry.dispose();
        planeGeometry.dispose();
        mediumMaterial.dispose();
        shellMaterial.dispose();
        voxelMaterial.dispose();
        planeMaterial.dispose();
        edgeMaterial.dispose();
        clipPlane.geometry.dispose();
        (clipPlane.material as THREE.Material).dispose();
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
        mediumMeshRef.current = null;
        mediumMaterialRef.current = null;
        edgesRef.current = null;
        shellMeshRef.current = null;
        voxelMeshRef.current = null;
        planeMeshRef.current = null;
        clipPlaneRef.current = null;
      };
    } catch (runtimeError) {
      setStatus('error');
      setError(
        runtimeError instanceof Error
          ? runtimeError.message
          : 'The 3D viewer could not be initialized in this browser.',
      );
    }
  }, [scene.medium.phaseRate, scene.medium.opacity, scene.medium.clipFraction]);

  const applyPresetView = (view: keyof typeof PRESET_CAMERA_VIEWS) => {
    Object.assign(controlsRef.current, PRESET_CAMERA_VIEWS[view], {
      panX: 0,
      panY: 0,
    });
  };

  useEffect(() => {
    const voxelMesh = voxelMeshRef.current;
    const planeMesh = planeMeshRef.current;
    const mediumMaterial = mediumMaterialRef.current;
    const clipPlane = clipPlaneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene3d = sceneRef.current;
    if (!voxelMesh || !planeMesh || !mediumMaterial || !clipPlane || !renderer || !camera || !scene3d) return;
    const mediumMesh = mediumMeshRef.current;
    const edges = edgesRef.current;
    const shellMesh = shellMeshRef.current;

    const voxelColor = new THREE.Color();
    const planeZ = scene.field.depth > 1 ? (sliceIndex / (scene.field.depth - 1)) * 2 - 1 : 0;
    voxelMesh.count = scene.field.cells.length;
    planeMesh.count = 1;
    voxelMesh.visible = scene.mode === 'volume' && scene.overlays.showInteriorDetail;
    planeMesh.visible = scene.mode === 'plane';
    mediumMesh!.visible = scene.overlays.showShell;
    mediumMaterial.opacity = scene.overlays.showShell ? scene.medium.opacity : 0;
    mediumMaterial.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), clipDistance(scene.medium.clipFraction))];
    clipPlane.position.z = planeZForClip(scene.medium.clipFraction);
    const normalizedPlanePhase =
      planeMotionMode === 'manual' ? planePhase : planePhaseRef.current;
    const planeOffset = normalizedPlanePhase * 2 - 1;
    const animatedPlaneZ = scene.mode === 'plane' ? planeOffset : planeZ;
    const planeVisible = scene.mode === 'plane' || scene.overlays.showInteriorDetail;
    planeMesh.setMatrixAt(
      0,
      new THREE.Matrix4().compose(
        new THREE.Vector3(0, 0, animatedPlaneZ),
        new THREE.Quaternion(),
        new THREE.Vector3(1, 1, 1),
      ),
    );

    for (let index = 0; index < scene.field.cells.length; index += 1) {
      const cell = scene.field.cells[index];
      voxelMesh.setMatrixAt(
        index,
        new THREE.Matrix4().compose(
          new THREE.Vector3(cell.position[0], cell.position[1], cell.position[2]),
          new THREE.Quaternion(),
          new THREE.Vector3(0.2, 0.2, 0.2),
        ),
      );
      voxelColor.setHSL(0.58 - cell.intensity * 0.18, 0.9, 0.38 + cell.intensity * 0.45);
      voxelMesh.setColorAt(index, voxelColor);
    }
    voxelMesh.visible = scene.mode === 'volume' && scene.overlays.showInteriorDetail;
    planeMesh.visible = planeVisible;
    mediumMaterial.opacity = scene.overlays.showShell ? scene.medium.opacity : 0;
    clipPlane.visible = scene.overlays.showShell;
    if (edges) edges.visible = scene.overlays.showGhostedStack;
    if (shellMesh) shellMesh.visible = scene.overlays.showShell;
    voxelMesh.instanceMatrix.needsUpdate = true;
    if (voxelMesh.instanceColor) voxelMesh.instanceColor.needsUpdate = true;
    planeMesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene3d, camera);
  }, [scene, sliceIndex, phase, planePhase, planeMotionMode]);

  return (
    <div className="reflectance-volume-panel">
      <div className="chart-heading">
        <h2>3D Reflectance View</h2>
        <div className="chart-toolbar">
          <span className="reflectance-volume-badge">{sceneBadge}</span>
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={freezeAnimation}
              onChange={(event) => setFreezeAnimation(event.target.checked)}
            />
            <span>Freeze</span>
          </label>
        </div>
      </div>
      <div className="reflectance-volume-toolbar">
        <div className="chart-button-group" role="group" aria-label="3D view mode">
          <button type="button" aria-pressed={mode === 'volume'} onClick={() => setMode('volume')}>
            Volume
          </button>
          <button type="button" aria-pressed={mode === 'plane'} onClick={() => setMode('plane')}>
            Plane
          </button>
        </div>
        <div className="chart-button-group" role="group" aria-label="3D overlay mode">
          <button
            type="button"
            aria-pressed={overlayMode === 'ghosted-stack'}
            onClick={() => setOverlayMode('ghosted-stack')}
            title="Glass shell with ghosted internal stack"
          >
            Ghosted stack
          </button>
          <button
            type="button"
            aria-pressed={overlayMode === 'transparent-medium'}
            onClick={() => setOverlayMode('transparent-medium')}
            title="Glass shell with no ghosted stack overlay"
          >
            Glass shell
          </button>
          <button
            type="button"
            aria-pressed={overlayMode === 'none'}
            onClick={() => setOverlayMode('none')}
            title="Glass shell only, with the faintest outline"
          >
            Shell only
          </button>
        </div>
        <div className="chart-button-group" role="group" aria-label="Camera preset views">
          <button type="button" onClick={() => applyPresetView('front')}>
            Front
          </button>
          <button type="button" onClick={() => applyPresetView('side')}>
            Side
          </button>
          <button type="button" onClick={() => applyPresetView('top')}>
            Top
          </button>
        </div>
      </div>
      <p className="reflectance-volume-overlay-explainer">{overlayDescription}</p>
      <p className="reflectance-volume-hint">{interactionHint}</p>
      <div className="reflectance-volume-plane-controls" aria-label="Reflection plane controls">
        <div className="chart-button-group" role="group" aria-label="Plane motion mode">
          <button
            type="button"
            aria-pressed={planeMotionMode === 'sweep'}
            onClick={() => {
              setPlaneMotionMode('sweep');
              setFreezeAnimation(false);
            }}
          >
            Sweep
          </button>
          <button
            type="button"
            aria-pressed={planeMotionMode === 'manual'}
            onClick={() => {
              setPlaneMotionMode('manual');
              setFreezeAnimation(true);
            }}
          >
            Manual
          </button>
        </div>
        <label className="toggle-control">
          <input
            type="checkbox"
            checked={planeMotionMode === 'manual' || freezeAnimation}
            disabled={planeMotionMode === 'manual'}
            onChange={(event) => setFreezeAnimation(event.target.checked)}
          />
          <span>{planeMotionMode === 'manual' || freezeAnimation ? 'Frozen' : 'Playing'}</span>
        </label>
        {planeMotionMode === 'sweep' ? (
          <label className="field reflectance-volume-speed-control">
            <span>Plane speed <strong>{planeSpeed.toFixed(2)} cycles/s</strong></span>
            <input
              type="range"
              min={0.05}
              max={1.25}
              step={0.05}
              value={planeSpeed}
              onChange={(event) => setPlaneSpeed(Number(event.target.value))}
            />
          </label>
        ) : (
          <label className="field reflectance-volume-speed-control">
            <span>Plane position <strong>{Math.round(planePhase * 100)}%</strong></span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={planePhase}
              onChange={(event) => setPlanePhase(Number(event.target.value))}
            />
          </label>
        )}
      </div>
      <div className="reflectance-volume-stage">
        <div ref={containerRef} className="reflectance-volume-canvas" aria-label="3D reflectance canvas" />
        {status === 'error' ? (
          <div className="chart-placeholder chart-placeholder-compact" role="alert">
            <div>
              <strong>3D view unavailable</strong>
              <p>{error ?? 'WebGL could not be initialized.'}</p>
              <p>Use the existing Stack Definition tab for a non-WebGL view of the structure.</p>
            </div>
          </div>
        ) : null}
      </div>
      <div className="reflectance-volume-controls">
        <label className="field">
          <span>Slice <strong>{sliceLabel}</strong></span>
          <input
            type="range"
            min={0}
            max={Math.max(0, scene.field.depth - 1)}
            step={1}
            value={sliceIndex}
            onChange={(event) => setSliceIndex(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Threshold <strong>{threshold.toFixed(2)}</strong></span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Clip plane <strong>{Math.round(clipFraction * 100)}%</strong></span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={clipFraction}
            onChange={(event) => setClipFraction(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="reflectance-volume-legend" aria-label="3D visualization legend">
        <span>
          <i className="legend-swatch legend-swatch-bright" /> high proxy intensity
        </span>
        <span>
          <i className="legend-swatch legend-swatch-dim" /> low proxy intensity
        </span>
        <span>
          <i className="legend-swatch legend-swatch-plane" /> phase-moving plane
        </span>
      </div>
      <p className="reflectance-volume-summary">
        {scene.summary.title}. {scene.summary.subtitle}. Peak reflectance {scene.summary.peakReflectance.toFixed(3)}.
        The shell stays visible in every overlay mode; the toggles only change the amount of ghosted internal detail.
      </p>
    </div>
  );
}

function clipDistance(fraction: number): number {
  return 1 - fraction * 2;
}

function planeZForClip(fraction: number): number {
  return 1 - fraction * 2;
}
