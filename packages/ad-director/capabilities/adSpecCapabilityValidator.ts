/**
 * Canonical AdSpec Capability Validator.
 * Pre-flight verification engine that determines whether a target video generation model
 * can execute each shot and project specification before credits are spent.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { AdSpec, AdShot } from '@contracts/adSpecContracts.js';
import type {
  ModelCapability,
  CompatibilityViolation,
  ShotCompatibilityReport,
  ProjectCompatibilityReport,
  VideoAspectRatio
} from '@contracts/modelCapabilityContracts.js';

export class AdSpecCapabilityValidator {
  /**
   * Validates a single AdShot against a ModelCapability.
   * Returns actionable blockers and warnings.
   */
  public validateShot(
    shot: AdShot,
    adSpec: AdSpec,
    capability: ModelCapability
  ): ShotCompatibilityReport {
    const blockers: CompatibilityViolation[] = [];
    const warnings: CompatibilityViolation[] = [];
    const shotId = shot.shotId;

    // 1. DURATION COMPATIBILITY
    const shotDuration = shot.timing?.duration ?? shot.durationSeconds;
    if (typeof shotDuration === 'number') {
      const isExactMatch = capability.supported_durations.includes(shotDuration);
      if (!isExactMatch) {
        const closest = capability.supported_durations.reduce((prev, curr) =>
          Math.abs(curr - shotDuration) < Math.abs(prev - shotDuration) ? curr : prev
        );
        blockers.push({
          code: 'DURATION_MISMATCH',
          severity: 'blocker',
          shotId,
          message: `Shot "${shotId}" has duration ${shotDuration}s, which is not supported by ${capability.displayName} (supported: [${capability.supported_durations.join(', ')}]s).`,
          requirement: shotDuration,
          capability: capability.supported_durations,
          actionSuggestion: `Adapt shot duration to ${closest}s or select a model supporting ${shotDuration}s (e.g. Kling 3.0, Seedance 2.0).`
        });
      }
    }

    // 2. ASPECT RATIO COMPATIBILITY
    const targetAspectRatio: VideoAspectRatio =
      (shot as any).aspectRatio ||
      (adSpec.generationRequirements?.aspectRatio as VideoAspectRatio) ||
      (adSpec.brief && (adSpec.brief as any).aspectRatio as VideoAspectRatio) ||
      '16:9';

    if (!capability.aspect_ratios.includes(targetAspectRatio)) {
      blockers.push({
        code: 'ASPECT_RATIO_MISMATCH',
        severity: 'blocker',
        shotId,
        message: `Project aspect ratio "${targetAspectRatio}" is not supported by ${capability.displayName} (supported: [${capability.aspect_ratios.join(', ')}]).`,
        requirement: targetAspectRatio,
        capability: capability.aspect_ratios,
        actionSuggestion: `Select a model supporting "${targetAspectRatio}" or adapt project aspect ratio.`
      });
    }

    // 3. FIRST-FRAME KEYFRAME SUPPORT
    const assetList = adSpec.assets?.assets || [];
    const referencedAssets = assetList.filter(a => (shot.referencedAssetIds || []).includes(a.assetId));
    
    const requiresFirstFrame =
      adSpec.generationRequirements?.firstFrameRequired ||
      shot.transitions?.incoming === 'match_cut' ||
      (shot.referencedAssetIds || []).some(id => id.includes('first_frame') || id.includes('keyframe_start')) ||
      referencedAssets.some(a => a.semanticRole === 'first_frame');

    if (requiresFirstFrame && !capability.first_frame) {
      blockers.push({
        code: 'FIRST_FRAME_UNSUPPORTED',
        severity: 'blocker',
        shotId,
        message: `Shot "${shotId}" requires first-frame keyframe anchoring, but ${capability.displayName} does not support first-frame conditioning.`,
        requirement: true,
        capability: false,
        actionSuggestion: `Choose a model with first_frame support (e.g. Google Veo 3.1, Runway Gen-3, Kling 3.0, Luma 1.6).`
      });
    }

    // 4. LAST-FRAME CONDITIONING SUPPORT
    const requiresLastFrame =
      adSpec.generationRequirements?.lastFrameRequired ||
      shot.transitions?.outgoing === 'match_cut' ||
      (shot.referencedAssetIds || []).some(id => id.includes('last_frame') || id.includes('keyframe_end')) ||
      referencedAssets.some(a => a.semanticRole === 'last_frame') ||
      (shot.constraints?.mustHappen || []).some(rule => rule.toLowerCase().includes('last frame') || rule.toLowerCase().includes('end frame'));

    if (requiresLastFrame && !capability.last_frame) {
      blockers.push({
        code: 'LAST_FRAME_UNSUPPORTED',
        severity: 'blocker',
        shotId,
        message: `Shot "${shotId}" requires last-frame conditioning for match-cut continuity, but ${capability.displayName} does not support last-frame guidance.`,
        requirement: true,
        capability: false,
        actionSuggestion: `Choose a model with last_frame support (e.g. Google Veo 3.1 Pro, Kling 3.0, Luma 1.6) or change outgoing transition to a standard cut.`
      });
    }

    // 5. REFERENCE MEDIA CAPACITY
    const declaredReferences = (shot.referencedAssetIds || []).length;
    const subjectReferences = (shot.subjects || []).length;
    const totalRequiredReferences = Math.max(declaredReferences, subjectReferences);

    if (totalRequiredReferences > capability.max_references) {
      blockers.push({
        code: 'REFERENCE_COUNT_EXCEEDED',
        severity: 'blocker',
        shotId,
        message: `Shot "${shotId}" references ${totalRequiredReferences} entity asset(s), exceeding ${capability.displayName} maximum limit of ${capability.max_references}.`,
        requirement: totalRequiredReferences,
        capability: capability.max_references,
        actionSuggestion: `Reduce reference assets to ${capability.max_references} or switch to a high-capacity model (e.g. Seedance 2.0 with up to 9 references).`
      });
    }

    // 6. CHARACTER REFERENCE SUPPORT
    const hasCharAssetRef = referencedAssets.some(a => a.semanticRole === 'character_ref') ||
      (shot.referencedAssetIds || []).some(id => id.includes('char_'));
    const hasCharacterSubject = (shot.subjects || []).some(s => s.entityType === 'character');

    if (hasCharAssetRef && !capability.character_reference) {
      blockers.push({
        code: 'CHARACTER_REFERENCE_UNSUPPORTED',
        severity: 'blocker',
        shotId,
        message: `Shot "${shotId}" binds character reference images, but ${capability.displayName} does not support character image conditioning.`,
        requirement: true,
        capability: false,
        actionSuggestion: `For strict character face & wardrobe fidelity, choose a model supporting character reference conditioning (e.g. Veo 3.1 Pro, Kling 3.0, Seedance 2.0).`
      });
    } else if (hasCharacterSubject && !capability.character_reference) {
      warnings.push({
        code: 'CHARACTER_REFERENCE_UNAVAILABLE',
        severity: 'warning',
        shotId,
        message: `Shot "${shotId}" features character entities, but ${capability.displayName} does not support character reference image conditioning. Character consistency will rely solely on textual prompts.`,
        requirement: true,
        capability: false,
        actionSuggestion: `For strict character face & wardrobe fidelity, consider models with character reference conditioning (e.g. Veo 3.1 Pro, Kling 3.0, Seedance 2.0).`
      });
    }

    // 7. AUDIO GENERATION SUPPORT
    const hasAudio =
      Boolean(shot.audio?.dialogue) ||
      Boolean(shot.audio?.voiceover) ||
      Boolean(shot.audio?.ambience) ||
      (shot.audio?.soundEffects || []).length > 0;

    if (hasAudio && !capability.audio) {
      warnings.push({
        code: 'AUDIO_UNSUPPORTED',
        severity: 'warning',
        shotId,
        message: `Shot "${shotId}" specifies dialogue, voiceover, or sound design, but ${capability.displayName} is video-only. Audio will be synthesized as an external audio track during assembly.`,
        requirement: true,
        capability: false,
        actionSuggestion: `Audio track will be generated via secondary audio provider during assembly.`
      });
    }

    // 8. NEGATIVE PROMPT SUPPORT
    const hasNegativeConstraints =
      (shot.constraints?.mustNotHappen || []).length > 0 ||
      (shot.qaExpectations?.forbiddenActions || []).length > 0;

    if (hasNegativeConstraints && !capability.negative_prompt) {
      warnings.push({
        code: 'NEGATIVE_PROMPT_UNSUPPORTED',
        severity: 'warning',
        shotId,
        message: `Shot "${shotId}" contains negative constraints, but ${capability.displayName} does not support negative prompts. Constraints will be filtered into natural-language avoidance directives.`,
        requirement: true,
        capability: false,
        actionSuggestion: `Negative constraints will be phrased positively or handled via post-generation QA.`
      });
    }

    return {
      shotId,
      compatible: blockers.length === 0,
      blockers,
      warnings
    };
  }

  /**
   * Validates an entire AdSpec project against a ModelCapability.
   */
  public validateProject(
    adSpec: AdSpec,
    capability: ModelCapability
  ): ProjectCompatibilityReport {
    const shotReports: Record<string, ShotCompatibilityReport> = {};
    const allBlockers: CompatibilityViolation[] = [];
    const allWarnings: CompatibilityViolation[] = [];
    let compatibleShotsCount = 0;

    for (const shot of adSpec.shots || []) {
      const report = this.validateShot(shot, adSpec, capability);
      shotReports[shot.shotId] = report;
      if (report.compatible) {
        compatibleShotsCount++;
      } else {
        allBlockers.push(...report.blockers);
      }
      allWarnings.push(...report.warnings);
    }

    return {
      projectId: adSpec.identity?.projectId || adSpec.identity?.adId || 'unknown_project',
      specVersion: adSpec.identity?.specVersion || 1,
      modelId: capability.model,
      provider: capability.provider,
      compatible: allBlockers.length === 0,
      totalShots: (adSpec.shots || []).length,
      compatibleShotsCount,
      blockers: allBlockers,
      warnings: allWarnings,
      shotReports
    };
  }
}

export const adSpecCapabilityValidator = new AdSpecCapabilityValidator();

export const validateShotCompatibility = (
  shot: AdShot,
  adSpec: AdSpec,
  capability: ModelCapability
): ShotCompatibilityReport => adSpecCapabilityValidator.validateShot(shot, adSpec, capability);

export const validateProjectCompatibility = (
  adSpec: AdSpec,
  capability: ModelCapability
): ProjectCompatibilityReport => adSpecCapabilityValidator.validateProject(adSpec, capability);
