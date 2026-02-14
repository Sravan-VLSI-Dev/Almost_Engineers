import { Html, useProgress } from "@react-three/drei";

export const ThreeLoader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="glass rounded-lg px-4 py-3 text-xs text-muted-foreground w-44">
        <p className="mb-2">Initializing Intelligence Graph</p>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="mt-2 font-mono">{Math.round(progress)}%</p>
      </div>
    </Html>
  );
};
