-- =============================================================================
-- Migration: 20260909000001_video_ad_normalized_schema.sql
-- Description: Normalized Relational Persistence for AI Advertising Director Phase 1
--              Projects, Versions, Character/Product/Location Bibles, Shots,
--              Shot References, Decisions/Locks & Execution Snapshots Foundation.
-- =============================================================================

-- 1. Video Ad Projects Root Table
CREATE TABLE IF NOT EXISTS public.video_ad_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_ad_projects_workspace ON public.video_ad_projects(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_ad_projects_created_by ON public.video_ad_projects(created_by);

-- 2. Video Ad Spec Versions (Immutable version snapshots with top-level creative intent)
CREATE TABLE IF NOT EXISTS public.video_ad_spec_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    parent_version_id UUID REFERENCES public.video_ad_spec_versions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
    brief JSONB NOT NULL DEFAULT '{}'::jsonb,
    creative JSONB NOT NULL DEFAULT '{}'::jsonb,
    brand_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    audio JSONB NOT NULL DEFAULT '{}'::jsonb,
    story JSONB NOT NULL DEFAULT '{}'::jsonb,
    continuity JSONB NOT NULL DEFAULT '{}'::jsonb,
    constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    generation_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    schema_version TEXT NOT NULL DEFAULT '1.0.0',
    content_hash TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_video_ad_project_version UNIQUE (project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_video_ad_versions_project_ver ON public.video_ad_spec_versions(project_id, version_number);
CREATE INDEX IF NOT EXISTS idx_video_ad_versions_workspace ON public.video_ad_spec_versions(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_ad_versions_hash ON public.video_ad_spec_versions(content_hash);

-- 3. Normalized Character Bible
CREATE TABLE IF NOT EXISTS public.video_ad_characters (
    id TEXT NOT NULL, -- e.g. 'char_sarah'
    version_id UUID NOT NULL REFERENCES public.video_ad_spec_versions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    narrative_role TEXT NOT NULL DEFAULT 'protagonist',
    appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
    wardrobe JSONB NOT NULL DEFAULT '{}'::jsonb,
    reference_asset_ids TEXT[] NOT NULL DEFAULT '{}',
    behavior_personality TEXT NOT NULL DEFAULT '',
    locks TEXT[] NOT NULL DEFAULT '{}',
    continuity_constraints TEXT[] NOT NULL DEFAULT '{}',
    forbidden_changes TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (version_id, id)
);

CREATE INDEX IF NOT EXISTS idx_video_ad_characters_project ON public.video_ad_characters(project_id);
CREATE INDEX IF NOT EXISTS idx_video_ad_characters_workspace ON public.video_ad_characters(workspace_id);

-- 4. Normalized Product Bible
CREATE TABLE IF NOT EXISTS public.video_ad_products (
    id TEXT NOT NULL, -- e.g. 'product_glow_serum'
    version_id UUID NOT NULL REFERENCES public.video_ad_spec_versions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    visual_description TEXT NOT NULL DEFAULT '',
    shape_form TEXT NOT NULL DEFAULT '',
    materials TEXT[] NOT NULL DEFAULT '{}',
    color_palette TEXT[] NOT NULL DEFAULT '{}',
    packaging JSONB NOT NULL DEFAULT '{}'::jsonb,
    branding JSONB NOT NULL DEFAULT '{}'::jsonb,
    reference_asset_ids TEXT[] NOT NULL DEFAULT '{}',
    locks TEXT[] NOT NULL DEFAULT '{}',
    allowed_transformations TEXT[] NOT NULL DEFAULT '{}',
    forbidden_transformations TEXT[] NOT NULL DEFAULT '{}',
    continuity_requirements TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (version_id, id)
);

CREATE INDEX IF NOT EXISTS idx_video_ad_products_project ON public.video_ad_products(project_id);
CREATE INDEX IF NOT EXISTS idx_video_ad_products_workspace ON public.video_ad_products(workspace_id);

-- 5. Normalized Location Bible
CREATE TABLE IF NOT EXISTS public.video_ad_locations (
    id TEXT NOT NULL, -- e.g. 'location_beach_sunrise'
    version_id UUID NOT NULL REFERENCES public.video_ad_spec_versions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    architecture TEXT NOT NULL DEFAULT '',
    spatial_characteristics JSONB NOT NULL DEFAULT '{}'::jsonb,
    lighting_characteristics JSONB NOT NULL DEFAULT '{}'::jsonb,
    palette TEXT[] NOT NULL DEFAULT '{}',
    atmosphere TEXT NOT NULL DEFAULT '',
    reference_asset_ids TEXT[] NOT NULL DEFAULT '{}',
    continuity_constraints TEXT[] NOT NULL DEFAULT '{}',
    locks TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (version_id, id)
);

CREATE INDEX IF NOT EXISTS idx_video_ad_locations_project ON public.video_ad_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_video_ad_locations_workspace ON public.video_ad_locations(workspace_id);

-- 6. Normalized Shots Specification
CREATE TABLE IF NOT EXISTS public.video_ad_shots (
    id TEXT NOT NULL, -- e.g. 'shot_01'
    version_id UUID NOT NULL REFERENCES public.video_ad_spec_versions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    duration_seconds NUMERIC(5,2) NOT NULL,
    purpose TEXT NOT NULL DEFAULT '',
    narrative_role TEXT NOT NULL DEFAULT '',
    location_id TEXT,
    action JSONB NOT NULL DEFAULT '{}'::jsonb,
    camera JSONB NOT NULL DEFAULT '{}'::jsonb,
    lighting JSONB NOT NULL DEFAULT '{}'::jsonb,
    visual_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
    audio JSONB NOT NULL DEFAULT '{}'::jsonb,
    transitions JSONB NOT NULL DEFAULT '{}'::jsonb,
    referenced_asset_ids TEXT[] NOT NULL DEFAULT '{}',
    continuity JSONB NOT NULL DEFAULT '{}'::jsonb,
    constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
    qa_expectations JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (version_id, id)
);

CREATE INDEX IF NOT EXISTS idx_video_ad_shots_project_seq ON public.video_ad_shots(project_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_video_ad_shots_workspace ON public.video_ad_shots(workspace_id);

-- 7. Normalized Shot Entity & Asset References
CREATE TABLE IF NOT EXISTS public.video_ad_shot_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.video_ad_spec_versions(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    shot_id TEXT NOT NULL,
    reference_type TEXT NOT NULL CHECK (reference_type IN ('character', 'product', 'asset')),
    entity_id TEXT NOT NULL,
    role TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_ad_shot_refs_ver_shot ON public.video_ad_shot_references(version_id, shot_id);
CREATE INDEX IF NOT EXISTS idx_video_ad_shot_refs_workspace ON public.video_ad_shot_references(workspace_id);

-- 8. Normalized Decision & Provenance Registry
CREATE TABLE IF NOT EXISTS public.video_ad_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.video_ad_spec_versions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    field_path TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('user_requested', 'ai_inferred', 'ai_optimized', 'system_repaired', 'model_constraint')),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lock_scope TEXT,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_ad_decisions_ver_path ON public.video_ad_decisions(version_id, field_path);
CREATE INDEX IF NOT EXISTS idx_video_ad_decisions_workspace ON public.video_ad_decisions(workspace_id);

-- 9. Execution Snapshots Foundation
CREATE TABLE IF NOT EXISTS public.video_ad_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.video_ad_spec_versions(id) ON DELETE RESTRICT,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    frozen_spec JSONB NOT NULL,
    execution_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_ad_executions_project ON public.video_ad_executions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_ad_executions_workspace ON public.video_ad_executions(workspace_id);

-- 10. Enable Row Level Security (RLS) on All Normalized Tables
ALTER TABLE public.video_ad_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_spec_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_shot_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_executions ENABLE ROW LEVEL SECURITY;

-- 11. Multi-Tenant Workspace Isolation Policies
CREATE POLICY "video_ad_projects_workspace_isolation" ON public.video_ad_projects
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "video_ad_spec_versions_workspace_isolation" ON public.video_ad_spec_versions
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "video_ad_characters_workspace_isolation" ON public.video_ad_characters
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "video_ad_products_workspace_isolation" ON public.video_ad_products
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "video_ad_locations_workspace_isolation" ON public.video_ad_locations
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "video_ad_shots_workspace_isolation" ON public.video_ad_shots
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "video_ad_shot_references_workspace_isolation" ON public.video_ad_shot_references
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "video_ad_decisions_workspace_isolation" ON public.video_ad_decisions
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "video_ad_executions_workspace_isolation" ON public.video_ad_executions
FOR ALL TO authenticated
USING (private.has_workspace_access(workspace_id))
WITH CHECK (private.has_workspace_access(workspace_id));
