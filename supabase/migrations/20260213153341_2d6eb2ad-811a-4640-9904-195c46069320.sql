
-- Profiles table (stores parsed user profile data)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  experience_level TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  github_url TEXT,
  github_stats JSONB,
  linkedin_url TEXT,
  resume_text TEXT,
  inferred_strength_score NUMERIC DEFAULT 0,
  data_completeness NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role analyses table
CREATE TABLE public.role_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  top_companies JSONB DEFAULT '[]'::jsonb,
  aggregated_required_skills JSONB DEFAULT '[]'::jsonb,
  skill_frequency_map JSONB DEFAULT '{}'::jsonb,
  sources JSONB DEFAULT '[]'::jsonb,
  confidence TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skill gaps table
CREATE TABLE public.skill_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_analysis_id UUID REFERENCES public.role_analyses(id) ON DELETE CASCADE,
  strong JSONB DEFAULT '[]'::jsonb,
  weak JSONB DEFAULT '[]'::jsonb,
  missing JSONB DEFAULT '[]'::jsonb,
  role_match_percentage NUMERIC DEFAULT 0,
  skills_found_count INT DEFAULT 0,
  skills_required_count INT DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roadmaps table
CREATE TABLE public.roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_gap_id UUID REFERENCES public.skill_gaps(id) ON DELETE CASCADE,
  roadmap JSONB DEFAULT '[]'::jsonb,
  total_learning_hours NUMERIC DEFAULT 0,
  estimated_readiness_weeks NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interview guides table
CREATE TABLE public.interview_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_analysis_id UUID REFERENCES public.role_analyses(id) ON DELETE CASCADE,
  interview_guide JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Explain logs table (explainability system)
CREATE TABLE public.explain_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  prompt_version TEXT,
  data_sources JSONB DEFAULT '[]'::jsonb,
  reasoning TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explain_logs ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Role analyses RLS
CREATE POLICY "Users view own analyses" ON public.role_analyses FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Skill gaps RLS
CREATE POLICY "Users view own gaps" ON public.skill_gaps FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Roadmaps RLS
CREATE POLICY "Users view own roadmaps" ON public.roadmaps FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Interview guides RLS
CREATE POLICY "Users view own guides" ON public.interview_guides FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Explain logs RLS
CREATE POLICY "Users view own logs" ON public.explain_logs FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
