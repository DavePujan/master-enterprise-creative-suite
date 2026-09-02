import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Check, Clock, X } from 'lucide-react';
import { cn } from '../../../../lib/utils.js';

export interface AdminNotification {
  id: string;
  userEmail: string;
  assetType: string;
  timestamp: number;
  read: boolean;
}

export interface UserNotification {
  id: string;
  status: string;
  assetType: string;
  completedComment?: string;
  timestamp: number;
  read: boolean;
}

export interface CurationToastersProps {
  userNotifications: any[];
  setUserNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  adminNotifications: any[];
  setAdminNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  onSelectUserRequest: (id: string) => void;
  onSelectAdminRequest: (id: string) => void;
}

export const CurationToasters: React.FC<CurationToastersProps> = ({
  userNotifications,
  setUserNotifications,
  adminNotifications,
  setAdminNotifications,
  onSelectUserRequest,
  onSelectAdminRequest
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>

        {/* Admin Notifications */}
        {adminNotifications
          .filter(n => !n.read)
          .map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-slate-900 border border-amber-500/30 text-white p-4 rounded-sm shadow-xl flex items-start gap-3 pointer-events-auto"
            >
              <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-sm shrink-0">
                <ShieldAlert size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-400">New Curation Request</p>
                <p className="text-[11px] text-slate-300 truncate">
                  {n.userEmail || 'Client'} requested human touch for {n.assetType || 'asset'}
                </p>
                <button
                  onClick={() => {
                    setAdminNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                    onSelectAdminRequest(n.id);
                  }}
                  className="mt-2 text-[10px] font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider cursor-pointer"
                >
                  Review Request →
                </button>
              </div>
              <button
                onClick={() => setAdminNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))}
                className="text-slate-500 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}

        {/* User Notifications */}
        {userNotifications
          .filter(n => !n.read)
          .map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "p-4 rounded-sm shadow-xl flex items-start gap-3 pointer-events-auto border",
                n.status === 'completed'
                  ? "bg-emerald-950/90 border-emerald-500/40 text-white"
                  : n.status === 'in-progress'
                  ? "bg-blue-950/90 border-blue-500/40 text-white"
                  : "bg-slate-900 border-slate-700 text-white"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-sm shrink-0",
                n.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
              )}>
                {n.status === 'completed' ? <Check size={16} /> : <Clock size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold capitalize">
                  {n.status === 'completed' ? 'Curation Complete!' : 'Curation In Progress'}
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  {n.completedComment || `Your ${n.assetType || 'asset'} curation status updated.`}
                </p>
                <button
                  onClick={() => {
                    setUserNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                    onSelectUserRequest(n.id);
                  }}
                  className="mt-2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider cursor-pointer"
                >
                  View in Inbox →
                </button>
              </div>
              <button
                onClick={() => setUserNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))}
                className="text-slate-500 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
};
