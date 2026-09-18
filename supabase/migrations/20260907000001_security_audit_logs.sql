-- =============================================================================
-- Migration: 20260907000001_security_audit_logs.sql
-- Description: Centralized Security Audit Logging Table & Admin-Only RLS Policies
-- Database Engine: PostgreSQL 15+ (Supabase)
-- Architecture: Append-Only, Admin-Restricted Read, Default Deny Direct Mutation
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'medium',
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    resource_type VARCHAR(64),
    resource_id TEXT,
    route VARCHAR(255),
    method VARCHAR(16),
    ip VARCHAR(64),
    user_agent VARCHAR(512),
    reason TEXT,
    request_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Performance Indexes for Security Telemetry & Admin Audits
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON public.security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_workspace_id ON public.security_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON public.security_audit_logs(severity);

-- RLS Hardening:
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Revoke direct mutation from standard authenticated, anon, PUBLIC roles
-- Audit entries are inserted authoritatively by the trusted backend via service-role
REVOKE INSERT, UPDATE, DELETE ON public.security_audit_logs FROM authenticated, anon, PUBLIC;

-- Only administrators can view security audit logs. Regular tenants and anonymous users CANNOT view security logs.
DROP POLICY IF EXISTS "Admins view security audit logs" ON public.security_audit_logs;
CREATE POLICY "Admins view security audit logs" ON public.security_audit_logs
    FOR SELECT USING (private.is_admin());
