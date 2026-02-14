import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, Sphere } from "@react-three/drei";
import { easing } from "maath";
import { ThreeLoader } from "./ThreeLoader";
import { useReducedMotion } from "framer-motion";

type SkillNode = {
  skill: string;
  type: "strong" | "weak" | "missing";
  radius: number;
};

interface Props {
  strong: string[];
  weak: string[];
  missing: string[];
  roleMatch?: number;
}

const colorOf = (type: SkillNode["type"]) => {
  if (type === "strong") return "#18f2ff";
  if (type === "weak") return "#66d0ff";
  return "#4f8fd9";
};

const NetworkGraph = ({ strong, weak, missing }: Props) => {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  const group = useRef<any>(null);
  const nodes = useMemo(() => {
    const strongNodes = strong.map((skill) => ({ skill, type: "strong" as const, radius: 0.13 }));
    const weakNodes = weak.map((skill) => ({ skill, type: "weak" as const, radius: 0.11 }));
    const missingNodes = missing.map((skill) => ({ skill, type: "missing" as const, radius: 0.1 }));
    return [...strongNodes, ...weakNodes, ...missingNodes].slice(0, 32);
  }, [strong, weak, missing]);

  const positioned = useMemo(() => {
    return nodes.map((node, idx) => {
      const t = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
      const layer = (idx % 4) * 0.2 + 0.72;
      return {
        ...node,
        pos: [Math.cos(t) * layer, Math.sin(t * 1.4) * 0.74, Math.sin(t) * layer] as [number, number, number],
      };
    });
  }, [nodes]);

  useFrame((_, delta) => {
    if (!group.current || reduceMotion) return;
    group.current.rotation.y += delta * 0.1;
    easing.damp(group.current.rotation, "x", Math.sin(Date.now() * 0.00012) * 0.1, 0.2, delta);
  });

  return (
    <group ref={group}>
      {positioned.map((node, idx) => (
        <group key={`${node.skill}-${idx}`} position={node.pos}>
          <Sphere
            args={[node.radius + (hovered === node.skill ? 0.03 : 0), 18, 18]}
            onPointerOver={() => setHovered(node.skill)}
            onPointerOut={() => setHovered(null)}
          >
            <meshStandardMaterial color={colorOf(node.type)} emissive={colorOf(node.type)} emissiveIntensity={hovered === node.skill ? 0.9 : 0.5} />
          </Sphere>
          {hovered === node.skill && (
            <Html center distanceFactor={14}>
              <div className="glass rounded-md px-2 py-1 text-[10px]">{node.skill}</div>
            </Html>
          )}
        </group>
      ))}

      {positioned.slice(1).map((node, idx) => (
        <Line
          key={`line-${idx}`}
          points={[positioned[idx].pos, node.pos]}
          color="#cec7f7"
          lineWidth={0.4}
          transparent
          opacity={0.25}
        />
      ))}
    </group>
  );
};

export const SkillNetworkScene = (props: Props) => {
  const [hovered, setHovered] = useState(false);
  const topMissing = props.missing.slice(0, 3);
  const topWeak = props.weak.slice(0, 2);

  return (
    <div
      className="h-[300px] rounded-xl overflow-hidden bg-gradient-to-br from-[#0d9dad] via-[#0a6d89] to-[#0a3f62] border border-[#49d9e8]/35 shadow-[0_16px_32px_-24px_rgba(10,132,171,.6)] relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute top-3 left-3 z-10 text-[11px] tracking-wide uppercase text-[#b7f7ff] font-medium bg-[#052238]/60 border border-[#2ad3e5]/45 rounded-full px-3 py-1">
        3D Skill Network
      </div>
      {hovered && (
        <div className="absolute bottom-3 left-3 right-3 z-10 glass border-[#2ad3e5]/40 bg-[#052238]/70 rounded-lg px-3 py-2 text-[11px] text-[#b7f7ff]">
          Input graph: {props.strong.length + props.weak.length + props.missing.length} skills mapped.
          Output insight: prioritize {topMissing.length ? topMissing.join(", ") : "weak/missing nodes"} first,
          then strengthen {topWeak.length ? topWeak.join(", ") : "existing weak nodes"} to lift match.
          {props.roleMatch != null ? ` Current role match signal: ${Math.round(props.roleMatch)}%.` : ""}
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.7]}
        fallback={<div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">WebGL not available on this device.</div>}
      >
        <color attach="background" args={["#0c4f74"]} />
        <ambientLight intensity={0.75} />
        <pointLight position={[2.5, 2.2, 3]} intensity={1.6} color="#11f1ff" />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.1, 0.055, 24, 100]} />
          <meshStandardMaterial color="#14ebff" emissive="#16efff" emissiveIntensity={0.7} />
        </mesh>
        <Sphere args={[0.84, 30, 30]}>
          <meshStandardMaterial color="#061a2d" emissive="#0a5e7a" emissiveIntensity={0.3} transparent opacity={0.95} />
        </Sphere>
        <Suspense fallback={<ThreeLoader />}>
          <NetworkGraph {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};
