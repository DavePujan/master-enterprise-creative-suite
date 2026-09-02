import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { savePreferences, loadPreferences } from '../../lib/preferences.js';
import { 
  type Gem, 
  type BrandGuidelines, 
  GENERIC_GEMS 
} from '../../services/geminiService.js';
import { 
  subscribeUserHistory, 
  addUserHistoryItem, 
  deleteHistoryItem 
} from '../infrastructure/firebase/repositories/historyRepository.js';
import { 
  subscribeUserAssets, 
  saveUserAsset 
} from '../infrastructure/firebase/repositories/assetRepository.js';
import { 
  subscribeBrandGuidelines, 
  saveBrandGuidelines 
} from '../infrastructure/firebase/repositories/brandRepository.js';
import { 
  subscribeUserAccount 
} from '../infrastructure/firebase/repositories/userRepository.js';
import { 
  submitHumanTouchRequest, 
  subscribeHumanTouchQueue 
} from '../infrastructure/firebase/repositories/humanTouchRepository.js';
import { useCanvasEditor } from '../features/canvas/hooks/useCanvasEditor.js';
import { useCreativeExecution } from '../features/creative/hooks/useCreativeExecution.js';
import { AppRouter } from './AppRouter.js';
import { AppShell } from './AppShell.js';
import { type HistoryItem } from '../features/layout/components/AppSidebar.js';

export function App() {
  const { user, loading, logout, login, loginWithEmail, registerWithEmail } = useAuth();
  
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [authError, setAuthError] = useState<string | null>(null);

  // Core App State
  const [brandSetupComplete, setBrandSetupComplete] = useState<boolean>(() => {
    const saved = localStorage.getItem('brandSetupComplete');
    return saved ? JSON.parse(saved) : false;
  });

  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines>(() => {
    const saved = localStorage.getItem('brandGuidelines');
    return saved ? JSON.parse(saved) : {
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
  });

  const [editingGuidelines, setEditingGuidelines] = useState<BrandGuidelines>(brandGuidelines);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem('studio_credits');
    return saved ? parseInt(saved) : 50;
  });

  const [selectedGem, setSelectedGem] = useState<Gem>(GENERIC_GEMS[0]);
  const [view, setView] = useState<'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup'>('tools');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);
  const isInitialDataLoadedRef = useRef(false);

  // Creative Parameters
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');
  const [videoShotType, setVideoShotType] = useState<'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling'>('Single Shot');
  const [imageStyle, setImageStyle] = useState('Photorealistic, 8k resolution');
  const [bakeLogoOnGeneration, setBakeLogoOnGeneration] = useState(false);
  const [voiceEmotion, setVoiceEmotion] = useState<'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming'>('Neutral');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedPresentationTheme, setSelectedPresentationTheme] = useState<any>(null);

  // Context Reference Attachments
  const [productContext, setProductContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [faceContext, setFaceContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [firstFrameContext, setFirstFrameContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [lastFrameContext, setLastFrameContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [ingredientsContexts, setIngredientsContexts] = useState<{ id: string; name: string; data: string }[]>([]);

  // Asset & History Persistence
  const [assets, setAssets] = useState<any[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('creative_history');
    return saved ? JSON.parse(saved) : [];
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

  // Dark Mode Sync
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle URL Routing Changes
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync Preferences to LocalStorage
  useEffect(() => {
    localStorage.setItem('brandSetupComplete', JSON.stringify(brandSetupComplete));
    localStorage.setItem('brandGuidelines', JSON.stringify(brandGuidelines));
    localStorage.setItem('studio_credits', credits.toString());
    localStorage.setItem('creative_history', JSON.stringify(history));
  }, [brandSetupComplete, brandGuidelines, credits, history]);

  // Real-time Subscriptions to Cloud Repositories when User is Authenticated
  useEffect(() => {
    if (!user) {
      isInitialDataLoadedRef.current = false;
      setIsInitialDataLoading(false);
      return;
    }

    setIsInitialDataLoading(true);

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

    // 4. Subscribe to Brand Guidelines
    const unsubBrand = subscribeBrandGuidelines(user.uid, 'default', (cloudGuidelines) => {
      if (cloudGuidelines) {
        setBrandGuidelines(cloudGuidelines as BrandGuidelines);
        setBrandSetupComplete(true);
        savePreferences({ brandGuidelines: cloudGuidelines, brandSetupComplete: true });
      }
      setIsInitialDataLoading(false);
      isInitialDataLoadedRef.current = true;
    });

    // 5. Subscribe to Human Touch Queue (if Admin)
    let unsubQueue = () => {};
    if (user.email === 'hardeep.pathak@gmail.com' || user.email === 'avdhesh.babaria@gmail.com') {
      unsubQueue = subscribeHumanTouchQueue((queue) => {
        setAdminCurationRequests(queue);
      });
    }

    return () => {
      unsubHistory();
      unsubAssets();
      unsubAccount();
      unsubBrand();
      unsubQueue();
    };
  }, [user]);

  // History Actions
  const handleSelectGem = (gem: Gem) => {
    setSelectedGem(gem);
    if (gem.type === 'image') {
      setSelectedModel('gemini-2.5-flash-image');
    } else if (gem.type === 'video') {
      setSelectedModel('veo-3.1-generate-preview');
    } else {
      setSelectedModel('gemini-2.5-flash');
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    creativeExecution.setResult(item.result);
    creativeExecution.setPrompt(item.prompt);
    const gem = GENERIC_GEMS.find(g => g.id === item.gemId);
    if (gem) {
      setSelectedGem(gem);
    }
    setView('tools');
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

  const handleSaveBrandGuidelines = async () => {
    setBrandGuidelines(editingGuidelines);
    setShowGuidelines(false);
    savePreferences({ brandGuidelines: editingGuidelines });
    if (user) {
      setIsSyncing(true);
      try {
        await saveBrandGuidelines(user.uid, editingGuidelines, 'default');
      } catch (e) {
        console.error("Failed to sync brand guidelines to cloud:", e);
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
      const reqId = `touch-${Date.now()}`;
      await submitHumanTouchRequest(reqId, {
        userId: user.uid,
        userEmail: user.email || 'Anonymous',
        emailReceipt: user.email || 'Anonymous',
        assetType: humanTouchItem.role || 'Image',
        assetUrl: humanTouchItem.imageUrl || '',
        originalPrompt: humanTouchItem.prompt || '',
        modelsUsed: humanTouchItem.modelsUsed || 'gemini-2.5-flash-image',
        userComment: humanTouchComment || '',
        status: 'pending',
        timestamp: Date.now()
      });

      setHumanTouchSuccessMsg('Request submitted! Our creative experts are on it.');
      setTimeout(() => {
        setHumanTouchItem(null);
        setHumanTouchComment('');
        setHumanTouchSuccessMsg(null);
      }, 2500);
    } catch (e) {
      console.error("Failed to submit human touch curation request:", e);
    } finally {
      setHumanTouchSubmitting(false);
    }
  };

  const handleBrandSetupComplete = async (guidelines: BrandGuidelines, initialAssets: any[]) => {
    setIsSyncing(true);
    try {
      if (user) {
        await saveBrandGuidelines(user.uid, guidelines, 'default');
        await Promise.all(
          initialAssets.map(a => saveUserAsset(user.uid, a.id || `init-asset-${Date.now()}`, a.name, a.data, a.type || 'image'))
        );
      }

      isInitialDataLoadedRef.current = true;
      setBrandGuidelines(guidelines);
      setAssets(initialAssets);
      setBrandSetupComplete(true);
      savePreferences({ brandGuidelines: guidelines, brandSetupComplete: true });
      navigateTo('/workspace');
    } catch (e) {
      console.error("Failed to save initial brand kit:", e);
      isInitialDataLoadedRef.current = true;
      setBrandGuidelines(guidelines);
      setAssets(initialAssets);
      setBrandSetupComplete(true);
      savePreferences({ brandGuidelines: guidelines, brandSetupComplete: true });
      navigateTo('/workspace');
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
      login={login}
      loginWithEmail={loginWithEmail}
      registerWithEmail={registerWithEmail}
      handleLogout={handleLogout}
      handleBrandSetupComplete={handleBrandSetupComplete}
    >
      <AppShell 
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
        setIsDarkMode={setIsDarkMode}
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
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        videoShotType={videoShotType}
        setVideoShotType={setVideoShotType}
        imageStyle={imageStyle}
        setImageStyle={setImageStyle}
        bakeLogoOnGeneration={bakeLogoOnGeneration}
        setBakeLogoOnGeneration={setBakeLogoOnGeneration}
        voiceEmotion={voiceEmotion}
        setVoiceEmotion={setVoiceEmotion}
        result={creativeExecution.result}
        setResult={creativeExecution.setResult}
        isGenerating={creativeExecution.isGenerating}
        videoStatus={creativeExecution.videoStatus}
        prompt={creativeExecution.prompt}
        setPrompt={creativeExecution.setPrompt}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        isGeneratingCreativePrompt={creativeExecution.isGeneratingCreativePrompt}
        setIsGeneratingCreativePrompt={creativeExecution.setIsGeneratingCreativePrompt}
        productContext={productContext}
        setProductContext={setProductContext}
        faceContext={faceContext}
        setFaceContext={setFaceContext}
        firstFrameContext={firstFrameContext}
        setFirstFrameContext={setFirstFrameContext}
        lastFrameContext={lastFrameContext}
        setLastFrameContext={setLastFrameContext}
        ingredientsContexts={ingredientsContexts}
        setIngredientsContexts={setIngredientsContexts}
        selectedPresentationTheme={selectedPresentationTheme}
        setSelectedPresentationTheme={setSelectedPresentationTheme}
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
    </AppRouter>
  );
}

export default App;
