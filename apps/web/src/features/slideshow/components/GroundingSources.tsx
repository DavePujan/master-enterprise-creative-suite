import React from 'react';
import { Globe } from 'lucide-react';

export const GroundingSources = ({ metadata }: { metadata?: any }) => {
  const chunks = metadata?.groundingChunks;
  if (!chunks || chunks.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        <Globe size={12} className="text-brand-primary" />
        Verified Sources & References
      </div>
      <div className="flex flex-wrap gap-2">
        {chunks.map((chunk: any, i: number) => {
          const source = chunk.web || chunk.maps;
          if (!source) return null;
          return (
            <a 
              key={i}
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:bg-brand-primary/5 hover:border-brand-primary/20 hover:text-brand-primary transition-all flex items-center gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-brand-primary/40" />
              {source.title || new URL(source.uri).hostname}
            </a>
          );
        })}
      </div>
    </div>
  );
};
