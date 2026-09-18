-- =============================================================================
-- Migration: 20260910000001_video_ad_qa_engine.sql
-- Description: Video QA Engine, Plan-vs-Result Evaluation, and Structured Repair Plans
-- =============================================================================

-- 1. Extend public.ad_director_qa_results with multi-dimensional checks and attempt tracking
DO $$
BEGIN
    -- Drop old check constraint on status if it exists
    ALTER TABLE public.ad_director_qa_results DROP CONSTRAINT IF EXISTS ad_director_qa_results_status_check;

    -- Add updated status check constraint
    ALTER TABLE public.ad_director_qa_results ADD CONSTRAINT ad_director_qa_results_status_check
        CHECK (status IN ('pending', 'analyzing', 'passed', 'failed', 'review_required', 'repair_planned', 'superseded'));

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'attempt_number') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'overall_result') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN overall_result TEXT NOT NULL DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'technical_checks') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN technical_checks JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'creative_checks') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN creative_checks JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'continuity_checks') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN continuity_checks JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'brand_checks') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN brand_checks JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'constraint_checks') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN constraint_checks JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'failures') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN failures JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'warnings') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN warnings JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'repair_required') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN repair_required BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'repair_plan_id') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN repair_plan_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'evaluator_version') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN evaluator_version TEXT NOT NULL DEFAULT 'v1';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_qa_results' AND column_name = 'created_at') THEN
        ALTER TABLE public.ad_director_qa_results ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ad_director_qa_snapshot_shot_attempt
    ON public.ad_director_qa_results(snapshot_id, shot_id, attempt_number DESC);

-- 2. Structured Repair Plans Table
CREATE TABLE IF NOT EXISTS public.ad_director_repair_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES public.ad_director_execution_snapshots(id) ON DELETE CASCADE,
    shot_id TEXT NOT NULL,
    qa_result_id UUID NOT NULL REFERENCES public.ad_director_qa_results(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    operations JSONB NOT NULL DEFAULT '[]'::jsonb,
    preserved_state JSONB NOT NULL DEFAULT '[]'::jsonb,
    approval_level TEXT NOT NULL CHECK (approval_level IN ('AUTO_SAFE', 'USER_CONFIRMATION_REQUIRED', 'EXECUTION_CONFIRMATION_REQUIRED', 'MANUAL_REVIEW_REQUIRED')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'superseded')),
    impact JSONB DEFAULT '{}'::jsonb,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ad_director_repair_snapshot_shot
    ON public.ad_director_repair_plans(snapshot_id, shot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_director_repair_qa_id
    ON public.ad_director_repair_plans(qa_result_id);

-- 3. Row Level Security Policies
ALTER TABLE public.ad_director_repair_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_director_repair_plans' AND policyname = 'Users can view repair plans of their workspaces'
    ) THEN
        CREATE POLICY "Users can view repair plans of their workspaces"
            ON public.ad_director_repair_plans
            FOR SELECT
            USING (
                snapshot_id IN (
                    SELECT s.id FROM public.ad_director_execution_snapshots s
                    JOIN public.workspace_members m ON m.workspace_id = s.workspace_id
                    WHERE m.user_id = auth.uid()
                )
            );
    END IF;
END $$;
