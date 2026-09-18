-- =============================================================================
-- Migration: 20260909000003_video_ad_concepts.sql
-- Description: Creative Concept Engine Persistence for Phase 3
--              Stores distinct creative directions, hooks, creative mechanisms,
--              emotional arcs, product roles, quality/diversity evaluations,
--              and user selection state tied to exact brief versions.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.video_ad_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    brief_version INTEGER NOT NULL,
    name TEXT NOT NULL,
    one_line_idea TEXT NOT NULL,
    strategic_foundation TEXT NOT NULL,
    creative_mechanism TEXT NOT NULL,
    hook JSONB NOT NULL DEFAULT '{}'::jsonb,
    premise TEXT NOT NULL,
    emotional_arc TEXT NOT NULL,
    visual_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
    narrative_structure TEXT NOT NULL,
    product_role TEXT NOT NULL,
    message_delivery TEXT NOT NULL,
    differentiation TEXT NOT NULL,
    risks TEXT[] NOT NULL DEFAULT '{}',
    strengths TEXT[] NOT NULL DEFAULT '{}',
    estimated_complexity TEXT NOT NULL DEFAULT 'medium' CHECK (estimated_complexity IN ('low', 'medium', 'high')),
    required_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'READY_FOR_REVIEW' CHECK (status IN ('DRAFT', 'READY_FOR_REVIEW', 'SELECTED', 'REJECTED', 'ARCHIVED')),
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_video_ad_concepts_project ON public.video_ad_concepts(project_id, brief_version, status);
CREATE INDEX IF NOT EXISTS idx_video_ad_concepts_workspace ON public.video_ad_concepts(workspace_id, updated_at DESC);

-- Row-Level Security
ALTER TABLE public.video_ad_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view concepts for their workspaces"
    ON public.video_ad_concepts FOR SELECT
    USING (private.has_workspace_access(workspace_id));

CREATE POLICY "Users can insert concepts for their workspaces"
    ON public.video_ad_concepts FOR INSERT
    WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "Users can update concepts for their workspaces"
    ON public.video_ad_concepts FOR UPDATE
    USING (private.has_workspace_access(workspace_id))
    WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "Users can delete concepts for their workspaces"
    ON public.video_ad_concepts FOR DELETE
    USING (private.has_workspace_access(workspace_id));
