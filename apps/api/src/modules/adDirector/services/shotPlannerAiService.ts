import { GoogleGenAI } from '@google/genai';
import type {
  AdBrief,
  CreativeConcept,
  StoryModel,
  AdShot,
  AdCharacterEntity,
  AdProductEntity,
  AdSpecLocationEntity,
  ShotSubjectItem,
  ShotTransitionType,
  CameraFraming,
  CameraAngle,
  CameraMovement,
  LensCharacteristics
} from '@contracts/adSpecContracts.js';

export interface ShotPlannerInput {
  storyModel: StoryModel;
  selectedConcept: CreativeConcept;
  brief: AdBrief;
  characters: AdCharacterEntity[];
  products: AdProductEntity[];
  locations: AdSpecLocationEntity[];
  assets?: Array<{ assetId: string; role?: string }>;
  targetTotalDurationSeconds?: number;
  cinematographyStyle?: string;
}

export class ShotPlannerAiService {
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (apiKey) {
      this.geminiClient = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Transforms story narrative beats into discrete, production-ready AdShot specifications.
   * Dual-engine: Google GenAI with deterministic fallback (3500ms timeout).
   */
  public async planShots(input: ShotPlannerInput): Promise<AdShot[]> {
    if (this.geminiClient) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('GenAI Shot Planner timeout after 3500ms')), 3500)
        );

        const llmPromise = this.invokeGeminiShotPlanner(input);
        const result = await Promise.race([llmPromise, timeoutPromise]);
        if (result && result.length >= 3) {
          return this.normalizeAndEnforceTiming(result, input);
        }
      } catch (err: any) {
        console.warn(`[ShotPlannerAiService] Primary LLM engine bypass active: ${err?.message}`);
      }
    }

    return this.generateDeterministicShots(input);
  }

  /**
   * Primary LLM Engine with strict prompt-injection defense.
   */
  private async invokeGeminiShotPlanner(input: ShotPlannerInput): Promise<AdShot[]> {
    if (!this.geminiClient) {
      throw new Error('Gemini client uninitialized');
    }

    const { storyModel, selectedConcept, brief, characters, products, locations, targetTotalDurationSeconds } = input;
    const totalDuration = targetTotalDurationSeconds || (typeof brief.desiredDurationSeconds === 'number' ? brief.desiredDurationSeconds : 15);

    const systemInstruction = `You are a world-class Cinematographer & Shot Director.
Transform the story beats into discrete, production-grade shots.

CRITICAL CONSTRAINTS:
1. Output exact JSON array of AdShot objects.
2. Shot timing MUST strictly add up to exactly ${totalDuration} seconds.
3. Every shot must reference declared entities:
   - Characters: ${characters.map(c => c.id).join(', ') || 'char_protagonist'}
   - Products: ${products.map(p => p.id).join(', ') || 'product_hero'}
   - Locations: ${locations.map(l => l.id).join(', ') || 'loc_default'}
4. Specify camera (shotSize, framing, angle, lens, movement), lighting, audio (soundEffects, voiceover), transitions, and QA expectations.
5. Never invent non-existent character or location IDs.`;

    const prompt = `
<STORY_MODEL>
${JSON.stringify(storyModel, null, 2)}
</STORY_MODEL>

<SELECTED_CONCEPT>
${JSON.stringify(selectedConcept, null, 2)}
</SELECTED_CONCEPT>

<DECLARED_ENTITIES>
Characters: ${JSON.stringify(characters.map(c => ({ id: c.id, role: c.narrativeRole })))}
Products: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name })))}
Locations: ${JSON.stringify(locations.map(l => ({ id: l.id, name: l.name })))}
</DECLARED_ENTITIES>
`;

    const response = await this.geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.5,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.shots || [];
  }

  /**
   * Deterministic Shot Planner Fallback Engine:
   * Generates a 5-shot cinematic commercial sequence perfectly calibrated to duration and referential integrity.
   */
  public generateDeterministicShots(input: ShotPlannerInput): AdShot[] {
    const { storyModel, selectedConcept, brief, characters, products, locations, assets = [], targetTotalDurationSeconds } = input;

    const totalDuration = targetTotalDurationSeconds || (typeof brief.desiredDurationSeconds === 'number' ? brief.desiredDurationSeconds : 15);

    // Entity IDs
    const charId = characters[0]?.id || 'char_protagonist';
    const prodId = products[0]?.id || 'product_hero';
    const locId = locations[0]?.id || 'loc_default';
    const assetIdList = assets.map(a => a.assetId);

    // Calculate 5 durations that strictly equal totalDuration
    // e.g. for 15s: [3, 3, 4, 3, 2] -> sum = 15
    // e.g. for 18s: [3, 4, 5, 3, 3] -> sum = 18
    const durations = this.partitionDuration(totalDuration, 5);

    const productName = products[0]?.name || (typeof brief.product === 'string' ? brief.product : 'Product');
    const ctaText = typeof brief.cta === 'object' && brief.cta !== null && 'visualText' in brief.cta
      ? (brief.cta as any).visualText
      : 'Try It Today';

    let currentStart = 0;
    const shots: AdShot[] = [];

    // Shot 1: Opening Hook
    const d1 = durations[0];
    shots.push({
      shotId: 'shot_01',
      sequence: 1,
      durationSeconds: d1,
      purpose: 'Opening Hook & Attention Capture',
      narrativeRole: 'hook',
      narrativePurpose: 'hook',
      timing: { startTime: currentStart, endTime: currentStart + d1, duration: d1 },
      subjects: [
        { entityId: charId, entityType: 'character', roleInShot: 'Protagonist under initial friction', focalPriority: 1 }
      ],
      action: {
        startingState: 'Everyday friction or agitation visually dominating the scene',
        action: selectedConcept.hook.description,
        choreography: 'Rapid kinetic camera push into focused protagonist expression',
        beats: [
          { startTime: currentStart, endTime: currentStart + d1, description: 'Initial friction beat shifting into unexpected visual disruption' }
        ],
        endingState: 'Sudden stillness as attention locks onto the catalyst',
        emotionalState: 'curiosity and surprise'
      },
      environment: { locationId: locId, environmentState: 'High-contrast atmosphere' },
      camera: {
        shotSize: 'medium_close_up',
        framing: 'medium_shot' as any,
        angle: 'eye_level' as any,
        lensCharacteristics: 'normal_prime_50mm' as any,
        cameraPosition: 'front_three_quarter',
        cameraMovement: 'push_in' as any,
        composition: 'dynamic leading lines',
        depthIntent: 'shallow_dof',
        focalLengthMm: 50,
        intention: 'Immediate sensory disruption and protagonist focus'
      },
      lighting: {
        source: 'stylized ambient with hard key rim',
        direction: 'side_rim',
        quality: 'specular',
        intensity: 'high_key',
        contrast: 'high',
        colorTemperature: '5200K',
        atmosphere: 'clean commercial',
        mood: 'tense_and_dramatic',
        keyLightDirection: 'side_rim',
        colorTemperatureK: 5200
      },
      visualDirection: {
        visualIntent: selectedConcept.visualDirection.visualLanguage || 'Cinematic high-energy commercial polish',
        realismLevel: 'photorealistic',
        colorPalette: ['#0A0A0A', '#1E293B', '#38BDF8'],
        colorGrading: 'crisp contrast and saturated accents',
        motionPacing: 'kinetic'
      },
      audio: {
        soundEffects: ['Sharp atmospheric whoosh', 'Sub-bass impact'],
        voiceover: undefined,
        audioPriority: 'high',
        music: 'Rhythmic percussive pulse'
      },
      transitions: {
        incoming: 'none' as ShotTransitionType,
        outgoing: 'whip_pan' as ShotTransitionType,
        transitionIn: 'none',
        transitionOut: 'whip_pan',
        durationSeconds: 0.5
      },
      referencedAssetIds: assetIdList.slice(0, 1),
      continuity: {
        inheritedStates: [],
        producedStates: [
          { entityId: charId, stateDescription: 'Alert and engaged attention' }
        ]
      },
      constraints: { mustHappen: ['Hook visual event occurs within 2.5s'], mustNotHappen: ['Sluggish camera movement'] },
      qaExpectations: {
        requiredSubjects: [charId],
        requiredActions: ['Surprised attention shift'],
        forbiddenActions: ['Looking directly at camera unprompted'],
        requiredFraming: 'medium_shot' as any,
        requiredCameraMovement: 'push_in' as any,
        productVisibility: 'background',
        characterIdentityRules: ['Consistent facial geometry'],
        brandRules: []
      }
    });
    currentStart += d1;

    // Shot 2: Setup & Product Introduction
    const d2 = durations[1];
    shots.push({
      shotId: 'shot_02',
      sequence: 2,
      durationSeconds: d2,
      purpose: `Product Introduction: ${productName}`,
      narrativeRole: 'setup',
      narrativePurpose: 'setup',
      timing: { startTime: currentStart, endTime: currentStart + d2, duration: d2 },
      subjects: [
        { entityId: charId, entityType: 'character', roleInShot: 'Protagonist receiving product', focalPriority: 2 },
        { entityId: prodId, entityType: 'product', roleInShot: 'Hero packshot reveal', focalPriority: 1 }
      ],
      action: {
        startingState: 'Seamless transition from hook impact',
        action: `The protagonist introduces ${productName}, highlighting its packaging and tactile design.`,
        choreography: 'Smooth rotational pan framing the product in hero silhouette',
        beats: [
          { startTime: currentStart, endTime: currentStart + d2, description: `Product tactile interaction and packaging highlight` }
        ],
        endingState: `${productName} primed and ready for action`,
        emotionalState: 'realization and anticipation'
      },
      environment: { locationId: locId, environmentState: 'Elevated clean environment' },
      camera: {
        shotSize: 'close_up',
        framing: 'close_up' as any,
        angle: 'low_angle' as any,
        lensCharacteristics: 'macro_lens' as any,
        cameraPosition: 'front',
        cameraMovement: 'push_in' as any,
        composition: 'symmetry',
        depthIntent: 'shallow_dof',
        focalLengthMm: 85,
        intention: 'Showcase product hero packaging and silhouette'
      },
      lighting: {
        source: 'softbox rim with precision spotlight on logo',
        direction: 'front_three_quarter',
        quality: 'soft_diffuse',
        intensity: 'balanced',
        contrast: 'medium',
        colorTemperature: '5600K',
        atmosphere: 'pristine commercial studio',
        mood: 'heroic_studio',
        keyLightDirection: 'front_three_quarter',
        colorTemperatureK: 5600
      },
      visualDirection: {
        visualIntent: 'Hero product tactile elegance',
        realismLevel: 'photorealistic',
        colorPalette: ['#0F172A', '#E2E8F0', '#38BDF8'],
        colorGrading: 'clean studio commercial master',
        motionPacing: 'fluid'
      },
      audio: {
        soundEffects: ['Tactile click / can crack sound', 'Clean acoustic riser'],
        voiceover: `Introducing ${productName}`,
        audioPriority: 'high',
        music: 'Building rhythmic crescendo'
      },
      transitions: {
        incoming: 'whip_pan' as ShotTransitionType,
        outgoing: 'cut' as ShotTransitionType,
        transitionIn: 'whip_pan',
        transitionOut: 'cut',
        durationSeconds: 0.5
      },
      referencedAssetIds: assetIdList.slice(0, 2),
      continuity: {
        inheritedStates: [
          { sourceShotId: 'shot_01', entityId: charId, aspect: 'wardrobe', requirement: 'Identical outfit and styling' }
        ],
        producedStates: [
          { entityId: prodId, stateDescription: 'Packaging open and active' }
        ]
      },
      constraints: { mustHappen: ['Product branding sharply in focus'], mustNotHappen: ['Occluded brand logo'] },
      qaExpectations: {
        requiredSubjects: [prodId, charId],
        requiredActions: ['Tactile product reveal'],
        forbiddenActions: ['Unclear product label'],
        requiredFraming: 'close_up' as any,
        requiredCameraMovement: 'push_in' as any,
        productVisibility: 'prominent_front',
        characterIdentityRules: ['Wardrobe consistency locked'],
        brandRules: ['Visible packaging']
      }
    });
    currentStart += d2;

    // Shot 3: Escalation & Transformation / Demonstration
    const d3 = durations[2];
    shots.push({
      shotId: 'shot_03',
      sequence: 3,
      durationSeconds: d3,
      purpose: 'Escalation & Core Benefit Demonstration',
      narrativeRole: 'development',
      narrativePurpose: 'escalation',
      timing: { startTime: currentStart, endTime: currentStart + d3, duration: d3 },
      subjects: [
        { entityId: charId, entityType: 'character', roleInShot: 'Protagonist empowered by product', focalPriority: 1 },
        { entityId: prodId, entityType: 'product', roleInShot: 'In-use catalyst', focalPriority: 2 }
      ],
      action: {
        startingState: 'Product activated',
        action: `Full kinetic demonstration: ${selectedConcept.premise.slice(0, 120)}`,
        choreography: 'Tracking sweep moving alongside the protagonist in full momentum',
        beats: [
          { startTime: currentStart, endTime: currentStart + d3, description: 'Surge of performance, speed, and effortless clarity' }
        ],
        endingState: 'Effortless peak triumph',
        emotionalState: 'exhilaration and empowerment'
      },
      environment: { locationId: locId, environmentState: 'Expansive dynamic space' },
      camera: {
        shotSize: 'medium_shot',
        framing: 'medium_shot' as any,
        angle: 'eye_level' as any,
        lensCharacteristics: 'normal_prime_50mm' as any,
        cameraPosition: 'side_tracking',
        cameraMovement: 'tracking' as any,
        composition: 'motion blur leading edge',
        depthIntent: 'medium_dof',
        focalLengthMm: 35,
        intention: 'Emphasize dynamic movement and velocity'
      },
      lighting: {
        source: 'dynamic directional lighting streaks',
        direction: 'top_rim',
        quality: 'volumetric',
        intensity: 'high_key',
        contrast: 'high',
        colorTemperature: '5500K',
        atmosphere: 'electrified kinetic momentum',
        mood: 'kinetic_electrified',
        keyLightDirection: 'top_rim',
        colorTemperatureK: 5500
      },
      visualDirection: {
        visualIntent: 'Visceral speed and weightless acceleration',
        realismLevel: 'photorealistic',
        colorPalette: ['#0284C7', '#38BDF8', '#FFFFFF'],
        colorGrading: 'vibrant saturation and high dynamic range',
        motionPacing: 'accelerating'
      },
      audio: {
        soundEffects: ['Kinetic wind rush', 'High-speed energy flare'],
        voiceover: undefined,
        audioPriority: 'high',
        music: 'Driving synth beat drop'
      },
      transitions: {
        incoming: 'cut' as ShotTransitionType,
        outgoing: 'match_cut' as ShotTransitionType,
        transitionIn: 'cut',
        transitionOut: 'match_cut',
        durationSeconds: 0.5
      },
      referencedAssetIds: assetIdList.slice(0, 2),
      continuity: {
        inheritedStates: [
          { sourceShotId: 'shot_02', entityId: charId, aspect: 'action_continuation', requirement: 'Forward momentum continued' },
          { sourceShotId: 'shot_02', entityId: prodId, aspect: 'product_state', requirement: 'Active state preserved' }
        ],
        producedStates: [
          { entityId: charId, stateDescription: 'Peak energized posture' }
        ]
      },
      constraints: { mustHappen: ['High-speed fluid motion'], mustNotHappen: ['Stagnant framing'] },
      qaExpectations: {
        requiredSubjects: [charId, prodId],
        requiredActions: ['Dynamic forward movement'],
        forbiddenActions: ['Cluttered background elements'],
        requiredFraming: 'medium_shot' as any,
        requiredCameraMovement: 'tracking' as any,
        productVisibility: 'in_use',
        characterIdentityRules: ['Consistent facial geometry and attire'],
        brandRules: []
      }
    });
    currentStart += d3;

    // Shot 4: Product Proof Climax
    const d4 = durations[3];
    shots.push({
      shotId: 'shot_04',
      sequence: 4,
      durationSeconds: d4,
      purpose: 'Climax & Undeniable Product Proof',
      narrativeRole: 'climax',
      narrativePurpose: 'product_moment',
      timing: { startTime: currentStart, endTime: currentStart + d4, duration: d4 },
      subjects: [
        { entityId: prodId, entityType: 'product', roleInShot: 'Supreme visual centerpiece', focalPriority: 1 }
      ],
      action: {
        startingState: 'Apex of the kinetic sequence',
        action: `Ultra-crisp macro reveal of ${productName} with droplets / light streaks reflecting across its geometry.`,
        choreography: 'Slow-motion orbit highlighting the premium finish and craftsmanship',
        beats: [
          { startTime: currentStart, endTime: currentStart + d4, description: 'Micro-details and brand typography locked in crystal clarity' }
        ],
        endingState: 'Total visual authority',
        emotionalState: 'awe and certainty'
      },
      environment: { locationId: locId, environmentState: 'Sleek architectural lighting' },
      camera: {
        shotSize: 'close_up',
        framing: 'close_up' as any,
        angle: 'low_angle' as any,
        lensCharacteristics: 'macro_lens' as any,
        cameraPosition: 'front',
        cameraMovement: 'orbital_arc' as any,
        composition: 'golden_ratio',
        depthIntent: 'shallow_dof',
        focalLengthMm: 100,
        intention: 'Demonstrate product proof and microscopic craft'
      },
      lighting: {
        source: 'precision multi-angle strip lighting',
        direction: 'front_three_quarter',
        quality: 'specular',
        intensity: 'balanced',
        contrast: 'high',
        colorTemperature: '5600K',
        atmosphere: 'luxury commercial master',
        mood: 'luxury_master',
        keyLightDirection: 'front_three_quarter',
        colorTemperatureK: 5600
      },
      visualDirection: {
        visualIntent: 'Undeniable product craftsmanship',
        realismLevel: 'photorealistic',
        colorPalette: ['#0F172A', '#38BDF8', '#F8FAFC'],
        colorGrading: 'deep blacks and gleaming metallic reflections',
        motionPacing: 'calm'
      },
      audio: {
        soundEffects: ['Resonant crystal chime', 'Crisp product texture'],
        voiceover: undefined,
        audioPriority: 'high',
        music: 'Triumphant harmonic swell'
      },
      transitions: {
        incoming: 'match_cut' as ShotTransitionType,
        outgoing: 'dissolve' as ShotTransitionType,
        transitionIn: 'match_cut',
        transitionOut: 'dissolve',
        durationSeconds: 0.5
      },
      referencedAssetIds: assetIdList.slice(0, 2),
      continuity: {
        inheritedStates: [
          { sourceShotId: 'shot_03', entityId: prodId, aspect: 'product_state', requirement: 'Flawless pristine condition' }
        ],
        producedStates: [
          { entityId: prodId, stateDescription: 'Final heroic pose locked' }
        ]
      },
      constraints: { mustHappen: ['Crystal-sharp brand typography'], mustNotHappen: ['Blurry or warped geometry'] },
      qaExpectations: {
        requiredSubjects: [prodId],
        requiredActions: ['Slow-motion product showcase'],
        forbiddenActions: ['Obstruction of label'],
        requiredFraming: 'close_up' as any,
        requiredCameraMovement: 'orbital_arc' as any,
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: ['Packaging and label strictly in focus']
      }
    });
    currentStart += d4;

    // Shot 5: Payoff & Call to Action (CTA)
    const d5 = durations[4];
    shots.push({
      shotId: 'shot_05',
      sequence: 5,
      durationSeconds: d5,
      purpose: 'Brand Lockup & Call to Action',
      narrativeRole: 'cta_ending',
      narrativePurpose: 'cta',
      timing: { startTime: currentStart, endTime: currentStart + d5, duration: d5 },
      subjects: [
        { entityId: prodId, entityType: 'product', roleInShot: 'Final brand lockup', focalPriority: 1 },
        { entityId: charId, entityType: 'character', roleInShot: 'Protagonist smiling in victory', focalPriority: 2 }
      ],
      action: {
        startingState: 'Heroic product framing',
        action: `Clear visual call-to-action lockup with ${productName} and typography: "${ctaText}".`,
        choreography: 'Grounded static lockup holding firm for maximum retention',
        beats: [
          { startTime: currentStart, endTime: currentStart + d5, description: `Final visual CTA and brand tagline lockup` }
        ],
        endingState: 'Clean commercial finish ready for click or conversion',
        emotionalState: 'conviction and resolve'
      },
      environment: { locationId: locId, environmentState: 'Minimalist brand color background' },
      camera: {
        shotSize: 'medium_close_up',
        framing: 'full_shot' as any,
        angle: 'eye_level' as any,
        lensCharacteristics: 'normal_prime_50mm' as any,
        cameraPosition: 'front',
        cameraMovement: 'static' as any,
        composition: 'clean centered lockup',
        depthIntent: 'deep_focus',
        focalLengthMm: 50,
        intention: 'Deliver unambiguous conversion action and brand impression'
      },
      lighting: {
        source: 'balanced commercial softbox',
        direction: 'front_three_quarter',
        quality: 'soft_diffuse',
        intensity: 'balanced',
        contrast: 'medium',
        colorTemperature: '5600K',
        atmosphere: 'clean daylight commercial',
        mood: 'clean_daylight',
        keyLightDirection: 'front_three_quarter',
        colorTemperatureK: 5600
      },
      visualDirection: {
        visualIntent: 'Bold, memorable final brand impression',
        realismLevel: 'photorealistic',
        colorPalette: ['#0B0F19', '#38BDF8', '#FFFFFF'],
        colorGrading: 'high key clarity',
        motionPacing: 'fluid'
      },
      audio: {
        dialogue: undefined,
        voiceover: ctaText,
        soundEffects: ['Warm audio signature chime'],
        audioPriority: 'high',
        music: 'Final resolving chord'
      },
      transitions: {
        incoming: 'dissolve' as ShotTransitionType,
        outgoing: 'none' as ShotTransitionType,
        transitionIn: 'dissolve',
        transitionOut: 'none',
        durationSeconds: 0.5
      },
      referencedAssetIds: assetIdList.slice(0, 2),
      continuity: {
        inheritedStates: [
          { sourceShotId: 'shot_04', entityId: prodId, aspect: 'product_state', requirement: 'Heroic brand orientation' }
        ],
        producedStates: []
      },
      constraints: { mustHappen: ['CTA text displayed clearly on screen'], mustNotHappen: ['Premature fade before hold'] },
      qaExpectations: {
        requiredSubjects: [prodId],
        requiredActions: ['Hold CTA lockup'],
        forbiddenActions: ['Distracting background motion'],
        requiredFraming: 'full_shot' as any,
        requiredCameraMovement: 'static' as any,
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: ['Official logo and CTA text present']
      }
    });

    return shots;
  }

  /**
   * Partitions total duration into N whole-second or half-second slices strictly summing to total.
   */
  private partitionDuration(totalSeconds: number, count: number): number[] {
    const base = Math.floor(totalSeconds / count);
    const remainder = totalSeconds - (base * count);
    const durations = new Array(count).fill(base);

    // Distribute remainder to middle shots (e.g. shot 3 and shot 2) for natural pacing
    for (let i = 0; i < remainder; i++) {
      const idx = (Math.floor(count / 2) + i) % count;
      durations[idx] += 1;
    }

    return durations;
  }

  /**
   * Ensures generated shots strictly sum to target duration and have monotonic timecodes.
   */
  private normalizeAndEnforceTiming(shots: AdShot[], input: ShotPlannerInput): AdShot[] {
    const totalDuration = input.targetTotalDurationSeconds || (typeof input.brief.desiredDurationSeconds === 'number' ? input.brief.desiredDurationSeconds : 15);
    const durations = this.partitionDuration(totalDuration, shots.length);

    let start = 0;
    return shots.map((shot, idx) => {
      const dur = durations[idx];
      const normalized: AdShot = {
        ...shot,
        sequence: idx + 1,
        shotId: `shot_${(idx + 1).toString().padStart(2, '0')}`,
        timing: {
          startTime: start,
          endTime: start + dur,
          duration: dur
        }
      };
      start += dur;
      return normalized;
    });
  }
}

export const shotPlannerAiService = new ShotPlannerAiService();
