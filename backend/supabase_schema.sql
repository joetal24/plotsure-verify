-- ============================================
-- PlotSure MVP — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Users table (extends Supabase auth.users)
-- Supabase Auth handles user creation automatically.
-- We add a public profile table for role tracking.
-- Role is now an array to allow users to be both buyer and seller.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    roles TEXT[] NOT NULL DEFAULT ARRAY['land_buyer'] CHECK (array_length(roles, 1) > 0),
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
    fraud_score NUMERIC,
    fraud_risk_level TEXT CHECK (fraud_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    anomaly_flags JSONB DEFAULT '[]'::jsonb,
    ml_anomaly_score NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cache lookups (plot_reference + created_at)
CREATE INDEX IF NOT EXISTS idx_searches_plot_ref ON public.searches(plot_reference, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_searches_user ON public.searches(user_id, created_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- Per ANTIGRAVITY.md: Enforced on all tables
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
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

-- Service role bypass (for backend using service_role key)
-- The service_role key bypasses RLS by default in Supabase.

-- ============================================
-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    role_text TEXT;
    role_array TEXT[];
BEGIN
    role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'land_buyer');
    -- Convert single role to array, or use as-is if it's an array
    IF role_text LIKE '{%}' THEN
        role_array := role_text::TEXT[];
    ELSE
        role_array := ARRAY[role_text];
    END IF;

    INSERT INTO public.users (id, roles)
    VALUES (
        NEW.id,
        role_array
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Land Listings table (for land sellers)
CREATE TABLE IF NOT EXISTS public.land_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    search_id UUID REFERENCES public.searches(id) ON DELETE SET NULL,
    listing_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (listing_status IN ('PENDING', 'ACTIVE', 'SOLD')),
    county TEXT,
    village TEXT,
    specific_area TEXT,
    price_min NUMERIC,
    price_max NUMERIC,
    description TEXT,
    contact_preference TEXT DEFAULT 'both' CHECK (contact_preference IN ('email', 'phone', 'both')),
    contact_phone TEXT CHECK (contact_phone ~ '^07[0-9]{8}$'),
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for land_listings
CREATE INDEX IF NOT EXISTS idx_land_listings_status ON public.land_listings(listing_status);
CREATE INDEX IF NOT EXISTS idx_land_listings_user ON public.land_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_land_listings_created ON public.land_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_land_listings_search_id ON public.land_listings(search_id);

-- 6. Inquiries table (buyer → seller communication)
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.land_listings(id) ON DELETE CASCADE,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_listing ON public.inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON public.inquiries(created_at DESC);
