-- =============================================================================
-- Migration: 20260911000001_video_ad_assembly_engine.sql
-- Description: Video Ad Assembly, Master Rendering, and Export Variants Engine
-- =============================================================================

-- 1. Assemblies Table (Immutable assembly specifications)
CREATE TABLE IF NOT EXISTS public.ad_director_assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.ad_director_plans(id) ON DELETE CASCADE,
    execution_id UUID NOT NULL REFERENCES public.ad_director_execution_snapshots(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    assembly_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'rendering', 'completed', 'failed', 'cancelled')),
    assembly_spec JSONB NOT NULL,
    validation_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_director_assemblies_exec_id ON public.ad_director_assemblies(execution_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_ad_director_assemblies_ws_id ON public.ad_director_assemblies(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_director_assemblies_hash ON public.ad_director_assemblies(assembly_hash);

-- 2. Master & Variant Render Jobs Table
CREATE TABLE IF NOT EXISTS public.ad_director_renders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_id UUID NOT NULL REFERENCES public.ad_director_assemblies(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.ai_generation_jobs(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    render_type TEXT NOT NULL DEFAULT 'master' CHECK (render_type IN ('master', 'variant')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'rendering', 'validating', 'completed', 'failed', 'cancelled')),
    output_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    duration_seconds NUMERIC(6,2),
    width INTEGER,
    height INTEGER,
    aspect_ratio TEXT,
    file_size_bytes BIGINT,
    render_progress INTEGER NOT NULL DEFAULT 0,
    progress_step TEXT,
    error_message TEXT,
    storage_path TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_director_renders_assembly_id ON public.ad_director_renders(assembly_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_director_renders_ws_id ON public.ad_director_renders(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_ad_director_renders_job_id ON public.ad_director_renders(job_id);

-- 3. Export Variants Table
CREATE TABLE IF NOT EXISTS public.ad_director_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    render_id UUID NOT NULL REFERENCES public.ad_director_renders(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    preset_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'completed', 'failed')),
    output_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    storage_path TEXT,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    aspect_ratio TEXT NOT NULL,
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ad_director_exports_render_id ON public.ad_director_exports(render_id);
CREATE INDEX IF NOT EXISTS idx_ad_director_exports_ws_id ON public.ad_director_exports(workspace_id);

-- 4. Enable Row Level Security Policies
ALTER TABLE public.ad_director_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_director_renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_director_exports ENABLE ROW LEVEL SECURITY;

-- Assemblies RLS
DROP POLICY IF EXISTS "Users can view assemblies in their workspace" ON public.ad_director_assemblies;
CREATE POLICY "Users can view assemblies in their workspace"
ON public.ad_director_assemblies FOR SELECT
TO authenticated
USING (private.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can insert assemblies in their workspace" ON public.ad_director_assemblies;
CREATE POLICY "Users can insert assemblies in their workspace"
ON public.ad_director_assemblies FOR INSERT
TO authenticated
WITH CHECK (private.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can update assemblies in their workspace" ON public.ad_director_assemblies;
CREATE POLICY "Users can update assemblies in their workspace"
ON public.ad_director_assemblies FOR UPDATE
TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

-- Renders RLS
DROP POLICY IF EXISTS "Users can view renders in their workspace" ON public.ad_director_renders;
CREATE POLICY "Users can view renders in their workspace"
ON public.ad_director_renders FOR SELECT
TO authenticated
USING (private.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can insert renders in their workspace" ON public.ad_director_renders;
CREATE POLICY "Users can insert renders in their workspace"
ON public.ad_director_renders FOR INSERT
TO authenticated
WITH CHECK (private.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can update renders in their workspace" ON public.ad_director_renders;
CREATE POLICY "Users can update renders in their workspace"
ON public.ad_director_renders FOR UPDATE
TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

-- Exports RLS
DROP POLICY IF EXISTS "Users can view exports in their workspace" ON public.ad_director_exports;
CREATE POLICY "Users can view exports in their workspace"
ON public.ad_director_exports FOR SELECT
TO authenticated
USING (private.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can insert exports in their workspace" ON public.ad_director_exports;
CREATE POLICY "Users can insert exports in their workspace"
ON public.ad_director_exports FOR INSERT
TO authenticated
WITH CHECK (private.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can update exports in their workspace" ON public.ad_director_exports;
CREATE POLICY "Users can update exports in their workspace"
ON public.ad_director_exports FOR UPDATE
TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));
