import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useUiStore } from "../../stores/uiStore";

const NORTH = new Vector3(0, 0, -1);
const tmp = new Vector3();

/** Publica o ângulo do norte na tela (bússola) conforme a câmera orbita. */
export function CameraYaw() {
  const camera = useThree((s) => s.camera);
  const setNorthDeg = useUiStore((s) => s.setNorthDeg);
  const last = useRef({ deg: NaN, t: 0 });

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - last.current.t < 0.08) {
      return;
    }
    tmp.copy(NORTH).transformDirection(camera.matrixWorldInverse);
    const deg = (Math.atan2(tmp.x, tmp.y) * 180) / Math.PI;
    if (
      Number.isNaN(last.current.deg) ||
      Math.abs(deg - last.current.deg) > 0.25
    ) {
      last.current = { deg, t: now };
      setNorthDeg(deg);
    }
  });

  return null;
}
