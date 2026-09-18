import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { savePreferences, loadPreferences, resolveIsDark, applyThemeToDocument } from '@web/lib/preferences.js';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { GENERIC_GEMS } from '@web/infrastructure/ai/modelRegistry.js';
import { 
  subscribeUserHistory, 
  addUserHistoryItem, 
  deleteHistoryItem 
} from '../infrastructure/repositories/historyRepository.js';
import { 
  subscribeUserAssets, 
  saveUserAsset 
} from '../infrastructure/repositories/assetRepository.js';
import { 
  subscribeBrandGuidelines, 
  saveBrandGuidelines 
} from '../infrastructure/repositories/brandRepository.js';
import { 
  subscribeUserAccount 
} from '../infrastructure/repositories/userRepository.js';
import { 
  submitHumanTouchRequest, 
  subscribeHumanTouchQueue 
} from '../infrastructure/repositories/humanTouchRepository.js';
import { useCanvasEditor } from '../features/canvas/hooks/useCanvasEditor.js';
import { useCreativeExecution } from '../features/creative/hooks/useCreativeExecution.js';
import { AppRouter } from './AppRouter.js';
import { AppShell } from './AppShell.js';
import { type HistoryItem } from '../features/layout/components/AppSidebar.js';
import { CreditGateProvider } from '../features/billing/context/CreditGateContext.js';
import { z } from 'zod';
import { safeGetItem, safeGetValidatedItem, safeSetItem, sanitizeHistory, HistoryItemSchema } from '../lib/storage.js';
import { normalizePath } from '../lib/navigation.js';

const AppBrandGuidelinesSchema = z.object({
  name: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  tone: z.string().max(500).optional(),
  pillars: z.array(z.string().max(200)).optional(),
  colors: z.array(z.string().max(50)).optional(),
  typography: z.record(z.string()).optional(),
  logo: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  voiceAccentStyle: z.string().max(200).optional(),
  visualEthnicityStyle: z.string().max(200).optional(),
}).passthrough();

export function App() {
  const {
    user,
    loading,
    logout,
    login,
    loginWithEmail,
    registerWithEmail,
    unconfirmedEmail,
    setUnconfirmedEmail,
    checkVerification,
    resendVerification,
    resetPassword,
    updatePassword,
  } = useAuth();
  
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window === 'undefined') return '/';
    return normalizePath(window.location.pathname + window.location.search + window.location.hash).pathname;
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // Core App State - Runtime validated from localStorage
  const [brandSetupComplete, setBrandSetupComplete] = useState<boolean>(() => {
    return safeGetValidatedItem('brandSetupComplete', z.boolean(), false);
  });

  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines>(() => {
    return safeGetValidatedItem('brandGuidelines', AppBrandGuidelinesSchema, {
      name: 'Studio AI',
      industry: 'Creative Technology',
      tone: 'Professional & Innovative',
      pillars: ['Innovation', 'Creativity', 'Efficiency'],
      colors: ['#0f172a', '#334155'],
      typography: { primary: 'Outfit', secondary: 'Inter' },
      logo: '',
      location: 'India',
      voiceAccentStyle: 'Indian English',
      visualEthnicityStyle: 'Indian'
    }) as BrandGuidelines;
  });

  const [editingGuidelines, setEditingGuidelines] = useState<BrandGuidelines>(brandGuidelines);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [credits, setCredits] = useState<number>(() => {
    const saved = safeGetValidatedItem(
      'studio_credits',
      z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
      50
    );
    return typeof saved === 'number' ? saved : 50;
  });

  const [selectedGem, setSelectedGem] = useState<Gem>(() => {
    const savedGemId = safeGetValidatedItem('active_selected_gem_id', z.string().max(100), '');
    if (savedGemId) {
      const found = GENERIC_GEMS.find(g => g.id === savedGemId);
      if (found) return found;
    }
    return GENERIC_GEMS[0];
  });

  const [view, setView] = useState<'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup'>(() => {
    const ViewSchema = z.enum(['tools', 'assets', 'plan', 'admin', 'curation', 'topup']);
    return safeGetValidatedItem('active_workspace_view', ViewSchema, 'tools');
  });

  // Persist view and selected tool across page refreshes
  useEffect(() => {
    if (view) {
      safeSetItem('active_workspace_view', view);
    }
  }, [view]);

  useEffect(() => {
    if (selectedGem?.id) {
      safeSetItem('active_selected_gem_id', selectedGem.id);
    }
  }, [selectedGem?.id]);

  const [sidebarOpen, setSidebarOpen] = useState(() => loadPreferences().sidebarOpen);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => loadPreferences().theme || 'system');
  const [isDarkMode, setIsDarkMode] = useState(() => resolveIsDark(loadPreferences().theme || 'system'));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);
  const isInitialDataLoadedRef = useRef(false);

  // Creative Preference Toggle
  const [bakeLogoOnGeneration, setBakeLogoOnGeneration] = useState(() => loadPreferences().bakeLogoOnGeneration);

  // Asset & History Persistence
  const [assets, setAssets] = useState<any[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = safeGetValidatedItem('creative_history', z.array(HistoryItemSchema), []);
    return Array.isArray(saved) ? sanitizeHistory(saved as any, 20) : [];
  });

  // Curation & Human Touch State
  const [userCurationRequests, setUserCurationRequests] = useState<any[]>([]);
  const [adminCurationRequests, setAdminCurationRequests] = useState<any[]>([]);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [selectedCurationRequestId, setSelectedCurationRequestId] = useState<string | null>(null);
  const [selectedAdminRequestId, setSelectedAdminRequestId] = useState<string | null>(null);
  const [humanTouchItem, setHumanTouchItem] = useState<any | null>(null);
  const [humanTouchComment, setHumanTouchComment] = useState('');
  const [humanTouchSubmitting, setHumanTouchSubmitting] = useState(false);
  const [humanTouchSuccessMsg, setHumanTouchSuccessMsg] = useState<string | null>(null);

  // Initialize Canvas Editor Hook
  const canvasEditor = useCanvasEditor(
    brandGuidelines,
    async (name, dataUrl, type) => {
      await saveAsset({
        id: `asset-${Date.now()}`,
        name,
        data: dataUrl,
        type
      });
    },
    ''
  );

  // Initialize Creative Execution Hook
  const creativeExecution = useCreativeExecution({
    user,
    selectedGem,
    brandGuidelines,
    credits,
    setCredits,
    assets,
    bakeLogoOnGeneration,
    saveAsset: async (name, dataUrl, type) => {
      await saveAsset({
        id: `asset-${Date.now()}`,
        name,
        data: dataUrl,
        type
      });
    },
    addToHistory: async (res, specificGemId, specificPrompt) => {
      const entry: HistoryItem = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        gemId: specificGemId || selectedGem.id,
        prompt: specificPrompt || creativeExecution.prompt,
        result: res,
        timestamp: Date.now()
      };
      setHistory(prev => [entry, ...prev].slice(0, 50));
      if (user) {
        try {
          await addUserHistoryItem(user.uid, entry.id, entry);
        } catch (e) {
          console.error("Failed to sync history item to cloud:", e);
        }
      }
    }
  });

  // Theme & Dark Mode Sync with OS media query listener
  useEffect(() => {
    const dark = resolveIsDark(theme);
    setIsDarkMode(dark);
    applyThemeToDocument(dark);

    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMediaChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        applyThemeToDocument(e.matches);
      };
      mql.addEventListener('change', handleMediaChange);
      return () => mql.removeEventListener('change', handleMediaChange);
    }
  }, [theme]);

  // Handle URL Routing Changes with canonical normalization and replace option
  const navigateTo = (path: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    const { pathname, hash } = normalizePath(path);
    setCurrentPath(pathname);

    if (hash) {
      // Trigger hashchange event for components listening to anchor navigation
      setTimeout(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 0);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const { pathname, hash } = normalizePath(window.location.pathname + window.location.search + window.location.hash);
      setCurrentPath(pathname);
      if (hash) {
        setTimeout(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }, 0);
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Sync Preferences to LocalStorage safely with quota protection
  useEffect(() => {
    safeSetItem('brandSetupComplete', brandSetupComplete);
    safeSetItem('brandGuidelines', brandGuidelines);
    safeSetItem('studio_credits', credits.toString());
    safeSetItem('creative_history', history);
  }, [brandSetupComplete, brandGuidelines, credits, history]);

  // Real-time Subscriptions to Cloud Repositories when User is Authenticated
  useEffect(() => {
    if (!user?.uid || user.emailConfirmed === false) {
      isInitialDataLoadedRef.current = false;
      setIsInitialDataLoading(false);
      return;
    }

    // Only set initial data loading flag if we haven't already loaded for this user
    if (!isInitialDataLoadedRef.current) {
      setIsInitialDataLoading(true);
    }

    // 1. Subscribe to User History
    const unsubHistory = subscribeUserHistory(user.uid, (items) => {
      if (items && items.length > 0) {
        setHistory(items);
      }
    });

    // 2. Subscribe to User Assets
    const unsubAssets = subscribeUserAssets(user.uid, (loadedAssets) => {
      if (loadedAssets && loadedAssets.length > 0) {
        setAssets(loadedAssets);
      }
    });

    // 3. Subscribe to User Account (Credits / Balance)
    const unsubAccount = subscribeUserAccount(user.uid, (accountData) => {
      if (accountData?.balance !== undefined) {
        setCredits(accountData.balance);
      }
    });

    // 4. Subscribe to Brand Guidelines with explicit exist/missing/error distinction
    const unsubBrand = subscribeBrandGuidelines(
      user.uid,
      'default',
      (cloudGuidelines) => {
        if (cloudGuidelines) {
          setBrandGuidelines(cloudGuidelines as BrandGuidelines);
          setBrandSetupComplete(true);
          savePreferences({ brandGuidelines: cloudGuidelines, brandSetupComplete: true });
        } else if (!isInitialDataLoadedRef.current) {
          setBrandSetupComplete(false);
          savePreferences({ brandGuidelines: null, brandSetupComplete: false });
        }
        setIsInitialDataLoading(false);
        isInitialDataLoadedRef.current = true;
      },
      (err) => {
        console.warn("[App] Failed to read brand guidelines:", err);
        setIsInitialDataLoading(false);
        isInitialDataLoadedRef.current = true;
      }
    );

    // 5. Subscribe to Human Touch Queue
    // All authenticated users subscribe to their workspace queue so Curation Inbox & notifications stay fresh
    const unsubUserQueue = subscribeHumanTouchQueue(
      (queue) => {
        setUserCurationRequests((prev) => {
          if (prev.length > 0) {
            queue.forEach((newReq) => {
              const oldReq = prev.find((p) => p.id === newReq.id);
              if (oldReq && oldReq.status !== newReq.status) {
                setUserNotifications((notifs) => [
                  {
                    id: `notif-${Date.now()}-${newReq.id}`,
                    status: newReq.status,
                    assetType: newReq.assetType,
                    completedComment: newReq.completedComment,
                    timestamp: Date.now(),
                    read: false,
                  },
                  ...notifs,
                ]);
              }
            });
          }
          return queue;
        });
      },
      undefined,
      { scope: 'workspace', intervalMs: 8000 }
    );

    // If Admin user, also subscribe to the global operational desk queue
    let unsubAdminQueue = () => {};
    const isAdmin = Boolean(user && (user as any).admin);
    if (isAdmin) {
      unsubAdminQueue = subscribeHumanTouchQueue(
        (queue) => {
          setAdminCurationRequests(queue);
        },
        undefined,
        { scope: 'all', intervalMs: 8000 }
      );
    }

    return () => {
      unsubHistory();
      unsubAssets();
      unsubAccount();
      unsubBrand();
      unsubUserQueue();
      unsubAdminQueue();
    };
  }, [user?.uid, user?.emailConfirmed]);

  // History Actions
  const handleSelectGem = (gem: Gem) => {
    setSelectedGem(gem);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    const gem = GENERIC_GEMS.find(g => g.id === item.gemId);
    if (gem) {
      setSelectedGem(gem);
      creativeExecution.setGemResult(item.gemId, item.result);
      creativeExecution.setGemPrompt(item.gemId, item.prompt);
    }
    setView('tools');
  };

  const handleOpenAssetInStudio = (asset: any) => {
    // 1. Determine target Gem based on asset type
    let targetGemId = 'standard-image';
    if (asset.type === 'video') {
      targetGemId = 'cinematic-video';
    } else if (asset.type === 'audio') {
      targetGemId = 'audio-studio';
    } else if (asset.type === 'doc') {
      targetGemId = 'strategy-captions';
    } else if (asset.type === 'image') {
      targetGemId = 'standard-image';
    }

    const gem = GENERIC_GEMS.find(g => g.id === targetGemId) || GENERIC_GEMS[3];
    setSelectedGem(gem);

    // 2. Set the creative result so canvas/player immediately displays it
    creativeExecution.setGemResult(gem.id, asset.data);
    creativeExecution.setResult(asset.data);

    // 3. Set the prompt if available
    const cleanPrompt = asset.prompt || (asset.name ? asset.name.replace(/^(Layout|Render|Video|Story|Voiceover):\s*/i, '') : '');
    creativeExecution.setGemPrompt(gem.id, cleanPrompt);
    creativeExecution.setPrompt(cleanPrompt);

    // 4. Reset text layers if switching canvas
    canvasEditor.setTextLayers([]);

    // 5. Switch view to tools and navigate to /workspace
    setView('tools');
    navigateTo('/workspace');
  };

  const handleUseAssetInDestination = (
    asset: any,
    destination: { gemId: string; roleId: string; roleName: string }
  ) => {
    const targetGem = GENERIC_GEMS.find((g) => g.id === destination.gemId);
    if (!targetGem) return;

    // 1. Prepare asset payload matching the slot schema
    const assetPayload = {
      id: asset.id,
      name: asset.name,
      data: asset.data
    };

    // 2. Mark this asset as selected in library so downstream selection stays in sync
    setAssets((prev) =>
      prev.map((a) => (a.id === asset.id ? { ...a, selected: true } : a))
    );

    // 3. Update target gem's specific state slice
    switch (destination.roleId) {
      case 'product':
      case 'product_shot':
      case 'product_theme':
      case 'story_ref':
        creativeExecution.updateGemState(targetGem.id, { productContext: assetPayload });
        break;

      case 'face':
      case 'character_face':
        creativeExecution.updateGemState(targetGem.id, { faceContext: assetPayload });
        break;

      case 'ingredient':
        creativeExecution.updateGemState(targetGem.id, (prev) => ({
          ingredientsContexts: [
            ...prev.ingredientsContexts.filter((item) => item.id !== asset.id),
            assetPayload
          ].slice(0, 3)
        }));
        break;

      case 'first_frame':
        creativeExecution.updateGemState(targetGem.id, { firstFrameContext: assetPayload });
        break;

      case 'last_frame':
        creativeExecution.updateGemState(targetGem.id, { lastFrameContext: assetPayload });
        break;

      case 'general_ref':
        creativeExecution.updateGemState(targetGem.id, (prev) => ({
          videoReferences: [
            ...prev.videoReferences.filter((item) => item.id !== asset.id),
            { ...assetPayload, role: 'subject', type: 'image' }
          ].slice(0, 3)
        }));
        break;

      case 'video_guide':
        creativeExecution.updateGemState(targetGem.id, (prev) => ({
          videoReferences: [
            ...prev.videoReferences.filter((item) => item.id !== asset.id),
            { ...assetPayload, role: 'motion', type: 'video' }
          ].slice(0, 3)
        }));
        break;

      case 'audio_track':
        creativeExecution.updateGemState(targetGem.id, (prev) => ({
          videoReferences: [
            ...prev.videoReferences.filter((item) => item.id !== asset.id),
            { ...assetPayload, role: 'audio_guide', type: 'audio' }
          ].slice(0, 3)
        }));
        break;

      case 'visual_context':
      case 'text_context':
      case 'campaign_brief':
      case 'script_source':
      default:
        // Multimodal / text reference context attaches to canonical selectedAssets
        break;
    }

    // 4. Select the target gem
    setSelectedGem(targetGem);

    // 5. Switch view to tools and navigate to workspace
    setView('tools');
    navigateTo('/workspace');
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (user) {
      try {
        await deleteHistoryItem(user.uid, id);
      } catch (err) {
        console.error("Failed to delete history item from cloud:", err);
      }
    }
  };

  const handleClearHistory = async () => {
    setHistory([]);
  };

  const saveAsset = async (asset: any) => {
    setAssets(prev => [asset, ...prev]);
    if (user) {
      try {
        await saveUserAsset(user.uid, asset.id || `asset-${Date.now()}`, asset.name, asset.data, asset.type || 'image');
      } catch (e) {
        console.error("Failed to sync asset to cloud:", e);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      isInitialDataLoadedRef.current = false;
      setBrandSetupComplete(false);
      savePreferences({ brandGuidelines: null, brandSetupComplete: false });
      creativeExecution.setResult(null);
      setHistory([]);
      setAssets([]);
      canvasEditor.setTextLayers([]);
      canvasEditor.setSelectedTextWordId(null);
      canvasEditor.setDraggingTextWordId(null);
      setCredits(50);
      setBrandGuidelines({
        name: 'Studio AI',
        industry: 'Creative Technology',
        tone: 'Professional & Innovative',
        pillars: ['Innovation', 'Creativity', 'Efficiency'],
        colors: ['#0f172a', '#334155'],
        typography: { primary: 'Outfit', secondary: 'Inter' },
        logo: '',
        location: 'India',
        voiceAccentStyle: 'Indian English',
        visualEthnicityStyle: 'Indian'
      });
      setShowGuidelines(false);
      setShowAssetLibrary(false);
      navigateTo('/');
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const handleSaveBrandGuidelines = async (newGuidelines?: BrandGuidelines) => {
    const target = newGuidelines || editingGuidelines;
    setBrandGuidelines(target);
    setEditingGuidelines(target);
    setShowGuidelines(false);
    savePreferences({ brandGuidelines: target });
    if (user) {
      setIsSyncing(true);
      try {
        await saveBrandGuidelines(user.uid, target, 'default');
      } catch (e) {
        console.error("Failed to sync brand guidelines to cloud:", e);
        throw e;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleWipeBrandParameters = async () => {
    const defaultGuidelines: BrandGuidelines = {
      name: 'Studio AI',
      industry: 'Creative Technology',
      tone: 'Professional & Innovative',
      pillars: ['Innovation', 'Creativity', 'Efficiency'],
      colors: ['#0f172a', '#334155'],
      typography: { primary: 'Outfit', secondary: 'Inter' },
      logo: '',
      location: 'India',
      voiceAccentStyle: 'Indian English',
      visualEthnicityStyle: 'Indian'
    };
    setBrandGuidelines(defaultGuidelines);
    setEditingGuidelines(defaultGuidelines);
    setBrandSetupComplete(false);
    savePreferences({ brandGuidelines: null, brandSetupComplete: false });
    setShowGuidelines(false);
    navigateTo('/brand-init');
  };

  const handleSubmitHumanTouch = async () => {
    if (!user || !humanTouchItem) return;
    try {
      setHumanTouchSubmitting(true);
      setHumanTouchSuccessMsg(null);
      const reqId = `touch-${Date.now()}`;
      await submitHumanTouchRequest(reqId, {
        userId: user.uid,
        userEmail: user.email || 'Anonymous',
        emailReceipt: user.email || 'Anonymous',
        assetType: humanTouchItem.role || 'image',
        assetUrl: humanTouchItem.imageUrl || '',
        originalPrompt: humanTouchItem.prompt || '',
        modelsUsed: humanTouchItem.modelsUsed || 'Writopedia Production Model',
        userComment: humanTouchComment || '',
        status: 'pending',
        timestamp: Date.now()
      });

      setHumanTouchSuccessMsg('Human Touch request sent. Your request is now in the curation queue.');
      setTimeout(() => {
        setHumanTouchItem(null);
        setHumanTouchComment('');
        setHumanTouchSuccessMsg(null);
      }, 2200);
    } catch (e: any) {
      console.error("Failed to submit human touch curation request:", e);
      throw e;
    } finally {
      setHumanTouchSubmitting(false);
    }
  };

  const handleBrandSetupComplete = async (guidelines: BrandGuidelines, initialAssets: any[]) => {
    if (!user) {
      setAuthError("Authentication required to save your brand parameters.");
      return;
    }

    setIsSyncing(true);
    try {
      await saveBrandGuidelines(user.uid, guidelines, 'default');
      await Promise.all(
        initialAssets.map(a => saveUserAsset(user.uid, a.id || `init-asset-${Date.now()}`, a.name, a.data, a.type || 'image'))
      );

      isInitialDataLoadedRef.current = true;
      setBrandGuidelines(guidelines);
      setAssets(initialAssets);
      setBrandSetupComplete(true);
      savePreferences({ brandGuidelines: guidelines, brandSetupComplete: true });
      navigateTo('/workspace');
    } catch (e: any) {
      console.error("Failed to save initial brand kit to cloud:", e);
      setAuthError(e?.message || "Failed to persist brand kit to cloud database. Please retry.");
      setBrandGuidelines(guidelines);
      setAssets(initialAssets);
    } finally {
      setIsSyncing(false);
    }
  };



  return (
    <AppRouter
      currentPath={currentPath}
      navigateTo={navigateTo}
      user={user}
      loading={loading}
      isInitialDataLoading={isInitialDataLoading}
      brandSetupComplete={brandSetupComplete}
      credits={credits}
      setCredits={setCredits}
      authError={authError}
      setAuthError={setAuthError}
      unconfirmedEmail={unconfirmedEmail}
      setUnconfirmedEmail={setUnconfirmedEmail}
      login={login}
      loginWithEmail={loginWithEmail}
      registerWithEmail={registerWithEmail}
      checkVerification={checkVerification}
      resendVerification={resendVerification}
      resetPassword={resetPassword}
      updatePassword={updatePassword}
      handleLogout={handleLogout}
      handleBrandSetupComplete={handleBrandSetupComplete}
    >
      <CreditGateProvider
        activeGemId={selectedGem?.id}
        currentView={view}
        setView={setView}
        credits={credits}
        setCredits={setCredits}
      >
        <AppShell 
          currentPath={currentPath}
          theme={theme}
          setTheme={(t) => {
            setTheme(t);
            savePreferences({ theme: t });
          }}
          onSaveBrandGuidelines={handleSaveBrandGuidelines}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          brandGuidelines={brandGuidelines}
          setBrandGuidelines={setBrandGuidelines}
          editingGuidelines={editingGuidelines}
          setEditingGuidelines={setEditingGuidelines}
          showGuidelines={showGuidelines}
        setShowGuidelines={setShowGuidelines}
        showAssetLibrary={showAssetLibrary}
        setShowAssetLibrary={setShowAssetLibrary}
        credits={credits}
        setCredits={setCredits}
        selectedGem={selectedGem}
        setSelectedGem={handleSelectGem}
        view={view}
        setView={setView}
        isDarkMode={isDarkMode}
        setIsDarkMode={(dark) => {
          setIsDarkMode(dark);
          const newTheme = dark ? 'dark' : 'light';
          setTheme(newTheme);
          savePreferences({ theme: newTheme });
        }}
        user={user}
        userNotifications={userNotifications}
        setUserNotifications={setUserNotifications}
        adminNotifications={adminNotifications}
        setAdminNotifications={setAdminNotifications}
        userCurationRequests={userCurationRequests}
        adminCurationRequests={adminCurationRequests}
        selectedCurationRequestId={selectedCurationRequestId}
        setSelectedCurationRequestId={setSelectedCurationRequestId}
        selectedAdminRequestId={selectedAdminRequestId}
        setSelectedAdminRequestId={setSelectedAdminRequestId}
        history={history}
        onSelectHistoryItem={handleSelectHistoryItem}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearHistory={handleClearHistory}
        isSyncing={isSyncing}
        setIsSyncing={setIsSyncing}
        assets={assets}
        setAssets={setAssets}
        saveAsset={saveAsset}
        onOpenAssetInStudio={handleOpenAssetInStudio}
        onUseAssetInDestination={handleUseAssetInDestination}
        addToHistory={async (entry) => {
          setHistory(prev => [entry, ...prev].slice(0, 50));
          if (user) {
            try {
              await addUserHistoryItem(user.uid, entry.id, entry);
            } catch (e) {
              console.error("Failed to sync history item to cloud:", e);
            }
          }
        }}
        navigateTo={navigateTo}
        handleLogout={handleLogout}
        // Creative State & Props
        // Creative State & Props (isolated per gem)
        aspectRatio={creativeExecution.aspectRatio}
        setAspectRatio={creativeExecution.setAspectRatio}
        selectedModel={creativeExecution.selectedModel}
        setSelectedModel={creativeExecution.setSelectedModel}
        videoShotType={creativeExecution.videoShotType}
        setVideoShotType={creativeExecution.setVideoShotType}
        videoDuration={creativeExecution.videoDuration}
        setVideoDuration={creativeExecution.setVideoDuration}
        videoResolution={creativeExecution.videoResolution}
        setVideoResolution={creativeExecution.setVideoResolution}
        videoAudioIntent={creativeExecution.videoAudioIntent}
        setVideoAudioIntent={creativeExecution.setVideoAudioIntent}
        videoNativeAudio={creativeExecution.videoNativeAudio}
        setVideoNativeAudio={creativeExecution.setVideoNativeAudio}
        videoReferences={creativeExecution.videoReferences}
        setVideoReferences={creativeExecution.setVideoReferences}
        klingElements={creativeExecution.klingElements}
        setKlingElements={creativeExecution.setKlingElements}
        imageStyle={creativeExecution.imageStyle}
        setImageStyle={creativeExecution.setImageStyle}
        bakeLogoOnGeneration={bakeLogoOnGeneration}
        setBakeLogoOnGeneration={setBakeLogoOnGeneration}
        voiceEmotion={creativeExecution.voiceEmotion}
        setVoiceEmotion={creativeExecution.setVoiceEmotion}
        result={creativeExecution.result}
        setResult={creativeExecution.setResult}
        isGenerating={creativeExecution.isGenerating}
        videoStatus={creativeExecution.videoStatus}
        prompt={creativeExecution.prompt}
        setPrompt={creativeExecution.setPrompt}
        selectedLanguage={creativeExecution.selectedLanguage}
        setSelectedLanguage={creativeExecution.setSelectedLanguage}
        selectedVoice={creativeExecution.selectedVoice}
        setSelectedVoice={creativeExecution.setSelectedVoice}
        audioGenerationType={creativeExecution.audioGenerationType}
        setAudioGenerationType={creativeExecution.setAudioGenerationType}
        musicMode={creativeExecution.musicMode}
        setMusicMode={creativeExecution.setMusicMode}
        musicGenre={creativeExecution.musicGenre}
        setMusicGenre={creativeExecution.setMusicGenre}
        musicMood={creativeExecution.musicMood}
        setMusicMood={creativeExecution.setMusicMood}
        speakerMode={creativeExecution.speakerMode}
        setSpeakerMode={creativeExecution.setSpeakerMode}
        speakerTwoVoice={creativeExecution.speakerTwoVoice}
        setSpeakerTwoVoice={creativeExecution.setSpeakerTwoVoice}
        isGeneratingCreativePrompt={creativeExecution.isGeneratingCreativePrompt}
        setIsGeneratingCreativePrompt={creativeExecution.setIsGeneratingCreativePrompt}
        productContext={creativeExecution.productContext}
        setProductContext={creativeExecution.setProductContext}
        faceContext={creativeExecution.faceContext}
        setFaceContext={creativeExecution.setFaceContext}
        firstFrameContext={creativeExecution.firstFrameContext}
        setFirstFrameContext={creativeExecution.setFirstFrameContext}
        lastFrameContext={creativeExecution.lastFrameContext}
        setLastFrameContext={creativeExecution.setLastFrameContext}
        ingredientsContexts={creativeExecution.ingredientsContexts}
        setIngredientsContexts={creativeExecution.setIngredientsContexts}
        selectedPresentationTheme={creativeExecution.selectedPresentationTheme}
        setSelectedPresentationTheme={creativeExecution.setSelectedPresentationTheme}
        generatingGemIds={creativeExecution.generatingGemIds}
        // Canvas State & Handlers
        containerRef={canvasEditor.containerRef}
        logoPosition={canvasEditor.logoPosition}
        setLogoPosition={canvasEditor.setLogoPosition}
        logoScale={canvasEditor.logoScale}
        setLogoScale={canvasEditor.setLogoScale}
        logoInverted={canvasEditor.logoInverted}
        setLogoInverted={canvasEditor.setLogoInverted}
        isDraggingLogo={canvasEditor.isDraggingLogo}
        handleLogoMouseDown={canvasEditor.handleLogoMouseDown}
        handleLogoTouchStart={canvasEditor.handleLogoTouchStart}
        textLayers={canvasEditor.textLayers}
        setTextLayers={canvasEditor.setTextLayers}
        selectedTextWordId={canvasEditor.selectedTextWordId}
        setSelectedTextWordId={canvasEditor.setSelectedTextWordId}
        draggingTextWordId={canvasEditor.draggingTextWordId}
        newTextWordInput={canvasEditor.newTextWordInput}
        setNewTextWordInput={canvasEditor.setNewTextWordInput}
        layoutStudioTab={canvasEditor.layoutStudioTab}
        setLayoutStudioTab={canvasEditor.setLayoutStudioTab}
        handleTextMouseDown={canvasEditor.handleTextMouseDown}
        handleTextTouchStart={canvasEditor.handleTextTouchStart}
        handleAddTextWord={canvasEditor.handleAddTextWord}
        handleContainerMouseMove={canvasEditor.handleContainerMouseMove}
        handleContainerTouchMove={canvasEditor.handleContainerTouchMove}
        handleContainerTouchEnd={canvasEditor.handleContainerTouchEnd}
        handleDownloadInteractiveImage={canvasEditor.handleDownloadInteractiveImage}
        // Audio & TTS
        isPlaying={creativeExecution.isPlaying}
        isTTSLoading={creativeExecution.isTTSLoading}
        audioProgress={creativeExecution.audioProgress}
        audioDuration={creativeExecution.audioDuration}
        audioVolume={creativeExecution.audioVolume}
        setAudioVolume={creativeExecution.setAudioVolume}
        audioUrl={creativeExecution.audioUrl}
        handleTTS={creativeExecution.handleTTS}
        handleDownloadAudio={creativeExecution.handleDownloadAudio}
        ttsError={creativeExecution.ttsError}
        setTtsError={creativeExecution.setTtsError}
        // Slideshow
        currentSlide={creativeExecution.currentSlide}
        setCurrentSlide={creativeExecution.setCurrentSlide}
        slideshowTheme={creativeExecution.slideshowTheme}
        setSlideshowTheme={creativeExecution.setSlideshowTheme}
        slideshowFont={creativeExecution.slideshowFont}
        setSlideshowFont={creativeExecution.setSlideshowFont}
        slideshowOverlay={creativeExecution.slideshowOverlay}
        setSlideshowOverlay={creativeExecution.setSlideshowOverlay}
        handleDownloadPDF={creativeExecution.handleDownloadPDF}
        isDownloadingPDF={creativeExecution.isDownloadingPDF}
        // Storyline
        isDownloadingZip={creativeExecution.isDownloadingZip}
        handleDownloadStorylineZip={creativeExecution.handleDownloadStorylineZip}
        // Modals & Warnings
        softWarning={creativeExecution.softWarning}
        setSoftWarning={creativeExecution.setSoftWarning}
        isRefineModalOpen={creativeExecution.isRefineModalOpen}
        setIsRefineModalOpen={creativeExecution.setIsRefineModalOpen}
        refinePrompt={creativeExecution.refinePrompt}
        setRefinePrompt={creativeExecution.setRefinePrompt}
        isRefining={creativeExecution.isRefining}
        handleRefineWithAI={creativeExecution.handleRefineWithAI}
        humanTouchItem={humanTouchItem}
        setHumanTouchItem={setHumanTouchItem}
        humanTouchComment={humanTouchComment}
        setHumanTouchComment={setHumanTouchComment}
        humanTouchSubmitting={humanTouchSubmitting}
        humanTouchSuccessMsg={humanTouchSuccessMsg}
        setHumanTouchSuccessMsg={setHumanTouchSuccessMsg}
        handleSubmitHumanTouch={handleSubmitHumanTouch}
        getBrandStyles={creativeExecution.getBrandStyles}
        handleGenerate={creativeExecution.handleGenerate}
        handleSaveBrandGuidelines={handleSaveBrandGuidelines}
        handleWipeBrandParameters={handleWipeBrandParameters}
      />
      </CreditGateProvider>
    </AppRouter>
  );
}

export default App;
