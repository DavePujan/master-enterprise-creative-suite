import React from 'react';
import type { AdSpecShot, AdSpecCharacterBible, AdSpecProductBible, AdSpecLocationBible, AdSpecAssetBible } from '@shared-types/adSpec.js';
import { 
  formatShotFraming, 
  formatCameraMovement, 
  formatCameraAngle, 
  formatDepthOfField,
  formatTimeRange,
  formatShotPurpose,
  formatSubjectProminence,
  formatSemanticRole
} from './planFormatters.js';
import { 
  X, 
  Camera, 
  Film, 
  MapPin, 
  Volume2, 
  ShieldCheck, 
  Link2, 
  Lock, 
  Sparkles, 
  Layers, 
  Clock, 
  Activity, 
  SunMedium, 
  Eye
} from 'lucide-react';

export interface ShotDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shot: AdSpecShot | null;
  sequence: number;
  totalShots: number;
  startSeconds: number;
  onAskAi: (shotId: string) => void;
  characters?: AdSpecCharacterBible;
  products?: AdSpecProductBible;
  locations?: AdSpecLocationBible;
  assets?: AdSpecAssetBible;
}

export const ShotDetailDrawer: React.FC<ShotDetailDrawerProps> = ({
  isOpen,
  onClose,
  shot,
  sequence,
  totalShots,
  startSeconds,
  onAskAi,
  characters,
  products,
  locations,
  assets
}) => {
  if (!isOpen || !shot) return null;

  const duration = shot.durationSeconds || 3.0;
  const timeRange = formatTimeRange(startSeconds, duration);
  const purpose = formatShotPurpose(undefined, sequence, totalShots);

  // Resolved Location Name
  const locationId = (shot.action as any)?.locationRef || (shot as any).environment?.locationId;
  const matchedLocation = locations?.locations?.find(l => l.locationId === locationId);
  const locationName = matchedLocation ? matchedLocation.name : (locationId || 'Studio Stage');

  // Resolved Characters with Locks
  const featuredCharIds: string[] = (shot.action as any)?.featuredCharacters || [];
  const resolvedCharacters = featuredCharIds.map(charId => {
    const found = characters?.characters?.find(c => c.characterId === charId);
    return {
      id: charId,
      name: found ? found.name : charId,
      role: found?.role || 'Actor',
      appearance: found?.physicalAppearance?.face || 'Clean production look',
      wardrobe: found?.wardrobe?.defaultOutfit || 'Standard wardrobe',
      locks: found?.locks || []
    };
  });

  // Resolved Products with Locks
  const featuredProdIds: string[] = (shot.action as any)?.featuredProducts || [];
  const resolvedProducts = featuredProdIds.map(prodId => {
    const found = products?.products?.find(p => p.productId === prodId);
    return {
      id: prodId,
      name: found ? found.name : prodId,
      category: found?.category || 'Commercial Product',
      branding: found?.branding?.logoPlacement || 'Centered',
      locks: found?.locks || []
    };
  });

  // Choreography Beats
  const choreographyBeats = shot.action?.choreography || [];

  // Continuity Inherited & Produced States
  const inheritedStates = (shot.continuity as any)?.inheritedStates || [];
  const producedStates = (shot.continuity as any)?.producedStates || [];

  // QA Expectations
  const qa = shot.qaExpectations || {};

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-left overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-2.5 py-1 rounded-xs">
              SHOT {sequence.toString().padStart(2, '0')}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Shot Cinematography & Production Plan
              </h2>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {timeRange} ({duration.toFixed(1)}s) · {purpose}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAskAi(shot.shotId);
              }}
              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xs text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
            >
              <Sparkles size={13} />
              Revise with AI
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close Drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Visual Action & Choreography */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              <Film size={14} className="text-rose-500" />
              <span>Visual Action & Temporal Choreography</span>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm space-y-3">
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {shot.action?.visualDescription || 'Visual action description progressing the commercial story.'}
              </p>

              {choreographyBeats.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase font-mono text-slate-400">
                    Choreography Beats Breakdown
                  </span>
                  <div className="space-y-1.5">
                    {choreographyBeats.map((beat: any, bIdx: number) => (
                      <div 
                        key={bIdx}
                        className="flex items-start gap-2.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xs text-xs"
                      >
                        <span className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                          {beat.relativeStart !== undefined ? `${beat.relativeStart}s - ${beat.relativeEnd}s` : `Beat ${bIdx + 1}`}
                        </span>
                        <div className="flex-1">
                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {beat.action || beat.description || beat}
                          </p>
                          {beat.bodyMechanics && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Mechanics: {beat.bodyMechanics}
                            </p>
                          )}
                          {beat.interaction && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Interaction: {beat.interaction}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Camera & Cinematography */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              <Camera size={14} className="text-rose-500" />
              <span>Cinematographic Camera Specifications</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Framing</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatShotFraming(shot.camera?.framing || (shot.camera as any)?.shotFraming || (shot.camera as any)?.shotSize)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Camera Angle</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCameraAngle(shot.camera?.angle || (shot.camera as any)?.cameraAngle)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Camera Movement</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCameraMovement(shot.camera?.cameraMovement || (shot.camera as any)?.movement)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Lens Characteristics</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {shot.camera?.lensFocalLength || (shot.camera as any)?.lensCharacteristics || '35mm Prime'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Depth of Field</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDepthOfField(shot.camera?.depthOfField || (shot.camera as any)?.depthIntent)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Composition</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {(shot.camera as any)?.composition || 'Rule of Thirds Horizon Focus'}
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Lighting & Atmosphere */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              <SunMedium size={14} className="text-rose-500" />
              <span>Lighting & Visual Atmosphere</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Location Environment:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{locationName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lighting Mood:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {shot.lighting?.mood || shot.lighting?.source || 'Natural diffused daylight'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Contrast Ratio:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                  {shot.lighting?.contrast || 'Balanced Medium Contrast'}
                </span>
              </div>
              {shot.lighting?.atmosphere && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Atmosphere Effects:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{shot.lighting.atmosphere}</span>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Subjects & Preserved Locks */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              <Lock size={14} className="text-emerald-500" />
              <span>Featured Subjects & Preserved Locks</span>
            </div>

            <div className="space-y-2">
              {resolvedCharacters.map(char => (
                <div 
                  key={char.id}
                  className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{char.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">({char.role})</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Outfit: {char.wardrobe}
                    </p>
                  </div>
                  {char.locks.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/60">
                      <Lock size={10} />
                      Locks: {char.locks.join(', ')}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px] italic">Unlocked</span>
                  )}
                </div>
              ))}

              {resolvedProducts.map(prod => (
                <div 
                  key={prod.id}
                  className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{prod.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">({prod.category})</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Logo Placement: {prod.branding}
                    </p>
                  </div>
                  {prod.locks.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/60">
                      <Lock size={10} />
                      Locks: {prod.locks.join(', ')}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px] italic">Unlocked</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Audio Design */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              <Volume2 size={14} className="text-rose-500" />
              <span>Sound Design & Dialogue</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs space-y-2">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Dialogue / Voiceover</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium italic mt-0.5">
                  {shot.audio?.voiceover || (shot.audio as any)?.dialogue ? `"${shot.audio?.voiceover || (shot.audio as any)?.dialogue}"` : 'No spoken dialogue'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Sound Effects (SFX)</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                  {(shot.audio?.soundEffects && shot.audio.soundEffects.length > 0) ? shot.audio.soundEffects.join(', ') : 'Natural ambient Foley'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Music Progression</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                  {shot.audio?.musicCue || 'Synchronized soundtrack pacing'}
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Quality Assurance Acceptance Criteria */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Shot Quality Assurance Criteria</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs space-y-2.5">
              <div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Must Show</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {(qa.mustShow && qa.mustShow.length > 0) ? qa.mustShow.join(' · ') : 'Key commercial product & character focus'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 uppercase font-bold block">Must Not Show</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {(qa.mustNotShow && qa.mustNotShow.length > 0) ? qa.mustNotShow.join(' · ') : 'Motion blur, anatomical distortion, illegible text'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Subject Prominence:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatSubjectProminence(qa.subjectProminence)}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
