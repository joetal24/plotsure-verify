-- ============================================
-- PlotSure GIS Fields Migration
-- Add latitude, longitude, district, parish, area_acres
-- to the land_listings table
-- ============================================

ALTER TABLE public.land_listings
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS parish TEXT,
ADD COLUMN IF NOT EXISTS area_acres DECIMAL(10,2);
