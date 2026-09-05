-- =============================================================================
-- Migration: 20260905000001_campaign_strategies_versioned.sql
-- Description: Production Tables, Versioning, Fingerprints & RLS for Campaign Strategist 2.0
-- =============================================================================

-- 1. Campaign Strategies Root Table
CREATE TABLE IF NOT EXISTS public.campaign_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    framework_id TEXT NOT NULL DEFAULT 'category-creation',
    current_version_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_strategies_workspace_id ON public.campaign_strategies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_strategies_created_by ON public.campaign_strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_campaign_strategies_status ON public.campaign_strategies(status);

-- 2. Campaign Strategy Versions Table (Full versioning lifecycle & territory pivots)
CREATE TABLE IF NOT EXISTS public.campaign_strategy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_strategy_id UUID NOT NULL REFERENCES public.campaign_strategies(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    selected_territory JSONB NOT NULL,
    master_strategy JSONB NOT NULL,
    downstream_briefs JSONB NOT NULL,
    epistemic_ledger JSONB NOT NULL DEFAULT '[]'::jsonb,
    critic_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_strategy_version UNIQUE (campaign_strategy_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_campaign_strat_vers_strat_id ON public.campaign_strategy_versions(campaign_strategy_id);

-- Add foreign key constraint back to root table for current_version_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_campaign_strategies_current_version'
    ) THEN
        ALTER TABLE public.campaign_strategies
        ADD CONSTRAINT fk_campaign_strategies_current_version
        FOREIGN KEY (current_version_id)
        REFERENCES public.campaign_strategy_versions(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Campaign Strategy Fingerprints Table (Multi-vector memory & novelty engine)
CREATE TABLE IF NOT EXISTS public.campaign_strategy_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    campaign_strategy_id UUID NOT NULL REFERENCES public.campaign_strategies(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.campaign_strategy_versions(id) ON DELETE CASCADE,
    narrative_hash TEXT NOT NULL,
    mechanism_hash TEXT NOT NULL,
    emotional_hash TEXT NOT NULL,
    insight_hash TEXT NOT NULL,
    visual_hash TEXT NOT NULL,
    token_bag TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_strat_fp_workspace_id ON public.campaign_strategy_fingerprints(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_strat_fp_created_at ON public.campaign_strategy_fingerprints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_strat_fp_strat_id ON public.campaign_strategy_fingerprints(campaign_strategy_id);

-- 4. Row Level Security Policies
ALTER TABLE public.campaign_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_strategy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_strategy_fingerprints ENABLE ROW LEVEL SECURITY;

-- Workspace members access to root strategies
DROP POLICY IF EXISTS "Workspace members can access campaign strategies" ON public.campaign_strategies;
CREATE POLICY "Workspace members can access campaign strategies"
ON public.campaign_strategies FOR ALL
TO authenticated
USING (
    private.has_workspace_access(workspace_id)
)
WITH CHECK (
    private.has_workspace_access(workspace_id)
);

-- Workspace members access to strategy versions
DROP POLICY IF EXISTS "Workspace members can access campaign strategy versions" ON public.campaign_strategy_versions;
CREATE POLICY "Workspace members can access campaign strategy versions"
ON public.campaign_strategy_versions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.campaign_strategies cs
        WHERE cs.id = campaign_strategy_versions.campaign_strategy_id
        AND private.has_workspace_access(cs.workspace_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.campaign_strategies cs
        WHERE cs.id = campaign_strategy_versions.campaign_strategy_id
        AND private.has_workspace_access(cs.workspace_id)
    )
);

-- Workspace members access to strategy fingerprints
DROP POLICY IF EXISTS "Workspace members can access campaign strategy fingerprints" ON public.campaign_strategy_fingerprints;
CREATE POLICY "Workspace members can access campaign strategy fingerprints"
ON public.campaign_strategy_fingerprints FOR ALL
TO authenticated
USING (
    private.has_workspace_access(workspace_id)
)
WITH CHECK (
    private.has_workspace_access(workspace_id)
);
