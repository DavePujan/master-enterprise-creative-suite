-- =============================================================================
-- Migration: 20260909000002_video_ad_discovery.sql
-- Description: Discovery Engine & AI Interviewer Persistence for Phase 2
--              Stores dynamic discovery state, known/unknown fields, questions,
--              answers, detected contradictions, and brief confirmation status.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.video_ad_discovery_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.video_ad_projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'DISCOVERY' CHECK (status IN ('DISCOVERY', 'WAITING_FOR_USER', 'READY_FOR_CREATIVE', 'BLOCKED')),
    brief JSONB NOT NULL DEFAULT '{}'::jsonb,
    known_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    unknown_fields TEXT[] NOT NULL DEFAULT '{}',
    ambiguities TEXT[] NOT NULL DEFAULT '{}',
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    contradictions JSONB NOT NULL DEFAULT '[]'::jsonb,
    blocking_issues TEXT[] NOT NULL DEFAULT '{}',
    completeness NUMERIC(3,2) NOT NULL DEFAULT 0.0,
    is_brief_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_video_ad_discovery_project UNIQUE (project_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_video_ad_discovery_workspace ON public.video_ad_discovery_sessions(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_ad_discovery_project ON public.video_ad_discovery_sessions(project_id);

-- Row-Level Security
ALTER TABLE public.video_ad_discovery_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discovery sessions for their workspaces"
    ON public.video_ad_discovery_sessions FOR SELECT
    USING (private.has_workspace_access(workspace_id));

CREATE POLICY "Users can insert discovery sessions for their workspaces"
    ON public.video_ad_discovery_sessions FOR INSERT
    WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "Users can update discovery sessions for their workspaces"
    ON public.video_ad_discovery_sessions FOR UPDATE
    USING (private.has_workspace_access(workspace_id))
    WITH CHECK (private.has_workspace_access(workspace_id));

CREATE POLICY "Users can delete discovery sessions for their workspaces"
    ON public.video_ad_discovery_sessions FOR DELETE
    USING (private.has_workspace_access(workspace_id));
