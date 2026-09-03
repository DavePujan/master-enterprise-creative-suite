-- =============================================================================
-- Migration: 20260903000002_hardened_functions_and_procedures.sql
-- Description: Hardened Security Definer Functions & Concurrency-Safe Financial Stored Procedures
-- Database Engine: PostgreSQL 15+ (Supabase)
-- Architecture: Private Schema Definers, Strict Role Hierarchy, Race-Proof Idempotent Ledger Holds
-- =============================================================================

-- 1. ROLE HIERARCHY EVALUATOR
CREATE OR REPLACE FUNCTION private.get_workspace_role_level(p_role public.workspace_role)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE p_role
        WHEN 'viewer' THEN 1
        WHEN 'editor' THEN 2
        WHEN 'admin'  THEN 3
        WHEN 'owner'  THEN 4
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. SYSTEM ADMIN CHECKER
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. WORKSPACE ACCESS CHECKER WITH ROLE HIERARCHY
CREATE OR REPLACE FUNCTION private.has_workspace_access(
    p_workspace_id UUID, 
    p_required_role public.workspace_role DEFAULT 'viewer'
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_role public.workspace_role;
BEGIN
    IF private.is_admin() THEN
        RETURN TRUE;
    END IF;

    SELECT role INTO v_user_role
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN private.get_workspace_role_level(v_user_role) >= private.get_workspace_role_level(p_required_role);
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. CONCURRENCY-SAFE ATOMIC IDEMPOTENT CREDIT RESERVATION (HOLD)
CREATE OR REPLACE FUNCTION public.reserve_credits_for_ai(
    p_workspace_id UUID,
    p_user_id UUID,
    p_amount INTEGER,
    p_idempotency_key TEXT,
    p_reference_id TEXT,
    p_description TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_balance INTEGER;
    v_held INTEGER;
    v_hold_id UUID;
    v_existing_hold RECORD;
BEGIN
    -- 1. Pre-check idempotency
    SELECT id, status, amount INTO v_existing_hold
    FROM public.credit_holds
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'hold_id', v_existing_hold.id,
            'status', v_existing_hold.status,
            'amount_reserved', v_existing_hold.amount,
            'is_replay', true
        );
    END IF;

    -- 2. Lock workspace balance row for update
    SELECT balance, held_balance INTO v_balance, v_held
    FROM public.credit_balances
    WHERE workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace balance not found' USING ERRCODE = 'P0002';
    END IF;

    -- Invariant check: available_balance = balance - held_balance
    IF (v_balance - v_held) < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_CREDITS',
            'available', (v_balance - v_held),
            'required', p_amount
        );
    END IF;

    -- 3. Update held balance atomically
    UPDATE public.credit_balances
    SET held_balance = held_balance + p_amount,
        updated_at = NOW()
    WHERE workspace_id = p_workspace_id;

    -- 4. Insert hold with concurrency conflict guard
    INSERT INTO public.credit_holds (
        workspace_id, user_id, amount, idempotency_key, reference_id, description
    ) VALUES (
        p_workspace_id, p_user_id, p_amount, p_idempotency_key, p_reference_id, p_description
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_hold_id;

    -- If a concurrent transaction inserted the same idempotency_key in parallel:
    IF v_hold_id IS NULL THEN
        -- Rollback held balance addition since the conflicting transaction already accounted for it
        UPDATE public.credit_balances
        SET held_balance = held_balance - p_amount,
            updated_at = NOW()
        WHERE workspace_id = p_workspace_id;

        SELECT id, status, amount INTO v_existing_hold
        FROM public.credit_holds
        WHERE idempotency_key = p_idempotency_key;

        RETURN jsonb_build_object(
            'success', true,
            'hold_id', v_existing_hold.id,
            'status', v_existing_hold.status,
            'amount_reserved', v_existing_hold.amount,
            'is_replay', true
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'hold_id', v_hold_id,
        'amount_reserved', p_amount
    );
END;
$$ LANGUAGE plpgsql;

-- 5. CAPTURE CREDIT HOLD (AI SUCCESS -> LEDGER SETTLEMENT)
CREATE OR REPLACE FUNCTION public.capture_credit_hold(
    p_hold_id UUID,
    p_idempotency_key TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_hold RECORD;
    v_new_balance INTEGER;
    v_ledger_id UUID;
    v_existing_ledger RECORD;
BEGIN
    -- Check if already captured with this idempotency key
    SELECT id, resulting_balance INTO v_existing_ledger
    FROM public.credit_ledger
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'new_balance', v_existing_ledger.resulting_balance,
            'ledger_id', v_existing_ledger.id,
            'is_replay', true
        );
    END IF;

    SELECT * INTO v_hold
    FROM public.credit_holds
    WHERE id = p_hold_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hold record not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_hold.status = 'captured' THEN
        RETURN jsonb_build_object('success', true, 'is_replay', true);
    END IF;

    IF v_hold.status != 'pending' THEN
        RAISE EXCEPTION 'Hold is not in pending status' USING ERRCODE = '22000';
    END IF;

    -- Settle balance: subtract from total balance and release hold atomically
    UPDATE public.credit_balances
    SET balance = balance - v_hold.amount,
        held_balance = held_balance - v_hold.amount,
        lifetime_spent = lifetime_spent + v_hold.amount,
        updated_at = NOW()
    WHERE workspace_id = v_hold.workspace_id
    RETURNING balance INTO v_new_balance;

    -- Mark hold captured
    UPDATE public.credit_holds
    SET status = 'captured', updated_at = NOW()
    WHERE id = p_hold_id;

    -- Record immutable ledger debit with conflict protection
    INSERT INTO public.credit_ledger (
        workspace_id, actor_user_id, amount, resulting_balance, type, reference_id, idempotency_key, description
    ) VALUES (
        v_hold.workspace_id, v_hold.user_id, -v_hold.amount, v_new_balance, 
        'ai_generation_debit', v_hold.reference_id, p_idempotency_key, v_hold.description
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_ledger_id;

    IF v_ledger_id IS NULL THEN
        SELECT id, resulting_balance INTO v_existing_ledger
        FROM public.credit_ledger
        WHERE idempotency_key = p_idempotency_key;
        v_ledger_id := v_existing_ledger.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'ledger_id', v_ledger_id
    );
END;
$$ LANGUAGE plpgsql;

-- 6. RELEASE CREDIT HOLD (AI PROVIDER FAILURE / TIMEOUT)
CREATE OR REPLACE FUNCTION public.release_credit_hold(
    p_hold_id UUID,
    p_reason TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_hold RECORD;
BEGIN
    SELECT * INTO v_hold
    FROM public.credit_holds
    WHERE id = p_hold_id
    FOR UPDATE;

    IF NOT FOUND OR v_hold.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hold not pending or missing');
    END IF;

    -- Release held balance back to available
    UPDATE public.credit_balances
    SET held_balance = held_balance - v_hold.amount,
        updated_at = NOW()
    WHERE workspace_id = v_hold.workspace_id;

    UPDATE public.credit_holds
    SET status = 'released', updated_at = NOW()
    WHERE id = p_hold_id;

    RETURN jsonb_build_object('success', true, 'amount_released', v_hold.amount);
END;
$$ LANGUAGE plpgsql;

-- 7. CONCURRENCY-SAFE ATOMIC IDEMPOTENT CREDIT GRANT (PAYMENTS & TOPUPS)
CREATE OR REPLACE FUNCTION public.grant_credits(
    p_workspace_id UUID,
    p_actor_user_id UUID,
    p_amount INTEGER,
    p_type public.transaction_type,
    p_idempotency_key TEXT,
    p_reference_id TEXT,
    p_description TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_balance INTEGER;
    v_new_balance INTEGER;
    v_ledger_id UUID;
    v_existing RECORD;
BEGIN
    -- Idempotency check: if transaction key already exists, return existing
    SELECT id, resulting_balance INTO v_existing
    FROM public.credit_ledger
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'new_balance', v_existing.resulting_balance,
            'ledger_id', v_existing.id,
            'is_replay', true
        );
    END IF;

    SELECT balance INTO v_balance
    FROM public.credit_balances
    WHERE workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.credit_balances (workspace_id, balance, held_balance, lifetime_granted, lifetime_spent)
        VALUES (p_workspace_id, p_amount, 0, p_amount, 0);
        v_new_balance := p_amount;
    ELSE
        v_new_balance := v_balance + p_amount;
        UPDATE public.credit_balances
        SET balance = v_new_balance,
            lifetime_granted = lifetime_granted + p_amount,
            updated_at = NOW()
        WHERE workspace_id = p_workspace_id;
    END IF;

    INSERT INTO public.credit_ledger (
        workspace_id, actor_user_id, amount, resulting_balance, type, reference_id, idempotency_key, description
    ) VALUES (
        p_workspace_id, p_actor_user_id, p_amount, v_new_balance, p_type, p_reference_id, p_idempotency_key, p_description
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_ledger_id;

    IF v_ledger_id IS NULL THEN
        SELECT id, resulting_balance INTO v_existing
        FROM public.credit_ledger
        WHERE idempotency_key = p_idempotency_key;
        v_ledger_id := v_existing.id;
        v_new_balance := v_existing.resulting_balance;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'ledger_id', v_ledger_id
    );
END;
$$ LANGUAGE plpgsql;
