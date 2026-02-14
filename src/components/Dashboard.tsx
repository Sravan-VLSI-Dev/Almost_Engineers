import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProfileInput } from "./ProfileInput";
import { AnalysisPipeline } from "./AnalysisPipeline";
import { SkillGapView } from "./SkillGapView";
import { RoadmapView } from "./RoadmapView";
import { InterviewView } from "./InterviewView";
import { api } from "@/lib/api";
import { AnalysisStep, UserProfile, RoleAnalysis, SkillGap, Roadmap, InterviewGuide, ResumeBulletResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, LogOut, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Dashboard = () => {
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roleAnalysis, setRoleAnalysis] = useState<RoleAnalysis | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGap | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [interview, setInterview] = useState<InterviewGuide | null>(null);
  const [resumeBullets, setResumeBullets] = useState<ResumeBulletResult | null>(null);

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
