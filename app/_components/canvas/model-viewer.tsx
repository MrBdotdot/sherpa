"use client";

import { Component, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CSS2DObject, CSS2DRenderer, GLTFLoader, OrbitControls } from "three-stdlib";
import * as THREE from "three";

// ── Types ────────────────────────────────────────────────────────────────────

type HotspotMarker = {
  id: string;
  /** Group-local coordinates */
  position: [number, number, number];
  /** Group-local surface normal — used for back-face culling */
  normal?: [number, number, number];
  title?: string;
  isSelected: boolean;
};

// ── Error boundary ────────────────────────────────────────────────────────────

class ModelLoadErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[ModelViewer] Failed to load 3D model:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
          <div className="px-6 text-center">
            <p className="text-sm font-medium text-white/70">Failed to load 3D model</p>
            <p className="mt-1 text-xs text-white/40">
              {this.state.error.message || "The file may be too large, corrupted, or an unsupported format."}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Public component ─────────────────────────────────────────────────────────

export function ModelViewer({
  modelUrl,
  scale,
  rotationX,
  rotationY,
  environment: _environment,
  isAuthoring = false,
  hotspotMarkers = [],
  accentColor,
  selectedHotspotId,
  onPlace3dHotspot,
  onSelectHotspot,
  onHotspotScreenPos,
}: {
  modelUrl: string;
  scale?: number;
  rotationX?: number;
  rotationY?: number;
  /** Lighting preset (not currently applied — directional lights are always used). */
  environment?: string;
  isAuthoring?: boolean;
  hotspotMarkers?: HotspotMarker[];
  accentColor?: string;
  selectedHotspotId?: string;
  onPlace3dHotspot?: (pos: [number, number, number], normal: [number, number, number]) => void;
  onSelectHotspot?: (id: string) => void;
  onHotspotScreenPos?: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [placingMode, setPlacingMode] = useState(false);
  const [modelLoadCount, setModelLoadCount] = useState(0);

  // ── Three.js objects ──────────────────────────────────────────────────────

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const css2dRendererRef = useRef<CSS2DRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<InstanceType<typeof OrbitControls> | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number>(0);

  // Auto-fit values: computed once per model load, then reused for transform updates.
  const autoScaleRef = useRef(1);
  const centerRef = useRef(new THREE.Vector3());

  // Hotspot sphere meshes (authoring mode only): map from marker ID → THREE.Mesh.
  const hotspotMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // CSS2DObjects for hotspot overlays: map from marker ID → CSS2DObject.
  const hotspotObjectsRef = useRef<Map<string, CSS2DObject>>(new Map());

  // ── Live refs (avoid stale closures inside rAF / event handlers) ──────────

  const isAuthoringRef = useRef(isAuthoring);
  const placingModeRef = useRef(placingMode);
  const scaleRef = useRef(scale ?? 1);
  const rotationXRef = useRef(rotationX ?? 0);
  const rotationYRef = useRef(rotationY ?? 0);
  const hotspotMarkersRef = useRef(hotspotMarkers);
  const selectedHotspotIdRef = useRef(selectedHotspotId);
  const onHotspotScreenPosRef = useRef(onHotspotScreenPos);
  const onPlace3dHotspotRef = useRef(onPlace3dHotspot);
  const onSelectHotspotRef = useRef(onSelectHotspot);

  // Keep live refs in sync each render (no dependency array → runs after every render).
  useEffect(() => {
    isAuthoringRef.current = isAuthoring;
    placingModeRef.current = placingMode;
    scaleRef.current = scale ?? 1;
    rotationXRef.current = rotationX ?? 0;
    rotationYRef.current = rotationY ?? 0;
    hotspotMarkersRef.current = hotspotMarkers;
    selectedHotspotIdRef.current = selectedHotspotId;
    onHotspotScreenPosRef.current = onHotspotScreenPos;
    onPlace3dHotspotRef.current = onPlace3dHotspot;
    onSelectHotspotRef.current = onSelectHotspot;
  });

  // ── Transform sync (scale / rotation props) ───────────────────────────────

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || group.children.length === 0) return;
    const t = autoScaleRef.current * (scale ?? 1);
    const c = centerRef.current;
    group.position.set(-c.x * t, -c.y * t, -c.z * t);
    group.scale.setScalar(t);
    group.rotation.set((rotationX ?? 0) * (Math.PI / 180), (rotationY ?? 0) * (Math.PI / 180), 0);
  }, [scale, rotationX, rotationY]);

  // ── Hotspot sphere sync (authoring mode) ─────────────────────────────────

  useEffect(() => {
    const scene = sceneRef.current;
    const group = groupRef.current;

    // Remove any previously rendered spheres from scene.
    hotspotMeshesRef.current.forEach((mesh) => {
      group?.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    hotspotMeshesRef.current.clear();

    if (!isAuthoring || !scene || !group) return;

    const SPHERE_R = 0.06;
    for (const m of hotspotMarkers) {
      if (!m.position) continue;
      const n = m.normal;
      const surfacePos: [number, number, number] = n
        ? [m.position[0] + n[0] * SPHERE_R, m.position[1] + n[1] * SPHERE_R, m.position[2] + n[2] * SPHERE_R]
        : m.position;

      const geometry = new THREE.SphereGeometry(SPHERE_R, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: m.isSelected ? "#ffffff" : "#3b82f6",
        emissive: m.isSelected ? "#3b82f6" : "#1e40af",
        emissiveIntensity: m.isSelected ? 0.8 : 0.4,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(surfacePos[0], surfacePos[1], surfacePos[2]);
      group.add(mesh);
      hotspotMeshesRef.current.set(m.id, mesh);
    }
  }, [isAuthoring, hotspotMarkers, modelLoadCount]);

  // ── CSS2DObject sync (hotspot overlays) ──────────────────────────────────

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Remove existing CSS2DObjects (CSS2DObject's 'removed' event removes its DOM element).
    hotspotObjectsRef.current.forEach((obj) => group.remove(obj));
    hotspotObjectsRef.current.clear();

    for (const marker of hotspotMarkers) {
      if (!marker.position) continue;

      const title = marker.title?.trim() || "Hotspot";
      const isSelected = marker.id === selectedHotspotId;

      // Build the DOM element for this hotspot.
      const el = document.createElement("div");

      if (isAuthoring) {
        // Authoring: small label pill that floats above the 3D sphere.
        el.style.pointerEvents = "none";
        const span = document.createElement("span");
        span.textContent = title;
        span.style.cssText = [
          "display:inline-block",
          `background:${isSelected ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)"}`,
          `color:${isSelected ? "#fff" : "#0a0a0a"}`,
          "font-size:10px",
          "font-weight:600",
          "font-family:sans-serif",
          "padding:2px 7px",
          "border-radius:999px",
          "box-shadow:0 1px 4px rgba(0,0,0,0.18)",
          "white-space:nowrap",
        ].join(";");
        el.appendChild(span);
      } else {
        // Preview: interactive pin button.
        el.style.pointerEvents = "none"; // outer wrapper passes through; button handles its own events
        const dotBg = accentColor || "#0a0a0a";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("aria-label", title);
        btn.style.cssText = [
          "pointer-events:auto",
          "background:none",
          "border:none",
          "padding:0",
          "cursor:pointer",
          "display:flex",
          "flex-direction:column",
          "align-items:center",
          "gap:4px",
        ].join(";");
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectHotspotRef.current?.(marker.id);
        });

        // Dot icon
        const iconWrap = document.createElement("span");
        iconWrap.style.cssText = "position:relative;display:flex;width:24px;height:24px;align-items:center;justify-content:center";
        const pulse = document.createElement("span");
        pulse.style.cssText = `position:absolute;inset:0;border-radius:50%;background:${dotBg};opacity:0.2;animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite`;
        const dot = document.createElement("span");
        dot.style.cssText = `position:relative;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);background:${dotBg}`;
        iconWrap.appendChild(pulse);
        iconWrap.appendChild(dot);

        // Label
        const label = document.createElement("span");
        label.textContent = title;
        label.style.cssText = [
          "border-radius:999px",
          "font-size:10px",
          "padding:2px 8px",
          "font-weight:600",
          "font-family:sans-serif",
          "box-shadow:0 1px 3px rgba(0,0,0,0.15)",
          "white-space:nowrap",
          "background:rgba(255,255,255,0.92)",
          "color:#0a0a0a",
        ].join(";");

        btn.appendChild(iconWrap);
        btn.appendChild(label);
        el.appendChild(btn);
      }

      const obj = new CSS2DObject(el);
      obj.position.set(marker.position[0], marker.position[1], marker.position[2]);
      // center (0.5, 1) = bottom-center of element at the 3D point → label floats above
      obj.center.set(0.5, isAuthoring ? 1.0 : 0.5);
      group.add(obj);
      hotspotObjectsRef.current.set(marker.id, obj);
    }

    return () => {
      hotspotObjectsRef.current.forEach((obj) => group.remove(obj));
      hotspotObjectsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspotMarkers, isAuthoring, accentColor, modelLoadCount]);

  // ── Selection styling update ──────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthoring) return;
    hotspotObjectsRef.current.forEach((obj, id) => {
      const span = obj.element.querySelector("span") as HTMLSpanElement | null;
      if (!span) return;
      const sel = id === selectedHotspotId;
      span.style.background = sel ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)";
      span.style.color = sel ? "#fff" : "#0a0a0a";
    });
  }, [selectedHotspotId, isAuthoring]);

  // ── Three.js setup (runs once on mount) ───────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // WebGL renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    rendererRef.current = renderer;

    // CSS2D renderer — layers HTML elements over the WebGL canvas, handles projection.
    const css2dRenderer = new CSS2DRenderer();
    css2dRenderer.domElement.style.position = "absolute";
    css2dRenderer.domElement.style.top = "0";
    css2dRenderer.domElement.style.left = "0";
    css2dRenderer.domElement.style.pointerEvents = "none";
    css2dRenderer.domElement.style.overflow = "visible";
    container.appendChild(css2dRenderer.domElement);
    css2dRendererRef.current = css2dRenderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    camera.position.set(0, 0.5, 4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
    dirLight2.position.set(-4, -2, -4);
    scene.add(dirLight2);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.5;
    controls.maxDistance = 30;
    controlsRef.current = controls;

    // Model group
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // Resize
    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      css2dRenderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    updateSize();

    // Back-face culling for CSS2DObjects: set visible flag each frame so CSS2DRenderer
    // hides elements whose surface normal points away from the camera.
    const pv = new THREE.Vector3();
    const nv = new THREE.Vector3();
    const cv = new THREE.Vector3();

    const updateHotspotVisibility = () => {
      const g = groupRef.current;
      if (!g) return;
      for (const [id, obj] of hotspotObjectsRef.current) {
        const marker = hotspotMarkersRef.current.find((m) => m.id === id);
        if (!marker?.position) { obj.visible = false; continue; }
        if (!marker.normal) { obj.visible = true; continue; }
        pv.set(marker.position[0], marker.position[1], marker.position[2]);
        pv.applyMatrix4(g.matrixWorld);
        nv.set(marker.normal[0], marker.normal[1], marker.normal[2]);
        nv.transformDirection(g.matrixWorld);
        cv.copy(camera.position).sub(pv).normalize();
        obj.visible = nv.dot(cv) > -0.1;
      }
    };

    // Render loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      updateHotspotVisibility();
      // CSS2DRenderer handles all projection + DOM positioning internally.
      css2dRenderer.render(scene, camera);

      // Report selected hotspot screen position for tooltip anchoring.
      const selId = selectedHotspotIdRef.current;
      const cb = onHotspotScreenPosRef.current;
      if (selId && cb) {
        const marker = hotspotMarkersRef.current.find((m) => m.id === selId);
        if (marker?.position) {
          pv.set(marker.position[0], marker.position[1], marker.position[2]);
          pv.applyMatrix4(group.matrixWorld);
          pv.project(camera);
          cb((pv.x * 0.5 + 0.5) * 100, (-pv.y * 0.5 + 0.5) * 100);
        }
      }
    };

    animate();

    // Click / raycast handler
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hasDragged = false;

    const onPointerDown = () => { hasDragged = false; };
    const onPointerMove = () => { hasDragged = true; };

    const onClick = (e: MouseEvent) => {
      if (hasDragged) { hasDragged = false; return; }

      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // In authoring mode: first check if a hotspot sphere was clicked → select it.
      if (isAuthoringRef.current) {
        const spheres = Array.from(hotspotMeshesRef.current.values());
        if (spheres.length > 0) {
          const hits = raycaster.intersectObjects(spheres, false);
          if (hits.length > 0) {
            const hitMesh = hits[0].object;
            for (const [id, mesh] of hotspotMeshesRef.current) {
              if (mesh === hitMesh) {
                onSelectHotspotRef.current?.(id);
                return;
              }
            }
          }
        }
      }

      // In placing mode: cast against the model to place a new hotspot.
      if (isAuthoringRef.current && placingModeRef.current && groupRef.current) {
        const sphereSet = new Set(hotspotMeshesRef.current.values());
        const hits = raycaster.intersectObjects(groupRef.current.children, true);
        const modelHit = hits.find((h) => !sphereSet.has(h.object as THREE.Mesh));
        if (!modelHit) return;

        const localPoint = groupRef.current.worldToLocal(modelHit.point.clone());
        const faceNormal = modelHit.face?.normal?.clone() ?? new THREE.Vector3(0, 0, 1);
        faceNormal.transformDirection(modelHit.object.matrixWorld);
        const invGroup = new THREE.Matrix4().copy(groupRef.current.matrixWorld).invert();
        faceNormal.transformDirection(invGroup).normalize();

        onPlace3dHotspotRef.current?.(
          [localPoint.x, localPoint.y, localPoint.z],
          [faceNormal.x, faceNormal.y, faceNormal.z],
        );
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      css2dRenderer.domElement.remove();
      rendererRef.current = null;
      css2dRendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      groupRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // ── Model loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    setLoaded(false);
    const group = groupRef.current;
    if (!group) return;
    let alive = true;

    while (group.children.length > 0) group.remove(group.children[0]);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (!alive) return;
        while (group.children.length > 0) group.remove(group.children[0]);

        const box = new THREE.Box3().setFromObject(gltf.scene);
        if (!box.isEmpty()) {
          const size = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(centerRef.current);
          const maxDim = Math.max(size.x, size.y, size.z);
          autoScaleRef.current = maxDim > 0 ? 2 / maxDim : 1;
        } else {
          autoScaleRef.current = 1;
          centerRef.current.set(0, 0, 0);
        }

        const t = autoScaleRef.current * scaleRef.current;
        const c = centerRef.current;
        group.position.set(-c.x * t, -c.y * t, -c.z * t);
        group.scale.setScalar(t);
        group.rotation.set(
          rotationXRef.current * (Math.PI / 180),
          rotationYRef.current * (Math.PI / 180),
          0,
        );
        group.add(gltf.scene);

        if (alive) { setModelLoadCount((c) => c + 1); setTimeout(() => setLoaded(true), 0); }
      },
      undefined,
      (err) => {
        console.error("[ModelViewer] Failed to load GLTF:", err);
      },
    );

    return () => {
      alive = false;
      if (groupRef.current) {
        while (groupRef.current.children.length > 0) {
          groupRef.current.remove(groupRef.current.children[0]);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // ── Camera reset ───────────────────────────────────────────────────────────

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 0.5, 4);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.reset();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ModelLoadErrorBoundary>
      <div
        ref={containerRef}
        className="absolute inset-0 bg-neutral-900"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "none" }}
      >
        {/* Three.js renders into this canvas */}
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            cursor: isAuthoring && placingMode ? "crosshair" : "grab",
          }}
        />

        {/* Loading overlay */}
        {!loaded && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-xl bg-black/40 px-3 py-2 text-xs font-medium text-white/70 backdrop-blur-sm">
              Loading model…
            </p>
          </div>
        )}

        {/* Authoring toolbar — top-right */}
        {isAuthoring && loaded && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              title="Reset camera"
              onClick={handleResetCamera}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
              aria-label="Reset camera"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M11.5 6.5A5 5 0 1 1 6.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8.5 1.5h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center overflow-hidden rounded-lg bg-black/50 backdrop-blur-sm text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPlacingMode(false)}
                className={`px-2.5 py-1.5 transition ${!placingMode ? "bg-white text-neutral-900" : "text-white/70 hover:text-white"}`}
              >
                Orbit
              </button>
              <button
                type="button"
                onClick={() => setPlacingMode(true)}
                className={`px-2.5 py-1.5 transition ${placingMode ? "bg-white text-neutral-900" : "text-white/70 hover:text-white"}`}
              >
                Place
              </button>
            </div>
          </div>
        )}

        {/* Hint text — bottom center */}
        {isAuthoring && loaded && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
            <p className="rounded-xl bg-black/50 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm whitespace-nowrap">
              {placingMode
                ? "Click model surface to place a hotspot · Switch to Orbit to look around"
                : "Drag to orbit · Scroll to zoom · Switch to Place to add hotspots"}
            </p>
          </div>
        )}
      </div>
    </ModelLoadErrorBoundary>
  );
}
