import React, { useState, useEffect, useRef } from 'react';
import { db, uploadAssetToStorage } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  where,
  setDoc
} from 'firebase/firestore';
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Mail, 
  User, 
  ArrowLeft,
  Search,
  Filter,
  Trash2,
  FileText,
  AlertTriangle,
  FileImage,
  Layers,
  Sparkles,
  Upload,
  Send,
  MessageSquare,
  Loader2,
  Camera,
  BookOpen,
  Film,
  Sliders,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  promptEngineSettings, 
  updatePromptEngineSettings, 
  PromptEngineSettings 
} from '../services/geminiService';

interface GlobalHumanTouchRequest {
  id: string;
  assetType: string;
  assetUrl: string;
  originalPrompt: string;
  modelsUsed: string;
  userComment: string;
  emailReceipt: string;
  status: string;
  timestamp: number;
  userId: string;
  userEmail: string;
  completedAssetUrl?: string;
  completedComment?: string;
  completedTimestamp?: number;
}

interface SalesQuery {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  teamSize: string;
  message: string;
  status: string; // 'pending', 'contacted', 'archived'
  timestamp: number;
}

interface AdminPanelProps {
  onClose: () => void;
  selectedRequestId?: string | null;
  onClearSelectedRequest?: () => void;
}

export default function AdminPanel({ onClose, selectedRequestId, onClearSelectedRequest }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'curation' | 'sales'>('curation');
  const [salesQueries, setSalesQueries] = useState<SalesQuery[]>([]);
  const [selectedSalesQuery, setSelectedSalesQuery] = useState<SalesQuery | null>(null);

  const [requests, setRequests] = useState<GlobalHumanTouchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'under-review' | 'completed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<GlobalHumanTouchRequest | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Upload/completion workspace states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileType, setUploadedFileType] = useState<'image' | 'video' | 'audio' | 'doc'>('image');
  const [curationNote, setCurationNote] = useState<string>('');

  // System Prompt Engine Settings State
  const [engineSettings, setEngineSettings] = useState<PromptEngineSettings>(() => {
    return { ...promptEngineSettings };
  });

  useEffect(() => {
    // Sync settings in real-time from Firestore if available
    const unsub = onSnapshot(doc(db, 'adminSettings', 'magicPromptConfig'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as any;
        // Map fields to ensure safety
        const updated: PromptEngineSettings = {
          enableAiRewrite: typeof data.enableAiRewrite === 'boolean' ? data.enableAiRewrite : true,
          enableGuidelines: typeof data.enableGuidelines === 'boolean' ? data.enableGuidelines : true,
          enablePhotoStyling: typeof data.enablePhotoStyling === 'boolean' ? data.enablePhotoStyling : true,
          enableCinematicStoryboard: typeof data.enableCinematicStoryboard === 'boolean' ? data.enableCinematicStoryboard : true,
          allowTextOnAssets: typeof data.allowTextOnAssets === 'boolean' ? data.allowTextOnAssets : true,
        };
        setEngineSettings(updated);
        updatePromptEngineSettings(updated);
      }
    }, (error) => {
      console.warn("Firestore admin settings subscription denied/offline, relying on local storage fallback", error);
    });
    return unsub;
  }, []);

  const handleToggleSettings = async (key: keyof PromptEngineSettings) => {
    const nextVal = !engineSettings[key];
    const newSettings = { ...engineSettings, [key]: nextVal };
    
    // Instantly update locally
    setEngineSettings(newSettings);
    updatePromptEngineSettings(newSettings);

    try {
      await setDoc(doc(db, 'adminSettings', 'magicPromptConfig'), newSettings);
    } catch (e) {
      console.error("Failed to commit settings update to Firestore:", e);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'humanTouchRequests'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: GlobalHumanTouchRequest[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({
          id: docSnap.id,
          ...docSnap.data()
        } as GlobalHumanTouchRequest);
      });
      setRequests(fetched);
      setLoading(false);

      // If a specific request was highlighted from a notification, select it
      if (selectedRequestId) {
        const found = fetched.find(r => r.id === selectedRequestId);
        if (found) {
          setSelectedRequest(found);
        }
      }
    }, (error) => {
      console.error("Failed to fetch administrative queue:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [selectedRequestId]);

  useEffect(() => {
    const q = query(
      collection(db, 'salesSubmissions'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: SalesQuery[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({
          id: docSnap.id,
          ...docSnap.data()
        } as SalesQuery);
      });
      setSalesQueries(fetched);
    }, (error) => {
      console.error("Failed to fetch administrative sales queries:", error);
    });

    return unsubscribe;
  }, []);

  const handleUpdateSalesStatus = async (queryId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      await updateDoc(doc(db, 'salesSubmissions', queryId), {
        status: newStatus
      });
      setSelectedSalesQuery(prev => prev && prev.id === queryId ? { ...prev, status: newStatus } : prev);
    } catch (err: any) {
      console.error("Failed to update sales query status:", err);
      setActionError(`Failed to update status: ${err.message || err}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteSalesQuery = async (queryId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this sales lead?")) return;
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      await deleteDoc(doc(db, 'salesSubmissions', queryId));
      setSelectedSalesQuery(null);
    } catch (err: any) {
      console.error("Failed to delete sales query:", err);
      setActionError(`Failed to delete record: ${err.message || err}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Keep selected request in sync with real-time updates
  useEffect(() => {
    if (selectedRequest) {
      const fresh = requests.find(r => r.id === selectedRequest.id);
      if (fresh) {
        setSelectedRequest(fresh);
      }
    }
  }, [requests]);

  // Clean uploading states on active request selection change
  useEffect(() => {
    setUploadedBase64(null);
    setUploadedFileName('');
    setCurationNote('');
    setActionError(null);
  }, [selectedRequest?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    let estimatedType: 'image' | 'video' | 'audio' | 'doc' = 'image';
    if (file.type.startsWith('video/')) {
      estimatedType = 'video';
    } else if (file.type.startsWith('audio/')) {
      estimatedType = 'audio';
    } else if (file.type.startsWith('text/') || file.type.includes('markdown') || file.type.includes('pdf') || file.type.includes('doc')) {
      estimatedType = 'doc';
    } else if (!file.type.startsWith('image/')) {
      estimatedType = 'doc';
    }
    setUploadedFileType(estimatedType);

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndComplete = async () => {
    if (!selectedRequest) return;
    if (!uploadedBase64) {
      setActionError("Please select a high-fidelity curated asset to upload.");
      return;
    }

    setIsUpdatingStatus(true);
    setActionError(null);

    try {
      const assetId = `${selectedRequest.id}_edited`;

      // 1. Upload high-fidelity edited deliverable to storage
      const uploadedUrl = await uploadAssetToStorage(
        selectedRequest.userId, 
        assetId, 
        uploadedBase64, 
        uploadedFileType
      );

      // 2. Insert directly as a brand asset inside the user's personal Assets Collection
      const userAssetDocRef = doc(db, 'users', selectedRequest.userId, 'assets', assetId);
      try {
        await setDoc(userAssetDocRef, {
          type: selectedRequest.assetType || 'image',
          content: uploadedUrl,
          prompt: `Writopedia Curation Edit (${selectedRequest.id.toUpperCase()})`,
          timestamp: Date.now()
        });
      } catch (assetErr: any) {
        console.error("Failed step 2: writing to user brand assets", assetErr);
        throw new Error(`[Step 2: Brand Assets] ${assetErr.message || assetErr}`);
      }

      // 3. Update both global tracking and localized user-level request logs
      const updatePayload = {
        status: 'completed',
        completedAssetUrl: uploadedUrl,
        completedComment: curationNote.trim(),
        completedTimestamp: Date.now()
      };

      const globalDocRef = doc(db, 'humanTouchRequests', selectedRequest.id);
      try {
        await updateDoc(globalDocRef, updatePayload);
      } catch (globalErr: any) {
        console.error("Failed step 3a: updating global humanTouchRequests", globalErr);
        throw new Error(`[Step 3a: Global Requests] ${globalErr.message || globalErr}`);
      }

      const userDocRef = doc(db, 'users', selectedRequest.userId, 'humanTouchRequests', selectedRequest.id);
      try {
        await updateDoc(userDocRef, updatePayload);
      } catch (userErr: any) {
        console.warn("User notification request updates completed: (subcollection is skipped):", userErr);
        // We do not throw or block completed state if the user subcollect updates fail, 
        // but if we do get an error it's helpful to see it.
        throw new Error(`[Step 3b: User Curation Request Subcollection] ${userErr.message || userErr}`);
      }

      setUploadedBase64(null);
      setUploadedFileName('');
      setCurationNote('');
      
    } catch (err: any) {
      console.error("Failed to complete request with curated asset upload:", err);
      setActionError(`Failed to save edits: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, userId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      // 1. Update in the global collection
      const globalDocRef = doc(db, 'humanTouchRequests', requestId);
      await updateDoc(globalDocRef, {
        status: newStatus
      });

      // 2. Update in user-specific subcollection
      const userDocRef = doc(db, 'users', userId, 'humanTouchRequests', requestId);
      await updateDoc(userDocRef, {
        status: newStatus
      }).catch(err => {
        console.warn("User-specific subcollection doc update failed (might be deleted):", err);
      });

    } catch (err: any) {
      console.error("Failed to update status:", err);
      setActionError(`Failed to update status: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteRequest = async (requestId: string, userId: string) => {
    if (!confirm("Are you sure you want to delete this human touch request? This cannot be undone.")) return;
    
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      // Delete in global collection
      const globalDocRef = doc(db, 'humanTouchRequests', requestId);
      await deleteDoc(globalDocRef);

      // Delete in user-specific subcollection
      const userDocRef = doc(db, 'users', userId, 'humanTouchRequests', requestId);
      await deleteDoc(userDocRef).catch(() => {});

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
        if (onClearSelectedRequest) onClearSelectedRequest();
      }
    } catch (err: any) {
      console.error("Failed to delete request:", err);
      setActionError(`Failed to delete request: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesQuery = searchQuery.trim() === '' || 
      req.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.originalPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.userComment && req.userComment.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesQuery;
  });

  const filteredSalesQueries = salesQueries.filter(q => {
    // Only filter by status if we're looking at sales status, or just rely on search query
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    const matchesQuery = searchQuery.trim() === '' ||
      q.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.message.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesQuery;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={12} />
            Completed
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-605 dark:text-emerald-400">
            <CheckCircle size={12} />
            Contacted
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400">
            <XCircle size={12} />
            Archived
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
            <Clock size={12} />
            Pending
          </span>
        );
    }
  };

  return (
    <div id="admin-dashboard-root" className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
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
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Operations Panel</h1>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest font-mono">Real-time professional curation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('curation');
              setSelectedSalesQuery(null);
            }}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'curation'
                ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-905'
            }`}
          >
            Curation Queue ({requests.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('sales');
              setSelectedRequest(null);
            }}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'sales'
                ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-905'
            }`}
          >
            Sales Leads ({salesQueries.length})
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        
        {/* Left pane: Requests feed */}
        <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden min-h-0 bg-white dark:bg-slate-950">
          
          {/* Controls & Searches */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input 
                type="text" 
                placeholder="Search by Email, ID, Prompt or Comment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mr-1">Filter:</span>
              {(['all', 'pending', 'under-review', 'completed', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-sm border uppercase tracking-wider transition-all shadow-2xs ${
                    statusFilter === status 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs' 
                      : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {status === 'all' ? 'All Queue' : status.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* List queue */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-0">
            {activeTab === 'curation' ? (
              loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-slate-900 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-400 font-mono">Syncing administrative queue...</p>
                  </div>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-48">
                  <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-light text-slate-500 dark:text-slate-400">No human touch requests match filters.</p>
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const isActive = selectedRequest?.id === req.id;
                  return (
                    <button
                      key={req.id}
                      onClick={() => {
                        setSelectedRequest(req);
                        if (onClearSelectedRequest) onClearSelectedRequest();
                      }}
                      className={`w-full text-left p-4 transition-all flex flex-col gap-2 relative ${
                        isActive 
                          ? 'bg-slate-50 dark:bg-slate-900/50 border-r-2 border-slate-900 dark:border-white' 
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 bg-emerald-500 w-1.5 h-1.5 rounded-full" />
                      )}
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-100 dark:bg-slate-900 rounded-sm flex items-center justify-center text-slate-500">
                            {req.assetType === 'image' ? <FileImage size={12} /> : <FileText size={12} />}
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {req.id.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(req.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <Mail size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{req.userEmail}</span>
                        </div>
                        {req.userComment && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic truncate font-light leading-relaxed">
                            "{req.userComment}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-dashed border-slate-100 dark:border-slate-900 shrink-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Receipt: {req.emailReceipt}
                        </span>
                        {getStatusBadge(req.status)}
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              // Active Tab is "sales"
              filteredSalesQueries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-48">
                  <Building className="w-8 h-8 text-slate-300 dark:text-slate-750 mb-2" />
                  <p className="text-sm font-light text-slate-500 dark:text-slate-400">No Enterprise sales queries found.</p>
                </div>
              ) : (
                filteredSalesQueries.map((queryItem) => {
                  const isActive = selectedSalesQuery?.id === queryItem.id;
                  return (
                    <button
                      key={queryItem.id}
                      onClick={() => {
                        setSelectedSalesQuery(queryItem);
                      }}
                      className={`w-full text-left p-4 transition-all flex flex-col gap-2 relative ${
                        isActive 
                          ? 'bg-slate-50 dark:bg-slate-900/50 border-r-2 border-slate-900 dark:border-white' 
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 bg-emerald-500 w-1.5 h-1.5 rounded-full" />
                      )}
                      
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-100 dark:bg-slate-900 rounded-sm flex items-center justify-center text-slate-500">
                            <Building size={12} />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {queryItem.companyName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(queryItem.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <User size={12} className="text-slate-400" />
                          <span className="font-medium">{queryItem.contactName} ({queryItem.teamSize} seats)</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                          {queryItem.message}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-dashed border-slate-100 dark:border-slate-850 shrink-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate max-w-[150px]">
                          {queryItem.email}
                        </span>
                        {getStatusBadge(queryItem.status)}
                      </div>
                    </button>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Right pane: Dedicated inspection dashboard */}
        <div className="w-full lg:w-1/2 overflow-y-auto flex flex-col p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-0">
          
          <AnimatePresence mode="wait">
            {selectedRequest ? (
              <motion.div
                key={selectedRequest.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Visual Card Frame */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm p-6 shadow-xs space-y-6">
                  
                  {/* Title Bar details */}
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Assignment ID</p>
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-mono break-all leading-none">
                        {selectedRequest.id.toUpperCase()}
                      </h2>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>

                  {actionError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      {actionError}
                    </div>
                  )}

                  {/* Administrative Operation Trigger Deck */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Review Action Desk</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => handleUpdateStatus(selectedRequest.id, selectedRequest.userId, 'under-review')}
                        disabled={isUpdatingStatus || selectedRequest.status === 'under-review'}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-sm border uppercase tracking-wider transition-colors font-mono ${
                          selectedRequest.status === 'under-review'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                            : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        <Clock size={14} />
                        Under Review
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedRequest.id, selectedRequest.userId, 'completed')}
                        disabled={isUpdatingStatus || selectedRequest.status === 'completed'}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-sm border uppercase tracking-wider transition-colors font-mono ${
                          selectedRequest.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        <CheckCircle size={14} />
                        Complete
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedRequest.id, selectedRequest.userId, 'rejected')}
                        disabled={isUpdatingStatus || selectedRequest.status === 'rejected'}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-sm border uppercase tracking-wider transition-colors font-mono ${
                          selectedRequest.status === 'rejected'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Inspector Fields */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 font-mono">
                          <User size={10} />
                          User ID / Account
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-mono break-all">
                          {selectedRequest.userId}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 font-mono">
                          <Mail size={10} />
                          User Email Address
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium break-all">
                          {selectedRequest.userEmail}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Creative Models Used</p>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium capitalize">
                          {selectedRequest.modelsUsed || 'Not Specified'}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Send Receipt Copy To</p>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-mono">
                          {selectedRequest.emailReceipt}
                        </p>
                      </div>
                    </div>

                    {selectedRequest.userComment && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">User Clarification / Comment</p>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xs text-xs font-light text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-900/50 whitespace-pre-wrap leading-relaxed">
                          {selectedRequest.userComment}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Original Generation Prompt</p>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xs text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-900/50 break-words leading-relaxed font-mono">
                        {selectedRequest.originalPrompt}
                      </div>
                    </div>

                    {/* Asset Preview Frame */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Target Asset Preview</p>
                        <a 
                          href={selectedRequest.assetUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:underline uppercase tracking-wide"
                        >
                          View Full Size
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      
                      {selectedRequest.assetType === 'image' && selectedRequest.assetUrl ? (
                        <div className="relative border border-slate-100 dark:border-slate-900 rounded-sm overflow-hidden bg-slate-100 dark:bg-slate-900 max-h-96 flex items-center justify-center">
                          <img 
                            src={selectedRequest.assetUrl} 
                            alt="Human Touch Asset Payload" 
                            className="object-contain max-h-96 w-full"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-sm text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-slate-300" />
                          <p>Non-image media request payloads are hosted at address:</p>
                          <p className="text-[10px] font-mono break-all bg-slate-100 dark:bg-slate-950 p-2 rounded-xs">
                            {selectedRequest.assetUrl}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Curation Deliverable Upload & Status Panel */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-900 space-y-4">
                      {selectedRequest.status === 'completed' && selectedRequest.completedAssetUrl && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-sm p-4 space-y-3">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs font-mono uppercase tracking-widest">
                            <CheckCircle size={14} className="animate-bounce" />
                            Professional Curation Complete
                          </div>
                          
                          {selectedRequest.completedComment && (
                            <div className="text-xs text-slate-700 dark:text-emerald-300 italic p-2 bg-white dark:bg-slate-900 border border-emerald-500/10 rounded-sm">
                              "{selectedRequest.completedComment}"
                            </div>
                          )}

                          <div className="space-y-1">
                            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Edited Asset Link</p>
                            <div className="flex items-center justify-between gap-4 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm">
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{selectedRequest.completedAssetUrl}</span>
                              <a
                                href={selectedRequest.completedAssetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-slate-950 dark:text-white font-bold hover:underline shrink-0"
                              >
                                View full size
                              </a>
                            </div>
                          </div>

                          {selectedRequest.assetType === 'image' ? (
                            <div className="relative border border-emerald-500/10 rounded-sm overflow-hidden bg-slate-50 dark:bg-slate-900 max-h-64 flex items-center justify-center">
                              <img 
                                src={selectedRequest.completedAssetUrl} 
                                alt="Admin Completed Asset Deliverable" 
                                className="object-contain max-h-64 w-full"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5">
                              <FileText className="w-6 h-6 text-emerald-500" />
                              <p className="font-mono text-[10px]">Non-image curated document</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Workspace form to upload edited asset */}
                      <div className="bg-slate-100/55 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 rounded-sm p-4 space-y-4">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Upload size={14} className="text-slate-500" />
                          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 font-mono">
                            {selectedRequest.status === 'completed' ? 'Re-upload / Update Edited Asset' : 'Upload Edited Deliverable Asset'}
                          </h4>
                        </div>

                        <div className="space-y-3">
                          {/* File input */}
                          <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-950 p-4 rounded-sm transition-colors text-center cursor-pointer relative">
                            <input 
                              type="file" 
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              accept={selectedRequest.assetType === 'image' ? 'image/*' : '*'}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {uploadedBase64 ? (
                              <div className="space-y-2 w-full">
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                                  <CheckCircle size={14} />
                                  Selected: {uploadedFileName}
                                </div>
                                {uploadedFileType === 'image' && (
                                  <div className="mx-auto border border-slate-200 dark:border-slate-800 rounded-sm max-h-36 overflow-hidden max-w-xs flex items-center justify-center bg-slate-50 p-1">
                                    <img src={uploadedBase64} alt="Pre-upload preview" className="object-contain max-h-32" referrerPolicy="no-referrer" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Upload size={24} className="mx-auto text-slate-400" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Drag/drop or click to upload curated asset</p>
                                <p className="text-[10px] text-slate-400">Supports edited images, graphics, docs, and logs</p>
                              </div>
                            )}
                          </div>

                          {/* Notes/Comments */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                              Curation notes & comments for the client
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Describe your edits (e.g. 'Aligned typography with your space-science guidelines, brightened levels, adjusted resolution to 1080p.')"
                              value={curationNote}
                              onChange={(e) => setCurationNote(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400 transition-all font-mono"
                            />
                          </div>

                          {/* Completion button */}
                          <button
                            onClick={handleUploadAndComplete}
                            disabled={isUpdatingStatus || !uploadedBase64}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs rounded-sm uppercase tracking-wider font-mono disabled:opacity-50 disabled:hover:bg-slate-950 disabled:dark:hover:bg-white transition-all shadow-xs"
                          >
                            {isUpdatingStatus ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Publishing Curation...
                              </>
                            ) : (
                              <>
                                <Send size={14} />
                                {selectedRequest.status === 'completed' ? 'Update & Deploy Deliverable' : 'Upload & Complete Request'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Absolute Deletion Anchor */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-900 flex justify-end">
                    <button
                      onClick={() => handleDeleteRequest(selectedRequest.id, selectedRequest.userId)}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1 text-[10px] font-bold text-red-600 dark:text-red-400 rounded-sm hover:bg-red-500/10 transition-colors flex items-center gap-1.5 uppercase tracking-widest font-mono"
                    >
                      <Trash2 size={12} />
                      Delete Request Record
                    </button>
                  </div>

                </div>
              </motion.div>
            ) : selectedSalesQuery ? (
              <motion.div
                key={selectedSalesQuery.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 text-left"
              >
                {/* Visual Card Frame */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm p-6 shadow-xs space-y-6">
                  
                  {/* Title Bar details */}
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Enterprise Lead</p>
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white break-all leading-none">
                        {selectedSalesQuery.companyName}
                      </h2>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {getStatusBadge(selectedSalesQuery.status)}
                    </div>
                  </div>

                  {actionError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      {actionError}
                    </div>
                  )}

                  {/* Administrative Operation Trigger Deck */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Outreach Operations</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 col-gap-2">
                      <button
                        onClick={() => handleUpdateSalesStatus(selectedSalesQuery.id, 'pending')}
                        disabled={isUpdatingStatus || selectedSalesQuery.status === 'pending'}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-sm border uppercase tracking-wider transition-colors font-mono cursor-pointer ${
                          selectedSalesQuery.status === 'pending'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                            : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        <Clock size={14} />
                        Reset Status
                      </button>

                      <button
                        onClick={() => handleUpdateSalesStatus(selectedSalesQuery.id, 'contacted')}
                        disabled={isUpdatingStatus || selectedSalesQuery.status === 'contacted'}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-sm border uppercase tracking-wider transition-colors font-mono cursor-pointer ${
                          selectedSalesQuery.status === 'contacted'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-550'
                            : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        <CheckCircle size={14} />
                        Contacted
                      </button>

                      <button
                        onClick={() => handleUpdateSalesStatus(selectedSalesQuery.id, 'archived')}
                        disabled={isUpdatingStatus || selectedSalesQuery.status === 'archived'}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-sm border uppercase tracking-wider transition-colors font-mono cursor-pointer ${
                          selectedSalesQuery.status === 'archived'
                            ? 'bg-slate-500/10 border-slate-500/20 text-slate-500'
                            : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        <XCircle size={14} />
                        Archive
                      </button>
                    </div>
                  </div>

                  {/* Inquiry Details Fields */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 font-mono font-bold">
                          <User size={10} />
                          Contact Person
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                          {selectedSalesQuery.contactName}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 font-mono font-bold">
                          <Mail size={10} />
                          Contact Email
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-mono font-medium">
                          {selectedSalesQuery.email}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 font-mono font-bold">
                          <Layers size={10} />
                          Estimated Team Size
                        </div>
                        <p className="text-xs text-slate-850 dark:text-slate-200 font-mono">
                          {selectedSalesQuery.teamSize} members
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 font-mono font-bold">
                          <Clock size={10} />
                          Requested Date
                        </div>
                        <p className="text-xs text-slate-850 dark:text-slate-200 font-mono">
                          {new Date(selectedSalesQuery.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 font-mono font-bold">
                        <MessageSquare size={10} />
                        Inquiry Message
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-850 rounded-sm text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-60 overflow-y-auto select-all whitespace-pre-wrap">
                        {selectedSalesQuery.message || 'No additional message was provided.'}
                      </div>

                      <div className="pt-2">
                        <a
                          href={`mailto:${selectedSalesQuery.email}?subject=Writopedia Enterprise Inquiry - ${selectedSalesQuery.companyName}`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold uppercase transition-all rounded-sm hover:bg-slate-850 dark:hover:bg-white/90"
                        >
                          <Mail size={14} />
                          Draft Outreach Email
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Absolute Deletion Anchor */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-900 flex justify-end">
                    <button
                      onClick={() => handleDeleteSalesQuery(selectedSalesQuery.id)}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1 text-[10px] font-bold text-red-600 dark:text-red-405 rounded-sm hover:bg-red-500/10 transition-colors flex items-center gap-1.5 uppercase tracking-widest font-mono cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Delete Lead Record
                    </button>
                  </div>

                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col space-y-6">
                {/* Custom System Prompt Engine Config Board */}
                <div id="prompt-engine-settings-card" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-left">
                    <Sliders className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                        Prompt Engine Feature Control
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                        Global toggle controls for image & video generation
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed text-left">
                    Writopedia leverages a proprietary multi-layer AI prompt engine to enrich user intents. If output visuals are over-stylized, toggle specific sub-engines or disable prompt expansion to enforce natural direct-rendering pipelines.
                  </p>

                  <div className="space-y-4">
                    {/* Toggle row 1 - enableAiRewrite */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors text-left">
                      <div className="flex gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Magic Prompt Expansion</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Automatically rewrite and expand user prompts into rich photography/visual directives using Gemini model expansion. Disable to use raw user input.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSettings('enableAiRewrite')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          engineSettings.enableAiRewrite ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            engineSettings.enableAiRewrite ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle row 2 - enablePhotoStyling */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors text-left">
                      <div className="flex gap-2.5">
                        <Camera className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Photographic & Lighting Styling</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Inject elite photography attributes (Rembrandt splits, volumetric mist, golden hours, premium material layers, raw slate). Disable for plain natural textures.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSettings('enablePhotoStyling')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          engineSettings.enablePhotoStyling ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            engineSettings.enablePhotoStyling ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle row 3 - enableGuidelines */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors text-left">
                      <div className="flex gap-2.5">
                        <BookOpen className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Brand Context & Demographics Integration</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Weave corporate pillars, target colors, region settings, active voice accents, and requested visual ethnicities directly into background concepts.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSettings('enableGuidelines')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          engineSettings.enableGuidelines ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            engineSettings.enableGuidelines ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle row 4 - enableCinematicStoryboard */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors text-left">
                      <div className="flex gap-2.5">
                        <Film className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Cinematic Video Storyboard Expansion</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Automatically rewrite and expand video promos into cohesive, progressive 5-line storylines for Veo generators. Disable to render raw prompts instantly.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSettings('enableCinematicStoryboard')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          engineSettings.enableCinematicStoryboard ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            engineSettings.enableCinematicStoryboard ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle row 5 - allowTextOnAssets */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors text-left">
                      <div className="flex gap-2.5">
                        <FileText className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Allow Text & Overlay on Assets</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Generate overlay typography, brand logo bakes, and words on generated images/videos. Disable to strictly produce clean, textless, layout-ready visuals.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSettings('allowTextOnAssets')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          engineSettings.allowTextOnAssets ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            engineSettings.allowTextOnAssets ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-100/40 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/50 rounded-lg">
                  <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2 animate-pulse" />
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">Administrative Desk Idle</h3>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs font-mono uppercase">Select a curation request from the left queue to begin last-mile validation.</p>
                </div>
              </div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
