import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry } from "three";
import { useSceneStore } from "../../stores/sceneStore";
import { blockLocalToWorld, modulePoseLocal } from "../../utils/waterMath";

export function WireLines() {
  const blocks = useSceneStore((s) => s.blocks);
  const waters = useSceneStore((s) => s.waters);
  const modules = useSceneStore((s) => s.modules);
  const mppts = useSceneStore((s) => s.mppts);

  const geometry = useMemo(() => new BufferGeometry(), []);

  useEffect(() => {
    const blockById = new Map(blocks.map((b) => [b.id, b]));
    const waterById = new Map(waters.map((w) => [w.id, w]));
    const segments: number[] = [];
    for (const module of modules) {
      if (!module.mppt_id) {
        continue;
      }
      const block = blockById.get(module.block_id);
      const water = waterById.get(module.anchor.water_id);
      const mppt = mppts.find((m) => m.id === module.mppt_id);
      if (!block || !water || !mppt) {
        continue;
      }
      const pose = modulePoseLocal(module, water);
      const from = blockLocalToWorld(block, pose.position);
      const to = mppt.place ?? { x: 0, y: 4.4, z: 0 };
      segments.push(from.x, from.y, from.z, to.x, to.y, to.z);
    }
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(segments), 3),
    );
    geometry.setIndex(null);
    geometry.computeBoundingSphere();
  }, [blocks, waters, modules, mppts, geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#fde047" transparent opacity={0.7} />
    </lineSegments>
  );
}
