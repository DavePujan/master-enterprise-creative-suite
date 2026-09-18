import React from 'react';
import type { AdSpecShot, AdSpecCharacterBible, AdSpecProductBible, AdSpecLocationBible, AdSpecAssetBible } from '@shared-types/adSpec.js';
import { 
  formatShotFraming, 
  formatCameraMovement, 
  formatCameraAngle, 
  formatTimeRange,
  formatShotPurpose,
  formatSemanticRole
} from './planFormatters.js';
import { cn } from '@web/lib/utils.js';
import { 
  Camera, 
  MapPin, 
  Users, 
  Volume2, 
  Link2, 
  Lock, 
  Sparkles, 
  Eye, 
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';

export interface ShotCardProps {
  shot: AdSpecShot;
  sequence: number;
  totalShots: number;
  startSeconds: number;
  isSelected: boolean;
  onSelect: () => void;
  onOpenDetail: () => void;
  onAskAi: (shotId: string) => void;
  characters?: AdSpecCharacterBible;
  products?: AdSpecProductBible;
  locations?: AdSpecLocationBible;
  assets?: AdSpecAssetBible;
  continuityConflict?: string | null;
}

export const ShotCard: React.FC<ShotCardProps> = ({
  shot,
  sequence,
  totalShots,
  startSeconds,
  isSelected,
  onSelect,
  onOpenDetail,
  onAskAi,
  characters,
  products,
  locations,
  assets,
  continuityConflict
}) => {
  const duration = shot.durationSeconds || 3.0;
  const timeRange = formatTimeRange(startSeconds, duration);
  const purpose = formatShotPurpose((shot as any).narrativePurpose || (shot as any).purpose, sequence, totalShots);

  // Resolved Location Name
  const locationId = shot.environment?.locationId || (shot.action as any)?.locationRef;
  const locList = (locations as any)?.locations || (Array.isArray(locations) ? locations : []);
  const matchedLocation = locList.find((l: any) => (l.locationId || l.id) === locationId);
  const locationName = matchedLocation ? matchedLocation.name : (locationId || 'Studio Stage');

  // Resolved Characters with Locks
  const charList = (characters as any)?.characters || (Array.isArray(characters) ? characters : []);
  const subjectCharIds = (shot.subjects || [])
    .filter(s => s.entityType === 'character')
    .map(s => s.entityId);
  const featuredCharIds: string[] = subjectCharIds.length > 0
    ? subjectCharIds
    : ((shot.action as any)?.featuredCharacters || []);

  const resolvedCharacters = featuredCharIds.map(charId => {
    const found = charList.find((c: any) => (c.characterId || c.id) === charId);
    return {
      id: charId,
      name: found ? found.name : charId,
      locks: found?.locks || []
    };
  });

  // Resolved Products with Locks
  const prodList = (products as any)?.products || (Array.isArray(products) ? products : []);
  const subjectProdIds = (shot.subjects || [])
    .filter(s => s.entityType === 'product')
    .map(s => s.entityId);
  const featuredProdIds: string[] = subjectProdIds.length > 0
    ? subjectProdIds
    : ((shot.action as any)?.featuredProducts || []);

  const resolvedProducts = featuredProdIds.map(prodId => {
    const found = prodList.find((p: any) => (p.productId || p.id) === prodId);
    return {
      id: prodId,
      name: found ? found.name : prodId,
      locks: found?.locks || []
    };
  });

  // Camera Summary in Natural Language
  const cameraSummary = [
    formatShotFraming(shot.camera?.framing || (shot.camera as any)?.shotFraming || (shot.camera as any)?.shotSize),
    formatCameraAngle(shot.camera?.angle || (shot.camera as any)?.cameraAngle),
    formatCameraMovement(shot.camera?.cameraMovement || (shot.camera as any)?.movement)
  ].filter(Boolean).join(' · ');

  // Audio Summary
  const voiceoverText = shot.audio?.voiceover || (shot.audio as any)?.dialogue;
  const sfxList = shot.audio?.soundEffects || [];
  const sfxSummary = sfxList.length > 0 ? sfxList.slice(0, 2).join(', ') : null;

  // Reference Assets for this shot
  const matchedAssets = (assets?.assets || []).filter(a => {
    if (a.targetEntityId && (featuredCharIds.includes(a.targetEntityId) || featuredProdIds.includes(a.targetEntityId))) {
      return true;
    }
    if (sequence === 1 && a.semanticRole === 'first_frame') return true;
    if (sequence === totalShots && a.semanticRole === 'last_frame') return true;
    return false;
  }).slice(0, 3);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "w-full bg-white dark:bg-slate-900 border rounded-sm p-5 transition-all text-left relative cursor-pointer group shadow-xs",
        isSelected
          ? "border-rose-500/80 dark:border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/20 shadow-md"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 hover:shadow-sm"
      )}
    >
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xs">
            SHOT {sequence.toString().padStart(2, '0')}
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
            {timeRange} ({duration.toFixed(1)}s)
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-sans">
            {purpose}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {continuityConflict ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 rounded-xs">
              <AlertTriangle size={12} />
              Continuity Issue
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 rounded-xs">
              <Link2 size={11} />
              {sequence === 1 ? 'Opening State' : `Continues from Shot ${(sequence - 1).toString().padStart(2, '0')}`}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Inspect Shot Details"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Primary Action Description */}
      <div className="mt-3.5 space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block font-mono">
          Visual Action
        </span>
        <p className="text-sm text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
          {shot.action?.visualDescription || 'Cinematic shot action progressing the commercial narrative.'}
        </p>
      </div>

      {/* Technical Dimensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        {/* Camera */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase font-mono">
            <Camera size={12} />
            <span>Camera</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
            {cameraSummary}
          </p>
        </div>

        {/* Location & Lighting */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase font-mono">
            <MapPin size={12} />
            <span>Location & Lighting</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-medium truncate" title={locationName}>
            {locationName}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {shot.lighting?.mood || shot.lighting?.source || 'Natural diffused daylight'}
          </p>
        </div>

        {/* Subjects & Locks */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase font-mono">
            <Users size={12} />
            <span>Subjects</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {resolvedCharacters.length === 0 && resolvedProducts.length === 0 ? (
              <span className="text-slate-400 italic">No featured actors</span>
            ) : null}

            {resolvedCharacters.map(char => (
              <span 
                key={char.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
              >
                {char.name}
                {char.locks.length > 0 && (
                  <span title={`Locked: ${char.locks.join(', ')}`} className="text-emerald-500">
                    <Lock size={9} />
                  </span>
                )}
              </span>
            ))}

            {resolvedProducts.map(prod => (
              <span 
                key={prod.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
              >
                {prod.name}
                {prod.locks.length > 0 && (
                  <span title={`Locked: ${prod.locks.join(', ')}`} className="text-emerald-500">
                    <Lock size={9} />
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Audio Design */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase font-mono">
            <Volume2 size={12} />
            <span>Audio Design</span>
          </div>
          {voiceoverText ? (
            <p className="text-slate-700 dark:text-slate-300 font-medium italic line-clamp-1">
              "{voiceoverText}"
            </p>
          ) : sfxSummary ? (
            <p className="text-slate-500 dark:text-slate-400 line-clamp-1">
              SFX: {sfxSummary}
            </p>
          ) : (
            <p className="text-slate-400 italic">Ambient score</p>
          )}
        </div>
      </div>

      {/* Reference Asset Thumbnails (if any) */}
      {matchedAssets.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 font-mono">
            Visual References:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {matchedAssets.map((asset, aIdx) => (
              <div
                key={asset.assetId || aIdx}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xs text-[10px] font-medium text-slate-600 dark:text-slate-300"
                title={`Asset: ${asset.assetId} (${formatSemanticRole(asset.semanticRole)})`}
              >
                <Layers size={11} className="text-slate-400" />
                <span className="truncate max-w-36">{formatSemanticRole(asset.semanticRole)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card Action Footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAskAi(shot.shotId);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
        >
          <Sparkles size={13} />
          Ask AI about Shot {sequence.toString().padStart(2, '0')}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <Eye size={13} />
          Inspect Cinematography Details
        </button>
      </div>
    </div>
  );
};
