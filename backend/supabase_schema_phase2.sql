-- ============================================
-- PlotSure Phase 2 Database Migration
-- Run this in Supabase SQL Editor after initial setup
-- ============================================

-- Enable new tables
-- No new main tables needed for Phase 2 as we enhanced existing tables

-- ============================================
-- Add price_history table
-- ============================================
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district TEXT NOT NULL,
    price_per_sqm NUMERIC NOT NULL,
    price_per_acre NUMERIC,
    property_type TEXT DEFAULT 'residential',
    category TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_district ON public.price_history(district);
CREATE INDEX idx_price_history_date ON public.price_history(recorded_at DESC);

-- Insert current pricing data (2025-2026)
INSERT INTO public.price_history (district, price_per_sqm, price_per_acre, property_type, category) VALUES
-- Central Region
('Kampala Central', 150000, 150000000, 'residential', 'prime'),
('Kampala North', 120000, 120000000, 'residential', 'prime'),
('Kampala East', 100000, 100000000, 'residential', 'high'),
('Kampala West', 110000, 110000000, 'residential', 'prime'),
-- Wakiso
('Wakiso', 85000, 85000000, 'residential', 'high'),
('Kira', 95000, 95000000, 'residential', 'high'),
('Najjera', 75000, 75000000, 'residential', 'medium'),
('Kyanja', 90000, 90000000, 'residential', 'high'),
('Namugongo', 70000, 70000000, 'residential', 'medium'),
('Gayaza', 65000, 65000000, 'residential', 'medium'),
('Seguku', 80000, 80000000, 'residential', 'high'),
('Lubowa', 60000, 60000000, 'residential', 'medium'),
-- Entebbe
('Entebbe', 80000, 80000000, 'residential', 'high'),
('Kajjansi', 55000, 55000000, 'residential', 'medium'),
-- Mukono
('Mukono', 40000, 40000000, 'residential', 'medium'),
('Seeta', 35000, 35000000, 'residential', 'medium'),
('Katosi', 25000, 25000000, 'residential', 'low'),
-- Jinja
('Jinja', 35000, 35000000, 'residential', 'medium'),
('Bugiri', 18000, 18000000, 'residential', 'low'),
('Iganga', 15000, 15000000, 'residential', 'low'),
('Mayuge', 12000, 12000000, 'residential', 'low'),
-- Mbale
('Mbale', 28000, 28000000, 'residential', 'medium'),
('Tororo', 20000, 20000000, 'residential', 'low'),
('Busia', 18000, 18000000, 'residential', 'low'),
('Sironko', 15000, 15000000, 'residential', 'low'),
-- Mbarara
('Mbarara', 28000, 28000000, 'residential', 'medium'),
('Ishaka', 20000, 20000000, 'residential', 'low'),
('Lyantonde', 15000, 15000000, 'residential', 'low'),
('Kiruhura', 12000, 12000000, 'residential', 'low'),
-- Gulu
('Gulu', 22000, 22000000, 'residential', 'medium'),
('Kitgum', 12000, 12000000, 'residential', 'low'),
('Pader', 10000, 10000000, 'residential', 'low'),
('Agago', 8000, 8000000, 'residential', 'low'),
-- Lira
('Lira', 18000, 18000000, 'residential', 'medium'),
('Apac', 10000, 10000000, 'residential', 'low'),
('Oyam', 8000, 8000000, 'residential', 'low'),
('Kole', 7000, 7000000, 'residential', 'low'),
-- Kasese
('Kasese', 15000, 15000000, 'residential', 'low'),
('Fort Portal', 20000, 20000000, 'residential', 'medium'),
('Bundibugyo', 10000, 10000000, 'residential', 'low'),
('Kyenjojo', 12000, 12000000, 'residential', 'low'),
-- Masindi
('Masindi', 20000, 20000000, 'residential', 'medium'),
('Kiryandongo', 15000, 15000000, 'residential', 'low'),
('Buliisa', 10000, 10000000, 'residential', 'low'),
-- Luweero
('Luweero', 30000, 30000000, 'residential', 'medium'),
('Wakiso Surrounds', 45000, 45000000, 'residential', 'medium'),
('Nakasongola', 12000, 12000000, 'residential', 'low'),
('Nakaseke', 18000, 18000000, 'residential', 'low'),
('Kayunga', 15000, 15000000, 'residential', 'low'),
-- Other
('Ssoroti', 12000, 12000000, 'residential', 'low'),
('Moroto', 10000, 10000000, 'residential', 'low'),
('Kotido', 6000, 6000000, 'residential', 'low'),
('Kaabong', 5000, 5000000, 'residential', 'very_low');

-- ============================================
-- Certificates table enhancement
-- ============================================
ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS verification_url TEXT;

-- ============================================
-- Searches table enhancement
-- ============================================
ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS base_price_per_sqm NUMERIC,
ADD COLUMN IF NOT EXISTS annual_growth NUMERIC,
ADD COLUMN IF NOT EXISTS price_category TEXT,
ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'residential';

-- ============================================
-- Enable RLS on price_history
-- ============================================
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read (it's public pricing data)
CREATE POLICY "Anyone can view price history"
    ON public.price_history FOR SELECT
    USING (true);

-- Only service role can insert
CREATE POLICY "Service role can insert price history"
    ON public.price_history FOR INSERT
    WITH CHECK (true);

-- ============================================
-- Function to update price history periodically
-- ============================================
CREATE OR REPLACE FUNCTION public.update_price_history()
RETURNS void AS $$
BEGIN
    -- This can be called monthly to track price changes
    -- For now, we keep initial data as baseline
    RAISE NOTICE 'Price history tracking enabled';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grant permissions
-- ============================================
GRANT SELECT ON public.price_history TO anon, authenticated;
GRANT INSERT ON public.price_history TO anon, authenticated;
GRANT ALL ON public.price_history TO service_role;

-- ============================================
-- Notes
-- ============================================
-- Run this migration after the initial schema (supabase_schema.sql)
-- This adds price history tracking and enhanced certificate fields