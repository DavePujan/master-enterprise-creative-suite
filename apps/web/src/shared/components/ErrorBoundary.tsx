import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.removeItem('creative_history');
      localStorage.removeItem('staged_text_brief');
      localStorage.removeItem('staged_image_brief');
      localStorage.removeItem('staged_video_brief');
      localStorage.removeItem('staged_audio_brief');
      localStorage.removeItem('staged_deck_brief');
      localStorage.removeItem('staged_full_strategy');
    } catch {}
    window.location.href = '/workspace';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 select-none font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-lg shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Something went wrong</h1>
                <p className="text-xs text-slate-400">The workspace encountered an unexpected runtime error.</p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] text-rose-400 break-all max-h-32 overflow-y-auto">
                {this.state.error.name}: {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw size={13} />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleClearStorageAndReload}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Clears local history cache to free storage quota"
              >
                <Trash2 size={13} />
                Clean Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
