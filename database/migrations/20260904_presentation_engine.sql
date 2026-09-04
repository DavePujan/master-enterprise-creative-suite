-- =============================================================================
-- Migration: 20260904_presentation_engine.sql
-- Description: Production Tables & RLS for Corporate Presentation Engine
-- =============================================================================

-- 1. Presentations Root Table
CREATE TABLE IF NOT EXISTS public.presentations (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    current_version INTEGER NOT NULL DEFAULT 1,
    aspect_ratio TEXT NOT NULL DEFAULT '16:9',
    theme JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presentations_workspace_id ON public.presentations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_presentations_created_by ON public.presentations(created_by);

-- 2. Presentation Versions Table (Immutable historical snapshots + concurrency)
CREATE TABLE IF NOT EXISTS public.presentation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id TEXT NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    document_json JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presentation_version UNIQUE (presentation_id, version)
);

CREATE INDEX IF NOT EXISTS idx_presentation_versions_pres_id ON public.presentation_versions(presentation_id);

-- 3. Presentation Assets Table (Tracks image/logo slots and generation lifecycle)
CREATE TABLE IF NOT EXISTS public.presentation_assets (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('image', 'logo', 'chart_export')),
    storage_bucket TEXT NOT NULL DEFAULT 'user-assets',
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
    mime_type TEXT NOT NULL DEFAULT 'image/webp',
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presentation_assets_pres_id ON public.presentation_assets(presentation_id);

-- 4. Presentation Exports Table (Server-side PPTX/PDF job queue)
CREATE TABLE IF NOT EXISTS public.presentation_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id TEXT NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('pptx', 'pdf')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    storage_bucket TEXT NOT NULL DEFAULT 'user-assets',
    storage_path TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_presentation_exports_pres_id ON public.presentation_exports(presentation_id);

-- 5. Row Level Security Policies
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_exports ENABLE ROW LEVEL SECURITY;

-- Allow workspace members access to presentations
DROP POLICY IF EXISTS "Workspace members can access presentations" ON public.presentations;
CREATE POLICY "Workspace members can access presentations"
ON public.presentations FOR ALL
TO authenticated
USING (
    private.has_workspace_access(workspace_id)
)
WITH CHECK (
    private.has_workspace_access(workspace_id)
);

-- Allow workspace members access to presentation versions
DROP POLICY IF EXISTS "Workspace members can access presentation versions" ON public.presentation_versions;
CREATE POLICY "Workspace members can access presentation versions"
ON public.presentation_versions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = presentation_versions.presentation_id
        AND private.has_workspace_access(p.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = presentation_versions.presentation_id
        AND private.has_workspace_access(p.workspace_id)
    )
);

-- Allow workspace members access to presentation assets
DROP POLICY IF EXISTS "Workspace members can access presentation assets" ON public.presentation_assets;
CREATE POLICY "Workspace members can access presentation assets"
ON public.presentation_assets FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = presentation_assets.presentation_id
        AND private.has_workspace_access(p.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = presentation_assets.presentation_id
        AND private.has_workspace_access(p.workspace_id)
    )
);

-- Allow workspace members access to presentation exports
DROP POLICY IF EXISTS "Workspace members can access presentation exports" ON public.presentation_exports;
CREATE POLICY "Workspace members can access presentation exports"
ON public.presentation_exports FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = presentation_exports.presentation_id
        AND private.has_workspace_access(p.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = presentation_exports.presentation_id
        AND private.has_workspace_access(p.workspace_id)
    )
);
