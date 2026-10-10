import React from 'react';
import { AppSidebar, type HistoryItem } from '../features/layout/components/AppSidebar.js';
import { AppHeader } from '../features/layout/components/AppHeader.js';
import { AssetLibrary } from '@web/features/assets/components/AssetLibrary.js';
import { AssetLibraryPage } from '@web/features/assets/pages/AssetLibraryPage.js';
import { CurationQueuePanel } from '@web/features/assets/components/CurationQueuePanel.js';
import { EnterprisePlan } from '@web/features/billing/components/EnterprisePlan.js';
import { CreditTopUp } from '@web/features/billing/components/CreditTopUp.js';
import { CampaignDeckWorkspace } from '@web/features/campaigns/components/CampaignDeckWorkspace.js';
import { CampaignStrategistWorkspace } from '@web/features/campaigns/components/CampaignStrategistWorkspace.js';
import { CreativeWorkspace } from '../features/creative/components/CreativeWorkspace.js';
import { BrandGuidelinesDrawer } from '../features/brand-guidelines/components/BrandGuidelinesDrawer.js';
import { HumanTouchRequestModal } from '../features/human-touch/components/HumanTouchRequestModal.js';
import { CurationToasters } from '../features/human-touch/components/CurationToasters.js';
import { cancelHumanTouchRequest } from '@web/infrastructure/repositories/humanTouchRepository.js';
import { Check, X, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { InsufficientCreditsModal } from '@web/features/billing/components/InsufficientCreditsModal.js';
import { useCreditGate } from '@web/features/billing/context/CreditGateContext.js';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { type TextWordLayer } from '../features/canvas/hooks/useCanvasEditor.js';
import { CreativeHistoryPage } from '@web/features/history/pages/CreativeHistoryPage.js';
import { CreditHistoryPage } from '@web/features/history/pages/CreditHistoryPage.js';
import { SettingsPage } from '@web/features/settings/pages/SettingsPage.js';

export interface AppShellProps {
  theme?: 'dark' | 'light' | 'system';
  setTheme?: (theme: 'dark' | 'light' | 'system') => void;
  onSaveBrandGuidelines?: (guidelines: BrandGuidelines) => Promise<void>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  brandGuidelines: BrandGuidelines;
  setBrandGuidelines: React.Dispatch<React.SetStateAction<BrandGuidelines>>;
  editingGuidelines: BrandGuidelines;
  setEditingGuidelines: React.Dispatch<React.SetStateAction<BrandGuidelines>>;
  showGuidelines: boolean;
  setShowGuidelines: (open: boolean) => void;
  showAssetLibrary: boolean;
  setShowAssetLibrary: (open: boolean) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  selectedGem: Gem;
  setSelectedGem: (gem: Gem) => void;
  view: 'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup';
  setView: (view: 'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup') => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  user: any;
  userNotifications: any[];
  setUserNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  adminNotifications: any[];
  setAdminNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  userCurationRequests: any[];
  adminCurationRequests: any[];
  selectedCurationRequestId: string | null;
  setSelectedCurationRequestId: (id: string | null) => void;
  selectedAdminRequestId: string | null;
  setSelectedAdminRequestId: (id: string | null) => void;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onDeleteHistoryItem: (e: React.MouseEvent, id: string) => void;
  onClearHistory: () => void;
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  assets: any[];
  setAssets: React.Dispatch<React.SetStateAction<any[]>>;
  saveAsset: (asset: any) => Promise<void>;
  onOpenAssetInStudio?: (asset: any) => void;
  onUseAssetInDestination?: (
    asset: any,
    destination: { gemId: string; roleId: string; roleName: string }
  ) => void;
  addToHistory: (entry: any) => Promise<void>;
  navigateTo: (path: string, options?: { replace?: boolean }) => void;
  handleLogout: () => Promise<void>;
  generatingGemIds?: string[];
  currentPath?: string;
  // Creative State & Props
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  videoShotType: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling';
  setVideoShotType: (type: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling') => void;
  videoDuration: string;
  setVideoDuration: (duration: string) => void;
  videoResolution: '720p' | '1080p' | '4k';
  setVideoResolution: (res: '720p' | '1080p' | '4k') => void;
  videoAudioIntent: 'none' | 'ambient' | 'music' | 'sfx' | 'cinematic_soundscape';
  setVideoAudioIntent: (intent: 'none' | 'ambient' | 'music' | 'sfx' | 'cinematic_soundscape') => void;
  videoNativeAudio: boolean;
  setVideoNativeAudio: (val: boolean) => void;
  videoReferences: Array<{ id: string; type: string; name: string; data: string; role?: string }>;
  setVideoReferences: React.Dispatch<React.SetStateAction<Array<{ id: string; type: string; name: string; data: string; role?: string }>>>;
  klingElements: Array<{ id: string; tag: string; name: string; data: string }>;
  setKlingElements: React.Dispatch<React.SetStateAction<Array<{ id: string; tag: string; name: string; data: string }>>>;
  imageStyle: string;
  setImageStyle: (style: string) => void;
  bakeLogoOnGeneration: boolean;
  setBakeLogoOnGeneration: React.Dispatch<React.SetStateAction<boolean>>;
  voiceEmotion: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming' | 'Dramatic';
  setVoiceEmotion: (emotion: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming' | 'Dramatic') => void;
  result: any;
  setResult: React.Dispatch<React.SetStateAction<any>>;
  isGenerating: boolean;
  videoStatus: string;
  prompt: string;
  setPrompt: (val: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  audioGenerationType?: 'voiceover' | 'music';
  setAudioGenerationType?: (val: 'voiceover' | 'music') => void;
  musicMode?: 'clip' | 'full-track';
  setMusicMode?: (val: 'clip' | 'full-track') => void;
  musicGenre?: string;
  setMusicGenre?: (val: string) => void;
  musicMood?: string;
  setMusicMood?: (val: string) => void;
  speakerMode?: 'single' | 'two-speaker';
  setSpeakerMode?: (val: 'single' | 'two-speaker') => void;
  speakerTwoVoice?: string;
  setSpeakerTwoVoice?: (val: string) => void;
  isGeneratingCreativePrompt: boolean;
  setIsGeneratingCreativePrompt: (val: boolean) => void;
  productContext: { id: string; name: string; data: string } | null;
  setProductContext: (val: { id: string; name: string; data: string } | null) => void;
  faceContext: { id: string; name: string; data: string } | null;
  setFaceContext: (val: { id: string; name: string; data: string } | null) => void;
  firstFrameContext: { id: string; name: string; data: string } | null;
  setFirstFrameContext: (val: { id: string; name: string; data: string } | null) => void;
  lastFrameContext: { id: string; name: string; data: string } | null;
  setLastFrameContext: (val: { id: string; name: string; data: string } | null) => void;
  ingredientsContexts: { id: string; name: string; data: string }[];
  setIngredientsContexts: React.Dispatch<React.SetStateAction<{ id: string; name: string; data: string }[]>>;
  selectedPresentationTheme: any;
  setSelectedPresentationTheme: (theme: any) => void;
  // Canvas State & Handlers
  containerRef: React.RefObject<HTMLDivElement | null>;
  logoPosition: { x: number; y: number };
  setLogoPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  logoScale: number;
  setLogoScale: React.Dispatch<React.SetStateAction<number>>;
  logoInverted: boolean;
  setLogoInverted: React.Dispatch<React.SetStateAction<boolean>>;
  isDraggingLogo: boolean;
  handleLogoMouseDown: (e: React.MouseEvent) => void;
  handleLogoTouchStart: (e: React.TouchEvent) => void;
  textLayers: TextWordLayer[];
  setTextLayers: React.Dispatch<React.SetStateAction<TextWordLayer[]>>;
  selectedTextWordId: string | null;
  setSelectedTextWordId: React.Dispatch<React.SetStateAction<string | null>>;
  draggingTextWordId: string | null;
  newTextWordInput: string;
  setNewTextWordInput: React.Dispatch<React.SetStateAction<string>>;
  layoutStudioTab: 'logo' | 'text';
  setLayoutStudioTab: React.Dispatch<React.SetStateAction<'logo' | 'text'>>;
  handleTextMouseDown: (e: React.MouseEvent, id: string) => void;
  handleTextTouchStart: (e: React.TouchEvent, id: string) => void;
  handleAddTextWord: (split: boolean) => void;
  handleContainerMouseMove: (e: React.MouseEvent) => void;
  handleContainerTouchMove: (e: React.TouchEvent) => void;
  handleContainerTouchEnd: () => void;
  handleDownloadInteractiveImage: (bgSrc: string, logoSrc: string) => Promise<void>;
  // Audio & TTS
  isPlaying: boolean;
  isTTSLoading: boolean;
  audioProgress: number;
  audioDuration: number;
  audioVolume: number;
  setAudioVolume: (vol: number) => void;
  audioUrl: string | null;
  handleTTS: (text: string, forceBrowserVoice?: boolean) => Promise<void>;
  handleDownloadAudio: () => void;
  ttsError?: string | null;
  setTtsError?: (err: string | null) => void;
  // Slideshow
  currentSlide: number;
  setCurrentSlide: React.Dispatch<React.SetStateAction<number>>;
  slideshowTheme: 'light' | 'dark' | 'brand';
  setSlideshowTheme: React.Dispatch<React.SetStateAction<'light' | 'dark' | 'brand'>>;
  slideshowFont: 'sans' | 'serif';
  setSlideshowFont: React.Dispatch<React.SetStateAction<'sans' | 'serif'>>;
  slideshowOverlay: number;
  setSlideshowOverlay: React.Dispatch<React.SetStateAction<number>>;
  handleDownloadPDF: () => Promise<void>;
  isDownloadingPDF: boolean;
  // Storyline
  isDownloadingZip: boolean;
  handleDownloadStorylineZip: () => Promise<void>;
  // Modals & Warnings
  softWarning: any;
  setSoftWarning: (val: any) => void;
  isRefineModalOpen: boolean;
  setIsRefineModalOpen: (val: boolean) => void;
  refinePrompt: string;
  setRefinePrompt: (val: string) => void;
  isRefining: boolean;
  handleRefineWithAI: () => Promise<void>;
  humanTouchItem: any;
  setHumanTouchItem: (item: any) => void;
  humanTouchComment: string;
  setHumanTouchComment: (val: string) => void;
  humanTouchSubmitting: boolean;
  humanTouchSuccessMsg: string | null;
  setHumanTouchSuccessMsg: (val: string | null) => void;
  handleSubmitHumanTouch: () => Promise<void>;
  getBrandStyles: () => React.CSSProperties;
  handleGenerate: () => Promise<void>;
  handleSaveBrandGuidelines: () => Promise<void>;
  handleWipeBrandParameters: () => Promise<void>;
}

export const AppShell: React.FC<AppShellProps> = (props) => {
  const {
    sidebarOpen,
    setSidebarOpen,
    brandGuidelines,
    editingGuidelines,
    setEditingGuidelines,
    showGuidelines,
    setShowGuidelines,
    credits,
    setCredits,
    selectedGem,
    setSelectedGem,
    view,
    setView,
    isDarkMode,
    setIsDarkMode,
    user,
    userNotifications,
    setUserNotifications,
    adminNotifications,
    setAdminNotifications,
    userCurationRequests,
    selectedCurationRequestId,
    setSelectedCurationRequestId,
    selectedAdminRequestId,
    setSelectedAdminRequestId,
    history,
    onSelectHistoryItem,
    onDeleteHistoryItem,
    onClearHistory,
    isSyncing,
    setIsSyncing,
    assets,
    setAssets,
    saveAsset,
    addToHistory,
    navigateTo,
    handleLogout,
    productContext,
    setProductContext,
    faceContext,
    setFaceContext,
    result,
    setResult,
    humanTouchItem,
    setHumanTouchItem,
    humanTouchComment,
    setHumanTouchComment,
    humanTouchSubmitting,
    humanTouchSuccessMsg,
    setHumanTouchSuccessMsg,
    handleSubmitHumanTouch,
    handleSaveBrandGuidelines,
    handleWipeBrandParameters,
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    selectedLanguage,
    setSelectedLanguage,
    audioGenerationType,
    setAudioGenerationType,
    musicMood,
    setMusicMood
  } = props;

  const { returnedFromTopUpNotice, returnToGem, dismissTopUpNotice } = useCreditGate();

  const [logoAlertDismissed, setLogoAlertDismissed] = React.useState<boolean>(() => {
    try {
      return sessionStorage.getItem('dismissed_workspace_logo_alert') === 'true';
    } catch {
      return false;
    }
  });

  const handleCancelUserRequest = async (requestId: string) => {
    try {
      await cancelHumanTouchRequest(requestId);
    } catch (err) {
      console.error("Failed to cancel user curation request:", err);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* Toast notifications */}
      <CurationToasters 
        userNotifications={userNotifications}
        setUserNotifications={setUserNotifications}
        adminNotifications={adminNotifications}
        setAdminNotifications={setAdminNotifications}
        onSelectUserRequest={(id) => {
          setSelectedCurationRequestId(id);
          setView('curation');
          if (navigateTo && props.currentPath !== '/workspace') {
            navigateTo('/workspace');
          }
        }}
        onSelectAdminRequest={(_id) => {
          if (navigateTo) {
            navigateTo('/admin/curation');
          }
        }}
      />

      {/* Sidebar Navigation */}
      <AppSidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        brandGuidelines={brandGuidelines}
        credits={credits}
        selectedGem={selectedGem}
        onSelectGem={(gem) => {
          setSelectedGem(gem);
          setView('tools');
          if (navigateTo && props.currentPath !== '/workspace') {
            navigateTo('/workspace');
          }
        }}
        view={view}
        setView={setView}
        user={user}
        userNotifications={userNotifications}
        setUserNotifications={setUserNotifications}
        adminNotifications={adminNotifications}
        history={history}
        onSelectHistoryItem={onSelectHistoryItem}
        onDeleteHistoryItem={onDeleteHistoryItem}
        onClearHistory={onClearHistory}
        isSyncing={isSyncing}
        generatingGemIds={props.generatingGemIds}
        onOpenSettings={() => {
          setEditingGuidelines(JSON.parse(JSON.stringify(brandGuidelines)));
          setShowGuidelines(true);
        }}
        onLogout={handleLogout}
        onLogin={() => navigateTo('/login')}
        currentPath={props.currentPath}
        navigateTo={navigateTo}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <AppHeader 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          selectedGem={selectedGem}
          view={view}
          setView={setView}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          currentPath={props.currentPath}
          navigateTo={navigateTo}
        />

        {/* View Switcher Area */}
        {props.currentPath === '/settings' ? (
          <SettingsPage
            navigateTo={navigateTo}
            theme={props.theme || (isDarkMode ? 'dark' : 'light')}
            setTheme={props.setTheme || ((t) => setIsDarkMode(t === 'dark'))}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            brandGuidelines={brandGuidelines}
            setBrandGuidelines={props.setBrandGuidelines}
            onSaveBrandGuidelines={props.onSaveBrandGuidelines || (async (g) => {
              props.setBrandGuidelines(g);
              props.setEditingGuidelines(g);
              await handleSaveBrandGuidelines();
            })}
            onWipeBrandParameters={handleWipeBrandParameters}
            user={user}
            credits={credits}
            isSyncing={isSyncing}
            aspectRatio={aspectRatio}
            setAspectRatio={props.setAspectRatio}
            audioVoice={props.selectedVoice}
            setAudioVoice={props.setSelectedVoice}
            audioVolume={props.audioVolume}
            setAudioVolume={props.setAudioVolume}
            bakeLogoOnGeneration={props.bakeLogoOnGeneration}
            setBakeLogoOnGeneration={props.setBakeLogoOnGeneration}
            logoPosition={props.logoPosition}
            setLogoPosition={props.setLogoPosition}
            logoScale={props.logoScale}
            setLogoScale={props.setLogoScale}
          />
        ) : props.currentPath === '/history/creative' ? (
          <CreativeHistoryPage
            history={history}
            onSelectHistoryItem={(item) => {
              onSelectHistoryItem(item);
              navigateTo('/workspace');
            }}
            onDeleteHistoryItem={onDeleteHistoryItem}
            onClearHistory={onClearHistory}
            onBack={() => navigateTo('/workspace')}
          />
        ) : props.currentPath === '/history/credits' ? (
          <CreditHistoryPage
            credits={credits}
            user={user}
            onLogin={() => navigateTo('/login')}
            onBack={() => navigateTo('/workspace')}
            onTopUp={() => {
              setView('topup');
              navigateTo('/workspace');
            }}
          />
        ) : props.currentPath === '/assets' ? (
          <AssetLibraryPage 
            assets={assets} 
            setAssets={setAssets} 
            brandGuidelines={brandGuidelines}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
            onBack={() => navigateTo('/workspace')}
            onNavigateToWorkspace={() => navigateTo('/workspace')}
            onOpenAssetInStudio={props.onOpenAssetInStudio}
            onUseAssetInDestination={props.onUseAssetInDestination}
          />
        ) : view === 'curation' ? (
          <CurationQueuePanel 
            requests={userCurationRequests}
            onClose={() => setView('tools')}
            selectedRequestId={selectedCurationRequestId}
            onSelectRequest={(id) => setSelectedCurationRequestId(id)}
            onOpenAssetInStudio={props.onOpenAssetInStudio}
            onSaveAssetToLibrary={props.saveAsset}
            onCancelRequest={handleCancelUserRequest}
          />
        ) : view === 'plan' ? (
          <EnterprisePlan 
            credits={credits} 
            setCredits={setCredits} 
            user={user} 
            onLogin={() => {
              if (!user) {
                navigateTo('/login');
              }
            }}
          />
        ) : view === 'topup' ? (
          <CreditTopUp 
            credits={credits} 
            setCredits={setCredits} 
            user={user} 
            onLogin={() => {
              if (!user) {
                navigateTo('/login');
              }
            }}
          />
        ) : view === 'admin' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <p className="text-sm font-mono text-slate-400">Admin Operations Console</p>
            <button
              onClick={() => {
                setView('tools');
                if (navigateTo) navigateTo('/admin');
              }}
              className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-xs font-mono text-white transition"
            >
              Open Operations Console (/admin)
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className={selectedGem.id === 'campaign-strategist-y' ? "max-w-[1400px] mx-auto space-y-6" : "max-w-5xl mx-auto space-y-6"}>
              {/* Workspace Onboarding Logo Alert Banner */}
              {!brandGuidelines?.logo && !logoAlertDismissed && (
                <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-4 sm:p-5 text-slate-800 dark:text-slate-100 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 ring-1 ring-amber-500/30">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                            Brand Logo Not Added
                          </h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Setup Required
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                          Your workspace doesn't have an official brand logo yet. Add or generate one to personalize your creatives and auto-watermark exports.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => {
                          if (navigateTo) {
                            navigateTo('/settings#brand');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Add Brand Logo</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                      <button
                        onClick={() => {
                          setLogoAlertDismissed(true);
                          try {
                            sessionStorage.setItem('dismissed_workspace_logo_alert', 'true');
                          } catch {}
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Dismiss alert"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedGem.id === 'bundles-campaigns' ? (
                <CampaignDeckWorkspace 
                  brandGuidelines={brandGuidelines}
                  productContext={productContext}
                  setProductContext={setProductContext}
                  faceContext={faceContext}
                  setFaceContext={setFaceContext}
                  onSaveCampaignAsset={saveAsset}
                  onSaveHistory={addToHistory}
                  currentActiveResult={result}
                  onClearActiveResult={() => setResult(null)}
                  setHumanTouchItem={setHumanTouchItem}
                />
              ) : selectedGem.id === 'campaign-strategist-y' ? (
                <CampaignStrategistWorkspace 
                  brandGuidelines={brandGuidelines}
                  onSaveCampaignAsset={saveAsset}
                  onSaveHistory={addToHistory}
                  credits={credits}
                  setCredits={setCredits}
                  productContext={productContext}
                  setProductContext={setProductContext}
                  faceContext={faceContext}
                  setFaceContext={setFaceContext}
                  setHumanTouchItem={setHumanTouchItem}
                  onSelectGem={setSelectedGem}
                  setPrompt={setPrompt}
                  setAspectRatio={setAspectRatio}
                  setSelectedLanguage={setSelectedLanguage}
                  setAudioGenerationType={setAudioGenerationType}
                  setMusicMood={setMusicMood}
                  currentActiveResult={result}
                  onClearActiveResult={() => setResult(null)}
                />
              ) : (
                <CreativeWorkspace {...props} />
              )}
            </div>
          </div>
        )}

        {/* Global Shell Footer */}
        <footer className="h-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">
          <div>© 2026 {brandGuidelines.name} Studio AI</div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigateTo('/settings#brand')} 
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Brand Config
            </button>
            <button 
              onClick={() => navigateTo('/pricing')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Enterprise Tier
            </button>
            <button 
              onClick={() => navigateTo('/legal/privacy-policy')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button 
              onClick={() => navigateTo('/legal/terms-of-service')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Terms
            </button>
          </div>
        </footer>
      </main>

      {/* Brand Guidelines Settings Drawer */}
      <BrandGuidelinesDrawer 
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        editingGuidelines={editingGuidelines}
        setEditingGuidelines={setEditingGuidelines}
        onSave={handleSaveBrandGuidelines}
        onWipe={handleWipeBrandParameters}
      />

      {/* Human Touch Request Modal */}
      <HumanTouchRequestModal 
        isOpen={!!humanTouchItem}
        onClose={() => setHumanTouchItem(null)}
        item={humanTouchItem}
        comment={humanTouchComment}
        setComment={setHumanTouchComment}
        submitting={humanTouchSubmitting}
        successMsg={humanTouchSuccessMsg}
        onSubmit={handleSubmitHumanTouch}
      />

      {/* Return from Top-Up Success Banner */}
      {returnedFromTopUpNotice && (
        <div className="fixed top-4 right-4 z-110 max-w-md p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <Check size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Credits Added Successfully!
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                +{returnedFromTopUpNotice.creditsAdded} credits added (Balance: {credits} credits). Ready to continue {returnedFromTopUpNotice.serviceName || 'generation'}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={returnToGem}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase rounded-md shadow-xs transition-all cursor-pointer"
            >
              Return
            </button>
            <button
              onClick={dismissTopUpNotice}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Global Insufficient Credits Modal */}
      <InsufficientCreditsModal />
    </div>
  );
};
