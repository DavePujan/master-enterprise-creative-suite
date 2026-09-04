import React from 'react';
import { AppSidebar, type HistoryItem } from '../features/layout/components/AppSidebar.js';
import { AppHeader } from '../features/layout/components/AppHeader.js';
import { AssetLibrary } from '@web/features/assets/components/AssetLibrary.js';
import { CurationQueuePanel } from '@web/features/assets/components/CurationQueuePanel.js';
import { EnterprisePlan } from '@web/features/billing/components/EnterprisePlan.js';
import { CreditTopUp } from '@web/features/billing/components/CreditTopUp.js';
import { AdminPanel } from '@web/features/admin/components/AdminPanel.js';
import { CampaignDeckWorkspace } from '@web/features/campaigns/components/CampaignDeckWorkspace.js';
import { CampaignStrategistWorkspace } from '@web/features/campaigns/components/CampaignStrategistWorkspace.js';
import { CreativeWorkspace } from '../features/creative/components/CreativeWorkspace.js';
import { BrandGuidelinesDrawer } from '../features/brand-guidelines/components/BrandGuidelinesDrawer.js';
import { HumanTouchRequestModal } from '../features/human-touch/components/HumanTouchRequestModal.js';
import { CurationToasters } from '../features/human-touch/components/CurationToasters.js';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { type TextWordLayer } from '../features/canvas/hooks/useCanvasEditor.js';

export interface AppShellProps {
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
  addToHistory: (entry: any) => Promise<void>;
  navigateTo: (path: string) => void;
  handleLogout: () => Promise<void>;
  generatingGemIds?: string[];
  // Creative State & Props
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  videoShotType: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling';
  setVideoShotType: (type: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling') => void;
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
    handleWipeBrandParameters
  } = props;

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
        }}
        onSelectAdminRequest={(id) => {
          setSelectedAdminRequestId(id);
          setView('admin');
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
        />

        {/* View Switcher Area */}
        {view === 'assets' ? (
          <AssetLibrary 
            assets={assets} 
            setAssets={setAssets} 
            onClose={() => setView('tools')} 
            brandGuidelines={brandGuidelines}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
          />
        ) : view === 'curation' ? (
          <CurationQueuePanel 
            requests={userCurationRequests}
            onClose={() => setView('tools')}
            selectedRequestId={selectedCurationRequestId}
            onSelectRequest={() => setSelectedCurationRequestId(null)}
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
          <AdminPanel 
            onClose={() => setView('tools')}
            selectedRequestId={selectedAdminRequestId}
            onClearSelectedRequest={() => setSelectedAdminRequestId(null)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
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
                />
              ) : (
                <CreativeWorkspace {...props} />
              )}
            </div>
          </div>
        )}

        {/* Global Shell Footer */}
        <footer className="h-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
          <div>© 2026 {brandGuidelines.name} Studio AI</div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                setEditingGuidelines(JSON.parse(JSON.stringify(brandGuidelines)));
                setShowGuidelines(true);
              }} 
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Brand Config
            </button>
            <button 
              onClick={() => navigateTo('/pricing')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Enterprise Tier
            </button>
            <button 
              onClick={() => navigateTo('/legal/privacy-policy')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button 
              onClick={() => navigateTo('/legal/terms-of-service')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
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
    </div>
  );
};
