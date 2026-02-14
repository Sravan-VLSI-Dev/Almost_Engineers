export interface UserProfile {
  id?: string;
  name: string;
  experience_level: string;
  skills: string[];
  projects: { name: string; description: string; technologies: string[] }[];
  education: { institution: string; degree: string; year: string }[];
  github_url?: string;
  github_stats?: Record<string, unknown>;
  linkedin_url?: string;
  resume_text?: string;
  resume_file_path?: string;
  inferred_strength_score?: number;
  data_completeness?: number;
}

export interface CompanySkillData {
  company: string;
  required_skills: string[];
  source_url: string;
}

export interface RoleAnalysis {
  id?: string;
  role: string;
  top_companies: CompanySkillData[];
  aggregated_required_skills: string[];
  skill_frequency_map: Record<string, number>;
  confidence: string;
}

export interface SkillGap {
  id?: string;
  strong: string[];
  weak: string[];
  missing: string[];
  role_match_percentage: number;
  skills_found_count: number;
  skills_required_count: number;
  confidence_score: number;
  company_matches?: CompanyMatch[];
}

export interface CompanyMatch {
  company: string;
  match_percentage: number;
  missing_skills: string[];
  strong_skills: string[];
  weak_skills: string[];
  required_skills: string[];
}

export interface RoadmapDay {
  day: number;
  skill_focus: string;
  task: string;
  estimated_hours: number;
  resources: { title: string; link: string; type: string; estimated_time: string }[];
  explanation: string;
}

export interface Roadmap {
  id?: string;
  roadmap: RoadmapDay[];
  total_learning_hours: number;
  estimated_readiness_weeks: number;
  projection?: Projection;
}

export interface Projection {
  id?: string;
  projected_role_match_percentage: number;
  projected_confidence_score: number;
  skills_after_completion: string[];
}

export interface InterviewQuestion {
  question: string;
  example_answer: string;
  explanation: string;
}

export interface InterviewGuide {
  id?: string;
  interview_guide: InterviewQuestion[];
}

export interface ResumeBullet {
  bullet: string;
  focus_skill: string;
  ats_keywords: string[];
}

export interface ResumeBulletResult {
  id?: string;
  bullets: ResumeBullet[];
}

export interface MatchStrategy {
  match_band: "HIGH" | "MID" | "LOW";
  strategy: {
    resume_optimization?: unknown;
    company_targets?: unknown;
    interview_strategy?: unknown;
    portfolio_strategy?: unknown;
    prioritized_roadmap?: unknown;
    learning_timeline?: unknown;
    projects?: unknown;
    certifications?: unknown;
    alternate_roles?: unknown;
    pivot_plan?: unknown;
    transition_timeline?: unknown;
  };
  source_metrics?: {
    role_match_percentage?: number | null;
    projection_match_percentage?: number | null;
    roadmap_hours?: number | null;
  };
}

export type AnalysisStep = 'idle' | 'profile' | 'role' | 'gap' | 'roadmap' | 'interview' | 'complete';
