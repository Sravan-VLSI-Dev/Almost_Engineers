import { SkillGap, RoleAnalysis } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
  gap: SkillGap;
  roleAnalysis: RoleAnalysis;
}

export const SkillGapView = ({ gap, roleAnalysis }: Props) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Role Match", value: `${Math.round(gap.role_match_percentage)}%`, color: "text-primary" },
          { label: "Skills Found", value: `${gap.skills_found_count}/${gap.skills_required_count}`, color: "text-accent" },
          { label: "Confidence", value: `${Math.round(gap.confidence_score * 100)}%`, color: "text-warning" },
          { label: "Role", value: roleAnalysis.role, color: "text-foreground" },
        ].map((m) => (
          <div key={m.label} className="glass rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Match bar */}
      <div className="glass rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Role Match</span>
          <span className="font-mono text-primary">{Math.round(gap.role_match_percentage)}%</span>
        </div>
        <Progress value={gap.role_match_percentage} className="h-2" />
      </div>

      {/* Skills breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-lg p-4">
          <h4 className="text-sm font-medium text-primary mb-3">Strong ({gap.strong.length})</h4>
          <div className="flex flex-wrap gap-2">
            {gap.strong.map((s) => (
              <Badge key={s} variant="default" className="bg-primary/20 text-primary border-primary/30">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div className="glass rounded-lg p-4">
          <h4 className="text-sm font-medium text-warning mb-3">Weak ({gap.weak.length})</h4>
          <div className="flex flex-wrap gap-2">
            {gap.weak.map((s) => (
              <Badge key={s} variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div className="glass rounded-lg p-4">
          <h4 className="text-sm font-medium text-destructive mb-3">Missing ({gap.missing.length})</h4>
          <div className="flex flex-wrap gap-2">
            {gap.missing.map((s) => (
              <Badge key={s} variant="outline" className="border-destructive/30 text-destructive">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Top companies */}
      <div className="glass rounded-lg p-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Companies Hiring</h4>
        <div className="space-y-3">
          {(gap.company_matches && gap.company_matches.length > 0 ? gap.company_matches : roleAnalysis.top_companies).map((c) => (
            <div key={c.company} className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.company}</span>
                {"match_percentage" in c ? (
                  <span className="font-mono text-primary text-xs">{Math.round(c.match_percentage)}%</span>
                ) : (
                  <span className="text-muted-foreground font-mono text-xs">{c.required_skills.slice(0, 3).join(", ")}</span>
                )}
              </div>
              {"missing_skills" in c && c.missing_skills.length > 0 && (
                <p className="text-xs text-muted-foreground">Missing: {c.missing_skills.slice(0, 3).join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
