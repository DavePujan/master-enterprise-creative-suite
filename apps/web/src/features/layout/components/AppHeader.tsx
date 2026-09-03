import React from 'react';
import { motion } from 'motion/react';
import { Menu, X, Coins, Sparkles, Sun, Moon } from 'lucide-react';
import type { Gem } from '@shared-types/creative.js';

export interface AppHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedGem: Gem;
  view: 'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup';
  setView: (view: 'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup') => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  selectedGem,
  view,
  setView,
  isDarkMode,
  setIsDarkMode
}) => {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 relative">
      <div className="flex items-center z-10">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-slate-500 dark:text-slate-400 cursor-pointer"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div 
          key={selectedGem.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-lg">{selectedGem.name}</h2>
        </motion.div>
      </div>
      
      <div className="flex items-center gap-4 z-10">
        {view !== 'plan' && view !== 'topup' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('topup')}
              className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer"
              id="topup-button"
              title="Booster / Top-Up Credits"
            >
              <Coins size={13} className="animate-pulse" />
              <span>Credit Top-Up</span>
            </button>
            <button
              onClick={() => setView('plan')}
              className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer"
              id="upgrade-button"
              title="Upgrade Pricing Plans"
            >
              <Sparkles size={13} className="animate-pulse" />
              <span>Upgrade</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setView('tools')}
            className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            id="workspace-back-button"
            title="Return to Workspace content"
          >
            <span>Back to Workspace</span>
          </button>
        )}

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
