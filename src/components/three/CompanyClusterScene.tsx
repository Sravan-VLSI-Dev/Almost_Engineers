import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Sphere } from "@react-three/drei";
import { easing } from "maath";
import { ThreeLoader } from "./ThreeLoader";
import { useReducedMotion } from "framer-motion";

type CompanyItem = {
  company: string;
  match_percentage?: number | null;
  missing_skills?: string[];
};

interface Props {
  companies: CompanyItem[];
}

const CompanyNodes = ({ companies }: Props) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const root = useRef<any>(null);
  const reduceMotion = useReducedMotion();

  const arranged = useMemo(() => {
    return companies.slice(0, 10).map((c, i) => {
      const pct = Number(c.match_percentage ?? 50);
      const radius = 0.11 + Math.max(0, Math.min(0.14, pct / 500));
      const orbit = 0.82 + i * 0.17;
      const angle = (i / Math.max(companies.length, 1)) * Math.PI * 2;
      return { ...c, radius, orbit, angle };
    });
  }, [companies]);

  useFrame((state, delta) => {
    if (!root.current || reduceMotion) return;
    root.current.rotation.y += delta * (hovered ? 0.04 : 0.12);
    easing.damp(root.current.position, "z", state.pointer.y * 0.08, 0.2, delta);
  });

  return (
    <group ref={root}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.06, 0.06, 24, 100]} />
        <meshStandardMaterial color="#14ebff" emissive="#16efff" emissiveIntensity={0.75} />
      </mesh>
      <Sphere args={[0.82, 28, 28]}>
        <meshStandardMaterial color="#061a2d" emissive="#0a5e7a" emissiveIntensity={0.35} />
      </Sphere>
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.42, 4]} />
        <meshStandardMaterial color="#051220" />
      </mesh>
      {arranged.map((c, i) => {
        const x = Math.cos(c.angle) * c.orbit;
        const z = Math.sin(c.angle) * c.orbit;
        const y = Math.sin(c.angle * 2) * 0.34;
        const ready = Number(c.match_percentage ?? 50) >= 75;
        const color = ready ? "#18f2ff" : Number(c.match_percentage ?? 50) >= 40 ? "#67ceff" : "#4f8fd9";
        return (
          <group key={`${c.company}-${i}`} position={[x, y, z]}>
            <Sphere
              args={[c.radius + (hovered === c.company ? 0.03 : 0), 18, 18]}
              onPointerOver={() => setHovered(c.company)}
              onPointerOut={() => setHovered(null)}
            >
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered === c.company ? 0.9 : 0.55} />
            </Sphere>
            {hovered === c.company && (
              <Html center distanceFactor={14}>
                <div className="glass rounded-md px-2 py-1 text-[10px] min-w-36">
                  <p className="font-medium">{c.company}</p>
                  <p>Match: {c.match_percentage != null ? `${Math.round(c.match_percentage)}%` : "N/A"}</p>
                  {!!c.missing_skills?.length && <p>Missing: {c.missing_skills.slice(0, 2).join(", ")}</p>}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

export const CompanyClusterScene = ({ companies }: Props) => {
  if (!companies.length) {
    return <div className="glass rounded-xl p-4 text-sm text-muted-foreground">Company intelligence unavailable.</div>;
  }

  return (
    <div className="h-[300px] rounded-xl overflow-hidden bg-gradient-to-br from-[#0d9dad] via-[#0a6d89] to-[#0a3f62] border border-[#49d9e8]/35 shadow-[0_16px_32px_-24px_rgba(10,132,171,.6)] relative">
      <div className="absolute top-3 left-3 z-10 text-[11px] tracking-wide uppercase text-[#b7f7ff] font-medium bg-[#052238]/60 border border-[#2ad3e5]/45 rounded-full px-3 py-1">
        3D Company Cluster
      </div>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 54 }}
        dpr={[1, 1.8]}
        fallback={<div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">WebGL not available on this device.</div>}
      >
        <color attach="background" args={["#0c4f74"]} />
        <ambientLight intensity={0.75} />
        <pointLight position={[2.6, 2.2, 3]} intensity={1.7} color="#11f1ff" />
        <Suspense fallback={<ThreeLoader />}>
          <CompanyNodes companies={companies} />
        </Suspense>
      </Canvas>
    </div>
  );
};
