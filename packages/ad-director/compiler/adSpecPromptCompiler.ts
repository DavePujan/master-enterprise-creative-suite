/**
 * Provider-Neutral Prompt Compiler for Canonical AdSpec.
 * Translates structured production shots into model-appropriate execution payloads
 * while maintaining 100% AdSpec immutability and separating human-readable Director Prompts
 * from machine execution parameters.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { AdSpec, AdShot } from '@contracts/adSpecContracts.js';
import type {
  ModelCapability,
  CompiledShotExecutionPayload,
  CompiledReferenceBinding,
  AdProjectExecutionPlan,
  VideoResolution
} from '@contracts/modelCapabilityContracts.js';
import { adSpecCapabilityValidator } from '../capabilities/adSpecCapabilityValidator.js';

export interface PromptCompilerOptions {
  resolution?: VideoResolution;
  userPromptOverrides?: Record<string, string>;
  customSettings?: Record<string, any>;
  assetUrlResolver?: (assetId: string) => string | undefined;
}

function extractCharacters(adSpec: AdSpec): any[] {
  if (Array.isArray(adSpec.characters)) return adSpec.characters;
  if (adSpec.characters && Array.isArray((adSpec.characters as any).characters)) return (adSpec.characters as any).characters;
  return [];
}

function extractProducts(adSpec: AdSpec): any[] {
  if (Array.isArray(adSpec.products)) return adSpec.products;
  if (adSpec.products && Array.isArray((adSpec.products as any).products)) return (adSpec.products as any).products;
  return [];
}

function extractLocations(adSpec: AdSpec): any[] {
  if (Array.isArray(adSpec.locations)) return adSpec.locations;
  if (adSpec.locations && Array.isArray((adSpec.locations as any).locations)) return (adSpec.locations as any).locations;
  return [];
}

export class AdSpecPromptCompiler {
  /**
   * Compiles a single AdShot into a provider-specific execution payload.
   * STRICTLY READ-ONLY: Never mutates adSpec.
   */
  public compileShot(
    shot: AdShot,
    adSpec: AdSpec,
    capability: ModelCapability,
    options: PromptCompilerOptions = {}
  ): CompiledShotExecutionPayload {
    const totalShots = (adSpec.shots || []).length;
    const resolution = options.resolution || '1080p';
    const aspectRatio =
      (adSpec.generationRequirements?.aspectRatio as string) ||
      (adSpec.brief && (adSpec.brief as any).aspectRatio as string) ||
      '16:9';

    // 1. Resolve Entity Contexts from AdSpec Bibles
    const charMap = new Map(extractCharacters(adSpec).map(c => [c.characterId || c.id, c]));
    const prodMap = new Map(extractProducts(adSpec).map(p => [p.productId || p.id, p]));
    const locMap = new Map(extractLocations(adSpec).map(l => [l.locationId || l.id, l]));
    const assetMap = new Map((adSpec.assets?.assets || []).map(a => [a.assetId, a]));

    // 2. Build Subject Descriptions
    const subjectDescriptions: string[] = [];
    (shot.subjects || []).forEach(sub => {
      if (sub.entityType === 'character') {
        const char = charMap.get(sub.entityId);
        if (char) {
          const charName = char.name || sub.entityId;
          const charVisual = char.visualDescription ? `${char.visualDescription}, ` : '';
          const wardrobe = char.wardrobe ? `wearing ${JSON.stringify(char.wardrobe).replace(/["{}]/g, '')}` : '';
          subjectDescriptions.push(`${charName} (${charVisual}${wardrobe}) - ${sub.roleInShot || 'main subject'}`);
        } else {
          subjectDescriptions.push(`Character ${sub.entityId} - ${sub.roleInShot || 'subject'}`);
        }
      } else if (sub.entityType === 'product') {
        const prod = prodMap.get(sub.entityId);
        if (prod) {
          const prodName = prod.name || sub.entityId;
          const prodDesc = prod.visualDescription ? `${prod.visualDescription}, ` : '';
          const packaging = prod.packaging ? `packaging: ${typeof prod.packaging === 'string' ? prod.packaging : JSON.stringify(prod.packaging).replace(/["{}]/g, '')}` : '';
          subjectDescriptions.push(`${prodName} (${prodDesc}${packaging}) - ${sub.roleInShot || 'hero product'}`);
        } else {
          subjectDescriptions.push(`Product ${sub.entityId} - ${sub.roleInShot || 'product'}`);
        }
      }
    });

    // 3. Build Setting & Location Description
    let settingDescription = '';
    const locId = shot.environment?.locationId;
    if (locId) {
      const loc = locMap.get(locId);
      if (loc) {
        settingDescription = `${loc.name || locId}: ${loc.description || ''}, architecture: ${loc.architecture || 'modern'}, atmosphere: ${loc.atmosphere || 'commercial studio'}`.trim();
      } else {
        settingDescription = `Location ${locId}`;
      }
    }

    // 4. Build Camera, Lighting, and Action Directives
    const camera = shot.camera || {};
    const lighting = shot.lighting || {};
    const action = shot.action || {};
    const visual = shot.visualDirection || {};

    const cameraDirective = [
      camera.framing ? `${String(camera.framing).replace(/_/g, ' ')} framing` : 'medium close-up',
      camera.cameraMovement ? `${String(camera.cameraMovement).replace(/_/g, ' ')} camera movement` : 'steady push-in',
      camera.angle ? `${String(camera.angle).replace(/_/g, ' ')} angle` : 'eye-level angle',
      camera.lensCharacteristics ? `lens: ${String(camera.lensCharacteristics).replace(/_/g, ' ')}` : '35mm prime lens',
      camera.composition ? `composition: ${camera.composition}` : '',
      camera.depthIntent ? `depth: ${camera.depthIntent}` : 'shallow depth of field'
    ].filter(Boolean).join(', ');

    const lightingDirective = [
      lighting.source ? `light source: ${lighting.source}` : 'soft studio key light',
      lighting.quality ? `${lighting.quality} lighting` : 'diffused soft lighting',
      lighting.contrast ? `${lighting.contrast} contrast` : 'balanced contrast',
      lighting.colorTemperature ? `color temperature ${lighting.colorTemperature}` : '5600K balanced daylight',
      lighting.atmosphere ? `atmosphere: ${lighting.atmosphere}` : 'pristine commercial atmosphere'
    ].filter(Boolean).join(', ');

    const actionDirective = [
      action.action || shot.purpose || 'Cinematic focal beat',
      action.choreography ? `Movement: ${action.choreography}` : '',
      action.startingState ? `Starting frame: ${action.startingState}` : '',
      action.endingState ? `Ending frame: ${action.endingState}` : ''
    ].filter(Boolean).join('. ');

    // 5. Synthesize Provider-Tuned Prompt
    const rawPrompt = this.synthesizeProviderPrompt({
      provider: capability.provider,
      model: capability.model,
      shotSequence: shot.sequence,
      totalShots,
      purpose: shot.purpose,
      narrativeRole: shot.narrativeRole,
      actionDirective,
      cameraDirective,
      lightingDirective,
      settingDescription,
      subjectDescriptions,
      visualIntent: visual.visualIntent || 'Ultra-premium photorealistic cinematic commercial polish',
      brandTone: adSpec.brand ? JSON.stringify(adSpec.brand).replace(/["{}]/g, '') : undefined
    });

    // Check user override or apply length clamping
    const userOverride = options.userPromptOverrides?.[shot.shotId];
    const finalPrompt = userOverride || this.clampPromptLength(rawPrompt, capability.max_prompt_length);

    // 6. Assemble Negative Prompt
    const negativePrompt = this.synthesizeNegativePrompt(shot, adSpec, capability);

    // 7. Resolve Reference Asset Bindings
    const references = this.resolveReferenceBindings(shot, adSpec, options.assetUrlResolver);

    // 8. Model-Specific Execution Settings
    const settings = this.synthesizeModelSettings(capability, shot, options.customSettings);

    return {
      provider: capability.provider,
      model: capability.model,
      shotId: shot.shotId,
      sequence: shot.sequence,
      prompt: finalPrompt,
      negativePrompt: capability.negative_prompt ? negativePrompt : undefined,
      references,
      duration: shot.timing?.duration ?? shot.durationSeconds ?? 4,
      aspectRatio,
      resolution,
      settings,
      directorPrompt: {
        humanReadableExplanation: `Shot ${shot.sequence}/${totalShots}: ${shot.purpose || 'Commercial beat'} with ${camera.cameraMovement || 'cinematic'} camera and ${lighting.quality || 'diffused'} lighting.`,
        creativeIntent: `${shot.narrativeRole || 'narrative development'} - ${shot.purpose || ''}`
      }
    };
  }

  /**
   * Compiles an entire AdSpec project into an AdProjectExecutionPlan.
   * STRICTLY READ-ONLY: Never mutates adSpec.
   */
  public compileProjectExecutionPlan(
    adSpec: AdSpec,
    capability: ModelCapability,
    options: PromptCompilerOptions = {}
  ): AdProjectExecutionPlan {
    // 1. Run Pre-flight Capability Validation
    const validationReport = adSpecCapabilityValidator.validateProject(adSpec, capability);

    // 2. Compile Each Shot Payload
    const shots: CompiledShotExecutionPayload[] = (adSpec.shots || []).map(shot =>
      this.compileShot(shot, adSpec, capability, options)
    );

    const totalDurationSeconds = shots.reduce((acc, s) => acc + (s.duration || 0), 0);
    const estimatedCreditCost = shots.length * (capability.credit_cost || 30);

    const readiness = !validationReport.compatible
      ? 'BLOCKED'
      : validationReport.warnings.length > 0
        ? 'WARNINGS'
        : 'READY';

    return {
      projectId: adSpec.identity?.projectId || adSpec.identity?.adId || 'unknown_project',
      adId: adSpec.identity?.adId || 'ad_master',
      specVersion: adSpec.identity?.specVersion || 1,
      targetModel: capability.model,
      targetProvider: capability.provider,
      shots,
      totalDurationSeconds: +totalDurationSeconds.toFixed(1),
      readiness,
      blockers: validationReport.blockers,
      warnings: validationReport.warnings,
      compiledAt: new Date().toISOString(),
      estimatedCreditCost
    };
  }

  /**
   * Synthesizes provider-tuned prompt syntax.
   */
  private synthesizeProviderPrompt(input: {
    provider: string;
    model: string;
    shotSequence: number;
    totalShots: number;
    purpose?: string;
    narrativeRole?: string;
    actionDirective: string;
    cameraDirective: string;
    lightingDirective: string;
    settingDescription: string;
    subjectDescriptions: string[];
    visualIntent: string;
    brandTone?: string;
  }): string {
    const {
      provider,
      shotSequence,
      totalShots,
      purpose,
      actionDirective,
      cameraDirective,
      lightingDirective,
      settingDescription,
      subjectDescriptions,
      visualIntent
    } = input;

    // A. GOOGLE (VEO 3.1) SYNTAX
    if (provider === 'google') {
      const parts = [
        `[Cinematic Commercial Shot ${shotSequence}/${totalShots}]`,
        purpose ? `Director's Focus: ${purpose}.` : '',
        `Action: ${actionDirective}`,
        subjectDescriptions.length ? `Subjects: ${subjectDescriptions.join('; ')}.` : '',
        settingDescription ? `Setting: ${settingDescription}.` : '',
        `Cinematography: ${cameraDirective}.`,
        `Lighting & Grade: ${lightingDirective}. Color Intent: ${visualIntent}.`
      ];
      return parts.filter(Boolean).join('\n');
    }

    // B. RUNWAY (GEN-3 ALPHA) SYNTAX
    if (provider === 'runway') {
      const cameraMotionKeyword = cameraDirective.includes('push') ? '[Camera: Fast Push In]'
        : cameraDirective.includes('tracking') ? '[Camera: Dynamic Tracking]'
        : cameraDirective.includes('pan') ? '[Camera: Smooth Pan]'
        : '[Camera: Slow Push In]';

      const parts = [
        cameraMotionKeyword,
        actionDirective,
        subjectDescriptions.length ? `featuring ${subjectDescriptions.join(' and ')}` : '',
        settingDescription ? `in ${settingDescription}` : '',
        cameraDirective,
        lightingDirective,
        'hyper-detailed, commercial grade, 35mm film grain, 8k resolution'
      ];
      return parts.filter(Boolean).join(', ');
    }

    // C. KLING (3.0 STANDARD) SYNTAX
    if (provider === 'kling') {
      const parts = [
        `Commercial Scene ${shotSequence}: ${actionDirective}`,
        subjectDescriptions.length ? `Characters & Objects: ${subjectDescriptions.join('; ')}` : '',
        settingDescription ? `Environment: ${settingDescription}` : '',
        `Camera: ${cameraDirective}`,
        `Lighting: ${lightingDirective}`,
        visualIntent
      ];
      return parts.filter(Boolean).join(' | ');
    }

    // D. LUMA (DREAM MACHINE) SYNTAX
    if (provider === 'luma') {
      const parts = [
        `Shot ${shotSequence}: ${actionDirective}`,
        subjectDescriptions.join('; '),
        settingDescription,
        cameraDirective,
        lightingDirective
      ];
      return parts.filter(Boolean).join('. ');
    }

    // E. SEEDANCE (2.0 CINEMATIC) SYNTAX
    if (provider === 'seedance') {
      const parts = [
        `@scene(shot_${String(shotSequence).padStart(2, '0')})`,
        `@action: ${actionDirective}`,
        subjectDescriptions.length ? `@entities: ${subjectDescriptions.join(' | ')}` : '',
        settingDescription ? `@location: ${settingDescription}` : '',
        `@camera: ${cameraDirective}`,
        `@lighting: ${lightingDirective}`,
        `@style: ${visualIntent}`
      ];
      return parts.filter(Boolean).join('\n');
    }

    // F. DEFAULT / UNIVERSAL SYNTAX
    const parts = [
      `[Shot ${shotSequence}/${totalShots}]`,
      actionDirective,
      subjectDescriptions.length ? `Subjects: ${subjectDescriptions.join('; ')}` : '',
      settingDescription ? `Location: ${settingDescription}` : '',
      `Camera: ${cameraDirective}`,
      `Lighting: ${lightingDirective}`,
      visualIntent
    ];
    return parts.filter(Boolean).join('. ');
  }

  /**
   * Synthesizes negative prompt based on QA expectations, constraints, and provider style.
   */
  private synthesizeNegativePrompt(shot: AdShot, adSpec: AdSpec, capability: ModelCapability): string {
    const baseNegatives = [
      'blurry',
      'low quality',
      'flickering artifacts',
      'distorted limbs',
      'morphing anatomy',
      'uncanny valley',
      'amateur footage',
      'poor text rendering',
      'compression noise'
    ];

    const forbiddenActions = shot.qaExpectations?.forbiddenActions || [];
    const mustNotHappen = shot.constraints?.mustNotHappen || [];
    const briefAvoids = (adSpec.brief as any)?.thingsToAvoid || [];

    const customNegatives = [
      ...forbiddenActions.map(a => `no ${a}`),
      ...mustNotHappen.map(r => `no ${r}`),
      ...briefAvoids.map((a: string) => `no ${a}`)
    ];

    return Array.from(new Set([...baseNegatives, ...customNegatives])).join(', ');
  }

  /**
   * Resolves reference bindings (character, product, location, style assets) into concrete URLs.
   */
  private resolveReferenceBindings(
    shot: AdShot,
    adSpec: AdSpec,
    assetUrlResolver?: (assetId: string) => string | undefined
  ): CompiledReferenceBinding[] {
    const bindings: CompiledReferenceBinding[] = [];
    const seenAssetIds = new Set<string>();

    const charMap = new Map(extractCharacters(adSpec).map(c => [c.characterId || c.id, c]));
    const prodMap = new Map(extractProducts(adSpec).map(p => [p.productId || p.id, p]));
    const locMap = new Map(extractLocations(adSpec).map(l => [l.locationId || l.id, l]));
    const assetMap = new Map((adSpec.assets?.assets || []).map(a => [a.assetId, a]));

    const resolveUrl = (id: string): string => {
      if (assetUrlResolver) {
        const resolved = assetUrlResolver(id);
        if (resolved) return resolved;
      }
      const asset = assetMap.get(id);
      if (asset?.storageUri) return asset.storageUri;
      if (asset?.uri) return asset.uri;
      return `https://assets.writopedia.internal/references/${id}.png`;
    };

    // 1. Direct referencedAssetIds
    for (const refId of shot.referencedAssetIds || []) {
      if (refId && !seenAssetIds.has(refId)) {
        seenAssetIds.add(refId);
        const asset = assetMap.get(refId);
        const role = (asset?.semanticRole as any) ||
          (refId.includes('first_frame') ? 'first_frame'
          : refId.includes('last_frame') ? 'last_frame'
          : refId.includes('char_') ? 'character_ref'
          : refId.includes('product_') ? 'product_ref'
          : refId.includes('loc_') ? 'location_ref'
          : 'style_ref');

        bindings.push({
          assetId: refId,
          url: resolveUrl(refId),
          role,
          type: role === 'character_ref' ? 'character' : role === 'product_ref' ? 'product' : role === 'location_ref' ? 'location' : 'style',
          label: asset?.description || refId,
          targetEntityId: asset?.targetEntityId
        });
      }
    }

    // 2. Character Reference Assets
    for (const sub of shot.subjects || []) {
      if (sub.entityType === 'character') {
        const char = charMap.get(sub.entityId);
        for (const refId of char?.referenceAssetIds || []) {
          if (refId && !seenAssetIds.has(refId)) {
            seenAssetIds.add(refId);
            bindings.push({
              assetId: refId,
              url: resolveUrl(refId),
              role: 'character_ref',
              type: 'character',
              label: `${char?.name || sub.entityId} Keyframe`
            });
          }
        }
      } else if (sub.entityType === 'product') {
        const prod = prodMap.get(sub.entityId);
        for (const refId of prod?.referenceAssetIds || []) {
          if (refId && !seenAssetIds.has(refId)) {
            seenAssetIds.add(refId);
            bindings.push({
              assetId: refId,
              url: resolveUrl(refId),
              role: 'product_ref',
              type: 'product',
              label: `${prod?.name || sub.entityId} Asset`
            });
          }
        }
      }
    }

    return bindings;
  }

  /**
   * Synthesizes provider-specific model settings.
   */
  private synthesizeModelSettings(
    capability: ModelCapability,
    shot: AdShot,
    customSettings: Record<string, any> = {}
  ): Record<string, any> {
    const camera = shot.camera || {};
    const settings: Record<string, any> = { ...customSettings };

    if (capability.camera_control) {
      settings.cameraMotion = camera.cameraMovement || 'slow_tracking';
      settings.framing = camera.framing || 'medium_close_up';
    }

    if (capability.motion_strength) {
      settings.motionStrength = customSettings.motionStrength || 0.7;
    }

    if (capability.audio) {
      settings.audioEnabled = Boolean(
        shot.audio?.dialogue ||
        shot.audio?.voiceover ||
        (shot.audio?.soundEffects || []).length > 0
      );
    }

    return settings;
  }

  /**
   * Clamps prompt length to avoid provider payload rejection.
   */
  private clampPromptLength(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) return prompt;
    // Truncate at last boundary before limit
    const truncated = prompt.slice(0, maxLength - 3);
    const lastPunctuation = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf(';'),
      truncated.lastIndexOf('\n')
    );
    if (lastPunctuation > maxLength * 0.7) {
      return truncated.slice(0, lastPunctuation + 1);
    }
    return `${truncated}...`;
  }
}

export const adSpecPromptCompiler = new AdSpecPromptCompiler();

export const compileShotPayload = (
  shot: AdShot,
  adSpec: AdSpec,
  capability: ModelCapability,
  options?: PromptCompilerOptions
): CompiledShotExecutionPayload => adSpecPromptCompiler.compileShot(shot, adSpec, capability, options);

export const compileProjectExecutionPlan = (
  adSpec: AdSpec,
  capability: ModelCapability,
  options?: PromptCompilerOptions
): AdProjectExecutionPlan => adSpecPromptCompiler.compileProjectExecutionPlan(adSpec, capability, options);
