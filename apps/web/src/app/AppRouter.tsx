import React, { useEffect } from 'react';
import LegalPage from '@web/features/marketing/components/LegalPage.js';
import PricingPage from '@web/features/billing/components/PricingPage.js';
import LandingPage from '@web/features/marketing/components/LandingPage.js';
import { GenerationLoader } from '@web/shared/components/GenerationLoader.js';
import { BrandSetup } from '../features/brand-guidelines/components/BrandSetup.js';
import { VerifyEmailView } from '../features/auth/components/VerifyEmailView.js';
import { AuthCallbackView } from '../features/auth/components/AuthCallbackView.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { getAppDestination, isPublicRoute, normalizePath } from '@web/lib/navigation.js';
import { AdminConsole } from '@web/features/admin/pages/AdminConsole.js';

const isAdminUser = (user: any): boolean => {
  if (!user) return false;
  return Boolean(user.admin);
};

export interface AppRouterProps {
  currentPath: string;
  navigateTo: (path: string, options?: { replace?: boolean }) => void;
  user: any;
  loading: boolean;
  isInitialDataLoading: boolean;
  brandSetupComplete: boolean;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  unconfirmedEmail?: string | null;
  setUnconfirmedEmail?: (email: string | null) => void;
  login: (redirectTo?: string) => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<any>;
  registerWithEmail: (e: string, p: string, name?: string) => Promise<any>;
  checkVerification?: () => Promise<boolean>;
  resendVerification?: (email?: string) => Promise<{ error?: string }>;
  resetPassword?: (email: string) => Promise<{ error?: string }>;
  updatePassword?: (password: string) => Promise<{ error?: string }>;
  handleLogout: () => Promise<void>;
  handleBrandSetupComplete: (guidelines: BrandGuidelines, assets: any[]) => Promise<void>;
  children: React.ReactNode;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  currentPath,
  navigateTo,
  user,
  loading,
  isInitialDataLoading,
  brandSetupComplete,
  credits,
  setCredits,
  authError,
  setAuthError,
  unconfirmedEmail,
  setUnconfirmedEmail,
  login,
  loginWithEmail,
  registerWithEmail,
  checkVerification,
  resendVerification,
  resetPassword,
  updatePassword,
  handleLogout,
  handleBrandSetupComplete,
  children
}) => {
  // Canonical Destination Handler for all "Enter the Product" actions
  const handleEnterProduct = () => {
    const returnUrl = sessionStorage.getItem('writopedia_return_url');
    sessionStorage.removeItem('writopedia_return_url');
    if (
      returnUrl &&
      !returnUrl.startsWith('/login') &&
      !returnUrl.startsWith('/verify-email') &&
      !returnUrl.startsWith('/auth/callback') &&
      brandSetupComplete
    ) {
      navigateTo(returnUrl, { replace: true });
      return;
    }
    const destination = getAppDestination(user || { emailConfirmed: true }, brandSetupComplete);
    navigateTo(destination, { replace: true });
  };

  // Centralized Authentication, Email Verification, and Onboarding Routing Guard Authority
  useEffect(() => {
    const { pathname } = normalizePath(currentPath);
    const rawHash = typeof window !== 'undefined' ? window.location.hash : '';
    const rawSearch = typeof window !== 'undefined' ? window.location.search : '';
    const hasAuthErrorOrToken = 
      rawHash.includes('error=') || 
      rawHash.includes('error_code=') || 
      rawSearch.includes('error=') ||
      rawSearch.includes('error_code=') ||
      rawHash.includes('access_token=') ||
      rawHash.includes('type=recovery') ||
      rawSearch.includes('code=');

    // 0. If Supabase redirected an error or auth token to any path, let AuthCallbackView process it without redirection
    if (hasAuthErrorOrToken) {
      return;
    }

    // 0B. Immediate Unverified Email Guard (runs BEFORE workspace data hydration checks)
    if (user && user.emailConfirmed === false) {
      if (pathname !== '/verify-email') {
        navigateTo('/verify-email', { replace: true });
      }
      return;
    }

    // 1. While auth state or initial cloud data is resolving, NEVER redirect prematurely
    if (loading || (user && isInitialDataLoading)) {
      return;
    }

    // 2. Unauthenticated User Guard
    if (!user) {
      if (!isPublicRoute(pathname)) {
        // Safely record intended return URL for post-authentication forward
        if (pathname && !pathname.startsWith('/login') && !pathname.startsWith('/verify-email')) {
          sessionStorage.setItem('writopedia_return_url', pathname);
        }
        navigateTo('/login', { replace: true });
      }
      return;
    }

    // 3. Authenticated User Guard
    if (user) {
      // Public marketing and legal pages remain fully accessible to authenticated users
      if (pathname === '/' || pathname === '/pricing' || pathname.startsWith('/legal')) {
        return;
      }

      // Visiting /auth/callback when authenticated and verified -> Forward to workspace or stored returnUrl
      if (pathname === '/auth/callback') {
        if (hasAuthErrorOrToken) {
          return;
        }
        const returnUrl = sessionStorage.getItem('writopedia_return_url');
        sessionStorage.removeItem('writopedia_return_url');
        if (
          returnUrl &&
          !returnUrl.startsWith('/login') &&
          !returnUrl.startsWith('/verify-email') &&
          !returnUrl.startsWith('/auth/callback') &&
          brandSetupComplete
        ) {
          navigateTo(returnUrl, { replace: true });
          return;
        }
        const destination = getAppDestination(user, brandSetupComplete);
        navigateTo(destination, { replace: true });
        return;
      }

      // 3A. Authenticated but Email NOT verified -> Require Email Verification
      if (user.emailConfirmed === false) {
        if (pathname !== '/verify-email') {
          navigateTo('/verify-email', { replace: true });
        }
        return;
      }

      // 3B. Authenticated AND Verified
      const destination = getAppDestination(user, brandSetupComplete);

      // Visiting /login or /verify-email when verified -> Forward into product or stored returnUrl
      if (pathname === '/login' || pathname === '/verify-email') {
        const returnUrl = sessionStorage.getItem('writopedia_return_url');
        sessionStorage.removeItem('writopedia_return_url');
        if (
          returnUrl &&
          !returnUrl.startsWith('/login') &&
          !returnUrl.startsWith('/verify-email') &&
          brandSetupComplete
        ) {
          navigateTo(returnUrl, { replace: true });
          return;
        }
        navigateTo(destination, { replace: true });
        return;
      }

      // Visiting /brand-init when brand setup is ALREADY complete -> Forward to /workspace
      if (pathname === '/brand-init' && brandSetupComplete) {
        navigateTo('/workspace', { replace: true });
        return;
      }

      // Visiting /workspace, /history, /settings, or /assets when brand setup is NOT complete -> Forward to /brand-init
      if (
        (pathname === '/workspace' || pathname.startsWith('/history/') || pathname === '/settings' || pathname === '/assets') &&
        !brandSetupComplete &&
        !isInitialDataLoading
      ) {
        const cached = localStorage.getItem('brandSetupComplete');
        if (cached !== 'true') {
          navigateTo('/brand-init', { replace: true });
          return;
        }
      }

      // Visiting /admin routes -> Enforce admin role authorization
      if (pathname.startsWith('/admin')) {
        if (!isAdminUser(user)) {
          navigateTo('/workspace', { replace: true });
        }
        return;
      }
    }
  }, [
    user?.uid,
    user?.emailConfirmed,
    user?.admin,
    user?.email,
    loading,
    isInitialDataLoading,
    brandSetupComplete,
    currentPath,
    navigateTo
  ]);

  const { pathname } = normalizePath(currentPath);
  const rawHash = typeof window !== 'undefined' ? window.location.hash : '';
  const rawSearch = typeof window !== 'undefined' ? window.location.search : '';
  const hasAuthErrorOrToken = 
    rawHash.includes('error=') || 
    rawHash.includes('error_code=') || 
    rawSearch.includes('error=') ||
    rawSearch.includes('error_code=') ||
    rawHash.includes('access_token=') ||
    rawHash.includes('type=recovery') ||
    rawSearch.includes('code=');

  // If Supabase redirected an auth error, recovery, or token to root '/' or any path, render AuthCallbackView
  if (pathname === '/auth/callback' || hasAuthErrorOrToken) {
    return (
      <AuthCallbackView
        checkVerification={checkVerification || (async () => false)}
        resendVerification={resendVerification || (async () => ({}))}
        updatePassword={updatePassword || (async () => ({}))}
        unconfirmedEmail={unconfirmedEmail}
        onSuccess={handleEnterProduct}
        navigateTo={navigateTo}
      />
    );
  }

  if (pathname.startsWith('/legal')) {
    return (
      <LegalPage 
        onOpenWorkspace={handleEnterProduct}
        onLogin={handleEnterProduct}
        navigateTo={navigateTo}
        user={user}
        brandSetupComplete={brandSetupComplete}
      />
    );
  }

  if (pathname === '/pricing') {
    return (
      <PricingPage 
        onOpenWorkspace={handleEnterProduct}
        onLogin={handleEnterProduct}
        navigateTo={navigateTo}
        user={user}
        brandSetupComplete={brandSetupComplete}
        credits={credits}
        setCredits={setCredits}
      />
    );
  }

  if (pathname === '/') {
    return (
      <LandingPage 
        navigateTo={navigateTo}
        onOpenWorkspace={handleEnterProduct}
        onLogin={handleEnterProduct}
        user={user}
        credits={credits}
      />
    );
  }

  if (pathname === '/verify-email') {
    return (
      <VerifyEmailView
        unconfirmedEmail={unconfirmedEmail}
        userEmail={user?.email}
        checkVerification={checkVerification || (async () => false)}
        resendVerification={resendVerification || (async () => ({}))}
        logout={handleLogout}
        onVerified={handleEnterProduct}
        navigateTo={navigateTo}
      />
    );
  }

  if (pathname.startsWith('/admin')) {
    if (loading) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#090d16] text-slate-100">
          <GenerationLoader title="Writopedia Operations Console" subtitle="Authenticating administrator credentials..." />
        </div>
      );
    }
    if (!isAdminUser(user)) {
      return null;
    }
    return (
      <AdminConsole
        currentPath={currentPath}
        navigateTo={navigateTo}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // Prevent flashing login or brand-init during auth loading or initial workspace data hydration
  if (loading || (user && isInitialDataLoading && user.emailConfirmed !== false)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <GenerationLoader title="Loading Creative Suite..." subtitle="Authenticating workspace and brand parameters" />
      </div>
    );
  }

  if (pathname === '/login' || pathname === '/brand-init' || !brandSetupComplete) {
    return (
      <BrandSetup 
        user={user}
        loading={loading}
        login={login}
        loginWithEmail={loginWithEmail}
        registerWithEmail={registerWithEmail}
        resetPassword={resetPassword}
        logout={handleLogout}
        authError={authError}
        setAuthError={setAuthError}
        currentPath={user && !brandSetupComplete ? '/brand-init' : pathname}
        navigateTo={navigateTo}
        onComplete={handleBrandSetupComplete} 
      />
    );
  }

  return <>{children}</>;
};

export default AppRouter;

