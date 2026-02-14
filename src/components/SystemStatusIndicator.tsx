interface Props {
  analysisComplete: boolean;
  roadmapReady: boolean;
  interviewReady: boolean;
}

export const SystemStatusIndicator = ({ analysisComplete, roadmapReady, interviewReady }: Props) => {
  const statusItems = [
    { label: "Analysis", ok: analysisComplete },
    { label: "Roadmap", ok: roadmapReady },
    { label: "Interview", ok: interviewReady },
  ];

  return (
    <div className="glass rounded-full px-3 py-1.5 flex items-center gap-3">
      {statusItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${item.ok ? "bg-primary shadow-[0_0_14px_rgba(109,124,255,.7)]" : "bg-muted-foreground/40"}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
        </div>
      ))}
    </div>
  );
};
