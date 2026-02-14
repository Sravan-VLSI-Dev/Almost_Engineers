import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProfileInput } from "./ProfileInput";
import { AnalysisPipeline } from "./AnalysisPipeline";
import { SkillGapView } from "./SkillGapView";
import { RoadmapView } from "./RoadmapView";
import { InterviewView } from "./InterviewView";
import { StrategyPanel } from "./StrategyPanel";
import { api } from "@/lib/api";
import { AnalysisStep, UserProfile, RoleAnalysis, SkillGap, Roadmap, InterviewGuide, ResumeBulletResult, MatchStrategy } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, LogOut, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchMatchStrategy } from "@/services/matchStrategyService";
import { getMatchBand } from "@/domain/matchStrategyEngine";
import { getMotivationMessage } from "@/domain/motivationEngine";
import { getIndustryExpectation } from "@/domain/expectationEngine";
import { clusterIdentity } from "@/domain/identityCluster";

export const Dashboard = () => {
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roleAnalysis, setRoleAnalysis] = useState<RoleAnalysis | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGap | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [interview, setInterview] = useState<InterviewGuide | null>(null);
  const [resumeBullets, setResumeBullets] = useState<ResumeBulletResult | null>(null);
  const [strategy, setStrategy] = useState<MatchStrategy | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);

  const ensurePsychologicalLayer = (input: MatchStrategy, sg: SkillGap, ra: RoleAnalysis): MatchStrategy => {
    if (input.psychological_layer) return input;

    const identity = clusterIdentity([...(sg.strong || []), ...(sg.weak || [])]);
    return {
      ...input,
      psychological_layer: {
        motivation_message: getMotivationMessage(input.match_band),
        identity_alignment_insight: `Your current strengths indicate ${identity.dominant_traits.join(" and ")} tendencies. ${identity.suggested_long_term_direction}`,
        industry_expectation_range: getIndustryExpectation(ra.role || ""),
      },
    };
  };

  const buildLocalStrategyFallback = (sg: SkillGap, ra: RoleAnalysis, rm: Roadmap): MatchStrategy => {
    const band = getMatchBand(sg.role_match_percentage);

    if (band === "HIGH") {
      return {
        match_band: "HIGH",
        strategy: {
          resume_optimization: {
            suggestions: sg.weak.map((s) => `Add quantified impact evidence for ${s}.`).slice(0, 6),
          },
          company_targets: (sg.company_matches && sg.company_matches.length > 0
            ? sg.company_matches
            : ra.top_companies.map((c) => ({ company: c.company, match_percentage: null, missing_skills: c.required_skills.slice(0, 2) }))
          ).slice(0, 6),
          interview_strategy: {
            focus_areas: [...sg.weak, ...sg.missing].slice(0, 6),
            drills: [
              "Run 3 timed mock interviews with role-specific scenarios.",
              "Prepare concise STAR stories for leadership and conflict.",
            ],
          },
          portfolio_strategy: {
            improvements: sg.missing.map((s) => `Create one polished artifact demonstrating ${s}.`).slice(0, 5),
          },
        },
        psychological_layer: {
          motivation_message: getMotivationMessage("HIGH"),
          identity_alignment_insight: "Your current profile shows strong execution readiness with room for precision-level refinement in role-critical areas.",
          industry_expectation_range: getIndustryExpectation(ra.role || ""),
        },
      };
    }

    if (band === "MID") {
      const prioritized = [...sg.missing, ...sg.weak];
      return {
        match_band: "MID",
        strategy: {
          prioritized_roadmap: prioritized,
          learning_timeline: Array.from({ length: 12 }, (_, i) => ({
            week: i + 1,
            primary_focus: prioritized.length ? prioritized[i % prioritized.length] : ra.role,
            outcome: "Produce one validated learning artifact.",
          })),
          projects: sg.missing.slice(0, 6).map((s) => `Build one role-relevant project focused on ${s}.`),
          certifications: {
            recommendations: [
              "Complete one vendor-recognized certification aligned to your stack.",
              "Add one verification/testing certificate if targeting hardware/verification roles.",
            ],
            narrative: "Use certification to validate fundamentals after shipping practical projects.",
          },
        },
        psychological_layer: {
          motivation_message: getMotivationMessage("MID"),
          identity_alignment_insight: "Your profile reflects meaningful foundations and a structured growth trajectory toward stronger role alignment.",
          industry_expectation_range: getIndustryExpectation(ra.role || ""),
        },
        source_metrics: {
          role_match_percentage: sg.role_match_percentage,
          roadmap_hours: rm.total_learning_hours,
          projection_match_percentage: rm.projection?.projected_role_match_percentage ?? null,
        },
      };
    }

    return {
      match_band: "LOW",
      strategy: {
        alternate_roles: [
          { role: "QA Engineer", overlap_score: 50, rationale: "Closer path from verification and testing foundations." },
          { role: "Test Automation Engineer", overlap_score: 48, rationale: "Strong alignment with validation and debugging workflow." },
          { role: "Junior Verification Engineer", overlap_score: 45, rationale: "Incremental path toward advanced target role." },
        ],
        pivot_plan: {
          strengths_overlap: sg.strong,
          steps: [
            "Focus on transferable strengths, preferred work-style, and portfolio signals.",
            "Sequence missing fundamentals before advanced topics.",
            "Target adjacent roles while building toward the dream role.",
          ],
        },
        transition_timeline: {
          formula: "(missing_skills * avg_hours) / weekly_capacity",
          estimated_weeks: Math.ceil((sg.missing.length * 24) / 10),
        },
      },
      psychological_layer: {
        motivation_message: getMotivationMessage("LOW"),
        identity_alignment_insight: "Your strengths suggest transferable potential; a staged path can improve fit while preserving long-term direction.",
        industry_expectation_range: getIndustryExpectation(ra.role || ""),
      },
      source_metrics: {
        role_match_percentage: sg.role_match_percentage,
        roadmap_hours: rm.total_learning_hours,
        projection_match_percentage: rm.projection?.projected_role_match_percentage ?? null,
      },
    };
  };

  const loadStrategy = async (profileId: string, roleId: string, sg: SkillGap, ra: RoleAnalysis, rm: Roadmap) => {
    setStrategyLoading(true);
    setStrategyError(null);
    try {
      const s = await fetchMatchStrategy(profileId, roleId);
      setStrategy(ensurePsychologicalLayer(s, sg, ra));
    } catch (err: unknown) {
      // Retry once in case of transient edge transport/network issue.
      try {
        await new Promise((resolve) => setTimeout(resolve, 700));
        const retried = await fetchMatchStrategy(profileId, roleId);
        setStrategy(ensurePsychologicalLayer(retried, sg, ra));
        setStrategyError(null);
      } catch {
        setStrategy(buildLocalStrategyFallback(sg, ra, rm));
        setStrategyError("Using local copilot mode for strategy. Core analysis remains fully available.");
      }
    } finally {
      setStrategyLoading(false);
    }
  };

  const runPipeline = async (profileData: Partial<UserProfile>, role: string) => {
    setLoading(true);
    try {
      // Step 1: Profile
      setStep("profile");
      const analyzedProfile = await api.analyzeProfile(profileData);
      setProfile(analyzedProfile);

      // Step 2: Role
      setStep("role");
      const ra = await api.analyzeRole(analyzedProfile.id!, role);
      setRoleAnalysis(ra);

      // Step 3: Gap
      setStep("gap");
      const sg = await api.analyzeGap(analyzedProfile.id!, ra.id!);
      setSkillGap(sg);

      // Step 4: Roadmap
      setStep("roadmap");
      const rm = await api.generateRoadmap(analyzedProfile.id!, sg.id!);
      setRoadmap(rm);

      // Step 5: Interview
      setStep("interview");
      const iv = await api.generateInterview(analyzedProfile.id!, ra.id!);
      setInterview(iv);

      setStep("complete");
      toast.success("Analysis complete!");

      // Optional post-analysis enhancement (must not block result view)
      api.generateResumeBullets(analyzedProfile.id!, ra.id!)
        .then(setResumeBullets)
        .catch(() => {
          // Keep analysis usable even if optional endpoint is unavailable.
        });

      loadStrategy(analyzedProfile.id!, ra.id!, sg, ra, rm);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      if (step === "idle") setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("idle");
    setProfile(null);
    setRoleAnalysis(null);
    setSkillGap(null);
    setRoadmap(null);
    setInterview(null);
    setResumeBullets(null);
    setStrategy(null);
    setStrategyError(null);
    setStrategyLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleExportPdf = async () => {
    if (!profile?.id) return;
    try {
      const result = await api.exportAnalysisPdf(profile.id);
      const byteChars = atob(result.base64_pdf);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i += 1) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: result.content_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.file_name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF export generated.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to export PDF");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-gradient">Career Co-Pilot</span>
          </h1>
          <div className="flex items-center gap-2">
            {step !== "idle" && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-1" /> New Analysis
              </Button>
            )}
            {step === "complete" && profile?.id && resumeBullets && (
              <Button variant="ghost" size="sm" onClick={handleExportPdf}>
                <Download className="h-4 w-4 mr-1" /> Export PDF
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {step === "idle" ? (
          <ProfileInput onSubmit={runPipeline} loading={loading} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            <div>
              <AnalysisPipeline currentStep={step} />
            </div>
            <div>
              {step === "complete" && skillGap && roleAnalysis && roadmap && interview ? (
                <Tabs defaultValue="gap" className="space-y-4">
                  <TabsList className="glass w-full justify-start">
                    <TabsTrigger value="gap">Skill Gap</TabsTrigger>
                    <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
                    <TabsTrigger value="interview">Interview</TabsTrigger>
                    <TabsTrigger value="strategy">Strategy</TabsTrigger>
                  </TabsList>
                  <TabsContent value="gap">
                    <SkillGapView gap={skillGap} roleAnalysis={roleAnalysis} />
                  </TabsContent>
                  <TabsContent value="roadmap">
                    <RoadmapView roadmap={roadmap} />
                  </TabsContent>
                  <TabsContent value="interview">
                    <InterviewView guide={interview} />
                  </TabsContent>
                  <TabsContent value="strategy">
                    {strategyLoading ? (
                      <div className="glass rounded-lg p-6 text-sm text-muted-foreground">Generating strategy plan...</div>
                    ) : strategy ? (
                      <div className="space-y-3">
                        {strategyError && (
                          <div className="glass rounded-lg p-3 text-xs text-muted-foreground">{strategyError}</div>
                        )}
                        <StrategyPanel strategy={strategy} />
                      </div>
                    ) : (
                      <div className="glass rounded-lg p-6 text-sm text-muted-foreground">No strategy available yet.</div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="glass rounded-lg p-12 text-center">
                  <div className="animate-pulse-slow">
                    <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Running agent pipeline...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
