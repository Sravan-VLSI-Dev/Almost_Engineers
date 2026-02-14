
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_RESUME_TEXT_CHARS = 40000;

const RATE_LIMITS: Record<string, { max: number; windowMinutes: number }> = {
  profile: { max: 10, windowMinutes: 15 },
  role: { max: 20, windowMinutes: 15 },
  gap: { max: 20, windowMinutes: 15 },
  roadmap: { max: 10, windowMinutes: 15 },
  interview: { max: 10, windowMinutes: 15 },
  resume_bullets: { max: 10, windowMinutes: 15 },
  export_pdf: { max: 10, windowMinutes: 15 },
};

const FALLBACK_ROLE_REQUIREMENTS: Record<string, string[]> = {
  "frontend engineer": ["JavaScript", "TypeScript", "React", "HTML", "CSS", "Testing", "Accessibility"],
  "backend engineer": ["Node.js", "APIs", "SQL", "System Design", "Distributed Systems", "Testing"],
  "full stack engineer": ["JavaScript", "TypeScript", "React", "Node.js", "APIs", "SQL"],
  "ml engineer": ["Python", "Machine Learning", "PyTorch", "TensorFlow", "MLOps", "Statistics"],
  "devops engineer": ["AWS", "Docker", "Kubernetes", "CI/CD", "Terraform", "Monitoring"],
};

const FALLBACK_COMPANIES = ["Google", "Microsoft", "Amazon", "Meta", "Stripe"];

const profileInputSchema = z.object({
  name: z.string().trim().max(120).optional(),
  experience_level: z.enum(["junior", "mid", "senior", "lead"]).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  github_url: z.string().url().max(300).optional(),
  linkedin_url: z.string().url().max(300).optional(),
  resume_text: z.string().max(MAX_RESUME_TEXT_CHARS).optional(),
  resume_file_path: z.string().regex(/^[a-f0-9-]+\/[A-Za-z0-9._-]+\.pdf$/).max(350).optional(),
});

const roleSchema = z.object({ profileId: z.string().uuid(), role: z.string().trim().min(2).max(140) });
const gapSchema = z.object({ profileId: z.string().uuid(), roleAnalysisId: z.string().uuid() });
const roadmapSchema = z.object({ profileId: z.string().uuid(), skillGapId: z.string().uuid() });
const interviewSchema = z.object({ profileId: z.string().uuid(), roleAnalysisId: z.string().uuid() });
const bulletsSchema = z.object({ profileId: z.string().uuid(), roleAnalysisId: z.string().uuid(), targetCount: z.number().int().min(3).max(10).default(6) });
const exportSchema = z.object({ profileId: z.string().uuid() });

const resumeExtractSchema = z.object({
  skills: z.array(z.string()).default([]),
  projects: z.array(z.object({ name: z.string(), description: z.string(), technologies: z.array(z.string()) })).default([]),
  education: z.array(z.object({ institution: z.string(), degree: z.string(), year: z.string() })).default([]),
  experience_level: z.enum(["junior", "mid", "senior", "lead"]).optional(),
});

const roadmapRefineSchema = z.object({
  roadmap: z.array(z.object({
    day: z.number().int().min(1).max(30),
    skill_focus: z.string().min(1),
    task: z.string().min(1),
    estimated_hours: z.number().min(1).max(3),
    resources: z.array(z.object({
      title: z.string().min(1),
      link: z.string().url(),
      type: z.string().min(1),
      estimated_time: z.string().min(1),
    })).default([]),
    explanation: z.string().min(1),
  })).length(30),
});

const interviewGuideSchema = z.object({
  interview_guide: z.array(z.object({ question: z.string().min(1), example_answer: z.string().min(1), explanation: z.string().min(1) })).length(10),
});

const bulletOutputSchema = z.object({
  bullets: z.array(z.object({ bullet: z.string().min(1), focus_skill: z.string().min(1), ats_keywords: z.array(z.string()).default([]) })).min(3).max(10),
});

const generatedRoleRequirementsSchema = z.object({
  required_skills: z.array(z.string().min(1)).min(6).max(20),
});

type SkillCoverage = { strong: string[]; weak: string[]; missing: string[] };
type RoadmapTask = { day: number; skill_focus: string; task: string; estimated_hours: number; resources: { title: string; link: string; type: string; estimated_time: string }[]; explanation: string };

async function callAI(systemPrompt: string, userPrompt: string, tools?: any[], toolChoice?: any) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const body: any = { model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const status = resp.status;
    if (status === 429) throw new Error("Rate limit exceeded, please try again later");
    if (status === 402) throw new Error("AI credits exhausted, please add credits");
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await resp.json();
  if (tools && data.choices?.[0]?.message?.tool_calls) {
    const args = data.choices[0].message.tool_calls[0].function.arguments;
    return JSON.parse(typeof args === "string" ? args : JSON.stringify(args));
  }
  return data.choices?.[0]?.message?.content || "";
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
}

function isMissingRelationError(error: unknown) {
  const msg = String((error as { message?: string })?.message || error || "").toLowerCase();
  return msg.includes("relation") && msg.includes("does not exist");
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("Not authenticated");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

function windowStartISO(minutes: number) {
  const now = new Date();
  const ms = minutes * 60 * 1000;
  const start = new Date(Math.floor(now.getTime() / ms) * ms);
  return start.toISOString();
}

async function enforceRateLimit(supabase: any, userId: string, action: string) {
  const cfg = RATE_LIMITS[action] || { max: 10, windowMinutes: 15 };
  const windowStart = windowStartISO(cfg.windowMinutes);

  const { data: existing, error: selectErr } = await supabase.from("api_rate_limits").select("id, request_count").eq("user_id", userId).eq("action", action).eq("window_start", windowStart).maybeSingle();
  if (selectErr) {
    if (isMissingRelationError(selectErr)) return;
    throw selectErr;
  }

  if (!existing) {
    const { error: insertErr } = await supabase.from("api_rate_limits").insert({ user_id: userId, action, window_start: windowStart, request_count: 1 });
    if (insertErr && !isMissingRelationError(insertErr)) throw insertErr;
    return;
  }

  if (existing.request_count >= cfg.max) throw new Error(`Rate limit exceeded for action: ${action}`);

  const { error: updateErr } = await supabase.from("api_rate_limits").update({ request_count: existing.request_count + 1 }).eq("id", existing.id);
  if (updateErr && !isMissingRelationError(updateErr)) throw updateErr;
}

async function getOwnedProfile(supabase: any, profileId: string, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", profileId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Profile not found");
  return data;
}

function normalizeRole(role: string) { return role.toLowerCase().replace(/\s+/g, " ").trim(); }

async function resolveCanonicalRole(supabase: any, rawRole: string) {
  const normalized = normalizeRole(rawRole);
  const { data: rows, error } = await supabase.from("role_requirements").select("role");
  if (error) {
    if (!isMissingRelationError(error)) throw error;
    const fallbackRoles = Object.keys(FALLBACK_ROLE_REQUIREMENTS);
    for (const role of fallbackRoles) {
      if (normalized.includes(role) || role.includes(normalized)) return role;
    }
    return normalized;
  }
  const uniqueRoles = [...new Set((rows || []).map((r: any) => normalizeRole(r.role)))];
  if (uniqueRoles.length === 0) return normalized;

  for (const r of uniqueRoles) if (normalized.includes(r) || r.includes(normalized)) return r;

  const tokens = normalized.split(" ").filter(Boolean);
  let best = uniqueRoles[0];
  let bestScore = -1;
  for (const candidate of uniqueRoles) {
    const candidateTokens = new Set(candidate.split(" "));
    const score = tokens.filter((t) => candidateTokens.has(t)).length;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : normalized;
}

async function generateRoleRequirementsFromAI(role: string) {
  const generated = await callAI(
    "You are a job-role ontology assistant. Return only core required skills for the role; no explanations.",
    `Generate a practical required skill list for role: "${role}".`,
    [{
      type: "function",
      function: {
        name: "role_requirements",
        description: "Return required skills for a role",
        parameters: {
          type: "object",
          properties: {
            required_skills: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 20 },
          },
          required: ["required_skills"],
          additionalProperties: false,
        },
      },
    }],
    { type: "function", function: { name: "role_requirements" } }
  );

  const parsed = generatedRoleRequirementsSchema.parse(generated);
  return [...new Set(parsed.required_skills.map((s) => s.trim()).filter(Boolean))];
}

function calculateCoverage(requiredSkills: string[], userSkills: string[], projects: any[]): SkillCoverage {
  const strong: string[] = [];
  const weak: string[] = [];
  const missing: string[] = [];

  for (const required of requiredSkills) {
    const requiredLower = required.toLowerCase();
    const hasSkill = userSkills.some((us) => us.includes(requiredLower) || requiredLower.includes(us));
    const hasProjectEvidence = projects.some((p: any) => (p.technologies || []).some((t: string) => {
      const lower = (t || "").toLowerCase();
      return lower.includes(requiredLower) || requiredLower.includes(lower);
    }));

    if (hasSkill && hasProjectEvidence) strong.push(required);
    else if (hasSkill) weak.push(required);
    else missing.push(required);
  }

  return { strong, weak, missing };
}

function roleMatchPercentage(coverage: SkillCoverage, totalRequired: number) {
  if (!totalRequired) return 0;
  return ((coverage.strong.length * 1.0 + coverage.weak.length * 0.5) / totalRequired) * 100;
}

function deterministicConfidence(profileCompleteness: number, roleConfidence: "high" | "medium" | "low") {
  const dataFactor = (profileCompleteness || 0) / 100;
  const consistencyFactor = roleConfidence === "high" ? 1 : roleConfidence === "medium" ? 0.7 : 0.4;
  return Math.round((dataFactor * 0.5 + consistencyFactor * 0.5) * 100) / 100;
}
function baselineHours(experience: string | null | undefined, skillType: "missing" | "weak" | "other") {
  const base = experience === "junior" ? 2.5 : experience === "mid" ? 2 : experience === "senior" ? 1.5 : 1.2;
  const multiplier = skillType === "missing" ? 1.1 : skillType === "weak" ? 0.8 : 0.6;
  const computed = base * multiplier;
  return Math.max(1, Math.min(3, Math.round(computed * 10) / 10));
}

function defaultResources(skill: string) {
  return [
    { title: `${skill} Official Docs`, link: "https://developer.mozilla.org", type: "documentation", estimated_time: "45m" },
    { title: `${skill} Practice`, link: "https://www.freecodecamp.org", type: "practice", estimated_time: "60m" },
  ];
}

function buildBaselineRoadmap(profile: any, gap: any): RoadmapTask[] {
  const missingSkills: string[] = gap.missing || [];
  const weakSkills: string[] = gap.weak || [];
  const prioritized = [...missingSkills, ...weakSkills];

  return Array.from({ length: 30 }, (_, idx) => {
    const day = idx + 1;
    const skill = prioritized.length > 0 ? prioritized[idx % prioritized.length] : "Interview readiness";
    const skillType: "missing" | "weak" | "other" = missingSkills.includes(skill) ? "missing" : weakSkills.includes(skill) ? "weak" : "other";
    const estimated_hours = baselineHours(profile.experience_level, skillType);

    return {
      day,
      skill_focus: skill,
      task: `Study ${skill} fundamentals and complete one applied exercise for your target role.`,
      estimated_hours,
      resources: defaultResources(skill),
      explanation: skillType === "missing" ? `${skill} is currently missing and prioritized early.` : skillType === "weak" ? `${skill} is present but needs stronger applied evidence.` : "General interview and consolidation practice.",
    };
  });
}

function totalHours(tasks: RoadmapTask[]) { return Math.round(tasks.reduce((acc, t) => acc + t.estimated_hours, 0) * 10) / 10; }

function etaWeeks(experience: string | null | undefined, hours: number) {
  const weekly = experience === "junior" ? 14 : experience === "mid" ? 12 : experience === "senior" ? 10 : 8;
  return Math.max(1, Math.round((hours / weekly) * 10) / 10);
}

async function refineRoadmapWithAI(baseline: RoadmapTask[], profile: any) {
  try {
    const raw = await callAI(
      "You improve learning roadmaps. Keep day numbers and estimated_hours unchanged. Improve task clarity, add practical resources, and keep output strictly structured.",
      `Refine this 30-day roadmap for a ${profile.experience_level || "unknown"} candidate. Return exactly 30 entries.\n${JSON.stringify(baseline)}`,
      [{
        type: "function",
        function: {
          name: "refine_roadmap",
          description: "Return refined roadmap",
          parameters: {
            type: "object",
            properties: {
              roadmap: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    day: { type: "number" },
                    skill_focus: { type: "string" },
                    task: { type: "string" },
                    estimated_hours: { type: "number" },
                    resources: { type: "array", items: { type: "object", properties: { title: { type: "string" }, link: { type: "string" }, type: { type: "string" }, estimated_time: { type: "string" } }, required: ["title", "link", "type", "estimated_time"] } },
                    explanation: { type: "string" },
                  },
                  required: ["day", "skill_focus", "task", "estimated_hours", "resources", "explanation"],
                },
              },
            },
            required: ["roadmap"],
            additionalProperties: false,
          },
        },
      }],
      { type: "function", function: { name: "refine_roadmap" } }
    );

    const parsed = roadmapRefineSchema.safeParse(raw);
    if (!parsed.success) return baseline;

    const refinedByDay = new Map(parsed.data.roadmap.map((r) => [r.day, r]));
    return baseline.map((base) => {
      const refined = refinedByDay.get(base.day);
      if (!refined) return base;
      return { ...refined, estimated_hours: base.estimated_hours, day: base.day };
    });
  } catch {
    return baseline;
  }
}

async function summarizeRoleWithAI(role: string, companies: any[], skills: string[]) {
  try {
    const summary = await callAI(
      "You summarize deterministic hiring data. Do not invent companies or skills.",
      `Summarize role insights for ${role}. Companies: ${companies.map((c: any) => c.company).join(", ")}. Skills: ${skills.join(", ")}`
    );
    const parsed = z.string().max(1200).safeParse(summary);
    return parsed.success ? parsed.data : "";
  } catch {
    return "";
  }
}

async function calculateAndStoreCompanyMatches(supabase: any, profile: any, roleAnalysis: any) {
  const { data: rows, error } = await supabase.from("company_role_requirements").select("company_id, required_skills, companies(name)").eq("role", normalizeRole(roleAnalysis.role));
  if (error) throw error;

  const userSkills = (profile.skills || []).map((s: string) => s.toLowerCase());
  const projects = profile.projects || [];

  const matches = (rows || []).map((row: any) => {
    const requiredSkills: string[] = row.required_skills || [];
    const coverage = calculateCoverage(requiredSkills, userSkills, projects);
    const matchPct = roleMatchPercentage(coverage, requiredSkills.length);

    return {
      profile_id: profile.id,
      role_analysis_id: roleAnalysis.id,
      company_id: row.company_id,
      company: row.companies?.name || "Unknown",
      match_percentage: Math.round(matchPct * 10) / 10,
      missing_skills: coverage.missing,
      strong_skills: coverage.strong,
      weak_skills: coverage.weak,
      required_skills: requiredSkills,
    };
  }).sort((a, b) => b.match_percentage - a.match_percentage);

  await supabase.from("company_matches").delete().eq("role_analysis_id", roleAnalysis.id);
  if (matches.length > 0) {
    const { error: insertErr } = await supabase.from("company_matches").insert(matches);
    if (insertErr) throw insertErr;
  }
  return matches;
}

function projectionCalculator(gap: any, profile: any, roadmapHours: number) {
  const strong = gap.strong || [];
  const weak = gap.weak || [];
  const missing = gap.missing || [];
  const required = gap.skills_required_count || strong.length + weak.length + missing.length;
  const skillsAfterCompletion = [...new Set([...(profile.skills || []), ...weak, ...missing])];
  const projectedWeighted = required > 0 ? ((strong.length + weak.length + missing.length) / required) * 100 : 0;
  const projectedConfidence = Math.min(1, (gap.confidence_score || 0) + Math.min(0.4, roadmapHours / 220));

  return {
    projected_role_match_percentage: Math.round(projectedWeighted * 10) / 10,
    projected_confidence_score: Math.round(projectedConfidence * 100) / 100,
    skills_after_completion: skillsAfterCompletion,
  };
}

async function upsertMetrics(supabase: any, payload: {
  profileId: string; roleAnalysisId?: string; skillGapId?: string; roadmapId?: string; projectionId?: string;
  roleMatch?: number; foundCount?: number; requiredCount?: number; confidence?: number; totalHours?: number; etaWeeks?: number; projectedMatch?: number;
}) {
  const { error } = await supabase.from("analysis_metrics").insert({
    profile_id: payload.profileId,
    role_analysis_id: payload.roleAnalysisId || null,
    skill_gap_id: payload.skillGapId || null,
    roadmap_id: payload.roadmapId || null,
    projection_id: payload.projectionId || null,
    role_match_percentage: payload.roleMatch || 0,
    skills_found_count: payload.foundCount || 0,
    skills_required_count: payload.requiredCount || 0,
    confidence_score: payload.confidence || 0,
    total_learning_hours: payload.totalHours || 0,
    eta_weeks: payload.etaWeeks || 0,
    projected_match_percentage: payload.projectedMatch || 0,
  });
  if (error) throw error;
}

function wrapText(text: string, maxChars = 95) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function buildAnalysisPdf(data: { profile: any; roleAnalysis: any; gap: any; roadmap: any; projection: any; companyMatches: any[]; interview: any; bullets: any }) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage([612, 792]);
  let y = 760;

  const addLine = (line: string, size = 10) => {
    if (y < 40) {
      page = pdfDoc.addPage([612, 792]);
      y = 760;
    }
    page.drawText(line, { x: 40, y, size, font });
    y -= size + 5;
  };

  addLine("Career Co-Pilot Analysis Export", 16);
  addLine(`Role: ${data.roleAnalysis?.role || "N/A"}`, 11);
  addLine(`Candidate: ${data.profile?.name || "N/A"}`, 11);
  addLine(`Generated: ${new Date().toISOString()}`, 9);

  addLine("", 10);
  addLine("Skill Gap", 13);
  addLine(`Role Match: ${Math.round(data.gap?.role_match_percentage || 0)}%`);
  addLine(`Confidence: ${Math.round((data.gap?.confidence_score || 0) * 100)}%`);
  addLine(`Missing: ${(data.gap?.missing || []).join(", ") || "None"}`);

  addLine("", 10);
  addLine("Roadmap", 13);
  addLine(`Total Learning Hours: ${Math.round(data.roadmap?.total_learning_hours || 0)}h`);
  addLine(`ETA Weeks: ${Math.round(data.roadmap?.estimated_readiness_weeks || 0)}w`);

  addLine("", 10);
  addLine("Projection", 13);
  addLine(`Projected Match: ${Math.round(data.projection?.projected_role_match_percentage || 0)}%`);
  addLine(`Projected Confidence: ${Math.round((data.projection?.projected_confidence_score || 0) * 100)}%`);

  addLine("", 10);
  addLine("Company Match", 13);
  for (const match of (data.companyMatches || []).slice(0, 5)) addLine(`${match.company}: ${Math.round(match.match_percentage)}% | Missing: ${(match.missing_skills || []).join(", ") || "None"}`);

  addLine("", 10);
  addLine("Interview Guide", 13);
  for (const q of (data.interview?.interview_guide || []).slice(0, 3)) {
    for (const line of wrapText(`Q: ${q.question}`)) addLine(line);
    for (const line of wrapText(`A: ${q.example_answer}`)) addLine(line);
  }

  addLine("", 10);
  addLine("Resume Bullets", 13);
  for (const b of (data.bullets?.bullets || []).slice(0, 6)) for (const line of wrapText(`- ${b.bullet}`)) addLine(line);

  const bytes = await pdfDoc.save();
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
async function handleProfile(supabase: any, userId: string, payload: any) {
  const profile = profileInputSchema.parse(payload.profile || {});

  let extractedSkills = profile.skills || [];
  let projects: any[] = [];
  let education: any[] = [];

  if (profile.resume_text) {
    const result = await callAI(
      "You are a resume parser. Extract structured data from resume text.",
      `Extract skills, projects, and education from this resume:\n\n${profile.resume_text}`,
      [{
        type: "function",
        function: {
          name: "extract_profile",
          description: "Extract structured profile data from resume text",
          parameters: {
            type: "object",
            properties: {
              skills: { type: "array", items: { type: "string" } },
              projects: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, technologies: { type: "array", items: { type: "string" } } }, required: ["name", "description", "technologies"] } },
              education: { type: "array", items: { type: "object", properties: { institution: { type: "string" }, degree: { type: "string" }, year: { type: "string" } }, required: ["institution", "degree", "year"] } },
              experience_level: { type: "string", enum: ["junior", "mid", "senior", "lead"] },
            },
            required: ["skills"],
            additionalProperties: false,
          },
        },
      }],
      { type: "function", function: { name: "extract_profile" } }
    );

    const parsed = resumeExtractSchema.safeParse(result);
    if (parsed.success) {
      extractedSkills = [...new Set([...(profile.skills || []), ...(parsed.data.skills || [])])];
      projects = parsed.data.projects || [];
      education = parsed.data.education || [];
    }
  }

  let completeness = 0;
  if (profile.name) completeness += 15;
  if (profile.experience_level) completeness += 15;
  if (extractedSkills.length > 0) completeness += 25;
  if (projects.length > 0) completeness += 20;
  if (education.length > 0) completeness += 10;
  if (profile.github_url) completeness += 5;
  if (profile.linkedin_url) completeness += 5;
  if (profile.resume_text) completeness += 5;

  const expLevel = profile.experience_level || "junior";
  const strengthScore = Math.min(100, extractedSkills.length * 5 + projects.length * 15 + (expLevel === "senior" || expLevel === "lead" ? 30 : expLevel === "mid" ? 20 : 10));

  const { data: existingProfile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();

  const profileData = {
    user_id: userId,
    name: profile.name || null,
    experience_level: profile.experience_level || null,
    skills: extractedSkills,
    projects,
    education,
    github_url: profile.github_url || null,
    linkedin_url: profile.linkedin_url || null,
    resume_text: profile.resume_text || null,
    resume_file_path: profile.resume_file_path || null,
    inferred_strength_score: strengthScore,
    data_completeness: completeness,
  };

  let savedProfile;
  if (existingProfile) {
    const { data, error } = await supabase.from("profiles").update(profileData).eq("id", existingProfile.id).select().single();
    if (error) throw error;
    savedProfile = data;
  } else {
    const { data, error } = await supabase.from("profiles").insert(profileData).select().single();
    if (error) throw error;
    savedProfile = data;
  }

  await supabase.from("explain_logs").insert({
    profile_id: savedProfile.id,
    step: "profile_analysis",
    prompt_version: "v2.0",
    data_sources: profile.resume_text ? ["resume_text"] : ["manual_input"],
    reasoning: `Extracted ${extractedSkills.length} skills, ${projects.length} projects. Data completeness: ${completeness}%. Strength score: ${strengthScore}.`,
  });

  return {
    id: savedProfile.id,
    name: savedProfile.name,
    experience_level: savedProfile.experience_level,
    skills: extractedSkills,
    projects,
    education,
    github_url: savedProfile.github_url,
    linkedin_url: savedProfile.linkedin_url,
    resume_text: savedProfile.resume_text,
    resume_file_path: savedProfile.resume_file_path,
    inferred_strength_score: strengthScore,
    data_completeness: completeness,
  };
}

async function handleRole(supabase: any, userId: string, body: any) {
  const { profileId, role } = roleSchema.parse(body);
  await getOwnedProfile(supabase, profileId, userId);

  const canonicalRole = await resolveCanonicalRole(supabase, role);

  let requirementsRows: Array<{ skill: string; weight: number }> = [];
  const { data: requirementsData, error: reqErr } = await supabase.from("role_requirements").select("skill, weight").eq("role", canonicalRole);
  if (reqErr) {
    if (!isMissingRelationError(reqErr)) throw reqErr;
    requirementsRows = (FALLBACK_ROLE_REQUIREMENTS[canonicalRole] || []).map((skill) => ({ skill, weight: 1 }));
  } else {
    requirementsRows = requirementsData || [];
  }

  if (requirementsRows.length === 0) {
    const generatedSkills = await generateRoleRequirementsFromAI(canonicalRole);
    requirementsRows = generatedSkills.map((skill) => ({ skill, weight: 1 }));

    const { error: upsertReqErr } = await supabase
      .from("role_requirements")
      .upsert(
        generatedSkills.map((skill) => ({ role: canonicalRole, skill, weight: 1 })),
        { onConflict: "role,skill" }
      );
    if (upsertReqErr && !isMissingRelationError(upsertReqErr)) throw upsertReqErr;
  }

  let companyRows: Array<{ company_id: string | null; required_skills: string[]; source_url: string; companies?: { name: string } }> = [];
  const { data: companyData, error: companyErr } = await supabase.from("company_role_requirements").select("company_id, required_skills, source_url, companies(name)").eq("role", canonicalRole);
  if (companyErr) {
    if (!isMissingRelationError(companyErr)) throw companyErr;
    companyRows = FALLBACK_COMPANIES.map((name) => ({
      company_id: null,
      required_skills: requirementsRows.map((r) => r.skill),
      source_url: "",
      companies: { name },
    }));
  } else {
    companyRows = companyData || [];
  }

  if (companyRows.length === 0) {
    const { data: dbCompanies, error: companiesErr } = await supabase
      .from("companies")
      .select("id, name")
      .limit(5);

    if (companiesErr && !isMissingRelationError(companiesErr)) throw companiesErr;

    const seedCompanies = (dbCompanies && dbCompanies.length > 0)
      ? dbCompanies
      : FALLBACK_COMPANIES.map((name) => ({ id: null, name }));

    companyRows = seedCompanies.map((c: any) => ({
      company_id: c.id,
      required_skills: requirementsRows.map((r) => r.skill),
      source_url: "",
      companies: { name: c.name },
    }));

    const upsertPayload = seedCompanies
      .filter((c: any) => !!c.id)
      .map((c: any) => ({
        company_id: c.id,
        role: canonicalRole,
        required_skills: requirementsRows.map((r) => r.skill),
        source_url: "",
      }));

    if (upsertPayload.length > 0) {
      const { error: upsertCompanyRoleErr } = await supabase
        .from("company_role_requirements")
        .upsert(upsertPayload, { onConflict: "company_id,role" });
      if (upsertCompanyRoleErr && !isMissingRelationError(upsertCompanyRoleErr)) throw upsertCompanyRoleErr;
    }
  }

  const companies = (companyRows || []).map((row: any) => ({
    company: row.companies?.name || "Unknown",
    required_skills: (row.required_skills || []) as string[],
    source_url: row.source_url || "",
  }));

  const frequency = new Map<string, number>();
  for (const req of requirementsRows || []) {
    const key = String(req.skill);
    frequency.set(key, (frequency.get(key) || 0) + Number(req.weight || 1));
  }
  for (const row of companyRows || []) {
    for (const skill of row.required_skills || []) {
      const key = String(skill);
      frequency.set(key, (frequency.get(key) || 0) + 1);
    }
  }

  const aggregatedSkills = [...frequency.entries()].sort((a, b) => b[1] - a[1]).map(([skill]) => skill);
  const confidence: "high" | "medium" | "low" = (companies.length >= 5 && aggregatedSkills.length >= 6) ? "high" : (companies.length >= 3 && aggregatedSkills.length >= 4) ? "medium" : "low";

  const summary = await summarizeRoleWithAI(canonicalRole, companies, aggregatedSkills);

  const { data, error } = await supabase.from("role_analyses").insert({
    profile_id: profileId,
    role: canonicalRole,
    top_companies: companies,
    aggregated_required_skills: aggregatedSkills,
    skill_frequency_map: Object.fromEntries(frequency),
    sources: companies.map((c: any) => c.source_url),
    confidence,
    summary,
  }).select().single();
  if (error) throw error;

  await supabase.from("explain_logs").insert({
    profile_id: profileId,
    step: "role_validation",
    prompt_version: "v2.0",
    data_sources: ["companies", "role_requirements"],
    reasoning: `Resolved role to "${canonicalRole}". Loaded ${companies.length} companies and ${aggregatedSkills.length} deterministic aggregated skills. Confidence: ${confidence}.`,
  });

  return { id: data.id, role: canonicalRole, top_companies: companies, aggregated_required_skills: aggregatedSkills, skill_frequency_map: Object.fromEntries(frequency), confidence, summary };
}

async function handleGap(supabase: any, userId: string, body: any) {
  const { profileId, roleAnalysisId } = gapSchema.parse(body);

  const profile = await getOwnedProfile(supabase, profileId, userId);
  const { data: ra, error: raErr } = await supabase.from("role_analyses").select("*").eq("id", roleAnalysisId).eq("profile_id", profileId).maybeSingle();
  if (raErr) throw raErr;
  if (!ra) throw new Error("Role analysis not found");

  const userSkills = (profile.skills || []).map((s: string) => s.toLowerCase());
  const requiredSkills: string[] = ra.aggregated_required_skills || [];
  const projects = profile.projects || [];

  const coverage = calculateCoverage(requiredSkills, userSkills, projects);
  const roleMatchPct = roleMatchPercentage(coverage, requiredSkills.length);
  const confidenceScore = deterministicConfidence(profile.data_completeness || 0, ra.confidence || "medium");

  const { data, error } = await supabase.from("skill_gaps").insert({
    profile_id: profileId,
    role_analysis_id: roleAnalysisId,
    strong: coverage.strong,
    weak: coverage.weak,
    missing: coverage.missing,
    role_match_percentage: Math.round(roleMatchPct * 10) / 10,
    skills_found_count: coverage.strong.length + coverage.weak.length,
    skills_required_count: requiredSkills.length,
    confidence_score: confidenceScore,
  }).select().single();
  if (error) throw error;

  let companyMatches: any[] = [];
  try {
    companyMatches = await calculateAndStoreCompanyMatches(supabase, profile, ra);
  } catch (err) {
    if (!isMissingRelationError(err)) throw err;
  }

  try {
    await upsertMetrics(supabase, {
      profileId,
      roleAnalysisId,
      skillGapId: data.id,
      roleMatch: Math.round(roleMatchPct * 10) / 10,
      foundCount: coverage.strong.length + coverage.weak.length,
      requiredCount: requiredSkills.length,
      confidence: confidenceScore,
      projectedMatch: 0,
    });
  } catch (err) {
    if (!isMissingRelationError(err)) throw err;
  }

  await supabase.from("explain_logs").insert({
    profile_id: profileId,
    step: "skill_gap_analysis",
    prompt_version: "v2.0",
    data_sources: ["profile_skills", "role_analysis"],
    reasoning: `Compared ${userSkills.length} user skills against ${requiredSkills.length} required. Strong: ${coverage.strong.length}, Weak: ${coverage.weak.length}, Missing: ${coverage.missing.length}. Match: ${Math.round(roleMatchPct)}%. Formula: (strong*1.0 + weak*0.5) / total_required.`,
    metadata: { strong: coverage.strong, weak: coverage.weak, missing: coverage.missing },
  });

  return {
    id: data.id,
    strong: coverage.strong,
    weak: coverage.weak,
    missing: coverage.missing,
    role_match_percentage: Math.round(roleMatchPct * 10) / 10,
    skills_found_count: coverage.strong.length + coverage.weak.length,
    skills_required_count: requiredSkills.length,
    confidence_score: confidenceScore,
    company_matches: companyMatches,
  };
}
async function handleRoadmap(supabase: any, userId: string, body: any) {
  const { profileId, skillGapId } = roadmapSchema.parse(body);

  const profile = await getOwnedProfile(supabase, profileId, userId);
  const { data: gap, error: gapErr } = await supabase.from("skill_gaps").select("*").eq("id", skillGapId).eq("profile_id", profileId).maybeSingle();
  if (gapErr) throw gapErr;
  if (!gap) throw new Error("Skill gap not found");

  const baseline = buildBaselineRoadmap(profile, gap);
  const refined = await refineRoadmapWithAI(baseline, profile);
  const computedHours = totalHours(refined);
  const computedEta = etaWeeks(profile.experience_level, computedHours);

  const { data: roadmapRow, error: roadmapErr } = await supabase.from("roadmaps").insert({
    profile_id: profileId,
    skill_gap_id: skillGapId,
    roadmap: refined,
    total_learning_hours: computedHours,
    estimated_readiness_weeks: computedEta,
  }).select().single();
  if (roadmapErr) throw roadmapErr;

  const tasksPayload = refined.map((task) => ({
    roadmap_id: roadmapRow.id,
    day: task.day,
    skill_focus: task.skill_focus,
    task: task.task,
    estimated_hours: task.estimated_hours,
    resources: task.resources,
    explanation: task.explanation,
  }));

  const { error: taskErr } = await supabase.from("roadmap_tasks").insert(tasksPayload);
  if (taskErr && !isMissingRelationError(taskErr)) {
    await supabase.from("roadmaps").delete().eq("id", roadmapRow.id);
    throw taskErr;
  }

  const projection = projectionCalculator(gap, profile, computedHours);
  let projectionRow: { id?: string } = {};
  const { data: projectionData, error: projErr } = await supabase.from("projections").insert({
    profile_id: profileId,
    skill_gap_id: skillGapId,
    projected_role_match_percentage: projection.projected_role_match_percentage,
    projected_confidence_score: projection.projected_confidence_score,
    skills_after_completion: projection.skills_after_completion,
  }).select().single();
  if (projErr) {
    if (!isMissingRelationError(projErr)) throw projErr;
  } else {
    projectionRow = projectionData || {};
  }

  try {
    await upsertMetrics(supabase, {
      profileId,
      skillGapId,
      roadmapId: roadmapRow.id,
      projectionId: projectionRow.id,
      roleMatch: gap.role_match_percentage || 0,
      foundCount: gap.skills_found_count || 0,
      requiredCount: gap.skills_required_count || 0,
      confidence: gap.confidence_score || 0,
      totalHours: computedHours,
      etaWeeks: computedEta,
      projectedMatch: projection.projected_role_match_percentage,
    });
  } catch (err) {
    if (!isMissingRelationError(err)) throw err;
  }

  await supabase.from("explain_logs").insert({
    profile_id: profileId,
    step: "roadmap_generation",
    prompt_version: "v2.0",
    data_sources: ["skill_gap", "profile", "baseline_logic"],
    reasoning: `Deterministic baseline generated first, then LLM refinement validated with schema. Total hours: ${computedHours}. ETA: ${computedEta} weeks.`,
  });

  return {
    id: roadmapRow.id,
    roadmap: refined,
    total_learning_hours: computedHours,
    estimated_readiness_weeks: computedEta,
    projection: {
      id: projectionRow.id,
      projected_role_match_percentage: projection.projected_role_match_percentage,
      projected_confidence_score: projection.projected_confidence_score,
      skills_after_completion: projection.skills_after_completion,
    },
  };
}

async function handleInterview(supabase: any, userId: string, body: any) {
  const { profileId, roleAnalysisId } = interviewSchema.parse(body);

  const profile = await getOwnedProfile(supabase, profileId, userId);
  const { data: ra, error: raErr } = await supabase.from("role_analyses").select("*").eq("id", roleAnalysisId).eq("profile_id", profileId).maybeSingle();
  if (raErr) throw raErr;
  if (!ra) throw new Error("Role analysis not found");

  const { data: gap } = await supabase.from("skill_gaps").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const result = await callAI(
    "You are an interview preparation expert. Return exactly 10 questions with concise example answers and explanations.",
    `Role: ${ra.role}\nRequired skills: ${(ra.aggregated_required_skills || []).join(", ")}\nCandidate skills: ${(profile.skills || []).join(", ")}\nWeak areas: ${gap ? (gap.weak || []).join(", ") : "unknown"}\nMissing skills: ${gap ? (gap.missing || []).join(", ") : "unknown"}`,
    [{
      type: "function",
      function: {
        name: "generate_interview",
        description: "Generate tailored interview questions with example answers",
        parameters: {
          type: "object",
          properties: {
            interview_guide: {
              type: "array",
              items: {
                type: "object",
                properties: { question: { type: "string" }, example_answer: { type: "string" }, explanation: { type: "string" } },
                required: ["question", "example_answer", "explanation"],
              },
              minItems: 10,
              maxItems: 10,
            },
          },
          required: ["interview_guide"],
          additionalProperties: false,
        },
      },
    }],
    { type: "function", function: { name: "generate_interview" } }
  );

  const parsed = interviewGuideSchema.parse(result);
  const { data, error } = await supabase.from("interview_guides").insert({ profile_id: profileId, role_analysis_id: roleAnalysisId, interview_guide: parsed.interview_guide }).select().single();
  if (error) throw error;

  await supabase.from("explain_logs").insert({
    profile_id: profileId,
    step: "interview_generation",
    prompt_version: "v2.0",
    data_sources: ["role_analysis", "profile", "skill_gap"],
    reasoning: `Generated ${parsed.interview_guide.length} interview questions for role "${ra.role}" with strict schema validation.`,
  });

  return { id: data.id, interview_guide: parsed.interview_guide };
}

async function handleResumeBullets(supabase: any, userId: string, body: any) {
  const { profileId, roleAnalysisId, targetCount } = bulletsSchema.parse(body);

  const profile = await getOwnedProfile(supabase, profileId, userId);
  const { data: roleAnalysis, error: raErr } = await supabase.from("role_analyses").select("*").eq("id", roleAnalysisId).eq("profile_id", profileId).maybeSingle();
  if (raErr) throw raErr;
  if (!roleAnalysis) throw new Error("Role analysis not found");

  const { data: gap } = await supabase.from("skill_gaps").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const result = await callAI(
    "You generate ATS-optimized resume bullets. Use measurable impact and role-aligned keywords.",
    `Target role: ${roleAnalysis.role}\nCurrent skills: ${(profile.skills || []).join(", ")}\nStrong: ${(gap?.strong || []).join(", ")}\nWeak: ${(gap?.weak || []).join(", ")}\nGenerate ${targetCount} bullets.`,
    [{
      type: "function",
      function: {
        name: "generate_resume_bullets",
        description: "Return ATS-ready resume bullets",
        parameters: {
          type: "object",
          properties: {
            bullets: {
              type: "array",
              minItems: 3,
              maxItems: 10,
              items: {
                type: "object",
                properties: { bullet: { type: "string" }, focus_skill: { type: "string" }, ats_keywords: { type: "array", items: { type: "string" } } },
                required: ["bullet", "focus_skill", "ats_keywords"],
              },
            },
          },
          required: ["bullets"],
          additionalProperties: false,
        },
      },
    }],
    { type: "function", function: { name: "generate_resume_bullets" } }
  );

  const parsed = bulletOutputSchema.parse(result);
  let data: { id?: string } = {};
  const { data: bulletData, error } = await supabase.from("resume_bullets").insert({ profile_id: profileId, role_analysis_id: roleAnalysisId, bullets: parsed.bullets }).select().single();
  if (error) {
    if (!isMissingRelationError(error)) throw error;
  } else {
    data = bulletData || {};
  }

  await supabase.from("explain_logs").insert({
    profile_id: profileId,
    step: "resume_bullet_generation",
    prompt_version: "v2.0",
    data_sources: ["profile", "role_analysis", "skill_gap"],
    reasoning: `Generated ${parsed.bullets.length} ATS-optimized resume bullets with schema validation.`,
  });

  return { id: data.id, bullets: parsed.bullets };
}

async function handleExportPdf(supabase: any, userId: string, body: any) {
  const { profileId } = exportSchema.parse(body);
  const profile = await getOwnedProfile(supabase, profileId, userId);

  const [{ data: roleAnalysis }, { data: gap }, { data: roadmap }, { data: projection }, { data: companyMatches }, { data: interview }, { data: bullets }] = await Promise.all([
    supabase.from("role_analyses").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("skill_gaps").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("roadmaps").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("projections").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("company_matches").select("*").eq("profile_id", profileId).order("match_percentage", { ascending: false }).limit(10),
    supabase.from("interview_guides").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("resume_bullets").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const base64Pdf = await buildAnalysisPdf({ profile, roleAnalysis, gap, roadmap, projection, companyMatches: companyMatches || [], interview, bullets });
  return { file_name: `career-analysis-${profileId}.pdf`, content_type: "application/pdf", base64_pdf: base64Pdf };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    if (!action || typeof action !== "string") throw new Error("Invalid action");

    const user = await getAuthenticatedUser(req);
    const supabase = getServiceClient();
    await enforceRateLimit(supabase, user.id, action);

    let result;
    switch (action) {
      case "profile": result = await handleProfile(supabase, user.id, body); break;
      case "role": result = await handleRole(supabase, user.id, body); break;
      case "gap": result = await handleGap(supabase, user.id, body); break;
      case "roadmap": result = await handleRoadmap(supabase, user.id, body); break;
      case "interview": result = await handleInterview(supabase, user.id, body); break;
      case "resume_bullets": result = await handleResumeBullets(supabase, user.id, body); break;
      case "export_pdf": result = await handleExportPdf(supabase, user.id, body); break;
      default: throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("career-analyze error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Rate limit") ? 429 : msg.includes("Not authenticated") ? 401 : msg.includes("Invalid") || msg.includes("Expected") ? 400 : 500;

    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
