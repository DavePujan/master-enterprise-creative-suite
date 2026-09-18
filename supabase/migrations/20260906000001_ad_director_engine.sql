-- =============================================================================
-- Migration: 20260906000001_ad_director_engine.sql
-- Description: Production Schema, Immutable Versioning, Execution Snapshots & RLS
--              for Writopedia AI Advertising Director Platform
-- =============================================================================

-- 1. Root Ad Director Plans Table
CREATE TABLE IF NOT EXISTS public.ad_director_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'executing', 'archived')),
    aspect_ratio TEXT NOT NULL DEFAULT '16:9',
    target_platform TEXT NOT NULL DEFAULT 'generic',
    current_version_number INTEGER NOT NULL DEFAULT 1,
    current_version_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_director_plans_workspace_id ON public.ad_director_plans(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ad_director_plans_created_by ON public.ad_director_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_ad_director_plans_status ON public.ad_director_plans(status);

-- 2. Ad Director Versions Table (Immutable document snapshots & patch deltas)
CREATE TABLE IF NOT EXISTS public.ad_director_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.ad_director_plans(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    plan_document JSONB NOT NULL,
    patch_delta JSONB,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ad_director_plan_version UNIQUE (plan_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_ad_director_versions_plan_id ON public.ad_director_versions(plan_id);
CREATE INDEX IF NOT EXISTS idx_ad_director_versions_created_at ON public.ad_director_versions(created_at DESC);

-- 3. Circular FK constraint back to root table for current_version_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ad_director_plans_current_version'
    ) THEN
        ALTER TABLE public.ad_director_plans
        ADD CONSTRAINT fk_ad_director_plans_current_version
        FOREIGN KEY (current_version_id)
        REFERENCES public.ad_director_versions(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Row Level Security Policies
ALTER TABLE public.ad_director_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_director_versions ENABLE ROW LEVEL SECURITY;

-- Workspace members access to root plans
DROP POLICY IF EXISTS "Workspace members can access ad director plans" ON public.ad_director_plans;
CREATE POLICY "Workspace members can access ad director plans"
ON public.ad_director_plans FOR ALL
TO authenticated
USING (
    private.has_workspace_access(workspace_id)
)
WITH CHECK (
    private.has_workspace_access(workspace_id)
);

-- Workspace members access to plan versions
DROP POLICY IF EXISTS "Workspace members can access ad director plan versions" ON public.ad_director_versions;
CREATE POLICY "Workspace members can access ad director plan versions"
ON public.ad_director_versions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ad_director_plans adp
        WHERE adp.id = ad_director_versions.plan_id
        AND private.has_workspace_access(adp.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ad_director_plans adp
        WHERE adp.id = ad_director_versions.plan_id
        AND private.has_workspace_access(adp.workspace_id)
    )
);
