-- =============================================================================
-- Migration: 20260904000001_storage_user_assets_rls.sql
-- Description: Production Row Level Security (RLS) Policies for 'user-assets'
-- =============================================================================

-- 1. Ensure the 'user-assets' bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-assets', 'user-assets', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Allow authenticated users to UPLOAD (INSERT) files to their own folder
-- Canonical path: <userId>/<filename>
DROP POLICY IF EXISTS "Authenticated users can upload own assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'user-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow authenticated users to READ (SELECT) their own files
DROP POLICY IF EXISTS "Authenticated users can read own assets" ON storage.objects;
CREATE POLICY "Authenticated users can read own assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'user-assets' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        private.is_admin()
    )
);

-- 4. Allow authenticated users to UPDATE/OVERWRITE their own files
DROP POLICY IF EXISTS "Authenticated users can update own assets" ON storage.objects;
CREATE POLICY "Authenticated users can update own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'user-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'user-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Allow authenticated users to DELETE their own files
DROP POLICY IF EXISTS "Authenticated users can delete own assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'user-assets' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        private.is_admin()
    )
);
