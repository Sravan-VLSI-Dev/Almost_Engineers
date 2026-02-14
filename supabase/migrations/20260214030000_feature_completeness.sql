-- Additional deterministic domain tables and security hardening
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS resume_file_path TEXT;

ALTER TABLE public.role_analyses
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE TABLE IF NOT EXISTS public.role_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  skill TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, skill)
);

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_role_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, role)
);

CREATE TABLE IF NOT EXISTS public.roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  day INT NOT NULL,
  skill_focus TEXT NOT NULL,
  task TEXT NOT NULL,
  estimated_hours NUMERIC NOT NULL,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_analysis_id UUID NOT NULL REFERENCES public.role_analyses(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  match_percentage NUMERIC NOT NULL,
  missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  strong_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  weak_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_gap_id UUID NOT NULL REFERENCES public.skill_gaps(id) ON DELETE CASCADE,
  projected_role_match_percentage NUMERIC NOT NULL,
  projected_confidence_score NUMERIC NOT NULL,
  skills_after_completion JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resume_bullets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_analysis_id UUID NOT NULL REFERENCES public.role_analyses(id) ON DELETE CASCADE,
  bullets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_analysis_id UUID REFERENCES public.role_analyses(id) ON DELETE SET NULL,
  skill_gap_id UUID REFERENCES public.skill_gaps(id) ON DELETE SET NULL,
  roadmap_id UUID REFERENCES public.roadmaps(id) ON DELETE SET NULL,
  projection_id UUID REFERENCES public.projections(id) ON DELETE SET NULL,
  role_match_percentage NUMERIC NOT NULL DEFAULT 0,
  skills_found_count INT NOT NULL DEFAULT 0,
  skills_required_count INT NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  total_learning_hours NUMERIC NOT NULL DEFAULT 0,
  eta_weeks NUMERIC NOT NULL DEFAULT 0,
  projected_match_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, action, window_start)
);

ALTER TABLE public.role_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_role_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_bullets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read role requirements" ON public.role_requirements
  FOR SELECT USING (true);

CREATE POLICY "Users read companies" ON public.companies
  FOR SELECT USING (true);

CREATE POLICY "Users read company role requirements" ON public.company_role_requirements
  FOR SELECT USING (true);

CREATE POLICY "Users view own roadmap tasks" ON public.roadmap_tasks FOR ALL
  USING (roadmap_id IN (
    SELECT id FROM public.roadmaps WHERE profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (roadmap_id IN (
    SELECT id FROM public.roadmaps WHERE profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users view own company matches" ON public.company_matches FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users view own projections" ON public.projections FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users view own resume bullets" ON public.resume_bullets FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users view own analysis metrics" ON public.analysis_metrics FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

INSERT INTO public.companies (name, website)
VALUES
  ('Google', 'https://careers.google.com'),
  ('Microsoft', 'https://careers.microsoft.com'),
  ('Amazon', 'https://www.amazon.jobs'),
  ('Meta', 'https://www.metacareers.com'),
  ('Stripe', 'https://stripe.com/jobs'),
  ('Netflix', 'https://jobs.netflix.com')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_requirements (role, skill, weight)
VALUES
  ('frontend engineer', 'JavaScript', 1),
  ('frontend engineer', 'TypeScript', 1),
  ('frontend engineer', 'React', 1),
  ('frontend engineer', 'HTML', 0.8),
  ('frontend engineer', 'CSS', 0.8),
  ('frontend engineer', 'Testing', 0.7),
  ('frontend engineer', 'Accessibility', 0.7),
  ('backend engineer', 'Node.js', 1),
  ('backend engineer', 'APIs', 1),
  ('backend engineer', 'SQL', 1),
  ('backend engineer', 'System Design', 0.9),
  ('backend engineer', 'Distributed Systems', 0.8),
  ('backend engineer', 'Testing', 0.7),
  ('full stack engineer', 'JavaScript', 1),
  ('full stack engineer', 'TypeScript', 1),
  ('full stack engineer', 'React', 0.9),
  ('full stack engineer', 'Node.js', 0.9),
  ('full stack engineer', 'SQL', 0.8),
  ('full stack engineer', 'APIs', 0.9),
  ('ml engineer', 'Python', 1),
  ('ml engineer', 'Machine Learning', 1),
  ('ml engineer', 'PyTorch', 0.8),
  ('ml engineer', 'TensorFlow', 0.8),
  ('ml engineer', 'MLOps', 0.8),
  ('ml engineer', 'Statistics', 0.8),
  ('devops engineer', 'AWS', 1),
  ('devops engineer', 'Docker', 1),
  ('devops engineer', 'Kubernetes', 1),
  ('devops engineer', 'CI/CD', 0.9),
  ('devops engineer', 'Terraform', 0.8),
  ('devops engineer', 'Monitoring', 0.8)
ON CONFLICT (role, skill) DO NOTHING;

WITH selected_companies AS (
  SELECT id, name FROM public.companies WHERE name IN ('Google', 'Microsoft', 'Amazon', 'Meta', 'Stripe', 'Netflix')
)
INSERT INTO public.company_role_requirements (company_id, role, required_skills, source_url)
SELECT sc.id,
  role_data.role,
  role_data.required_skills,
  role_data.source_url
FROM selected_companies sc
CROSS JOIN (
  VALUES
    ('frontend engineer', '["JavaScript","TypeScript","React","HTML","CSS","Testing"]'::jsonb, 'https://example.com/frontend-role-sample'),
    ('backend engineer', '["Node.js","APIs","SQL","System Design","Distributed Systems","Testing"]'::jsonb, 'https://example.com/backend-role-sample'),
    ('full stack engineer', '["JavaScript","TypeScript","React","Node.js","APIs","SQL"]'::jsonb, 'https://example.com/fullstack-role-sample'),
    ('ml engineer', '["Python","Machine Learning","PyTorch","TensorFlow","MLOps","Statistics"]'::jsonb, 'https://example.com/ml-role-sample'),
    ('devops engineer', '["AWS","Docker","Kubernetes","CI/CD","Terraform","Monitoring"]'::jsonb, 'https://example.com/devops-role-sample')
) AS role_data(role, required_skills, source_url)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own resumes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own resumes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
