-- ============================================
-- PlotSure MVP — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Users table (extends Supabase auth.users)
-- Supabase Auth handles user creation automatically.
-- We add a public profile table for role tracking.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'land_buyer' CHECK (role IN ('land_buyer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Searches table
CREATE TABLE IF NOT EXISTS public.searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plot_reference TEXT NOT NULL,
    location TEXT,
    owner TEXT,
    title_status TEXT,
    encumbrances JSONB DEFAULT '[]'::jsonb,
    transfer_count INTEGER DEFAULT 0,
    last_transfer_date TEXT,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    price_min NUMERIC,
    price_max NUMERIC,
    land_type TEXT,
    plot_size NUMERIC,
    plot_size_unit TEXT DEFAULT 'Decimals',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cache lookups (plot_reference + created_at)
CREATE INDEX IF NOT EXISTS idx_searches_plot_ref ON public.searches(plot_reference, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_searches_user ON public.searches(user_id, created_at DESC);

-- 3. Certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    hash TEXT NOT NULL UNIQUE,
    file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for hash verification lookups
CREATE INDEX IF NOT EXISTS idx_certificates_hash ON public.certificates(hash);

-- ============================================
-- Row Level Security (RLS)
-- Per ANTIGRAVITY.md: Enforced on all tables
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users: can only read their own profile
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Searches: users can only access their own searches
CREATE POLICY "Users can view own searches"
    ON public.searches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches"
    ON public.searches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Certificates: users can view their own, anyone can verify by hash
CREATE POLICY "Users can view own certificates"
    ON public.certificates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own certificates"
    ON public.certificates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for backend using service_role key)
-- The service_role key bypasses RLS by default in Supabase.

-- ============================================
-- Storage bucket for certificate PDFs
-- ============================================
-- Run this separately or create via Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true);

-- ============================================
-- Auto-create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'land_buyer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
