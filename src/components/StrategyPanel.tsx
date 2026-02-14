import type { ReactNode } from "react";
import type { MatchStrategy } from "@/lib/types";

interface Props {
  strategy: MatchStrategy;
}

const titleByBand = {
  HIGH: "Application Optimization Plan",
  MID: "Skill Acceleration Plan",
  LOW: "Career Realignment Plan",
} as const;

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

function renderList(items: string[]) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No items available.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, idx) => (
        <li key={`${item}-${idx}`} className="border-l-2 border-primary/30 pl-3">{item}</li>
      ))}
    </ul>
  );
}

function card(title: string, body: ReactNode) {
  return (
    <div className="glass rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      {body}
    </div>
  );
}

export const StrategyPanel = ({ strategy }: Props) => {
  const s = strategy.strategy;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass rounded-lg p-4">
        <h3 className="font-medium">{titleByBand[strategy.match_band]}</h3>
        <p className="text-xs text-muted-foreground mt-1">Match band: {strategy.match_band}</p>
      </div>

      {strategy.match_band === "HIGH" && (
        <div className="space-y-4">
          {card("Resume Optimization Suggestions", renderList(asStringList((s.resume_optimization as any)?.suggestions || [])))}
          {card(
            "Company Targeting List",
            Array.isArray(s.company_targets) && s.company_targets.length > 0 ? (
              <div className="space-y-2 text-sm">
                {(s.company_targets as any[]).map((c, idx) => (
                  <div key={`${c.company || "company"}-${idx}`} className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span>{c.company || "Company"}</span>
                    <span className="text-xs text-muted-foreground">{c.match_percentage != null ? `${Math.round(c.match_percentage)}% match` : "Target"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No company targets available.</p>
            )
          )}
          {card("Advanced Interview Preparation", renderList(asStringList((s.interview_strategy as any)?.focus_areas || [])))}
          {card("Portfolio Polishing Strategy", renderList(asStringList((s.portfolio_strategy as any)?.improvements || [])))}
        </div>
      )}

      {strategy.match_band === "MID" && (
        <div className="space-y-4">
          {card("Prioritized Skill Roadmap", renderList(asStringList(s.prioritized_roadmap)))}
          {card(
            "Timeline-Based Learning Plan (12 weeks)",
            Array.isArray(s.learning_timeline) && s.learning_timeline.length > 0 ? (
              <div className="space-y-2 text-sm">
                {(s.learning_timeline as any[]).map((w) => (
                  <div key={`week-${w.week}`} className="border-l-2 border-accent/40 pl-3">
                    <p className="font-medium">Week {w.week}: {w.primary_focus}</p>
                    <p className="text-muted-foreground">{w.outcome}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No timeline available.</p>
            )
          )}
          {card("Project Recommendations", renderList(asStringList(s.projects)))}
          {card(
            "Certification Path",
            <div className="space-y-2 text-sm">
              {renderList(asStringList((s.certifications as any)?.recommendations || []))}
              {(s.certifications as any)?.narrative && (
                <p className="text-muted-foreground">{String((s.certifications as any).narrative)}</p>
              )}
            </div>
          )}
        </div>
      )}

      {strategy.match_band === "LOW" && (
        <div className="space-y-4">
          {card(
            "Alternate Roles Aligned With Strength Profile",
            Array.isArray(s.alternate_roles) && s.alternate_roles.length > 0 ? (
              <div className="space-y-2 text-sm">
                {(s.alternate_roles as any[]).map((r, idx) => (
                  <div key={`${r.role || "role"}-${idx}`} className="border-l-2 border-primary/30 pl-3">
                    <p className="font-medium">{r.role}</p>
                    {r.overlap_score != null && <p className="text-muted-foreground">Overlap: {r.overlap_score}%</p>}
                    {r.rationale && <p className="text-muted-foreground">{r.rationale}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No alternate roles available.</p>
            )
          )}
          {card("Pivot Path", renderList(asStringList((s.pivot_plan as any)?.steps || [])))}
          {card(
            "Realistic Transition Timeline",
            <div className="text-sm space-y-2">
              {(s.transition_timeline as any)?.estimated_weeks != null && (
                <p>Estimated transition time: <span className="font-medium">{String((s.transition_timeline as any).estimated_weeks)} weeks</span></p>
              )}
              {(s.transition_timeline as any)?.formula && (
                <p className="text-muted-foreground">Formula: {String((s.transition_timeline as any).formula)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
