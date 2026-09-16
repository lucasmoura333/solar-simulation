import { useEffect, useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { DoubleSide } from "three";
import { findModule } from "../../fixtures";
import { useSceneStore } from "../../stores/sceneStore";
import { useUiStore } from "../../stores/uiStore";
import type { Block, SolarModule, Water } from "../../types";
import { buildBlockWallsGeometry, buildWaterGeometry } from "../../utils/geometry";
import { nextEntityId } from "../../utils/id";
import { isDragClick } from "../../utils/pointer";
import {
  projectToWaterFromGround,
  projectToWaterLocal,
  worldToBlockLocal,
} from "../../utils/waterMath";
import { BlockPanels, PlacementGhost } from "./SolarPanels";

export function Blocks() {
  const building = useSceneStore((s) => s.building);
  const blocks = useSceneStore((s) => s.blocks);
  const waters = useSceneStore((s) => s.waters);
  const modules = useSceneStore((s) => s.modules);
  const seedDefault = useSceneStore((s) => s.seedDefault);
  const cancelTools = useUiStore((s) => s.cancelTools);

  useEffect(() => {
    seedDefault();
  }, [seedDefault]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelTools();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelTools]);

  if (!building || blocks.length === 0) {
    return null;
  }

  return (
    <>
      {blocks.map((block) => (
        <BlockGroup
          key={block.id}
          block={block}
          waters={waters.filter((w) => w.block_id === block.id)}
          modules={modules.filter((m) => m.block_id === block.id)}
        />
      ))}
    </>
  );
}

function BlockGroup({
  block,
  waters,
  modules,
}: {
  block: Block;
  waters: Water[];
  modules: SolarModule[];
}) {
  const upsertModule = useSceneStore((s) => s.upsertModule);
  const placementFamily = useUiStore((s) => s.placementFamily);
  const tool = useUiStore((s) => s.tool);
  const installWaterId = useUiStore((s) => s.installWaterId);
  const setSelection = useUiStore((s) => s.setSelection);
  const setInstallWaterId = useUiStore((s) => s.setInstallWaterId);
  const setHover = useUiStore((s) => s.setHover);

  const groupRef = useRef<Group>(null);
  const wallsGeometry = useMemo(() => buildBlockWallsGeometry(block), [block]);

  const allowedWater = (water: Water): boolean =>
    tool !== "install" || installWaterId === null || installWaterId === water.id;

  const addModuleAt = (water: Water, worldPoint: { x: number; y: number; z: number }) => {
    if (!placementFamily || !allowedWater(water)) {
      return;
    }
    const family = findModule(placementFamily);
    if (!family) {
      return;
    }
    const local = worldToBlockLocal(block, worldPoint);
    const anchor = projectToWaterLocal(water, local);
    if (!anchor) {
      return;
    }
    const id = nextEntityId(
      "mod-",
      useSceneStore.getState().modules.map((m) => m.id),
    );
    upsertModule({
      id,
      catalog_id: family.id,
      block_id: block.id,
      anchor,
      yaw_deg: 0,
      mppt_id: null,
      external_refs: [],
    });
  };

  const hoverFrom = (water: Water, worldPoint: { x: number; y: number; z: number }) => {
    if (!placementFamily || !allowedWater(water)) {
      return;
    }
    const local = worldToBlockLocal(block, worldPoint);
    const anchor = projectToWaterLocal(water, local);
    setHover(anchor ? { waterId: water.id, u: anchor.u_m, v: anchor.v_m } : null);
  };

  const handleWaterClick = (
    water: Water,
    nativeEvent: { clientX: number; clientY: number },
    point: { x: number; y: number; z: number },
  ) => {
    if (isDragClick(nativeEvent)) {
      return;
    }
    if (tool === "install") {
      if (!allowedWater(water)) {
        return;
      }
      if (installWaterId === null && placementFamily) {
        setInstallWaterId(water.id);
      }
      addModuleAt(water, point);
      return;
    }
    setSelection({ kind: "water", id: water.id });
  };

  const addModulePlanar = (worldPoint: { x: number; y: number; z: number }) => {
    const target = waters.find((w) => w.id === installWaterId);
    if (!placementFamily || !target) {
      return;
    }
    const local = worldToBlockLocal(block, worldPoint);
    const anchor = projectToWaterFromGround(target, local);
    if (!anchor) {
      return;
    }
    const family = findModule(placementFamily);
    if (!family) {
      return;
    }
    const id = nextEntityId(
      "mod-",
      useSceneStore.getState().modules.map((m) => m.id),
    );
    upsertModule({
      id,
      catalog_id: family.id,
      block_id: block.id,
      anchor,
      yaw_deg: 0,
      mppt_id: null,
      external_refs: [],
    });
  };

  return (
    <group
      ref={groupRef}
      position={[block.place?.x ?? 0, 0, block.place?.z ?? 0]}
      rotation={[0, (block.orientation_deg * Math.PI) / 180, 0]}
    >
      <mesh
        geometry={wallsGeometry}
        castShadow
        receiveShadow
        onClick={(e) => {
          if (isDragClick(e.nativeEvent)) {
            return;
          }
          if (tool === "install" && installWaterId) {
            e.stopPropagation();
            addModulePlanar(e.point);
            return;
          }
          setSelection({ kind: "block", id: block.id });
        }}
      >
        <meshStandardMaterial color="#64748b" side={DoubleSide} />
      </mesh>

      {waters.map((water) => (
        <WaterMesh
          key={water.id}
          water={water}
          dimmed={tool === "install" && !allowedWater(water)}
          onClick={(native, point) => handleWaterClick(water, native, point)}
          onHover={(point) => hoverFrom(water, point)}
          onLeave={() => setHover(null)}
        />
      ))}

      <BlockPanels waters={waters} modules={modules} />
      <PlacementGhost block={block} waters={waters} />
    </group>
  );
}

function WaterMesh({
  water,
  dimmed,
  onClick,
  onHover,
  onLeave,
}: {
  water: Water;
  dimmed: boolean;
  onClick: (
    native: { clientX: number; clientY: number },
    point: { x: number; y: number; z: number },
  ) => void;
  onHover: (point: { x: number; y: number; z: number }) => void;
  onLeave: () => void;
}) {
  const geometry = useMemo(() => buildWaterGeometry(water), [water]);
  const placementFamily = useUiStore((s) => s.placementFamily);
  const meshRef = useRef<Mesh>(null);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onClick(e.nativeEvent, e.point);
      }}
      onPointerMove={(e) => {
        if (placementFamily) {
          onHover(e.point);
        }
      }}
      onPointerOut={() => onLeave()}
    >
      <meshStandardMaterial
        color={dimmed ? "#4b5563" : "#94a3b8"}
        side={DoubleSide}
      />
    </mesh>
  );
}

