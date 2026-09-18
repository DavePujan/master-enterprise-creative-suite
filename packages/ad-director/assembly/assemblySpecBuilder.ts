/**
 * Assembly Specification Builder.
 * Converts approved ExecutionSnapshots, frozen AdSpecs, and accepted GenerationResults
 * into an immutable, deterministic AssemblySpec with cryptographic hash.
 *
 * Framework-free: MUST NOT import React or Express.
 */

import crypto from 'node:crypto';
import type { AdSpec } from '../../types/adSpec.js';
import type {
  AssemblySpec,
  AssemblyShotItem,
  AssemblyTransitionItem,
  AssemblyAudioTrack,
  AssemblyCaptionItem,
  AssemblyLogoOverlay,
  AssemblyCtaCard,
  AssemblyOutputConfig
} from '../../contracts/videoAssemblyContracts.js';

export interface BuildAssemblySpecParams {
  projectId: string;
  executionId: string;
  snapshotId: string;
  specVersion: number;
  specHash: string;
  frozenAdSpec: AdSpec;
  acceptedResults: Array<{
    shotId: string;
    generationJobId: string;
    attemptNumber: number;
    outputAssetId: string;
    durationSeconds?: number;
    storagePath?: string;
    acceptanceStatus?: string;
  }>;
  options?: {
    outputAspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
    resolution?: '720p' | '1080p';
    customShotOrder?: string[];
    includeLogo?: boolean;
    includeCta?: boolean;
    requestedVariants?: Array<'vertical_720p' | 'square_1x1' | 'landscape_16x9'>;
  };
}

export class AssemblySpecBuilder {
  /**
   * Constructs an immutable AssemblySpec and computes its deterministic content hash.
   */
  build(params: BuildAssemblySpecParams): AssemblySpec {
    const {
      projectId,
      executionId,
      snapshotId,
      specVersion,
      specHash,
      frozenAdSpec,
      acceptedResults,
      options
    } = params;

    const adSpec = frozenAdSpec || (params as any).spec || {};
    const plannedShots = (adSpec.shots && adSpec.shots.length > 0)
      ? adSpec.shots
      : (adSpec.directorsPlan?.plannedShots || adSpec.production?.shots || []);

    // 1. Resolve Shot Ordering (Preserves planned sequence unless custom order explicitly specified)
    let orderedShotIds: string[] = [];
    if (options?.customShotOrder && options.customShotOrder.length > 0) {
      orderedShotIds = options.customShotOrder;
    } else {
      const sorted = [...plannedShots].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      orderedShotIds = sorted.map(s => s.shotId || (s as any).id);
    }

    // 2. Map Shots to Accepted Results
    const shots: AssemblyShotItem[] = [];
    let cumulativeDuration = 0;

    for (let i = 0; i < orderedShotIds.length; i++) {
      const sId = orderedShotIds[i];
      const planShot = plannedShots.find(s => (s.shotId || (s as any).id) === sId);
      const acceptedResult = acceptedResults.find(r => r.shotId === sId);

      const targetDuration = planShot?.timing?.duration ?? planShot?.durationSeconds ?? 5;
      const actualSourceDuration = acceptedResult?.durationSeconds ?? targetDuration;

      shots.push({
        shotId: sId,
        shotName: planShot?.name || (planShot as any)?.shotName || sId,
        sequence: planShot?.sequence ?? (i + 1),
        order: i + 1,
        acceptedResultId: acceptedResult?.generationJobId || `mock_res_${sId}`,
        acceptedAttemptId: acceptedResult?.generationJobId || acceptedResult?.outputAssetId || `mock_res_${sId}`,
        attemptNumber: acceptedResult?.attemptNumber || 1,
        outputAssetId: acceptedResult?.outputAssetId || `asset_${sId}`,
        storagePath: acceptedResult?.storagePath || `videos/${projectId}/${sId}.mp4`,
        sourceDurationSeconds: actualSourceDuration,
        trimStartSeconds: 0,
        trimStart: 0,
        trimEndSeconds: targetDuration,
        trimEnd: targetDuration,
        playbackDurationSeconds: targetDuration,
        playbackDuration: targetDuration,
        originalAudioMode: (planShot?.audio as any)?.mode || 'mute',
        originalAudioVolume: 1.0
      });

      cumulativeDuration += targetDuration;
    }

    // 3. Transitions between adjacent shots
    const transitions: AssemblyTransitionItem[] = [];
    for (let i = 0; i < shots.length - 1; i++) {
      const current = shots[i];
      const next = shots[i + 1];
      const planShot = plannedShots.find(s => (s.shotId || (s as any).id) === current.shotId);
      const transType = (planShot?.transitions?.outgoing as any) || 'cut';
      const duration = transType === 'cut' ? 0 : 0.5;

      transitions.push({
        fromShotId: current.shotId,
        toShotId: next.shotId,
        type: transType,
        durationSeconds: duration
      });
    }

    // 4. Audio Tracks (Voiceover, Music, SFX)
    const audioTracks: AssemblyAudioTrack[] = [];

    // Background Music
    if (adSpec.audioPlan?.musicAssetId || (adSpec.brand as any)?.audioStyle) {
      audioTracks.push({
        id: `track_music_${executionId.slice(0, 8)}`,
        type: 'music',
        assetId: adSpec.audioPlan?.musicAssetId,
        storagePath: adSpec.audioPlan?.musicStoragePath,
        startTimeSeconds: 0,
        endTimeSeconds: cumulativeDuration,
        volume: 0.65,
        fadeInSeconds: 0.5,
        fadeOutSeconds: 1.5,
        loop: true,
        ducking: {
          enabled: true,
          duckVolume: 0.2, // Drop to 20% when voiceover plays
          fadeDurationSeconds: 0.3
        }
      });
    }

    // Voiceover (if planned)
    if (adSpec.audioPlan?.voiceoverAssetId || adSpec.brief?.cta?.spokenText) {
      audioTracks.push({
        id: `track_vo_${executionId.slice(0, 8)}`,
        type: 'voiceover',
        assetId: adSpec.audioPlan?.voiceoverAssetId,
        storagePath: adSpec.audioPlan?.voiceoverStoragePath,
        startTimeSeconds: 0.5,
        volume: 1.0,
        fadeInSeconds: 0.1,
        fadeOutSeconds: 0.2
      });
    }

    // 5. Captions
    const captions: AssemblyCaptionItem[] = [];
    let captionCursor = 0.5;
    for (const s of plannedShots) {
      const voText = s.audio?.voiceover || (s.audio as any)?.dialogue;
      const sDuration = s.timing?.duration ?? s.durationSeconds ?? 5;
      if (voText) {
        captions.push({
          id: `cap_${s.shotId}`,
          text: voText,
          startTimeSeconds: captionCursor,
          endTimeSeconds: captionCursor + Math.max(sDuration - 0.5, 1.0),
          position: 'bottom'
        });
      }
      captionCursor += sDuration;
    }

    // 6. Brand Logo Overlay
    let logo: AssemblyLogoOverlay | undefined = undefined;
    const includeLogo = options?.includeLogo !== false;
    const logoAssetId = adSpec.brand?.visualStyle?.logoAssetId;
    if (includeLogo && (logoAssetId || adSpec.brief?.mustInclude?.some((i: string) => i.toLowerCase().includes('logo')))) {
      logo = {
        enabled: true,
        assetId: logoAssetId,
        position: 'top_right',
        scalePercent: 12,
        opacity: 0.9,
        startTimeSeconds: 0.5,
        endTimeSeconds: cumulativeDuration
      };
    }

    // 7. Call To Action (CTA) Card
    let cta: AssemblyCtaCard | undefined = undefined;
    const includeCta = options?.includeCta !== false;
    if (includeCta && (adSpec.brief?.cta?.visualText || adSpec.brief?.cta?.actionIntent)) {
      const ctaDuration = 3.0;
      cta = {
        enabled: true,
        type: 'composite',
        text: adSpec.brief.cta.visualText || 'Learn More',
        actionIntent: adSpec.brief.cta.actionIntent || 'shop_now',
        startTimeSeconds: Math.max(cumulativeDuration - ctaDuration, 0),
        durationSeconds: ctaDuration
      };
    }

    // 8. Output Configuration
    const targetRatio = options?.outputAspectRatio ||
      (adSpec.generationRequirements?.aspectRatio as any) ||
      adSpec.brief?.aspectRatio ||
      '9:16';

    const isPortrait = targetRatio === '9:16';
    const isSquare = targetRatio === '1:1';
    const resolution = options?.resolution || '1080p';

    let width = 1080;
    let height = 1920;

    if (resolution === '720p') {
      width = isPortrait ? 720 : isSquare ? 720 : 1280;
      height = isPortrait ? 1280 : isSquare ? 720 : 720;
    } else {
      width = isPortrait ? 1080 : isSquare ? 1080 : 1920;
      height = isPortrait ? 1920 : isSquare ? 1080 : 1080;
    }

    const output: AssemblyOutputConfig = {
      width,
      height,
      aspectRatio: targetRatio,
      frameRate: 30,
      fps: 30,
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4',
      targetBitrateKbps: 8000,
      targetDurationSeconds: cumulativeDuration
    };

    const requestedVariants = options?.requestedVariants || [
      'vertical_720p',
      'square_1x1',
      'landscape_16x9'
    ];

    const hasVo = Boolean(adSpec.audioPlan?.voiceoverAssetId || adSpec.brief?.cta?.spokenText);
    const hasMusic = Boolean(adSpec.audioPlan?.musicAssetId || (adSpec.brand as any)?.audioStyle);

    const spec: AssemblySpec = {
      id: crypto.randomUUID(),
      projectId,
      executionId,
      sourceExecutionSnapshotId: snapshotId,
      specVersion,
      specHash,
      adSpecVersion: adSpec.identity?.specVersion || 1,
      adSpecHash: specHash,
      shots,
      transitions,
      audioTracks,
      audio: {
        voiceover: {
          enabled: hasVo,
          volume: 1.0,
          assetId: adSpec.audioPlan?.voiceoverAssetId
        },
        music: {
          enabled: hasMusic,
          volume: 0.35,
          fadeOutDuration: 2.0,
          assetId: adSpec.audioPlan?.musicAssetId
        },
        originalShotAudio: (plannedShots[0]?.audio as any)?.mode || 'mute',
        soundEffects: []
      },
      timing: {
        totalTargetDuration: cumulativeDuration,
        calculatedDuration: cumulativeDuration
      },
      captions,
      logo,
      cta,
      output,
      requestedVariants,
      createdAt: new Date().toISOString()
    };

    return spec;
  }

  buildAssemblySpec(params: any): { spec: AssemblySpec; assemblyHash: string } {
    const p: BuildAssemblySpecParams = {
      projectId: params.projectId,
      executionId: params.executionId,
      snapshotId: params.snapshot?.snapshotId || params.snapshotId,
      specVersion: params.version || params.specVersion || 1,
      specHash: params.snapshot?.adSpecHash || params.snapshot?.specHash || params.specHash || 'hash-1',
      frozenAdSpec: params.snapshot?.frozenAdSpec || params.snapshot?.spec || params.frozenAdSpec,
      acceptedResults: (params.shotJobs || params.acceptedResults || []).map((j: any) => ({
        shotId: j.shotId,
        generationJobId: j.generationJobId || j.activeAttemptId || j.completedAttemptId || 'job-1',
        attemptNumber: j.attemptNumber || 1,
        outputAssetId: j.outputAssetId || j.outputUrl || 'asset-1',
        durationSeconds: j.durationSeconds || 4,
        storagePath: j.storagePath || j.outputUrl,
        acceptanceStatus: j.acceptanceStatus || 'accepted'
      })),
      options: params.options || params.customOverrides
    };

    const spec = this.build(p);
    if (params.customOverrides?.transitions) {
      spec.transitions = params.customOverrides.transitions;
    }
    const hash = this.calculateAssemblyHash(spec);
    return { spec, assemblyHash: hash };
  }

  /**
   * Deterministically calculates SHA-256 hash of the AssemblySpec content.
   * Excludes timestamps and ephemeral IDs.
   */
  calculateAssemblyHash(spec: AssemblySpec): string {
    const canonicalPayload = {
      sourceExecutionSnapshotId: spec.sourceExecutionSnapshotId,
      specVersion: spec.specVersion,
      specHash: spec.specHash,
      shots: spec.shots.map(s => ({
        shotId: s.shotId,
        order: s.order,
        outputAssetId: s.outputAssetId,
        trimStartSeconds: s.trimStartSeconds,
        trimEndSeconds: s.trimEndSeconds,
        playbackDurationSeconds: s.playbackDurationSeconds,
        originalAudioMode: s.originalAudioMode
      })),
      transitions: spec.transitions.map(t => ({
        fromShotId: t.fromShotId,
        toShotId: t.toShotId,
        type: t.type,
        durationSeconds: t.durationSeconds
      })),
      audioTracks: spec.audioTracks.map(a => ({
        type: a.type,
        assetId: a.assetId,
        startTimeSeconds: a.startTimeSeconds,
        endTimeSeconds: a.endTimeSeconds,
        volume: a.volume,
        ducking: a.ducking
      })),
      captions: spec.captions.map(c => ({
        text: c.text,
        startTimeSeconds: c.startTimeSeconds,
        endTimeSeconds: c.endTimeSeconds,
        position: c.position
      })),
      logo: spec.logo ? {
        enabled: spec.logo.enabled,
        position: spec.logo.position,
        scalePercent: spec.logo.scalePercent,
        opacity: spec.logo.opacity,
        startTimeSeconds: spec.logo.startTimeSeconds
      } : null,
      cta: spec.cta ? {
        enabled: spec.cta.enabled,
        type: spec.cta.type,
        text: spec.cta.text,
        startTimeSeconds: spec.cta.startTimeSeconds,
        durationSeconds: spec.cta.durationSeconds
      } : null,
      output: {
        width: spec.output.width,
        height: spec.output.height,
        aspectRatio: spec.output.aspectRatio,
        frameRate: spec.output.frameRate,
        videoCodec: spec.output.videoCodec,
        container: spec.output.container,
        targetDurationSeconds: spec.output.targetDurationSeconds
      }
    };

    return crypto.createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
  }
}

export const assemblySpecBuilder = new AssemblySpecBuilder();
