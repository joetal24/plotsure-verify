-- ============================================
-- PlotSure Saved Properties Migration
-- Allows buyers to bookmark/save plots for later
-- ============================================

CREATE TABLE IF NOT EXISTS public.saved_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, search_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_properties_user ON public.saved_properties(user_id);

ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved properties"
    ON public.saved_properties FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved properties"
    ON public.saved_properties FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved properties"
    ON public.saved_properties FOR DELETE
    USING (auth.uid() = user_id);
