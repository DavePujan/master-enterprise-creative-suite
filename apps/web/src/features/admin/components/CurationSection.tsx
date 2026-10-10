import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  subscribeHumanTouchQueue, 
  updateHumanTouchRequestStatus,
  type HumanTouchQueueOptions
} from '@web/infrastructure/repositories/humanTouchRepository.js';
import { retryCurationNotification } from '@web/infrastructure/repositories/adminRepository.js';
import type { HumanTouchRequest } from '@shared-types/user.js';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Search, 
  Filter, 
  ArrowRight, 
  Upload, 
  Send, 
  Check, 
  Loader2, 
  FileText, 
  FileImage, 
  Film, 
  Music, 
  ExternalLink, 
  X, 
  MessageSquare, 
  Mail, 
  User, 
  RefreshCw,
  ShieldAlert,
  Download
} from 'lucide-react';
import { cn } from '@web/lib/utils.js';

type StatusFilter = 'all' | 'pending' | 'in_review' | 'completed' | 'rejected';

interface CurationSectionProps {
  initialRequestId?: string | null;
}

export const CurationSection: React.FC<CurationSectionProps> = ({ initialRequestId }) => {
  const [requests, setRequests] = useState<(HumanTouchRequest & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected request inspector state
  const [selectedId, setSelectedId] = useState<string | null>(initialRequestId || null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Deliverable upload state for completion flow
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileType, setUploadedFileType] = useState<'image' | 'video' | 'audio' | 'doc'>('image');
  const [artistNotes, setArtistNotes] = useState<string>('');

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Subscribe to real-time global admin queue
  useEffect(() => {
    const unsub = subscribeHumanTouchQueue(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to curation queue:', err);
        setLoading(false);
      },
      { scope: 'all', intervalMs: 20000 }
    );
    return unsub;
  }, []);

  // Update selectedId if initialRequestId changes
  useEffect(() => {
    if (initialRequestId) {
      setSelectedId(initialRequestId);
    }
  }, [initialRequestId]);

  const selectedRequest = useMemo(() => {
    return requests.find(r => r.id === selectedId) || null;
  }, [requests, selectedId]);

  // Clean form state when changing selected request
  useEffect(() => {
    setUploadedBase64(null);
    setUploadedFileName('');
    setArtistNotes('');
    setActionError(null);
    setActionSuccess(null);
    setShowRejectModal(false);
    setRejectReason('');
  }, [selectedId]);

  // Filter and sort requests (Pending first, then In Review, then Completed/Rejected, newest first)
  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          r.id.toLowerCase().includes(q) ||
          (r.emailReceipt && r.emailReceipt.toLowerCase().includes(q)) ||
          (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
          (r.originalPrompt && r.originalPrompt.toLowerCase().includes(q)) ||
          (r.userComment && r.userComment.toLowerCase().includes(q));
        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => {
        const statusPriority: Record<string, number> = {
          pending: 1,
          in_review: 2,
          completed: 3,
          rejected: 4,
        };
        const pA = statusPriority[a.status] || 5;
        const pB = statusPriority[b.status] || 5;
        if (pA !== pB) return pA - pB;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
  }, [requests, statusFilter, searchQuery]);

  // Status transition handlers
  const handleStartReview = async () => {
    if (!selectedRequest) return;
    setIsUpdatingStatus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateHumanTouchRequestStatus(selectedRequest.id, { status: 'in_review' });
      setActionSuccess('Review started. Request moved to In Review state.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update request state');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    let type: 'image' | 'video' | 'audio' | 'doc' = 'image';
    if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.type.startsWith('text/') || file.type.includes('pdf') || file.type.includes('markdown')) type = 'doc';
    setUploadedFileType(type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteRequest = async () => {
    if (!selectedRequest) return;
    if (!uploadedBase64 && !selectedRequest.completedAssetUrl) {
      setActionError('You must upload the completed deliverable file before marking as completed.');
      return;
    }

    setIsUpdatingStatus(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = {
        status: 'completed' as const,
        completedAssetUrl: uploadedBase64 || selectedRequest.completedAssetUrl,
        completedComment: artistNotes.trim() || undefined,
      };

      const res = await updateHumanTouchRequestStatus(selectedRequest.id, payload);
      
      let msg = 'Request completed successfully and deliverable added to client library.';
      if (res?.emailDispatched) {
        msg += ' Real completion email sent to customer.';
      } else if (res?.emailError) {
        msg += ` Note: Email delivery returned: ${res.emailError}`;
      }
      setActionSuccess(msg);
      setUploadedBase64(null);
      setUploadedFileName('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to complete request');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    if (!rejectReason.trim()) {
      setActionError('Please provide a brief reason for rejection.');
      return;
    }

    setIsUpdatingStatus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateHumanTouchRequestStatus(selectedRequest.id, {
        status: 'rejected',
        completedComment: `Rejected: ${rejectReason.trim()}`,
      });
      setActionSuccess('Request rejected and updated.');
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to reject request');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRetryEmail = async () => {
    if (!selectedRequest) return;
    setIsUpdatingStatus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await retryCurationNotification(selectedRequest.id);
      setActionSuccess('Completion notification email successfully re-dispatched.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to re-send notification email');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Curation Work Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage Human Touch requests, review source assets, upload deliverables, and notify clients.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          {(['all', 'pending', 'in_review', 'completed', 'rejected'] as StatusFilter[]).map((tab) => {
            const count = requests.filter(r => tab === 'all' ? true : r.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer flex items-center gap-1.5",
                  statusFilter === tab
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                )}
              >
                <span>{tab.replace('_', ' ')}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  statusFilter === tab ? "bg-rose-800 text-white" : "bg-slate-800 text-slate-400"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by ID, client email, or prompt keywords..."
          className="w-full bg-slate-900 border border-slate-800 rounded-sm pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
        />
      </div>

      {/* Main Work Table + Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Queue Table / List */}
        <div className={cn("transition-all space-y-2", selectedRequest ? "lg:col-span-6 xl:col-span-7" : "lg:col-span-12")}>
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-rose-500 mr-2" />
              <span className="text-xs font-mono uppercase">Loading requests...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-12 text-center text-slate-500 font-mono text-xs">
              No curation requests found for filter "{statusFilter}".
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Asset</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Age</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredRequests.map((req) => {
                      const isSelected = selectedId === req.id;
                      const ageMs = Date.now() - (req.timestamp || 0);
                      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
                      const ageStr = ageHours > 24 ? `${Math.floor(ageHours / 24)}d ago` : `${ageHours}h ago`;

                      return (
                        <tr
                          key={req.id}
                          onClick={() => setSelectedId(req.id)}
                          className={cn(
                            "hover:bg-slate-800/50 cursor-pointer transition-colors",
                            isSelected && "bg-slate-800/80 border-l-2 border-l-rose-500"
                          )}
                        >
                          <td className="p-3 font-bold text-white">
                            #{req.id.slice(0, 8)}
                          </td>
                          <td className="p-3 text-slate-300 max-w-[160px] truncate">
                            {req.emailReceipt || req.userEmail || 'Client'}
                          </td>
                          <td className="p-3 uppercase text-slate-400 font-bold text-[11px]">
                            {req.assetType || 'image'}
                          </td>
                          <td className="p-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              req.status === 'pending' && "bg-amber-500/10 text-amber-400 border border-amber-500/30",
                              req.status === 'in_review' && "bg-sky-500/10 text-sky-400 border border-sky-500/30",
                              req.status === 'completed' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
                              req.status === 'rejected' && "bg-slate-800 text-slate-400"
                            )}>
                              {req.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {ageStr}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(req.id);
                              }}
                              className="text-xs text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider"
                            >
                              Inspect &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Detailed Request Inspector */}
        {selectedRequest && (
          <div className="lg:col-span-6 xl:col-span-5 bg-slate-900 border border-slate-800 rounded-sm p-5 space-y-5">
            {/* Inspector Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">
                    Order #{selectedRequest.id}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider",
                    selectedRequest.status === 'pending' && "bg-amber-500/10 text-amber-400 border border-amber-500/30",
                    selectedRequest.status === 'in_review' && "bg-sky-500/10 text-sky-400 border border-sky-500/30",
                    selectedRequest.status === 'completed' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
                    selectedRequest.status === 'rejected' && "bg-slate-800 text-slate-400"
                  )}>
                    {selectedRequest.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Client: <span className="text-slate-200">{selectedRequest.emailReceipt || selectedRequest.userEmail}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1 text-slate-500 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Notifications / Alerts */}
            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-400 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-start gap-2">
                <Check size={14} className="shrink-0 mt-0.5" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Requested Adjustments */}
            <div className="p-3.5 bg-slate-950/70 border-l-2 border-rose-500 border border-slate-800/80 rounded-sm space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 block">
                Client's Required Adjustments:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans italic">
                "{selectedRequest.userComment}"
              </p>
            </div>

            {/* Source Creative Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="font-bold uppercase tracking-wider">Source Creative ({selectedRequest.assetType})</span>
                {selectedRequest.assetUrl && (
                  <a 
                    href={selectedRequest.assetUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                  >
                    <span>Raw Link</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {selectedRequest.assetUrl && (
                <div className="bg-slate-950 border border-slate-800 rounded-sm p-2 flex items-center justify-center max-h-56 overflow-hidden">
                  {selectedRequest.assetType === 'video' ? (
                    <video src={selectedRequest.assetUrl} controls className="max-h-52 w-auto object-contain rounded" />
                  ) : selectedRequest.assetType === 'audio' ? (
                    <audio src={selectedRequest.assetUrl} controls className="w-full py-4" />
                  ) : (
                    <img 
                      src={selectedRequest.assetUrl} 
                      alt="Source" 
                      className="max-h-52 w-auto object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Original Prompt */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Original Prompt:
              </span>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 font-mono leading-relaxed max-h-28 overflow-y-auto">
                {selectedRequest.originalPrompt}
              </div>
            </div>

            {/* ========================================================
                LIFECYCLE ACTIONS
               ======================================================== */}
            <div className="pt-3 border-t border-slate-800 space-y-4">
              {/* STATE 1: PENDING -> START REVIEW */}
              {selectedRequest.status === 'pending' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 font-mono">
                    This order is waiting for artist assignment. Click to begin production review.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleStartReview}
                      disabled={isUpdatingStatus}
                      className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isUpdatingStatus ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                      <span>Start Review</span>
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isUpdatingStatus}
                      className="px-3 py-2 border border-slate-800 text-rose-400 hover:bg-rose-950/30 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 2: IN REVIEW -> UPLOAD & COMPLETE */}
              {selectedRequest.status === 'in_review' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 block">
                      Artist Production: Upload Finished Deliverable
                    </span>
                    
                    {/* File Upload Box */}
                    <div className="border border-dashed border-slate-700 rounded-sm p-4 text-center bg-slate-950/60 hover:border-rose-500/50 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf,.md,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {uploadedBase64 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-mono text-emerald-400 font-bold">
                            ✓ {uploadedFileName} ({uploadedFileType.toUpperCase()})
                          </p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                          >
                            Replace File
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload size={20} className="text-slate-500 mx-auto" />
                          <p className="text-xs font-mono text-slate-300">
                            Upload edited asset file (PNG, JPG, MP4, MP3, PDF)
                          </p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-mono uppercase tracking-wider cursor-pointer"
                          >
                            Choose File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Completion Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Artist Completion Notes (Sent to Client in Email):
                    </label>
                    <textarea
                      value={artistNotes}
                      onChange={(e) => setArtistNotes(e.target.value)}
                      placeholder="e.g. Adjusted product lighting, moved logo to top right corner, and refined skin tones."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCompleteRequest}
                      disabled={isUpdatingStatus || !uploadedBase64}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-sm"
                    >
                      {isUpdatingStatus ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      <span>Complete & Notify Client</span>
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isUpdatingStatus}
                      className="px-3 py-2.5 border border-slate-800 text-rose-400 hover:bg-rose-950/30 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 3: COMPLETED */}
              {selectedRequest.status === 'completed' && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-sm space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                    <CheckCircle2 size={15} />
                    <span>Deliverable Completed & Dispatched</span>
                  </div>

                  {selectedRequest.completedComment && (
                    <div className="text-xs text-slate-300 font-sans italic bg-slate-950/60 p-2.5 rounded border border-emerald-500/20">
                      Artist Notes: "{selectedRequest.completedComment}"
                    </div>
                  )}

                  {selectedRequest.completedAssetUrl && (
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={selectedRequest.completedAssetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-rose-400 hover:text-rose-300 font-mono font-bold inline-flex items-center gap-1"
                      >
                        <Download size={13} />
                        <span>Inspect Completed Asset</span>
                      </a>
                      <button
                        onClick={handleRetryEmail}
                        disabled={isUpdatingStatus}
                        className="text-xs text-slate-400 hover:text-white font-mono inline-flex items-center gap-1 cursor-pointer"
                        title="Re-send notification email"
                      >
                        <Mail size={12} />
                        <span>Resend Email</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STATE 4: REJECTED */}
              {selectedRequest.status === 'rejected' && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm text-xs text-slate-400 font-mono space-y-1">
                  <span className="font-bold text-rose-400">Request Rejected</span>
                  <p className="text-slate-500 italic">
                    {selectedRequest.completedComment || 'No rejection notes recorded.'}
                  </p>
                </div>
              )}
            </div>

            {/* Rejection Modal */}
            {showRejectModal && (
              <div className="p-4 bg-slate-950 border border-rose-500/40 rounded space-y-3 animate-in fade-in">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider block">
                  Rejection Reason (Internal & Client Record):
                </span>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Asset format incompatible or violation of usage guidelines."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-mono rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectRequest}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold rounded cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
