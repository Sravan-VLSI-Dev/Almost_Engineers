interface Props {
  psychologicalLayer?: {
    motivation_message?: string;
    identity_alignment_insight?: string;
    industry_expectation_range?: string;
  };
}

export const PsychologicalInsightsPanel = ({ psychologicalLayer }: Props) => {
  if (!psychologicalLayer) {
    return (
      <div className="glass rounded-lg p-4 text-sm text-muted-foreground">
        Psychological insights are not available yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-lg p-4">
        <h4 className="text-sm font-medium text-primary mb-2">Motivation Message</h4>
        <p className="text-sm">{psychologicalLayer.motivation_message}</p>
      </div>

      <div className="glass rounded-lg p-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Career Identity Alignment Insight</h4>
        <p className="text-sm text-foreground/90">{psychologicalLayer.identity_alignment_insight}</p>
      </div>

      <div className="glass rounded-lg p-4">
        <p className="text-xs text-muted-foreground">
          Industry expectation range: {psychologicalLayer.industry_expectation_range}
        </p>
      </div>
    </div>
  );
};
