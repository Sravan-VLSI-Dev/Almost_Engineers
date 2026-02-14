import { AnalysisStep } from "@/lib/types";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

const steps: { key: AnalysisStep; label: string }[] = [
  { key: "profile", label: "Profile Analysis" },
  { key: "role", label: "Role Validation" },
  { key: "gap", label: "Skill Gap Detection" },
  { key: "roadmap", label: "Roadmap Generation" },
  { key: "interview", label: "Interview Prep" },
];

interface Props {
  currentStep: AnalysisStep;
}

export const AnalysisPipeline = ({ currentStep }: Props) => {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);
  const isComplete = currentStep === "complete";

  return (
    <div className="glass rounded-lg p-6 animate-fade-in">
      <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
        Agent Pipeline
      </h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isDone = isComplete || i < currentIdx;
          const isActive = !isComplete && i === currentIdx;

          return (
            <div key={step.key} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : isActive ? (
                <Loader2 className="h-5 w-5 text-accent shrink-0 animate-spin" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
              )}
              <span
                className={`text-sm ${isDone ? "text-foreground" : isActive ? "text-accent font-medium" : "text-muted-foreground/50"}`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
