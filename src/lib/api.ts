import { supabase } from "@/integrations/supabase/client";
import type { UserProfile, RoleAnalysis, SkillGap, Roadmap, InterviewGuide, ResumeBulletResult } from "./types";

const invoke = async (fn: string, body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message || `Edge function ${fn} failed`);
  return data;
};

export const api = {
  async analyzeProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    return invoke("career-analyze", { action: "profile", profile });
  },

  async analyzeRole(profileId: string, role: string): Promise<RoleAnalysis> {
    return invoke("career-analyze", { action: "role", profileId, role });
  },

  async analyzeGap(profileId: string, roleAnalysisId: string): Promise<SkillGap> {
    return invoke("career-analyze", { action: "gap", profileId, roleAnalysisId });
  },

  async generateRoadmap(profileId: string, skillGapId: string): Promise<Roadmap> {
    return invoke("career-analyze", { action: "roadmap", profileId, skillGapId });
  },

  async generateInterview(profileId: string, roleAnalysisId: string): Promise<InterviewGuide> {
    return invoke("career-analyze", { action: "interview", profileId, roleAnalysisId });
  },

  async generateResumeBullets(profileId: string, roleAnalysisId: string, targetCount = 6): Promise<ResumeBulletResult> {
    return invoke("career-analyze", { action: "resume_bullets", profileId, roleAnalysisId, targetCount });
  },

  async exportAnalysisPdf(profileId: string): Promise<{ file_name: string; content_type: string; base64_pdf: string }> {
    return invoke("career-analyze", { action: "export_pdf", profileId });
  },

  async deleteProfile(profileId: string): Promise<void> {
    await supabase.from("profiles").delete().eq("id", profileId);
  },
};
