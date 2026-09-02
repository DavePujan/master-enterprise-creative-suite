import React from 'react';
import { LegalPage } from '../../components/LegalPage.js';
import { PricingPage } from '../../components/PricingPage.js';
import { LandingPage } from '../../components/LandingPage.js';
import { GenerationLoader } from '../shared/components/GenerationLoader.js';
import { BrandSetup } from '../features/brand-guidelines/components/BrandSetup.js';
import { type BrandGuidelines } from '../../services/geminiService.js';

export interface AppRouterProps {
  currentPath: string;
  navigateTo: (path: string) => void;
  user: any;
  loading: boolean;
  isInitialDataLoading: boolean;
  brandSetupComplete: boolean;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  login: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string) => Promise<void>;
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
  login,
  loginWithEmail,
  registerWithEmail,
  handleLogout,
  handleBrandSetupComplete,
  children
}) => {
  if (currentPath.startsWith('/legal')) {
    return (
      <LegalPage 
        onOpenWorkspace={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        onLogin={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        navigateTo={navigateTo}
        user={user}
        brandSetupComplete={brandSetupComplete}
      />
    );
  }

  if (currentPath === '/pricing') {
    return (
      <PricingPage 
        onOpenWorkspace={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        onLogin={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        navigateTo={navigateTo}
        user={user}
        brandSetupComplete={brandSetupComplete}
        credits={credits}
        setCredits={setCredits}
      />
    );
  }

  if (currentPath === '/') {
    return (
      <LandingPage 
        navigateTo={navigateTo}
        onOpenWorkspace={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        onLogin={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
      />
    );
  }

  // Prevent flashing login or brand-init during auth loading or initial workspace data hydration
  if (loading || (user && isInitialDataLoading && (currentPath === '/workspace' || currentPath === '/brand-init'))) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <GenerationLoader title="Loading Creative Suite..." subtitle="Authenticating workspace and brand parameters" />
      </div>
    );
  }

  if (currentPath === '/login' || currentPath === '/brand-init' || !brandSetupComplete) {
    return (
      <BrandSetup 
        user={user}
        loading={loading}
        login={login}
        loginWithEmail={loginWithEmail}
        registerWithEmail={registerWithEmail}
        logout={handleLogout}
        authError={authError}
        setAuthError={setAuthError}
        currentPath={currentPath}
        navigateTo={navigateTo}
        onComplete={handleBrandSetupComplete} 
      />
    );
  }

  return <>{children}</>;
};
