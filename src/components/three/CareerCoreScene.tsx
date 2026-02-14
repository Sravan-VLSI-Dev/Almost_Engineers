import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, Sphere } from "@react-three/drei";
import { easing } from "maath";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "react-responsive";
import { ThreeLoader } from "./ThreeLoader";

type Props = {
  strong: string[];
  weak: string[];
  missing: string[];
};

const CareerCoreNodes = ({ strong, weak, missing }: Props) => {
  const group = useRef<any>(null);
  const reduceMotion = useReducedMotion();
  const allNodes = useMemo(() => {
    const wrap = (items: string[], type: "strong" | "weak" | "missing") => items.map((label) => ({ label, type }));
    return [...wrap(strong, "strong"), ...wrap(weak, "weak"), ...wrap(missing, "missing")].slice(0, 24);
  }, [strong, weak, missing]);

  const points = useMemo(() => {
    if (allNodes.length === 0) return [];
    return allNodes.map((node, i) => {
      const ring = 0.78 + (i % 3) * 0.18;
      const theta = (i / allNodes.length) * Math.PI * 2;
      const phi = ((i % 7) / 7) * Math.PI;
      return {
        ...node,
        position: [
          ring * Math.cos(theta) * Math.sin(phi),
          ring * Math.cos(phi),
          ring * Math.sin(theta) * Math.sin(phi),
        ] as [number, number, number],
      };
    });
  }, [allNodes]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (!reduceMotion) {
      group.current.rotation.y += delta * 0.12;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.06;
    }
    const target = [state.pointer.y * 0.08, state.pointer.x * 0.1, 0] as [number, number, number];
    easing.damp3(group.current.position, target, 0.2, delta);
  });

  const colorOf = (type: "strong" | "weak" | "missing") => {
    if (type === "strong") return "#16f1ff";
    if (type === "weak") return "#6ac8ff";
    return "#5e87d8";
  };

  if (points.length === 0) {
    return (
      <Float speed={1.5} rotationIntensity={0.1}>
        <Sphere args={[0.68, 48, 48]}>
          <meshStandardMaterial color="#071d30" emissive="#0ac6e0" emissiveIntensity={0.35} transparent opacity={0.9} />
        </Sphere>
      </Float>
    );
  }

  return (
    <group ref={group} position={[0, 0.02, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.065, 32, 120]} />
        <meshStandardMaterial color="#14ebff" emissive="#16efff" emissiveIntensity={0.8} />
      </mesh>
      <Sphere args={[0.72, 40, 40]}>
        <meshStandardMaterial color="#061a2d" emissive="#0a5e7a" emissiveIntensity={0.35} />
      </Sphere>
      <mesh position={[0, -1.02, 0]}>
        <cylinderGeometry args={[0.62, 0.84, 0.46, 4]} />
        <meshStandardMaterial color="#051220" />
      </mesh>

      {points.map((p, idx) => (
        <group key={`${p.label}-${idx}`} position={p.position}>
          <Sphere args={[0.06, 18, 18]}>
            <meshStandardMaterial color={colorOf(p.type)} emissive={colorOf(p.type)} emissiveIntensity={0.45} />
          </Sphere>
          <Line points={[[0, 0, 0], p.position.map((n) => -n) as [number, number, number]]} color="#d7d3fb" lineWidth={0.6} transparent opacity={0.35} />
        </group>
      ))}
    </group>
  );
};

export const CareerCoreScene = ({ strong, weak, missing }: Props) => {
  const isMobile = useMediaQuery({ maxWidth: 768 });

  return (
    <div className="h-[300px] w-full rounded-xl overflow-hidden bg-gradient-to-br from-[#0d9dad] via-[#0a6d89] to-[#0a3f62] border border-[#49d9e8]/35 shadow-[0_18px_40px_-26px_rgba(10,132,171,.65)] relative">
      <div className="absolute top-3 left-3 z-10 text-[11px] tracking-wide uppercase text-[#b7f7ff] font-medium bg-[#052238]/60 border border-[#2ad3e5]/45 rounded-full px-3 py-1">
        3D Career Intelligence Core
      </div>
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, isMobile ? 3.95 : 3.55], fov: 47 }}
        fallback={<div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">WebGL not available on this device.</div>}
      >
        <color attach="background" args={["#0c4f74"]} />
        <ambientLight intensity={0.7} />
        <pointLight position={[2.6, 2.3, 3]} intensity={1.9} color="#11f1ff" />
        <pointLight position={[-2, -2, 2]} intensity={1.1} color="#0db3cd" />
        <Suspense fallback={<ThreeLoader />}>
          <CareerCoreNodes strong={strong} weak={weak} missing={missing} />
        </Suspense>
      </Canvas>
    </div>
  );
};
