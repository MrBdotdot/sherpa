"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Html } from "@react-three/drei";
import * as THREE from "three";

// ── Types ───────────────────────────────────────────────────────────────────

type EnvironmentPreset =
  | "apartment" | "city" | "dawn" | "forest" | "lobby"
  | "night" | "park" | "studio" | "sunset" | "warehouse";

type HotspotMarker = {
  id: string;
  /** Group-local coordinates — stays glued to the surface as scale/rotation change */
  position: [number, number, number];
  /** Group-local surface normal — used for back-face culling of HTML pins */
  normal?: [number, number, number];
  title?: string;
  isSelected: boolean;
};

// ── Hotspot sphere marker (authoring mode) ───────────────────────────────────

function HotspotSphere({
  position,
  isSelected,
  title,
  onClick,
}: {
  position: [number, number, number];
  isSelected: boolean;
  title?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const label = title?.trim() || "Hotspot";
  return (
    <mesh
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial
        color={isSelected ? "#ffffff" : hovered ? "#60a5fa" : "#3b82f6"}
        emissive={isSelected ? "#3b82f6" : "#1e40af"}
        emissiveIntensity={isSelected ? 0.8 : 0.4}
      />
      <Html
        position={[0, 0.12, 0]}
        center
        zIndexRange={[29, 28]}
        style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
      >
        <span
          style={{
            display: "inline-block",
            background: isSelected ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)",
            color: isSelected ? "#fff" : "#0a0a0a",
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "sans-serif",
            padding: "2px 7px",
            borderRadius: 999,
            boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          }}
        >
          {label}
        </span>
      </Html>
    </mesh>
  );
}

// ── Hotspot HTML pin (preview mode) ──────────────────────────────────────────

function HotspotHtmlPin({
  marker,
  groupRef,
  accentColor,
  onClick,
}: {
  marker: HotspotMarker;
  groupRef: React.RefObject<THREE.Group>;
  accentColor?: string;
  onClick: () => void;
}) {
  const { camera } = useThree();
  const containerRef = useRef<HTMLDivElement>(null);
  const nV = useRef(new THREE.Vector3());
  const pV = useRef(new THREE.Vector3());
  const cV = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!containerRef.current) return;
    let show = true;
    if (marker.normal && groupRef.current) {
      nV.current.set(marker.normal[0], marker.normal[1], marker.normal[2]);
      nV.current.transformDirection(groupRef.current.matrixWorld);
      pV.current.set(marker.position[0], marker.position[1], marker.position[2]);
      pV.current.applyMatrix4(groupRef.current.matrixWorld);
      cV.current.copy(camera.position).sub(pV.current).normalize();
      show = nV.current.dot(cV.current) > -0.1;
    }
    containerRef.current.style.visibility = show ? "visible" : "hidden";
    containerRef.current.style.pointerEvents = show ? "auto" : "none";
  });

  const dotBg = accentColor || "#0a0a0a";
  const title = marker.title?.trim() || "Hotspot";

  return (
    <Html
      position={marker.position}
      center
      zIndexRange={[29, 28]}
      style={{ pointerEvents: "none" }}
    >
      <div ref={containerRef} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="group flex flex-col items-center gap-1"
          style={{ touchAction: "none", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          aria-label={title}
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            <span
              className="absolute inset-0 animate-pulse rounded-full opacity-20"
              style={{ backgroundColor: dotBg }}
            />
            <span
              className="relative h-3.5 w-3.5 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125"
              style={{ backgroundColor: dotBg }}
            />
          </span>
          <span
            className="rounded-full text-[10px] px-2 py-0.5 font-semibold shadow-sm transition whitespace-nowrap"
            style={{ backgroundColor: "rgba(255,255,255,0.92)", color: "#0a0a0a" }}
          >
            {title}
          </span>
        </button>
      </div>
    </Html>
  );
}

// ── Camera reset control (lives inside Canvas to access R3F store) ───────────

function ResetCameraControl({ resetSignalRef }: { resetSignalRef: React.RefObject<number> }) {
  const { camera, controls } = useThree();
  const lastSignal = useRef(resetSignalRef.current);

  useFrame(() => {
    if (resetSignalRef.current === lastSignal.current) return;
    lastSignal.current = resetSignalRef.current;
    camera.position.set(0, 0.5, 4);
    camera.lookAt(0, 0, 0);
    if (controls) (controls as unknown as { reset: () => void }).reset();
  });

  return null;
}

// ── Model scene ──────────────────────────────────────────────────────────────

function ModelScene({
  url,
  scale = 1,
  rotationX = 0,
  rotationY = 0,
  isAuthoring = false,
  hotspotMarkers = [],
  accentColor,
  selectedHotspotId,
  onPlace3dHotspot,
  onSelectHotspot,
  onHotspotScreenPos,
  onLoad,
}: {
  url: string;
  scale?: number;
  rotationX?: number;
  rotationY?: number;
  isAuthoring?: boolean;
  hotspotMarkers?: HotspotMarker[];
  accentColor?: string;
  selectedHotspotId?: string;
  onPlace3dHotspot?: (pos: [number, number, number], normal: [number, number, number]) => void;
  onSelectHotspot?: (id: string) => void;
  onHotspotScreenPos?: (x: number, y: number) => void;
  onLoad: () => void;
}) {
  const { scene: gltfScene } = useGLTF(url);
  // Clone the GLTF scene so each instance owns its own Three.js objects,
  // preventing "position is read-only" from shared cached scene references.
  const scene = useMemo(() => gltfScene.clone(true), [gltfScene]);
  const groupRef = useRef<THREE.Group>(null);

  // Auto-fit: normalise longest axis to 2 units, then apply user scale multiplier.
  const [autoScale, center] = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return [1, new THREE.Vector3()];
    const size = new THREE.Vector3();
    const c = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(c);
    const maxDim = Math.max(size.x, size.y, size.z);
    return [maxDim > 0 ? 2 / maxDim : 1, c];
  }, [scene]);

  const totalScale = autoScale * scale;

  // Notify parent on first render (deferred so Canvas has committed).
  const notified = useRef(false);
  if (!notified.current) {
    notified.current = true;
    setTimeout(onLoad, 0);
  }

  // Project the selected hotspot's world position to canvas-relative percentages
  // every frame so the React content panel can track it without state updates.
  const projVec = useRef(new THREE.Vector3());
  const { camera } = useThree();
  useFrame(() => {
    if (!selectedHotspotId || !onHotspotScreenPos || !groupRef.current) return;
    const marker = hotspotMarkers.find((m) => m.id === selectedHotspotId);
    if (!marker) return;
    projVec.current
      .set(marker.position[0], marker.position[1], marker.position[2])
      .applyMatrix4(groupRef.current.matrixWorld);
    projVec.current.project(camera);
    const x = (projVec.current.x * 0.5 + 0.5) * 100;
    const y = (-projVec.current.y * 0.5 + 0.5) * 100;
    onHotspotScreenPos(x, y);
  });

  const handleMeshClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isAuthoring || !onPlace3dHotspot || !groupRef.current) return;
    e.stopPropagation();

    // Store position in group-local space so markers stay glued to the model
    // surface even when the user later adjusts scale or rotation.
    const localPoint = groupRef.current.worldToLocal(e.point.clone());

    // Transform face normal: mesh-local → world → group-local.
    const faceNormal = e.face?.normal?.clone() ?? new THREE.Vector3(0, 0, 1);
    faceNormal.transformDirection(e.object.matrixWorld);
    const invGroup = new THREE.Matrix4().copy(groupRef.current.matrixWorld).invert();
    faceNormal.transformDirection(invGroup).normalize();

    onPlace3dHotspot(
      [localPoint.x, localPoint.y, localPoint.z],
      [faceNormal.x, faceNormal.y, faceNormal.z],
    );
  };

  return (
    <group
      ref={groupRef}
      position={[-center.x * totalScale, -center.y * totalScale, -center.z * totalScale]}
      scale={[totalScale, totalScale, totalScale]}
      rotation={[rotationX * (Math.PI / 180), rotationY * (Math.PI / 180), 0]}
    >
      <primitive object={scene} onClick={handleMeshClick} />

      {hotspotMarkers.map((m) => {
        // Offset sphere/pin above the surface so it sits on top rather than sinking in.
        const SPHERE_R = 0.06;
        const n = m.normal;
        const surfacePos: [number, number, number] = n
          ? [m.position[0] + n[0] * SPHERE_R, m.position[1] + n[1] * SPHERE_R, m.position[2] + n[2] * SPHERE_R]
          : m.position;
        const displayMarker = { ...m, position: surfacePos };

        return isAuthoring ? (
          <HotspotSphere
            key={m.id}
            position={surfacePos}
            isSelected={m.isSelected}
            title={m.title}
            onClick={() => onSelectHotspot?.(m.id)}
          />
        ) : (
          <HotspotHtmlPin
            key={m.id}
            marker={displayMarker}
            groupRef={groupRef as React.RefObject<THREE.Group>}
            accentColor={accentColor}
            onClick={() => onSelectHotspot?.(m.id)}
          />
        );
      })}
    </group>
  );
}

// ── Loading overlay ──────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <p className="rounded-xl bg-black/40 px-3 py-2 text-xs font-medium text-white/70 backdrop-blur-sm">
        Loading model…
      </p>
    </div>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

export function ModelViewer({
  modelUrl,
  scale,
  rotationX,
  rotationY,
  environment,
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
  /** Lighting / environment preset name, or "none" for plain directional lights */
  environment?: string;
  isAuthoring?: boolean;
  hotspotMarkers?: HotspotMarker[];
  accentColor?: string;
  selectedHotspotId?: string;
  onPlace3dHotspot?: (pos: [number, number, number], normal: [number, number, number]) => void;
  onSelectHotspot?: (id: string) => void;
  onHotspotScreenPos?: (x: number, y: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  // false = orbit mode (safe default); true = place hotspot mode
  const [placingMode, setPlacingMode] = useState(false);
  const resetSignalRef = useRef(0);
  const useEnv = !!environment && environment !== "none";

  return (
    <div
      className="absolute inset-0 bg-neutral-900"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ touchAction: "none" }}
    >
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100%", height: "100%", cursor: isAuthoring && placingMode ? "crosshair" : "grab" }}
      >
        {!useEnv && (
          <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
            <directionalLight position={[-4, -2, -4]} intensity={0.35} />
          </>
        )}

        <Suspense fallback={null}>
          {useEnv && (
            <Environment preset={environment as EnvironmentPreset} background={false} />
          )}
          <ModelScene
            url={modelUrl}
            scale={scale}
            rotationX={rotationX}
            rotationY={rotationY}
            isAuthoring={isAuthoring}
            hotspotMarkers={hotspotMarkers}
            accentColor={accentColor}
            selectedHotspotId={selectedHotspotId}
            onPlace3dHotspot={placingMode ? onPlace3dHotspot : undefined}
            onSelectHotspot={onSelectHotspot}
            onHotspotScreenPos={onHotspotScreenPos}
            onLoad={() => setLoaded(true)}
          />
        </Suspense>

        <ResetCameraControl resetSignalRef={resetSignalRef} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={0.5}
          maxDistance={30}
        />
      </Canvas>

      {!loaded && <LoadingOverlay />}

      {/* Authoring toolbar — top-right */}
      {isAuthoring && loaded && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {/* Camera reset */}
          <button
            type="button"
            title="Reset camera"
            onClick={() => { resetSignalRef.current += 1; }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
            aria-label="Reset camera"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M11.5 6.5A5 5 0 1 1 6.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8.5 1.5h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Place / Orbit toggle */}
          <div className="flex items-center overflow-hidden rounded-lg bg-black/50 backdrop-blur-sm text-[11px] font-semibold">
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
          <p className="rounded-xl bg-black/50 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-sm whitespace-nowrap">
            {placingMode
              ? "Click model surface to place a hotspot · Switch to Orbit to look around"
              : "Drag to orbit · Scroll to zoom · Switch to Place to add hotspots"}
          </p>
        </div>
      )}
    </div>
  );
}
