import { Roadmap } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen } from "lucide-react";

interface Props {
  roadmap: Roadmap;
}

export const RoadmapView = ({ roadmap }: Props) => {
  const weeks = [
    roadmap.roadmap.filter((d) => d.day <= 7),
    roadmap.roadmap.filter((d) => d.day > 7 && d.day <= 14),
    roadmap.roadmap.filter((d) => d.day > 14 && d.day <= 21),
    roadmap.roadmap.filter((d) => d.day > 21),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-lg p-4 text-center">
          <Clock className="h-5 w-5 text-accent mx-auto mb-1" />
          <div className="text-2xl font-bold font-mono text-accent">
            {Math.round(roadmap.total_learning_hours)}h
          </div>
          <div className="text-xs text-muted-foreground">Total Hours</div>
        </div>
        <div className="glass rounded-lg p-4 text-center">
          <BookOpen className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-2xl font-bold font-mono text-primary">
            {Math.round(roadmap.estimated_readiness_weeks)}w
          </div>
          <div className="text-xs text-muted-foreground">ETA Readiness</div>
        </div>
      </div>

      {/* Weekly breakdown */}
      {weeks.map((week, wi) => (
        <div key={wi} className="glass rounded-lg p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Week {wi + 1}
          </h4>
          <div className="space-y-3">
            {week.map((day) => (
              <div key={day.day} className="border-l-2 border-primary/30 pl-4 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Day {day.day}: {day.skill_focus}
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {day.estimated_hours}h
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{day.task}</p>
                {day.resources.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {day.resources.map((r, ri) => (
                      <a
                        key={ri}
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        {r.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
