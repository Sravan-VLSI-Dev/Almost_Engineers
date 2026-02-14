import { Roadmap } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

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

  const currentMatch = 100 - Math.min(95, Math.round((roadmap.total_learning_hours / 120) * 100));
  const projectedMatch = Math.round(roadmap.projection?.projected_role_match_percentage ?? Math.min(95, currentMatch + 24));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
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

      <div className="glass rounded-lg p-4 bg-white/70 border-white/60">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Projected Growth Signal</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Current Match</p>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${currentMatch}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} className="h-full bg-gradient-to-r from-primary to-accent" />
            </div>
            <p className="text-xs mt-1 font-mono">{currentMatch}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Projected Match</p>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${projectedMatch}%` }} transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.08 }} className="h-full bg-gradient-to-r from-[#8f84ff] to-primary" />
            </div>
            <p className="text-xs mt-1 font-mono">{projectedMatch}%</p>
          </div>
        </div>
      </div>

      {/* Weekly breakdown */}
      {weeks.map((week, wi) => (
        <motion.div key={wi} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.28, delay: wi * 0.05 }} className="glass rounded-lg p-4 bg-white/70 border-white/60">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Week {wi + 1}
          </h4>
          <div className="space-y-3">
            {week.map((day) => (
              <motion.div key={day.day} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="border-l-2 border-primary/30 pl-4 py-1 relative">
                <span className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-primary/70 shadow-[0_0_12px_rgba(108,123,255,0.55)]" />
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
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
