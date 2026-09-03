import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  CreditCard, 
  Coins, 
  Fingerprint, 
  History, 
  Trash2, 
  Cloud, 
  CloudOff, 
  Settings, 
  LogOut,
  Video as VideoIcon,
  FileText,
  LayoutDashboard,
  Presentation,
  Target,
  BookOpen,
  Layers,
  Volume2,
  Music
} from 'lucide-react';
import { BrandLogo } from '@web/features/brand/components/BrandLogo.js';
import { GENERIC_GEMS } from '@web/infrastructure/ai/modelRegistry.js';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { cn } from '@web/lib/utils.js';

export interface HistoryItem {
  id: string;
  gemId: string;
  prompt: string;
  title?: string;
  result: any;
  timestamp: number;
}

export interface AppSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  brandGuidelines: BrandGuidelines;
  credits: number;
  selectedGem: Gem;
  onSelectGem: (gem: Gem) => void;
  view: 'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup';
  setView: (view: 'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup') => void;
  user: any;
  userNotifications: any[];
  setUserNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  adminNotifications: any[];
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onDeleteHistoryItem: (e: React.MouseEvent, id: string) => void;
  onClearHistory: () => void;
  isSyncing: boolean;
  onOpenSettings: () => void;
  onLogout: () => void;
  onLogin: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  brandGuidelines,
  credits,
  selectedGem,
  onSelectGem,
  view,
  setView,
  user,
  userNotifications,
  setUserNotifications,
  adminNotifications,
  history,
  onSelectHistoryItem,
  onDeleteHistoryItem,
  onClearHistory,
  isSyncing,
  onOpenSettings,
  onLogout,
  onLogin
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Image': return <ImageIcon size={20} />;
      case 'Video': return <VideoIcon size={20} />;
      case 'FileText': return <FileText size={20} />;
      case 'LayoutDashboard': return <LayoutDashboard size={20} />;
      case 'Presentation': return <Presentation size={20} />;
      case 'Target': return <Target size={20} />;
      case 'BookOpen': return <BookOpen size={20} />;
      case 'Layers': return <Layers size={20} />;
      case 'Volume2': return <Volume2 size={20} />;
      case 'Music': return <Music size={20} />;
      default: return <Sparkles size={20} />;
    }
  };

  return (
    <aside 
      className={cn(
        "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-72" : "w-0 -translate-x-full lg:w-20 lg:translate-x-0"
      )}
    >
      <div className={cn(
        "flex flex-col items-center border-b border-slate-100 dark:border-slate-800 shrink-0 transition-all duration-300",
        sidebarOpen ? "p-8" : "p-4"
      )}>
        <BrandLogo 
          collapsed={!sidebarOpen} 
          customLogo={brandGuidelines.logo} 
          brandName={brandGuidelines.name} 
          className={cn(
            "transition-all duration-500",
            sidebarOpen ? "h-24 w-24 mb-4" : "h-10 w-10"
          )} 
        />
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              {brandGuidelines.name}
            </span>
            <p className="text-[9px] text-slate-500 font-medium tracking-widest uppercase mt-1">Creative Suite</p>
            <div className="mt-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Sparkles size={12} />
              {credits} Credits
            </div>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2", !sidebarOpen && "hidden")}>
          Creative Gems
        </div>
        {GENERIC_GEMS.map((gem) => {
          const isSelected = selectedGem.id === gem.id;
          const isAudio = gem.type === 'audio';
          return (
            <button
              key={gem.id}
              onClick={() => onSelectGem(gem)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border cursor-pointer",
                isSelected
                  ? isAudio
                    ? "bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/60 shadow-sm"
                    : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                  : isAudio
                    ? "border-transparent text-slate-600 dark:text-slate-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10 hover:text-violet-500 dark:hover:text-violet-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className={cn(
                "shrink-0", 
                isSelected 
                  ? isAudio 
                    ? "text-violet-600 dark:text-violet-400" 
                    : "text-rose-600 dark:text-rose-400" 
                  : isAudio
                    ? "text-slate-400 group-hover:text-violet-500 dark:group-hover:text-violet-400"
                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              )}>
                {getIcon(gem.icon)}
              </div>
              {sidebarOpen && (
                <div className="text-left overflow-hidden flex-1">
                  <p className="font-medium text-sm whitespace-nowrap">{gem.name}</p>
                  <p className={cn(
                    "text-[10px] truncate uppercase tracking-wider font-semibold", 
                    isSelected 
                      ? isAudio 
                        ? "text-violet-400 dark:text-violet-500" 
                        : "text-rose-400 dark:text-rose-500" 
                      : "text-slate-400"
                  )}>
                    {gem.id === 'corporate-presentations' ? 'PPT' : gem.type}
                  </p>
                </div>
              )}
              {sidebarOpen && (
                <div className={cn(
                  "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors",
                  isSelected
                    ? isAudio
                      ? "text-violet-600 bg-violet-100 dark:text-violet-300 dark:bg-violet-950/50"
                      : "text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/50"
                    : "text-amber-500 bg-amber-500/10"
                )}>
                  {gem.cost}
                </div>
              )}
            </button>
          );
        })}

        <div className="pt-8">
          <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2", !sidebarOpen && "hidden")}>
            Library & Plans
          </div>
          <button
            onClick={() => setView('assets')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border mb-2 cursor-pointer",
              view === 'assets'
                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            <div className={cn("shrink-0", view === 'assets' ? "text-rose-600 dark:text-rose-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
              <ImageIcon size={20} />
            </div>
            {sidebarOpen && (
              <div className="text-left overflow-hidden">
                <p className="font-medium text-sm whitespace-nowrap">Asset Library</p>
                <p className={cn("text-[10px] truncate uppercase tracking-wider", view === 'assets' ? "text-rose-400 dark:text-rose-500" : "text-slate-400")}>
                  Manage Assets
                </p>
              </div>
            )}
          </button>

          <button
            onClick={() => {
              setView('curation');
              setUserNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border mb-2 cursor-pointer",
              view === 'curation'
                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            <div className={cn("shrink-0 relative", view === 'curation' ? "text-rose-600 dark:text-rose-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
              <Sparkles size={20} className={cn(view !== 'curation' && userNotifications.filter(n => !n.read).length > 0 ? "animate-bounce text-rose-500" : "")} />
              {view !== 'curation' && userNotifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-white dark:border-slate-900 rounded-full animate-ping" />
              )}
            </div>
            {sidebarOpen && (
              <div className="text-left overflow-hidden flex-1 flex items-center justify-between gap-1">
                <div>
                  <span className="font-medium text-sm whitespace-nowrap block leading-tight">Curation Inbox</span>
                  <span className={cn("text-[10px] truncate uppercase tracking-wider block font-mono", view === 'curation' ? "text-rose-400 dark:text-rose-550" : "text-slate-400")}>
                    Curations released
                  </span>
                </div>
                {userNotifications.filter(n => !n.read).length > 0 && (
                  <span className="bg-rose-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shrink-0 animate-bounce">
                    {userNotifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
            )}
          </button>
          <button
            onClick={() => setView('plan')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border cursor-pointer",
              view === 'plan'
                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            <div className={cn("shrink-0", view === 'plan' ? "text-rose-600 dark:text-rose-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
              <CreditCard size={20} />
            </div>
            {sidebarOpen && (
              <div className="text-left overflow-hidden">
                <p className="font-medium text-sm whitespace-nowrap">Enterprise Plan</p>
                <p className={cn("text-[10px] truncate uppercase tracking-wider", view === 'plan' ? "text-rose-400 dark:text-rose-500" : "text-slate-400")}>
                  View Pricing
                </p>
              </div>
            )}
          </button>

          <button
            onClick={() => setView('topup')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border cursor-pointer",
              view === 'topup'
                ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60 shadow-sm" 
                : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            <div className={cn("shrink-0", view === 'topup' ? "text-indigo-650 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
              <Coins size={20} />
            </div>
            {sidebarOpen && (
              <div className="text-left overflow-hidden">
                <p className="font-medium text-sm whitespace-nowrap">Credit Top-Up</p>
                <p className={cn("text-[10px] truncate uppercase tracking-wider", view === 'topup' ? "text-indigo-400 dark:text-indigo-500" : "text-slate-400")}>
                  Add Balance
                </p>
              </div>
            )}
          </button>

          {user && (user.email === 'hardeep.pathak@gmail.com' || user.email === 'avdhesh.babaria@gmail.com') && (
            <button
              onClick={() => setView('admin')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border mt-2 cursor-pointer",
                view === 'admin'
                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className={cn("shrink-0", view === 'admin' ? "text-rose-600 dark:text-rose-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
                <Fingerprint size={20} className={cn(view !== 'admin' && adminNotifications.filter(n => !n.read).length > 0 ? "animate-bounce text-amber-500" : "")} />
              </div>
              {sidebarOpen && (
                <div className="text-left overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-medium text-xs whitespace-nowrap">Admin Operations</p>
                    {adminNotifications.filter(n => !n.read).length > 0 && (
                      <span className="bg-rose-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                        {adminNotifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </div>
                  <p className={cn("text-[10px] truncate uppercase tracking-wider font-mono font-bold", view === 'admin' ? "text-rose-400 dark:text-rose-500" : "text-amber-500")}>
                    Writopedia Queue
                  </p>
                </div>
              )}
            </button>
          )}
        </div>

        <div className="pt-8">
          <div className={cn("flex items-center justify-between mb-4 px-2", !sidebarOpen && "hidden")}>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recent History
            </div>
            {sidebarOpen && history.length > 0 && (
              <button 
                onClick={onClearHistory}
                className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear All History"
              >
                Clear
              </button>
            )}
          </div>
          
          {history.length === 0 && sidebarOpen && (
            <div className="px-2 py-4 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-600 italic">No recent history</p>
            </div>
          )}

          {history.map((item) => (
            <div
              key={item.id}
              className="group relative"
            >
              <button
                onClick={() => onSelectHistoryItem(item)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer",
                  !sidebarOpen && "justify-center"
                )}
              >
                <History size={16} className="shrink-0" />
                {sidebarOpen && <span className="text-xs truncate pr-6">{item.title || item.prompt}</span>}
              </button>
              
              {sidebarOpen && (
                <button
                  onClick={(e) => onDeleteHistoryItem(e, item.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Delete entry"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-sm text-[10px] uppercase tracking-widest font-bold cursor-pointer",
          user ? "text-emerald-500 bg-emerald-500/5" : "text-amber-500 bg-amber-500/5 px-3",
          "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        )} onClick={() => user ? onLogout() : onLogin()}>
          {user ? (
            <>
              <Cloud size={16} className={cn(isSyncing && "animate-pulse")} />
              {sidebarOpen && (
                <div className="flex flex-col">
                  <span>Cloud Synced</span>
                  <span className="text-[8px] opacity-70 truncate max-w-30 normal-case tracking-normal">{user.email}</span>
                </div>

              )}
            </>
          ) : (
            <>
              <CloudOff size={16} />
              {sidebarOpen && <span>Sign in to sync</span>}
            </>
          )}
        </div>

        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 p-3 rounded-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Settings size={20} />
          {sidebarOpen && <span className="text-sm font-medium">Settings</span>}
        </button>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-3 rounded-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
          title="Log out session and return to brand configuration"
        >
          <LogOut size={20} />
          {sidebarOpen && <span className="text-sm font-medium">Log Out</span>}
        </button>
      </div>
    </aside>
  );
};
