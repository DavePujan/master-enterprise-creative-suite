import React, { useState } from 'react';
import { PresentationDocument } from '@presentation-engine/index.js';
import { presentationClient, ExportJobStatus } from '../services/presentationClient.js';
import { FileDown, Loader2, CheckCircle2, AlertCircle, X, Presentation, FileText } from 'lucide-react';

interface ExportModalProps {
  document: PresentationDocument;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  document,
  isOpen,
  onClose
}) => {
  const [format, setFormat] = useState<'pptx' | 'pdf'>('pptx');
  const [isExporting, setIsExporting] = useState(false);
  const [jobStatus, setJobStatus] = useState<ExportJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setError(null);
    setJobStatus(null);

    try {
      // 1. Submit export job request
      const initialJob = await presentationClient.requestExport(document.id, format);
      setJobStatus(initialJob);

      // 2. Poll until ready or failed
      const completedJob = await presentationClient.pollExportUntilReady(
        initialJob.id,
        (progress) => setJobStatus(progress)
      );

      setJobStatus(completedJob);

      // Auto-trigger download if signed URL provided
      if (completedJob.downloadUrl) {
        window.open(completedJob.downloadUrl, '_blank');
      }
    } catch (err: any) {
      setError(err.message || 'Export failed. Please retry.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isExporting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <FileDown className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Export Presentation</h3>
            <p className="text-xs text-slate-400">
              Server-side native rendering for cross-platform fidelity
            </p>
          </div>
        </div>

        {/* Format Selector Cards */}
        {!jobStatus?.downloadUrl && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div
              onClick={() => !isExporting && setFormat('pptx')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                format === 'pptx'
                  ? 'border-blue-500 bg-blue-500/10 shadow-md ring-1 ring-blue-500'
                  : 'border-white/10 bg-slate-800/40 hover:bg-slate-800/80 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Presentation className="w-6 h-6 text-orange-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">
                  Office Native
                </span>
              </div>
              <div className="font-bold text-sm text-white">PowerPoint (.pptx)</div>
              <div className="text-xs text-slate-400 mt-1 leading-snug">
                Editable charts, vector shapes, styled tables & speaker notes.
              </div>
            </div>

            <div
              onClick={() => !isExporting && setFormat('pdf')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                format === 'pdf'
                  ? 'border-blue-500 bg-blue-500/10 shadow-md ring-1 ring-blue-500'
                  : 'border-white/10 bg-slate-800/40 hover:bg-slate-800/80 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-6 h-6 text-rose-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
                  Vector PDF
                </span>
              </div>
              <div className="font-bold text-sm text-white">Adobe PDF (.pdf)</div>
              <div className="text-xs text-slate-400 mt-1 leading-snug">
                Vector document output ready for client sharing and printing.
              </div>
            </div>
          </div>
        )}

        {/* Progress or Ready Status */}
        {isExporting && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white block">
                {jobStatus?.status === 'processing'
                  ? `Rendering ${format.toUpperCase()} on server...`
                  : 'Queuing export worker...'}
              </span>
              Processing {document.slides.length} slides and generating native elements.
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {jobStatus?.status === 'ready' && jobStatus.downloadUrl && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-white">Export Ready!</div>
            <p className="text-xs text-slate-300 mt-1 mb-3">
              Your presentation was compiled and saved to storage.
            </p>
            <a
              href={jobStatus.downloadUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <FileDown className="w-4 h-4" />
              Download {format.toUpperCase()} File
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {jobStatus?.status === 'ready' ? 'Close' : 'Cancel'}
          </button>

          {!jobStatus?.downloadUrl && (
            <button
              onClick={handleStartExport}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Generate {format.toUpperCase()}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
