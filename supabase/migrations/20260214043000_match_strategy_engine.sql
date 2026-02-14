CREATE TABLE IF NOT EXISTS public.match_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.role_analyses(id) ON DELETE CASCADE,
  match_band TEXT NOT NULL CHECK (match_band IN ('HIGH', 'MID', 'LOW')),
  strategy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.match_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own match strategies" ON public.match_strategies
  FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
