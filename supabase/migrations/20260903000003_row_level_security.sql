-- =============================================================================
-- Migration: 20260903000003_row_level_security.sql
-- Description: Production Row Level Security (RLS) & Database Privilege Lockdown
-- Database Engine: PostgreSQL 15+ (Supabase)
-- Architecture: Default Deny, Hierarchy-Checked Workspace Isolation, Tamper-Proof Ledgers
-- =============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL APPLICATION TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firebase_uid_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_touch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

-- 2. HARDEN PRIVILEGES: REVOKE MUTATION ON FINANCIAL & PRIVILEGE TABLES
-- Standard users (authenticated/anon) can NEVER directly INSERT, UPDATE, or DELETE financial or role data.
REVOKE INSERT, UPDATE, DELETE ON public.credit_balances FROM authenticated, anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM authenticated, anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.credit_holds FROM authenticated, anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.firebase_uid_map FROM authenticated, anon, PUBLIC;

-- 3. PROFILES POLICIES
DROP POLICY IF EXISTS "Users view own profile or admin" ON public.profiles;
CREATE POLICY "Users view own profile or admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR private.is_admin());

DROP POLICY IF EXISTS "Users update own identity fields" ON public.profiles;
CREATE POLICY "Users update own identity fields" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. USER ROLES POLICIES
DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
CREATE POLICY "Users view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id OR private.is_admin());

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
    FOR ALL USING (private.is_admin())
    WITH CHECK (private.is_admin());

-- 5. WORKSPACES POLICIES
DROP POLICY IF EXISTS "Members view workspace" ON public.workspaces;
CREATE POLICY "Members view workspace" ON public.workspaces
    FOR SELECT USING (private.has_workspace_access(id, 'viewer'));

DROP POLICY IF EXISTS "Owners update workspace" ON public.workspaces;
CREATE POLICY "Owners update workspace" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid() OR private.is_admin())
    WITH CHECK (owner_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "Authenticated create workspace" ON public.workspaces;
CREATE POLICY "Authenticated create workspace" ON public.workspaces
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 6. WORKSPACE MEMBERS POLICIES
DROP POLICY IF EXISTS "Members view membership" ON public.workspace_members;
CREATE POLICY "Members view membership" ON public.workspace_members
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Admins manage membership" ON public.workspace_members;
CREATE POLICY "Admins manage membership" ON public.workspace_members
    FOR ALL USING (private.has_workspace_access(workspace_id, 'admin'))
    WITH CHECK (private.has_workspace_access(workspace_id, 'admin'));

-- 7. FINANCIAL LEDGERS & BALANCES (READ-ONLY VIA RLS)
DROP POLICY IF EXISTS "Members view balance" ON public.credit_balances;
CREATE POLICY "Members view balance" ON public.credit_balances
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Members view holds" ON public.credit_holds;
CREATE POLICY "Members view holds" ON public.credit_holds
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Members view ledger" ON public.credit_ledger;
CREATE POLICY "Members view ledger" ON public.credit_ledger
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Admins view payments" ON public.payments;
CREATE POLICY "Admins view payments" ON public.payments
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'admin'));

-- 8. BRAND GUIDELINES POLICIES
DROP POLICY IF EXISTS "Members view brand guidelines" ON public.brand_guidelines;
CREATE POLICY "Members view brand guidelines" ON public.brand_guidelines
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Editors manage brand guidelines" ON public.brand_guidelines;
CREATE POLICY "Editors manage brand guidelines" ON public.brand_guidelines
    FOR ALL USING (private.has_workspace_access(workspace_id, 'editor'))
    WITH CHECK (private.has_workspace_access(workspace_id, 'editor'));

-- 9. ASSETS POLICIES
DROP POLICY IF EXISTS "Members view assets" ON public.assets;
CREATE POLICY "Members view assets" ON public.assets
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Editors manage assets" ON public.assets;
CREATE POLICY "Editors manage assets" ON public.assets
    FOR ALL USING (private.has_workspace_access(workspace_id, 'editor'))
    WITH CHECK (private.has_workspace_access(workspace_id, 'editor'));

-- 10. AI GENERATION JOBS & USAGE
DROP POLICY IF EXISTS "Members view ai jobs" ON public.ai_generation_jobs;
CREATE POLICY "Members view ai jobs" ON public.ai_generation_jobs
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Members view ai outputs" ON public.ai_generation_outputs;
CREATE POLICY "Members view ai outputs" ON public.ai_generation_outputs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_generation_jobs j 
            WHERE j.id = generation_job_id AND private.has_workspace_access(j.workspace_id, 'viewer')
        )
    );

DROP POLICY IF EXISTS "Admins view ai usage" ON public.ai_usage;
CREATE POLICY "Admins view ai usage" ON public.ai_usage
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'admin'));

-- 11. HISTORY LOGS POLICIES
DROP POLICY IF EXISTS "Members view history" ON public.history_logs;
CREATE POLICY "Members view history" ON public.history_logs
    FOR SELECT USING (private.has_workspace_access(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Editors insert history" ON public.history_logs;
CREATE POLICY "Editors insert history" ON public.history_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id AND private.has_workspace_access(workspace_id, 'editor'));

DROP POLICY IF EXISTS "Users delete own history" ON public.history_logs;
CREATE POLICY "Users delete own history" ON public.history_logs
    FOR DELETE USING (auth.uid() = user_id OR private.is_admin());

-- 12. HUMAN TOUCH REQUESTS POLICIES
DROP POLICY IF EXISTS "Users view own curation requests" ON public.human_touch_requests;
CREATE POLICY "Users view own curation requests" ON public.human_touch_requests
    FOR SELECT USING (auth.uid() = requester_id OR private.is_admin());

DROP POLICY IF EXISTS "Users create curation requests" ON public.human_touch_requests;
CREATE POLICY "Users create curation requests" ON public.human_touch_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Admins manage curation requests" ON public.human_touch_requests;
CREATE POLICY "Admins manage curation requests" ON public.human_touch_requests
    FOR UPDATE USING (private.is_admin())
    WITH CHECK (private.is_admin());

-- 13. ADMIN SETTINGS POLICIES
DROP POLICY IF EXISTS "Authenticated read settings" ON public.admin_settings;
CREATE POLICY "Authenticated read settings" ON public.admin_settings
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins write settings" ON public.admin_settings;
CREATE POLICY "Admins write settings" ON public.admin_settings
    FOR ALL USING (private.is_admin())
    WITH CHECK (private.is_admin());

-- 14. SALES LEADS POLICIES
DROP POLICY IF EXISTS "Public submit sales leads" ON public.sales_leads;
CREATE POLICY "Public submit sales leads" ON public.sales_leads
    FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admins view sales leads" ON public.sales_leads;
CREATE POLICY "Admins view sales leads" ON public.sales_leads
    FOR ALL USING (private.is_admin())
    WITH CHECK (private.is_admin());
