-- ============================================
-- PlotSure — Async Fraud Detection Migration
-- Adds fraud_status and neo4j_result columns
-- to the searches table for the event-driven
-- fraud detection pipeline, plus a DLQ table.
-- ============================================

-- Add fraud tracking columns to searches
ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS fraud_status TEXT
    DEFAULT 'pending'
    CHECK (fraud_status IN ('pending', 'processing', 'verified', 'flagged', 'failed'));

ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS neo4j_result JSONB DEFAULT NULL;
ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS fraud_details JSONB DEFAULT NULL;
ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_searches_fraud_status
    ON public.searches(fraud_status);

-- Dead letter queue table for failed fraud checks
CREATE TABLE IF NOT EXISTS public.fraud_check_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
    plot_id TEXT NOT NULL,
    error_message TEXT,
    error_details JSONB,
    original_message JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    retried_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_fraud_check_failures_verification
    ON public.fraud_check_failures(verification_id);
