import { useSceneStore } from "../../stores/sceneStore";
import { useUiStore } from "../../stores/uiStore";
import { isDragClick } from "../../utils/pointer";

export function MpptNodes() {
  const mppts = useSceneStore((s) => s.mppts);
  const selection = useUiStore((s) => s.selection);
  const setSelection = useUiStore((s) => s.setSelection);

  return (
    <>
      {mppts.map((mppt) => {
        const selected = selection?.kind === "mppt" && selection.id === mppt.id;
        const place = mppt.place ?? { x: 0, y: 4.4, z: 0 };
        return (
          <mesh
            key={mppt.id}
            position={[place.x, place.y, place.z]}
            onClick={(e) => {
              if (isDragClick(e.nativeEvent)) {
                return;
              }
              e.stopPropagation();
              setSelection({ kind: "mppt", id: mppt.id });
            }}
          >
            <sphereGeometry args={[0.28, 20, 16]} />
            <meshStandardMaterial
              color={selected ? "#fbbf24" : "#fb923c"}
              emissive={selected ? "#fbbf24" : "#7c2d12"}
              emissiveIntensity={0.35}
            />
          </mesh>
        );
      })}
    </>
  );
}
