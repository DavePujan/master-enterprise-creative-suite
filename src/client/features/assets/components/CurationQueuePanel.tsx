import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  AlertTriangle, 
  FileImage, 
  Download,
  Info,
  Calendar,
  Layers,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../../lib/utils.js';

export interface UserHumanTouchRequest {
  id: string;
  assetType: string;
  assetUrl: string;
  originalPrompt: string;
  modelsUsed: string;
  userComment: string;
  emailReceipt: string;
  status: string;
  timestamp: number;
  completedAssetUrl?: string;
  completedComment?: string;
  completedTimestamp?: number;
}

interface CurationQueuePanelProps {
  requests: UserHumanTouchRequest[];
  onClose: () => void;
  selectedRequestId?: string | null;
  onSelectRequest?: (id: string) => void;
}

export default function CurationQueuePanel({ 
  requests, 
  onClose, 
  selectedRequestId,
  onSelectRequest 
}: CurationQueuePanelProps) {
  const [activeRequest, setActiveRequest] = useState<UserHumanTouchRequest | null>(() => {
    if (selectedRequestId) {
      const found = requests.find(r => r.id === selectedRequestId);
      if (found) return found;
    }
    return requests.length > 0 ? requests[0] : null;
  });

  // Keep active request in sync with real-time prop updates
  React.useEffect(() => {
    if (selectedRequestId) {
      const found = requests.find(r => r.id === selectedRequestId);
      if (found) {
        setActiveRequest(found);
        return;
      }
    }
    if (activeRequest) {
      const fresh = requests.find(r => r.id === activeRequest.id);
      if (fresh) {
        setActiveRequest(fresh);
      }
    } else if (requests.length > 0) {
      setActiveRequest(requests[0]);
    }
  }, [requests, selectedRequestId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={12} />
            Curation Ready
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <XCircle size={12} />
            Rejected
          </span>
        );
      case 'under-review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertCircle size={12} />
            Under Review
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <Clock size={12} className="animate-spin" />
            In Queue
          </span>
        );
    }
  };

  return (
    <div id="user-curation-inbox" className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-sm transition-colors border border-slate-200 dark:border-slate-800 shadow-xs"
            title="Back to Suite"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Writopedia Professional Curation Inbox</h1>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest font-mono">Real-time status transitions & deliverable releases</p>
          </div>
        </div>
        <div className="text-right text-[10px] font-mono text-slate-400 uppercase">
          Tracked Deliverables: <span className="font-bold text-slate-800 dark:text-slate-200">{requests.length}</span>
        </div>
      </header>

      {/* Grid workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        
        {/* Left Side: Deliverable List */}
        <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden min-h-0 bg-white dark:bg-slate-950">
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 font-mono flex items-center gap-2">
              <Layers size={14} />
              Professional Assignments Feed
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-0">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-64">
                <Info className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No Curation Requests Sent Yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Use the Campaign Workspace or any active deliverable preview to submit professional requests to our expert curation desk.</p>
              </div>
            ) : (
              requests.map((req) => {
                const isActive = activeRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    onClick={() => {
                      setActiveRequest(req);
                      if (onSelectRequest) onSelectRequest(req.id);
                    }}
                    className={cn(
                      "w-full text-left p-5 transition-all flex flex-col gap-3 relative border-b border-slate-100 dark:border-slate-900",
                      isActive 
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-r-2 border-slate-950 dark:border-white' 
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-900 rounded-sm flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-850">
                          {req.assetType === 'image' ? <FileImage size={12} /> : <FileText size={12} />}
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {req.id.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(req.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        <strong className="font-semibold text-slate-800 dark:text-slate-200 block">Prompt:</strong>
                        {req.originalPrompt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-900 shrink-0">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                        MODELS: {req.modelsUsed || 'Default'}
                      </span>
                      {getStatusBadge(req.status)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Deliverable Release Inspector */}
        <div className="w-full lg:w-1/2 overflow-y-auto flex flex-col p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-0">
          <AnimatePresence mode="wait">
            {activeRequest ? (
              <motion.div
                key={activeRequest.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Visual Status card */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm p-6 shadow-xs space-y-6">
                  
                  {/* Header Title details */}
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Release Code</p>
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-mono break-all leading-none">
                        {activeRequest.id.toUpperCase()}
                      </h2>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(activeRequest.status)}
                    </div>
                  </div>

                  {/* High Fidelity Curation Delivery Section */}
                  {activeRequest.status === 'completed' && activeRequest.completedAssetUrl ? (
                    <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 rounded-sm space-y-4">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest font-mono">
                        <CheckCircle size={14} className="text-emerald-500" />
                        Professional Deliverable Released
                      </div>

                      {activeRequest.completedComment && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                            <MessageSquare size={10} />
                            Curation Architect Notes
                          </span>
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-sm text-xs text-slate-700 dark:text-emerald-300 italic border border-emerald-500/10 leading-relaxed">
                            "{activeRequest.completedComment}"
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">Curated Assets Preview</p>
                        
                        {activeRequest.assetType === 'image' ? (
                          <div className="relative border border-emerald-500/20 rounded-sm overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center max-h-87.5">
                            <img 
                              src={activeRequest.completedAssetUrl} 
                              alt="Writopedia Curation release" 
                              className="object-contain max-h-87.5 w-full"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (

                          <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-center flex flex-col items-center justify-center gap-2">
                            <FileText className="w-10 h-10 text-emerald-600" />
                            <p className="text-xs font-mono font-medium">{activeRequest.completedAssetUrl}</p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <a 
                            href={activeRequest.completedAssetUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-950 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors border border-transparent shadow-xs"
                          >
                            View Original Deliverable
                            <ExternalLink size={12} />
                          </a>

                          <a
                            href={activeRequest.completedAssetUrl}
                            download={`curated_${activeRequest.id}.png`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors border border-slate-200 dark:border-slate-800"
                          >
                            <Download size={14} />
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : activeRequest.status === 'rejected' ? (
                    <div className="p-4 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-sm space-y-2 text-rose-800 dark:text-rose-400">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest font-mono">
                        <XCircle size={14} />
                        Curation Request Rejected
                      </div>
                      <p className="text-xs leading-relaxed font-light">The curation desk rejected this submission as it falls outside of normal professional styling pipelines or lacks sufficient creative context.</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25 rounded-sm space-y-3 text-amber-800 dark:text-amber-400">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest font-mono">
                        <Clock size={14} className="animate-pulse" />
                        Operational Curation In Progress
                      </div>
                      <p className="text-xs leading-relaxed font-light">Our administrative curation desk has lock-leased this asset and is performing pixel adjustments, brand-alignment scaling, and vector touch-ups. You will receive an instant notification right here as soon as the file is released.</p>
                    </div>
                  )}

                  {/* Core Inspection Specifications */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">Metadata Specs</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Asset Category Type</p>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-mono uppercase font-bold">
                          {activeRequest.assetType || 'image'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Submission Timestamp</p>
                        <p className="text-xs text-slate-850 dark:text-slate-200">
                          {new Date(activeRequest.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 Pt-2">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Creative Generation Model</p>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-mono">
                        {activeRequest.modelsUsed || 'Default Model Ensemble'}
                      </p>
                    </div>

                    {activeRequest.userComment && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Your Instructions to Curation Desk</p>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-sm text-xs font-light text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-900/50 leading-relaxed font-mono whitespace-pre-wrap">
                          "{activeRequest.userComment}"
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Original Creative Prompt</p>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 font-mono rounded-sm text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-900/50 wrap-break-word leading-relaxed">
                        {activeRequest.originalPrompt}
                      </div>
                    </div>


                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Original Raw Asset</p>
                      {activeRequest.assetType === 'image' && activeRequest.assetUrl ? (
                        <div className="relative border border-slate-100 dark:border-slate-900 rounded-sm overflow-hidden bg-slate-100 dark:bg-slate-900 max-h-64 flex items-center justify-center">
                          <img 
                            src={activeRequest.assetUrl} 
                            alt="Original Raw Asset" 
                            className="object-contain max-h-64"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <p className="text-xs font-mono break-all bg-slate-100 dark:bg-slate-900 p-2 rounded-xs">
                          {activeRequest.assetUrl}
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-96">
                <Info className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2 animate-bounce" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">Operational Curation Desk</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Select an active request from your curation feed list on the left to verify its real-time progress status.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
