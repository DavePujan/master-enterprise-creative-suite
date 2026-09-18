/**
 * Prompt Compiler Contract & Reference Synthesizer for Ad Director Plans.
 * Defines the strict architectural boundary between provider-neutral Director Plans
 * and provider/engine-specific compiled execution payloads.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  DirectorPlan,
  DirectorShot,
  CompilationContext,
  CompiledModelRequest,
  CompiledReferenceAsset
} from '@shared-types/adDirector.js';
import type { VideoEngineCapability } from '@shared-types/videoGeneration.js';

export interface AdPromptCompiler {
  compile(
    plan: DirectorPlan,
    shot: DirectorShot,
    capability: VideoEngineCapability,
    context: CompilationContext
  ): Promise<CompiledModelRequest>;
}

/**
 * Standard reference compiler that translates a structured DirectorShot into a
 * rich, photorealistic, cinematic prompt payload compatible with video models.
 */
export class StandardAdPromptCompiler implements AdPromptCompiler {
  async compile(
    plan: DirectorPlan,
    shot: DirectorShot,
    capability: VideoEngineCapability,
    context: CompilationContext
  ): Promise<CompiledModelRequest> {
    const shotIndex = plan.shots.findIndex(s => s.id === shot.id);
    const shotNumber = shotIndex >= 0 ? shotIndex + 1 : shot.sequence;

    // 1. Resolve Entity Contexts
    const charMap = new Map((plan.assetWorld?.characters || []).map(c => [c.id, c]));
    const prodMap = new Map((plan.assetWorld?.products || []).map(p => [p.id, p]));
    const locMap = new Map((plan.assetWorld?.locations || []).map(l => [l.id, l]));

    const subjectDescriptions: string[] = [];
    (shot.executionSpec.subjects || []).forEach(sub => {
      if (sub.entityType === 'character') {
        const char = charMap.get(sub.entityId);
        if (char) {
          subjectDescriptions.push(
            `${char.name} (${char.role}, ${char.appearance.apparentAge || ''} ${char.appearance.gender || ''}, wearing ${char.wardrobe.outfit}): ${sub.roleInShot}`
          );
        }
      } else if (sub.entityType === 'product') {
        const prod = prodMap.get(sub.entityId);
        if (prod) {
          subjectDescriptions.push(
            `${prod.productIdentity} (${prod.appearance}, ${prod.packaging.containerType}, logo: ${prod.branding.logoPlacement}): ${sub.roleInShot}`
          );
        }
      }
    });

    // 2. Resolve Environment & Location
    let locationDescription = '';
    const locationId = shot.executionSpec.environment?.locationId;
    if (locationId) {
      const loc = locMap.get(locationId);
      if (loc) {
        locationDescription = `${loc.environmentIdentity}, ${loc.visualDescription}, time of day: ${loc.lightingCharacteristics.timeOfDay}`;
      }
    }

    // 3. Assemble Cinematic Prompt Text
    const camera = shot.executionSpec.camera;
    const lighting = shot.executionSpec.lighting;
    const color = shot.executionSpec.colorAtmosphere;

    const cameraDirection = `${camera.framing.replace(/_/g, ' ')}, ${camera.lensCharacteristics.replace(/_/g, ' ')}, ${camera.cameraMovement.replace(/_/g, ' ')} camera movement, ${camera.angle.replace(/_/g, ' ')} angle. Composition: ${camera.composition}.`;
    const lightingDirection = `Lighting: ${lighting.keyLightDirection}, ${lighting.contrastRatio} contrast, atmosphere: ${lighting.atmosphere}. Color palette: ${color.palette.join(', ')}, ${color.gradingStyle} grading.`;
    const actionDirection = `Action: ${shot.executionSpec.action}. Choreography: ${shot.executionSpec.choreography}. Starting state: ${shot.executionSpec.startingState}. Ending state: ${shot.executionSpec.endingState}.`;

    const promptSegments = [
      `[CINEMATIC COMMERCIAL SHOT ${shotNumber}/${plan.shots.length}]`,
      `Creative Intent: ${shot.creativeIntent}`,
      cameraDirection,
      subjectDescriptions.length > 0 ? `Featured Subjects: ${subjectDescriptions.join('; ')}.` : '',
      locationDescription ? `Setting: ${locationDescription}.` : '',
      actionDirection,
      lightingDirection,
      plan.brief?.brandPersonality?.tone ? `Tone & Energy: ${plan.brief.brandPersonality.tone}, ${plan.brief.brandPersonality.energyLevel}.` : ''
    ].filter(Boolean);

    const generatedPrompt = context.userPromptOverrides?.[shot.id] || promptSegments.join('\n');

    // 4. Assemble Negative Prompt (Brand Safety + Quality)
    const negativeSegments = [
      'blurry, distorted, morphing limbs, flickering artifacts, low resolution, amateur video, poorly rendered text, uncanny valley',
      ...(plan.brief?.thingsToAvoid || []).map(item => `no ${item}`)
    ];
    if (shot.qaExpectations?.forbiddenActions) {
      negativeSegments.push(...shot.qaExpectations.forbiddenActions.map(act => `no ${act}`));
    }
    const negativePrompt = negativeSegments.join(', ');

    // 5. Compile Reference Assets
    const mediaCatalog = new Map((plan.assetWorld?.referenceMedia || []).map(m => [m.assetId, m]));
    const compiledReferences: CompiledReferenceAsset[] = [];
    let firstFrameUrl: string | undefined;
    let lastFrameUrl: string | undefined;

    for (const refId of shot.visualReferences || []) {
      const media = mediaCatalog.get(refId);
      const url = context.assetUrlResolver
        ? await context.assetUrlResolver(refId)
        : media?.url || `https://assets.writopedia.internal/${refId}`;

      if (url) {
        compiledReferences.push({
          assetId: refId,
          role: media?.role || 'general_reference',
          url,
          mimeType: media?.mimeType
        });

        if (media?.role === 'first_frame' && !firstFrameUrl) {
          firstFrameUrl = url;
        }
        if (media?.role === 'last_frame' && !lastFrameUrl) {
          lastFrameUrl = url;
        }
      }
    }

    // 6. Dialogue & Audio script
    const audioSpec = shot.executionSpec.audio;
    const dialogueScript = audioSpec?.dialogue || audioSpec?.voiceover;
    const audioPrompt = audioSpec && audioSpec.audioIntent !== 'silent'
      ? `Intent: ${audioSpec.audioIntent}. SFX: ${audioSpec.soundEffects.join(', ')}.`
      : undefined;

    return {
      shotId: shot.id,
      engineKey: capability.engineKey,
      prompt: generatedPrompt,
      negativePrompt,
      aspectRatio: plan.aspectRatio,
      durationSeconds: shot.timing.duration,
      referenceAssets: compiledReferences,
      firstFrameUrl,
      lastFrameUrl,
      audioPrompt,
      dialogueScript,
      engineParameters: {
        cameraMotion: camera.cameraMovement,
        framing: camera.framing,
        cinematicGrade: color.gradingStyle
      },
      qaExpectationsSummary: {
        requiredSubjects: shot.qaExpectations?.requiredSubjects || [],
        forbiddenActions: shot.qaExpectations?.forbiddenActions || [],
        productVisibility: shot.qaExpectations?.productVisibility || 'prominent_front'
      }
    };
  }
}

export const standardAdPromptCompiler = new StandardAdPromptCompiler();
