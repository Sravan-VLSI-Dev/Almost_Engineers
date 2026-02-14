import { z } from "https://esm.sh/zod@3.25.76";
import { getMatchBand, type MatchBand } from "../domain/matchStrategyEngine.ts";
import { getMotivationMessage } from "../domain/motivationEngine.ts";
import { clusterIdentity } from "../domain/identityCluster.ts";
import { getIndustryExpectation } from "../domain/expectationEngine.ts";
import { refineStrategyNarrative } from "../agents/matchStrategyAgent.ts";
import { buildIdentityInsight } from "../agents/identityInsightAgent.ts";

const strategyResponseSchema = z.object({
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
  }),
});

const certMap: Record<string, string[]> = {
  aws: ["AWS Certified Developer Associate", "AWS Solutions Architect Associate"],
  kubernetes: ["Certified Kubernetes Application Developer"],
  docker: ["Docker Certified Associate"],
  python: ["PCAP: Certified Associate in Python Programming"],
  data: ["Google Data Analytics Certificate"],
  security: ["CompTIA Security+", "ISC2 CC"],
};

function lowerList(input: string[]) {
  return input.map((s) => s.toLowerCase());
}

function certificationSuggestions(skills: string[]) {
  const out = new Set<string>();
  for (const skill of lowerList(skills)) {
    for (const [k, certs] of Object.entries(certMap)) {
      if (skill.includes(k)) certs.forEach((c) => out.add(c));
    }
  }
  return [...out].slice(0, 5);
}

function projectSuggestion(skill: string) {
  return `Build and document one production-style project focused on ${skill}, including tests and deployment notes.`;
}

function transitionWeeks(missingSkills: number, avgHours = 24, weeklyCapacity = 10) {
  if (weeklyCapacity <= 0) return null;
  return Math.ceil((missingSkills * avgHours) / weeklyCapacity);
}

function isMissingRelationError(error: unknown) {
  const msg = String((error as { message?: string })?.message || "").toLowerCase();
  return msg.includes("relation") && msg.includes("does not exist");
}

async function highBandStrategy(params: {
  roleAnalysis: any;
  skillGap: any;
  companyMatches: any[];
}) {
  const weak = params.skillGap?.weak || [];
  const missing = params.skillGap?.missing || [];
  const companyTargets = (params.companyMatches || [])
    .sort((a: any, b: any) => Number(b.match_percentage) - Number(a.match_percentage))
    .slice(0, 8)
    .map((c: any) => ({
      company: c.company,
      match_percentage: c.match_percentage,
      missing_skills: c.missing_skills || [],
    }));

  const refined = await refineStrategyNarrative({
    match_band: "HIGH",
    title: "Application Optimization Plan",
    deterministic_summary: "You are in optimization mode. Focus on application quality and interview depth.",
    deterministic_points: [
      ...weak.map((s: string) => `Strengthen evidence for ${s} with measurable results.`),
      ...missing.map((s: string) => `Address ${s} with concise project proof before interviews.`),
    ].slice(0, 8),
  });

  return {
    resume_optimization: {
      narrative: refined.narrative,
      suggestions: refined.recommendations,
    },
    company_targets: companyTargets,
    interview_strategy: {
      focus_areas: [...weak, ...missing].slice(0, 6),
      approach: "Practice depth-first role-specific scenarios with quantified impact.",
    },
    portfolio_strategy: {
      improvements: [...missing, ...weak].slice(0, 5).map((s: string) => `Add one polished artifact demonstrating ${s}.`),
    },
  };
}

async function midBandStrategy(params: {
  skillGap: any;
  roadmap: any;
}) {
  const missing = params.skillGap?.missing || [];
  const weak = params.skillGap?.weak || [];
  const prioritized = [...missing, ...weak];

  const timeline = Array.from({ length: 12 }, (_, i) => {
    const week = i + 1;
    const skill = prioritized.length > 0 ? prioritized[i % prioritized.length] : "Interview fundamentals";
    return {
      week,
      primary_focus: skill,
      outcome: `Deliver one concrete output proving ${skill}.`,
    };
  });

  const certs = certificationSuggestions(prioritized);
  const certNarrative = await refineStrategyNarrative({
    match_band: "MID",
    title: "Skill Acceleration Plan",
    deterministic_summary: "You are in development mode. A focused 12-week plan will significantly improve competitiveness.",
    deterministic_points: certs.length > 0 ? certs : ["No direct certification fit identified; prioritize portfolio evidence."],
  });

  return {
    prioritized_roadmap: prioritized,
    learning_timeline: timeline,
    projects: missing.slice(0, 6).map((s: string) => projectSuggestion(s)),
    certifications: {
      recommendations: certs,
      narrative: certNarrative.narrative,
    },
  };
}

async function lowBandStrategy(params: {
  profile: any;
  skillGap: any;
  roleRequirementsRows: any[];
}) {
  const profileSkills: string[] = params.profile?.skills || [];
  const userSkillSet = new Set(lowerList(profileSkills));
  const strengths = params.skillGap?.strong || [];
  const missing = params.skillGap?.missing || [];

  const byRole = new Map<string, Set<string>>();
  for (const row of params.roleRequirementsRows || []) {
    const role = String(row.role || "").toLowerCase();
    if (!byRole.has(role)) byRole.set(role, new Set());
    byRole.get(role)!.add(String(row.skill || "").toLowerCase());
  }

  const ranked = [...byRole.entries()]
    .map(([role, skills]) => {
      const overlap = [...skills].filter((s) => userSkillSet.has(s)).length;
      return { role, overlap, total: skills.size };
    })
    .filter((r) => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.total - b.total)
    .slice(0, 3)
    .map((r) => ({
      role: r.role,
      overlap_score: r.total ? Math.round((r.overlap / r.total) * 100) : 0,
    }));

  const weeklyCapacity = params.profile?.experience_level === "junior" ? 8 : params.profile?.experience_level === "mid" ? 10 : 12;
  const weeks = transitionWeeks(missing.length, 24, weeklyCapacity);

  const refined = await refineStrategyNarrative({
    match_band: "LOW",
    title: "Career Realignment Plan",
    deterministic_summary: "You are early in this target path. A strategic pivot plan can reduce risk and improve momentum.",
    deterministic_points: ranked.map((r) => `Role option: ${r.role} (${r.overlap_score}% overlap).`),
  });

  return {
    alternate_roles: ranked,
    pivot_plan: {
      strengths_overlap: strengths,
      steps: [
        "Stabilize core transferable strengths and create evidence artifacts.",
        "Build missing foundational skills in sequenced order.",
        "Run targeted applications for overlap-heavy roles first.",
      ],
      narrative: refined.narrative,
    },
    transition_timeline: {
      weekly_capacity_hours: weeklyCapacity,
      estimated_weeks: weeks,
      formula: "(missing_skills * avg_hours) / weekly_capacity",
    },
  };
}

export async function buildMatchStrategy(params: {
  supabase: any;
  profileId: string;
  roleId: string;
  userId: string;
}) {
  const { supabase, profileId, roleId, userId } = params;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("user_id", userId)
    .maybeSingle();
  if (profileErr || !profile) throw new Error("Profile not found");

  const { data: roleAnalysis, error: roleErr } = await supabase
    .from("role_analyses")
    .select("*")
    .eq("id", roleId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (roleErr || !roleAnalysis) throw new Error("Role analysis not found");

  const { data: skillGap, error: gapErr } = await supabase
    .from("skill_gaps")
    .select("*")
    .eq("profile_id", profileId)
    .eq("role_analysis_id", roleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (gapErr || !skillGap) throw new Error("Skill gap not found");

  const [{ data: projection }, { data: roadmap }, { data: roleReqRows }, { data: companyMatches }] = await Promise.all([
    supabase.from("projections").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("roadmaps").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("role_requirements").select("role, skill, weight"),
    supabase.from("company_matches").select("*").eq("profile_id", profileId).eq("role_analysis_id", roleId).order("match_percentage", { ascending: false }),
  ]);

  const matchBand = getMatchBand(Number(skillGap.role_match_percentage || 0));
  let strategy: Record<string, unknown> = {};

  if (matchBand === "HIGH") {
    strategy = await highBandStrategy({ roleAnalysis, skillGap, companyMatches: companyMatches || [] });
  } else if (matchBand === "MID") {
    strategy = await midBandStrategy({ skillGap, roadmap });
  } else {
    strategy = await lowBandStrategy({ profile, skillGap, roleRequirementsRows: roleReqRows || [] });
  }

  const identityCluster = clusterIdentity([
    ...((skillGap?.strong || []) as string[]),
    ...((skillGap?.weak || []) as string[]),
    ...((profile?.skills || []) as string[]),
  ]);

  const identity = await buildIdentityInsight({
    dominant_traits: identityCluster.dominant_traits,
    suggested_long_term_direction: identityCluster.suggested_long_term_direction,
  });

  const psychological_layer = {
    motivation_message: getMotivationMessage(matchBand),
    identity_alignment_insight: identity.identity_insight,
    industry_expectation_range: getIndustryExpectation(roleAnalysis.role || ""),
  };

  const response = {
    match_band: matchBand as MatchBand,
    strategy,
    psychological_layer,
    source_metrics: {
      role_match_percentage: skillGap.role_match_percentage,
      projection_match_percentage: projection?.projected_role_match_percentage || null,
      roadmap_hours: roadmap?.total_learning_hours || null,
    },
  };

  const parsed = strategyResponseSchema.parse({
    match_band: response.match_band,
    strategy: response.strategy,
    psychological_layer: response.psychological_layer,
  });

  const { error: saveErr } = await supabase.from("match_strategies").insert({
    profile_id: profileId,
    role_id: roleId,
    match_band: parsed.match_band,
    strategy_json: { strategy: response.strategy, psychological_layer: response.psychological_layer },
  });
  if (saveErr && !isMissingRelationError(saveErr)) throw saveErr;

  return response;
}
