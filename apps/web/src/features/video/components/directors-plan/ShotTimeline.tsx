import React from 'react';
import type { AdSpecShot } from '@shared-types/adSpec.js';
import { formatTimecode, formatShotPurpose } from './planFormatters.js';
import { cn } from '@web/lib/utils.js';
import { Film, Clock } from 'lucide-react';

export interface ShotTimelineProps {
  shots: AdSpecShot[];
  selectedShotId: string | null;
  onSelectShot: (shotId: string) => void;
  totalDurationSeconds: number;
}

export const ShotTimeline: React.FC<ShotTimelineProps> = ({
  shots,
  selectedShotId,
  onSelectShot,
  totalDurationSeconds
}) => {
  if (!shots || shots.length === 0) return null;

  // Calculate cumulative starts for each shot
  let currentStart = 0;
  const shotSegments = shots.map((shot, idx) => {
    const start = currentStart;
    const duration = shot.durationSeconds || 3;
    currentStart += duration;
    const isSelected = selectedShotId === shot.shotId;
    const widthPercent = totalDurationSeconds > 0 
      ? Math.max(8, (duration / totalDurationSeconds) * 100) 
      : 100 / shots.length;

    return {
      shot,
      index: idx,
      start,
      end: start + duration,
      duration,
      isSelected,
      widthPercent
    };
  });

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-xs text-left">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Film size={15} className="text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-sans">
            Production Shot Timeline
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
            {shots.length} {shots.length === 1 ? 'Shot' : 'Shots'} · {formatTimecode(totalDurationSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 dark:text-slate-500">
          <Clock size={13} />
          <span>Timeline View: 0.0s – {formatTimecode(totalDurationSeconds)}</span>
        </div>
      </div>

      {/* Interactive Timeline Bar */}
      <div className="relative w-full h-14 bg-slate-100 dark:bg-slate-950 rounded-sm p-1 flex items-stretch gap-1 overflow-x-auto border border-slate-200/80 dark:border-slate-800/80 select-none">
        {shotSegments.map((segment) => {
          const { shot, index, start, end, duration, isSelected, widthPercent } = segment;
          const purpose = formatShotPurpose((shot as any).narrativePurpose || (shot as any).purpose, shot.sequence || index + 1, shots.length);

          return (
            <button
              key={shot.shotId}
              type="button"
              onClick={() => onSelectShot(shot.shotId)}
              style={{ width: `${widthPercent}%` }}
              className={cn(
                "relative group flex flex-col justify-between p-2 rounded-xs transition-all text-left cursor-pointer min-w-22 shrink-0 border overflow-hidden",
                isSelected
                  ? "bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/80 ring-2 ring-rose-500/30 text-rose-950 dark:text-rose-100 shadow-xs"
                  : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-850"
              )}
              title={`Shot ${shot.sequence || index + 1} (${formatTimecode(start)} – ${formatTimecode(end)}): ${purpose}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  SHOT {(shot.sequence || index + 1).toString().padStart(2, '0')}
                </span>
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                  {formatTimecode(duration)}
                </span>
              </div>

              <div className="truncate text-[10px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                {purpose}
              </div>

              {/* Active Underline Accent */}
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-0.75 bg-rose-600 dark:bg-rose-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Timecode markers below ruler */}
      <div className="flex justify-between items-center px-1 mt-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-500">
        <span>00:00.0s</span>
        <span>{formatTimecode(totalDurationSeconds / 2)}</span>
        <span>{formatTimecode(totalDurationSeconds)}</span>
      </div>
    </div>
  );
};
