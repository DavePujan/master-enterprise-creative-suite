-- =============================================================================
-- Migration: 20260908000001_ad_director_execution_architecture.sql
-- Description: Execution Snapshots, Provider Runs, Prompt Versions, QA Results,
--              Revisions & ai_jobs Extensions for AI Advertising Director
-- =============================================================================

-- 1. Extend public.ad_director_versions with lineage and audit metadata
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_versions' AND column_name = 'parent_version_id') THEN
        ALTER TABLE public.ad_director_versions ADD COLUMN parent_version_id UUID REFERENCES public.ad_director_versions(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_versions' AND column_name = 'schema_version') THEN
        ALTER TABLE public.ad_director_versions ADD COLUMN schema_version TEXT NOT NULL DEFAULT 'adspec_v1';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_versions' AND column_name = 'content_hash') THEN
        ALTER TABLE public.ad_director_versions ADD COLUMN content_hash TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_versions' AND column_name = 'approved_at') THEN
        ALTER TABLE public.ad_director_versions ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_director_versions' AND column_name = 'approved_by') THEN
        ALTER TABLE public.ad_director_versions ADD COLUMN approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Revision Records Table (Audit of user instructions, AI proposals, deltas & impact)
CREATE TABLE IF NOT EXISTS public.ad_director_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.ad_director_plans(id) ON DELETE CASCADE,
    base_version_number INTEGER NOT NULL,
    resulting_version_number INTEGER NOT NULL,
    actor JSONB NOT NULL, -- { id, role }
    reason TEXT NOT NULL,
    operations JSONB NOT NULL DEFAULT '[]'::jsonb,
    impact JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_director_revisions_plan_id ON public.ad_director_revisions(plan_id, created_at DESC);

-- 3. Execution Snapshots Table (Immutable freeze of approved AdSpec for generation)
CREATE TABLE IF NOT EXISTS public.ad_director_execution_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.ad_director_plans(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    spec_version INTEGER NOT NULL,
    spec_hash TEXT NOT NULL,
    frozen_ad_spec JSONB NOT NULL,
    resolved_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
    selected_provider TEXT NOT NULL,
    selected_model TEXT NOT NULL,
    credit_cost_estimate INTEGER NOT NULL DEFAULT 0,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_director_snapshots_plan_id ON public.ad_director_execution_snapshots(plan_id);
CREATE INDEX IF NOT EXISTS idx_ad_director_snapshots_workspace_id ON public.ad_director_execution_snapshots(workspace_id, created_at DESC);

-- 4. Prompt Versions Table (Derived artifact records per shot & model)
CREATE TABLE IF NOT EXISTS public.ad_director_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES public.ad_director_execution_snapshots(id) ON DELETE CASCADE,
    shot_id TEXT NOT NULL,
    compiler_version TEXT NOT NULL DEFAULT 'v1',
    target_engine TEXT NOT NULL,
    compiled_prompt TEXT NOT NULL,
    negative_prompt TEXT,
    generation_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolved_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_director_prompts_snapshot_shot ON public.ad_director_prompt_versions(snapshot_id, shot_id);

-- 5. Extend existing public.ai_generation_jobs (Zero duplicate queue)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generation_jobs' AND column_name = 'snapshot_id') THEN
        ALTER TABLE public.ai_generation_jobs ADD COLUMN snapshot_id UUID REFERENCES public.ad_director_execution_snapshots(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generation_jobs' AND column_name = 'shot_id') THEN
        ALTER TABLE public.ai_generation_jobs ADD COLUMN shot_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generation_jobs' AND column_name = 'prompt_version_id') THEN
        ALTER TABLE public.ai_generation_jobs ADD COLUMN prompt_version_id UUID REFERENCES public.ad_director_prompt_versions(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generation_jobs' AND column_name = 'retry_count') THEN
        ALTER TABLE public.ai_generation_jobs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_jobs_snapshot_shot ON public.ai_generation_jobs(snapshot_id, shot_id) WHERE snapshot_id IS NOT NULL;

-- 6. Provider Runs Table (Decouples logical job from provider attempts/retries)
CREATE TABLE IF NOT EXISTS public.ad_director_provider_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_job_id UUID NOT NULL REFERENCES public.ai_generation_jobs(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    external_job_id TEXT,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'submitted',
    request_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ad_director_provider_runs_job_id ON public.ad_director_provider_runs(generation_job_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_ad_director_provider_runs_ext_id ON public.ad_director_provider_runs(external_job_id) WHERE external_job_id IS NOT NULL;

-- 7. Generation Results Table (Shot-level video output and acceptance)
CREATE TABLE IF NOT EXISTS public.ad_director_generation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_job_id UUID NOT NULL REFERENCES public.ai_generation_jobs(id) ON DELETE CASCADE,
    snapshot_id UUID NOT NULL REFERENCES public.ad_director_execution_snapshots(id) ON DELETE CASCADE,
    shot_id TEXT NOT NULL,
    output_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    duration_seconds NUMERIC(5,2),
    acceptance_status TEXT NOT NULL DEFAULT 'pending' CHECK (acceptance_status IN ('pending', 'accepted', 'rejected', 'superseded')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_director_results_snapshot_shot ON public.ad_director_generation_results(snapshot_id, shot_id);
CREATE INDEX IF NOT EXISTS idx_ad_director_results_job_id ON public.ad_director_generation_results(generation_job_id);

-- 8. QA Results Table (Grounds evaluation in exact snapshot requirements)
CREATE TABLE IF NOT EXISTS public.ad_director_qa_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID NOT NULL REFERENCES public.ad_director_generation_results(id) ON DELETE CASCADE,
    generation_job_id UUID NOT NULL REFERENCES public.ai_generation_jobs(id) ON DELETE CASCADE,
    snapshot_id UUID NOT NULL REFERENCES public.ad_director_execution_snapshots(id) ON DELETE CASCADE,
    shot_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning')),
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    repair_recommendation JSONB,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_director_qa_snapshot_shot ON public.ad_director_qa_results(snapshot_id, shot_id);
CREATE INDEX IF NOT EXISTS idx_ad_director_qa_result_id ON public.ad_director_qa_results(result_id);

-- 9. Row Level Security Policies
ALTER TABLE public.ad_director_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_director_execution_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_director_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_director_provider_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_director_generation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_director_qa_results ENABLE ROW LEVEL SECURITY;

-- Revisions: Workspace members
DROP POLICY IF EXISTS "Workspace members can access revisions" ON public.ad_director_revisions;
CREATE POLICY "Workspace members can access revisions"
ON public.ad_director_revisions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ad_director_plans adp
        WHERE adp.id = ad_director_revisions.plan_id
        AND private.has_workspace_access(adp.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ad_director_plans adp
        WHERE adp.id = ad_director_revisions.plan_id
        AND private.has_workspace_access(adp.workspace_id)
    )
);

-- Execution Snapshots: Workspace members
DROP POLICY IF EXISTS "Workspace members can access execution snapshots" ON public.ad_director_execution_snapshots;
CREATE POLICY "Workspace members can access execution snapshots"
ON public.ad_director_execution_snapshots FOR ALL
TO authenticated
USING (
    private.has_workspace_access(workspace_id)
)
WITH CHECK (
    private.has_workspace_access(workspace_id)
);

-- Prompt Versions: Via parent snapshot workspace
DROP POLICY IF EXISTS "Workspace members can access prompt versions" ON public.ad_director_prompt_versions;
CREATE POLICY "Workspace members can access prompt versions"
ON public.ad_director_prompt_versions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ad_director_execution_snapshots snap
        WHERE snap.id = ad_director_prompt_versions.snapshot_id
        AND private.has_workspace_access(snap.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ad_director_execution_snapshots snap
        WHERE snap.id = ad_director_prompt_versions.snapshot_id
        AND private.has_workspace_access(snap.workspace_id)
    )
);

-- Provider Runs: Via parent generation job workspace
DROP POLICY IF EXISTS "Workspace members can access provider runs" ON public.ad_director_provider_runs;
CREATE POLICY "Workspace members can access provider runs"
ON public.ad_director_provider_runs FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ai_generation_jobs job
        WHERE job.id = ad_director_provider_runs.generation_job_id
        AND private.has_workspace_access(job.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ai_generation_jobs job
        WHERE job.id = ad_director_provider_runs.generation_job_id
        AND private.has_workspace_access(job.workspace_id)
    )
);

-- Generation Results: Via parent snapshot workspace
DROP POLICY IF EXISTS "Workspace members can access generation results" ON public.ad_director_generation_results;
CREATE POLICY "Workspace members can access generation results"
ON public.ad_director_generation_results FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ad_director_execution_snapshots snap
        WHERE snap.id = ad_director_generation_results.snapshot_id
        AND private.has_workspace_access(snap.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ad_director_execution_snapshots snap
        WHERE snap.id = ad_director_generation_results.snapshot_id
        AND private.has_workspace_access(snap.workspace_id)
    )
);

-- QA Results: Via parent snapshot workspace
DROP POLICY IF EXISTS "Workspace members can access qa results" ON public.ad_director_qa_results;
CREATE POLICY "Workspace members can access qa results"
ON public.ad_director_qa_results FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ad_director_execution_snapshots snap
        WHERE snap.id = ad_director_qa_results.snapshot_id
        AND private.has_workspace_access(snap.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ad_director_execution_snapshots snap
        WHERE snap.id = ad_director_qa_results.snapshot_id
        AND private.has_workspace_access(snap.workspace_id)
    )
);
