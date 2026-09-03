-- =============================================================================
-- Migration: 20260903000001_initial_schema.sql
-- Description: Core Schema Foundation for Writopedia Enterprise Creative Suite
-- Database Engine: PostgreSQL 15+ (Supabase)
-- Architecture: Multi-Tenant Workspace Tenancy, Immutable Ledger, AI Observability
-- =============================================================================

-- 1. SCHEMAS, EXTENSIONS & ENUMS
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE system_role AS ENUM ('user', 'curator', 'admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM ('viewer', 'editor', 'admin', 'owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE asset_type AS ENUM ('image', 'doc', 'video', 'audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'signup_grant', 'topup_purchase', 'subscription_grant', 
        'ai_generation_hold', 'ai_generation_debit', 'ai_generation_release', 
        'admin_adjustment', 'refund'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE hold_status AS ENUM ('pending', 'captured', 'released', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE curation_status AS ENUM ('pending', 'in_review', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE sales_status AS ENUM ('new', 'contacted', 'qualified', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. CORE IDENTITY & PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Separate Server-Managed Authorization Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    role system_role NOT NULL DEFAULT 'user',
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legacy Compatibility Table for Deterministic Migration
CREATE TABLE IF NOT EXISTS public.firebase_uid_map (
    firebase_uid TEXT PRIMARY KEY,
    supabase_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    legacy_email TEXT,
    migration_status TEXT NOT NULL DEFAULT 'linked',
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. WORKSPACES & MEMBERSHIP
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_personal BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'editor',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- 4. AUTHORITATIVE CREDIT BALANCES, HOLDS, & IMMUTABLE TRANSACTION LEDGER
-- INVARIANT: available_balance = balance - held_balance (enforced via CHECK constraint)
CREATE TABLE IF NOT EXISTS public.credit_balances (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 50 CHECK (balance >= 0),
    held_balance INTEGER NOT NULL DEFAULT 0 CHECK (held_balance >= 0),
    lifetime_granted INTEGER NOT NULL DEFAULT 50,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT balance_covers_holds CHECK (balance >= held_balance)
);

CREATE TABLE IF NOT EXISTS public.credit_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    status hold_status NOT NULL DEFAULT 'pending',
    idempotency_key TEXT NOT NULL UNIQUE,
    reference_id TEXT,
    description TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_holds_active ON public.credit_holds(workspace_id, status) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount INTEGER NOT NULL,
    resulting_balance INTEGER NOT NULL CHECK (resulting_balance >= 0),
    type transaction_type NOT NULL,
    reference_id TEXT,
    idempotency_key TEXT UNIQUE,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_workspace ON public.credit_ledger(workspace_id, created_at DESC);

-- Engine-level immutability protection for credit_ledger
CREATE OR REPLACE FUNCTION private.prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'credit_ledger is strictly append-only. UPDATE and DELETE are prohibited.' 
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credit_ledger_immutable ON public.credit_ledger;
CREATE TRIGGER trg_credit_ledger_immutable
BEFORE UPDATE OR DELETE ON public.credit_ledger
FOR EACH ROW EXECUTE FUNCTION private.prevent_ledger_mutation();

-- 5. BILLING & PAYMENT AUDIT (State Machine Enforced)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    order_id TEXT NOT NULL UNIQUE,
    payment_id TEXT UNIQUE,
    signature TEXT,
    plan_id TEXT NOT NULL,
    amount_subunits INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status payment_status NOT NULL DEFAULT 'created',
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment State Machine Transition Validator
CREATE OR REPLACE FUNCTION private.validate_payment_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Valid transitions
    IF OLD.status = 'created' AND NEW.status IN ('authorized', 'captured', 'failed') THEN
        RETURN NEW;
    ELSIF OLD.status = 'authorized' AND NEW.status IN ('captured', 'failed') THEN
        RETURN NEW;
    ELSIF OLD.status = 'captured' AND NEW.status IN ('refunded', 'partially_refunded') THEN
        RETURN NEW;
    ELSIF OLD.status = 'partially_refunded' AND NEW.status = 'refunded' THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Invalid payment state transition from % to %', OLD.status, NEW.status
            USING ERRCODE = '22023';
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_status_transition ON public.payments;
CREATE TRIGGER trg_payment_status_transition
BEFORE UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION private.validate_payment_status_transition();

-- 6. BRAND GUIDELINES
CREATE TABLE IF NOT EXISTS public.brand_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    industry VARCHAR(200) NOT NULL DEFAULT '',
    tone VARCHAR(500) NOT NULL DEFAULT '',
    pillars TEXT[] NOT NULL DEFAULT '{}',
    colors TEXT[] NOT NULL DEFAULT '{}',
    typography JSONB NOT NULL DEFAULT '{"primary":"Inter","secondary":"Inter"}'::jsonb,
    logo_storage_path TEXT,
    logo_description VARCHAR(2000),
    location VARCHAR(200),
    voice_accent_style VARCHAR(200),
    visual_ethnicity_style VARCHAR(200),
    mission VARCHAR(2000),
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_workspace_default_brand UNIQUE (workspace_id, is_default)
);

-- 7. ASSETS (Canonical Storage Path & Sha256 Checksum)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'user-assets',
    storage_path TEXT NOT NULL,
    type asset_type NOT NULL,
    prompt TEXT,
    analysis JSONB,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    sha256 VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_workspace ON public.assets(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_sha256 ON public.assets(sha256) WHERE sha256 IS NOT NULL;

-- 8. AI GENERATION JOBS, OUTPUTS & USAGE COST OBSERVABILITY
CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    operation VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_requested VARCHAR(100) NOT NULL,
    model_used VARCHAR(100),
    status job_status NOT NULL DEFAULT 'pending',
    credits_reserved INTEGER NOT NULL DEFAULT 0,
    credits_charged INTEGER NOT NULL DEFAULT 0,
    provider_request_id TEXT,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_workspace ON public.ai_generation_jobs(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_generation_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_job_id UUID NOT NULL REFERENCES public.ai_generation_jobs(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'user-assets',
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256 VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    generation_job_id UUID NOT NULL REFERENCES public.ai_generation_jobs(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    input_units INTEGER DEFAULT 0,
    output_units INTEGER DEFAULT 0,
    provider_cost_microunits BIGINT NOT NULL DEFAULT 0, -- USD micro-dollars (e.g. $0.001237 = 1237)
    credits_charged INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics ON public.ai_usage(provider, model, created_at);

-- 9. HISTORY LOGS (Lightweight presentation view referencing ai_generation_jobs)
CREATE TABLE IF NOT EXISTS public.history_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.ai_generation_jobs(id) ON DELETE SET NULL,
    gem_id VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    prompt TEXT NOT NULL,
    result_summary JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_logs_workspace ON public.history_logs(workspace_id, created_at DESC);

-- 10. HUMAN TOUCH, SETTINGS & SALES
CREATE TABLE IF NOT EXISTS public.human_touch_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_type VARCHAR(100) NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'user-assets',
    storage_path TEXT NOT NULL,
    original_prompt TEXT NOT NULL,
    models_used VARCHAR(1000) NOT NULL DEFAULT '',
    user_comment TEXT NOT NULL,
    email_receipt VARCHAR(200) NOT NULL,
    status curation_status NOT NULL DEFAULT 'pending',
    assigned_curator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    completed_storage_path TEXT,
    completed_comment TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    team_size VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status sales_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. USER SIGNUP & ONBOARDING TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    -- 1. Create Profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

    -- 2. Assign Default Role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        NEW.id,
        CASE 
            WHEN NEW.email IN ('hardeep.pathak@gmail.com', 'avdhesh.babaria@gmail.com', 'business@writopedia.com')
            THEN 'admin'::public.system_role
            ELSE 'user'::public.system_role
        END
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Create Default Personal Workspace
    INSERT INTO public.workspaces (name, owner_id, is_personal)
    VALUES ('Personal Workspace', NEW.id, TRUE)
    RETURNING id INTO v_workspace_id;

    -- 4. Add User as Owner of Workspace
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, NEW.id, 'owner'::public.workspace_role);

    -- 5. Initialize Credit Balances with 50 Trial Credits
    INSERT INTO public.credit_balances (workspace_id, balance, held_balance, lifetime_granted, lifetime_spent)
    VALUES (v_workspace_id, 50, 0, 50, 0)
    ON CONFLICT (workspace_id) DO NOTHING;

    -- 6. Record Initial Audit Ledger Entry
    INSERT INTO public.credit_ledger (
        workspace_id, actor_user_id, amount, resulting_balance, type, reference_id, idempotency_key, description
    ) VALUES (
        v_workspace_id, NEW.id, 50, 50, 'signup_grant', 'signup_bonus', 'signup_' || NEW.id, 'Trial signup credit grant'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();
