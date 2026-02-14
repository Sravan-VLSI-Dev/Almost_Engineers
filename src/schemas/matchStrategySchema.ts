import { z } from "zod";

export const matchStrategySchema = z.object({
  match_band: z.enum(["HIGH", "MID", "LOW"]),
  strategy: z.object({
    resume_optimization: z.any().optional(),
    company_targets: z.any().optional(),
    interview_strategy: z.any().optional(),
    portfolio_strategy: z.any().optional(),
    prioritized_roadmap: z.any().optional(),
    learning_timeline: z.any().optional(),
    projects: z.any().optional(),
    certifications: z.any().optional(),
    alternate_roles: z.any().optional(),
    pivot_plan: z.any().optional(),
    transition_timeline: z.any().optional(),
  }),
  psychological_layer: z.object({
    motivation_message: z.string(),
    identity_alignment_insight: z.string(),
    industry_expectation_range: z.string(),
  }).optional(),
  source_metrics: z.object({
    role_match_percentage: z.number().nullable().optional(),
    projection_match_percentage: z.number().nullable().optional(),
    roadmap_hours: z.number().nullable().optional(),
  }).optional(),
});

export type MatchStrategyResponse = z.infer<typeof matchStrategySchema>;
