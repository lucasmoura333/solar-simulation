import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { MOUSE } from "three";
import { Blocks } from "./Building";
import { CameraYaw } from "./CameraYaw";
import { MpptNodes } from "./MpptNodes";
import { SelectionControls } from "./SelectionControls";
import { ShadingAnalysis } from "./ShadingAnalysis";
import { SunLight } from "./SunLight";
import { WireLines } from "./WireLines";
import { installPointerGuard, isDragClick } from "../../utils/pointer";
import { useUiStore } from "../../stores/uiStore";

export function Scene() {
  return (
    <Canvas
      camera={{ position: [10, 8, 12], fov: 50 }}
      gl={{ antialias: true }}
      shadows
      style={{ height: "100%" }}
    >
      <color attach="background" args={["#0b1220"]} />
      <PointerGuard />
      <SunLight />
      <Grid
        position={[0, 0, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1e293b"
        sectionSize={2.5}
        sectionThickness={1.2}
        sectionColor="#334155"
        infiniteGrid
        fadeDistance={45}
      />
      <GroundShadow />
      <Blocks />
      <MpptNodes />
      <WireLines />
      <SelectionControls />
      <ShadingAnalysis />
      <CameraYaw />
      <OrbitControls
        makeDefault
        mouseButtons={{
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.PAN,
          RIGHT: MOUSE.PAN,
        }}
      />
    </Canvas>
  );
}

/** Registra pointerdown no canvas (anti-arrasto para cliques de seleção). */
function PointerGuard() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (gl) {
      installPointerGuard(gl.domElement);
    }
  }, [gl]);
  return null;
}

/** Chão que recebe sombra; clique no vazio desmarca. */
function GroundShadow() {
  const setSelection = useUiStore((s) => s.setSelection);
  const clearMulti = useUiStore((s) => s.clearMulti);
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0.005, 0]}
      receiveShadow
      onClick={(e) => {
        if (isDragClick(e.nativeEvent)) {
          return;
        }
        setSelection(null);
        clearMulti();
      }}
    >
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#131c2c" roughness={1} />
    </mesh>
  );
}
