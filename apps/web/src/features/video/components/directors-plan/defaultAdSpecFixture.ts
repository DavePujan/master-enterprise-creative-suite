import type { AdSpec } from '@shared-types/adSpec.js';

/**
 * Default production AdSpec fixture for initial rendering when no existing adId is selected.
 * Corresponds to an 18-second commercial campaign for a premium hydration product.
 */
export function createDefaultAdSpecFixture(brandName = 'HydraFlow', brandColors = ['#0f172a', '#3b82f6']): AdSpec {
  return {
    identity: {
      adId: 'ad_prod_18s_launch',
      specVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creativeState: 'director_plan_draft',
      executionState: 'idle'
    },
    brief: {
      objective: 'conversions',
      targetAudience: {
        primarySegment: 'Urban athletes & active professionals',
        painPoints: ['Dehydration fatigue during long workdays', 'Bulky, unergonomic standard bottles'],
        buyerPersona: 'Fitness-oriented creator valuing design and performance'
      },
      desiredDurationSeconds: 18.0,
      targetPlatform: 'instagram_reels',
      aspectRatio: '9:16',
      keyMessage: 'Engineered hydration that matches your daily rhythm.',
      cta: {
        visualText: 'Experience Pure Hydration — Shop Now',
        spokenText: 'Upgrade your daily rhythm with HydraFlow.',
        actionIntent: 'shop_now'
      },
      tone: ['Empowering', 'High-Energy', 'Premium'],
      mustInclude: ['Visible logo on bottle', 'Active condensation droplets'],
      avoid: ['Sluggish pacing', 'Unrealistic CGI artifacts']
    },
    decisionMetadata: {
      'brief.desiredDurationSeconds': {
        source: 'user_provided',
        confidence: 1.0,
        status: 'confirmed',
        locked: true,
        reason: 'Selected 18-second commercial format'
      },
      'brief.cta': {
        source: 'user_provided',
        confidence: 1.0,
        status: 'confirmed',
        locked: true,
        reason: 'Confirmed e-commerce conversion intent'
      },
      'creative.selectedConceptId': {
        source: 'user_provided',
        confidence: 0.95,
        status: 'confirmed',
        locked: true,
        reason: 'User selected Concept 1: Every Morning Ritual'
      }
    },
    creative: {
      alternativeConcepts: [
        {
          conceptId: 'concept_01',
          title: 'Every Morning Ritual',
          creativeMechanism: 'kinetic_action',
          premise: 'Follow an urban creator powering through dawn training to executive focus, unified by cold hydration.',
          hookDescription: 'Macro drop impact on frost-matte bottle with sudden sonic crescendo.',
          emotionalArc: 'Apathy -> Awaken -> Velocity -> Focused Triumph',
          estimatedFeasibility: 0.94,
          whyItWorks: 'Emotional relatability combined with immediate tactile product desire.'
        },
        {
          conceptId: 'concept_02',
          title: 'The Blueprint of Focus',
          creativeMechanism: 'intimate_ritual',
          premise: 'A minimalist architectural meditation on physical recovery and mental clarity.',
          hookDescription: 'Extreme slow-motion water vortex inside titanium chamber.',
          emotionalArc: 'Intrigue -> Calm -> Elevate',
          estimatedFeasibility: 0.90,
          whyItWorks: 'Appeals to high-end design-focused consumers.'
        }
      ],
      selectedConceptId: 'concept_01'
    },
    brand: {
      brandName,
      visualStyle: {
        palette: brandColors,
        aestheticMood: 'Scandinavian Athletic Minimalism',
        lightingStyle: 'Cold cinematic daylight with warm rim accents'
      },
      brandVoice: {
        tone: ['Authoritative', 'Direct', 'Inspirational'],
        readingLevel: 'Accessible',
        bannedPhrases: ['Cheap alternative', 'Discount bottle']
      },
      deterministicRules: [
        {
          ruleId: 'rule_logo_clarity',
          priority: 'critical',
          ruleText: 'The brand logo on the product bottle must be legibly oriented in at least 2 shots.'
        }
      ]
    },
    assets: {
      assets: [
        {
          assetId: 'asset_packshot_hero',
          semanticRole: 'product_hero',
          targetEntityId: 'prod_hydra_titanium',
          priority: 'required'
        },
        {
          assetId: 'asset_alex_face',
          semanticRole: 'character_face',
          targetEntityId: 'char_alex',
          priority: 'required'
        },
        {
          assetId: 'asset_endcard_logo',
          semanticRole: 'last_frame',
          priority: 'preferred'
        }
      ]
    },
    characters: {
      characters: [
        {
          characterId: 'char_alex',
          name: 'Alex Rivera',
          role: 'protagonist',
          demographics: { ageRange: '26-32' },
          physicalAppearance: {
            face: 'Defined athletic facial structure with focused gaze',
            hair: 'Short textured dark hair',
            bodyType: 'Athletic runner build'
          },
          wardrobe: {
            defaultOutfit: 'Matte charcoal technical running shirt and compression shorts'
          },
          locks: ['identity', 'wardrobe']
        }
      ]
    },
    products: {
      products: [
        {
          productId: 'prod_hydra_titanium',
          name: 'HydraFlow Titanium 750ml',
          category: 'Active Hydration Vessel',
          physicalTraits: {
            formFactor: 'Ergonomic tapered titanium flask with knurled cap',
            materials: ['Brushed aerospace-grade titanium', 'Matte black food-grade silicone']
          },
          branding: {
            logoPlacement: 'Laser-etched vertical brand mark on lower third',
            visibleColors: ['#0f172a', '#94a3b8'],
            packagingType: 'Minimalist matte retail cylinder'
          },
          locks: ['geometry', 'logo', 'brandColors']
        }
      ]
    },
    locations: {
      locations: [
        {
          locationId: 'loc_gym_dawn',
          name: 'Minimalist High-Ceiling Training Studio',
          environmentType: 'interior',
          spatialTraits: {
            scale: 'medium',
            keyProps: ['Black rubber floor', 'Floor-to-ceiling dawn window'],
            architectureStyle: 'Industrial Brutalist Minimal'
          },
          lightingDefault: {
            timeOfDay: 'blue_hour',
            primarySource: 'Cold morning window wash with amber tungsten rim',
            mood: 'Atmospheric and intense'
          },
          locks: ['architecture', 'lighting']
        },
        {
          locationId: 'loc_street_sun',
          name: 'Downtown Waterfront Promenade',
          environmentType: 'exterior',
          spatialTraits: {
            scale: 'monumental',
            keyProps: ['Architectural glass facade reflections'],
            architectureStyle: 'Contemporary Urban'
          },
          lightingDefault: {
            timeOfDay: 'golden_hour',
            primarySource: 'Direct low sunbeam flare',
            mood: 'Empowering and vibrant'
          },
          locks: ['spatial']
        }
      ]
    },
    story: {
      narrativeArc: 'Awaken -> Movement -> Exhaustion -> Cold Elevation -> Daily Triumph',
      hookMechanism: 'Macro sonic droplet impact',
      storyBeats: [
        {
          beatId: 'beat_01',
          sequence: 1,
          title: 'The Wakeup Call',
          purpose: 'hook',
          emotionalTone: 'Curiosity',
          narrativeDescription: 'Macro droplet beads on cold matte bottle; sudden fast cut to Alex lacing running shoes.',
          durationTargetSeconds: 3.5
        },
        {
          beatId: 'beat_02',
          sequence: 2,
          title: 'The Velocity Peak',
          purpose: 'problem',
          emotionalTone: 'Intensity',
          narrativeDescription: 'Alex sprints along promenade, physical fatigue rising under morning sun.',
          durationTargetSeconds: 3.5
        },
        {
          beatId: 'beat_03',
          sequence: 3,
          title: 'The Cold Reset',
          purpose: 'product_reveal',
          emotionalTone: 'Relief',
          narrativeDescription: 'Alex unscrews knurled titanium cap; crystal condensation mist releases.',
          durationTargetSeconds: 4.0
        },
        {
          beatId: 'beat_04',
          sequence: 4,
          title: 'The Hydration Flow',
          purpose: 'transformation',
          emotionalTone: 'Empowerment',
          narrativeDescription: 'Satisfying intake; Alex exhales with renewed vitality as eyes lock on horizon.',
          durationTargetSeconds: 3.5
        },
        {
          beatId: 'beat_05',
          sequence: 5,
          title: 'Brand Payoff & CTA',
          purpose: 'cta',
          emotionalTone: 'Confidence',
          narrativeDescription: 'Hero packshot with crisp logo framing and conversion call to action.',
          durationTargetSeconds: 3.5
        }
      ]
    },
    shots: [
      {
        shotId: 'shot_01',
        sequence: 1,
        durationSeconds: 3.5,
        beatRef: 'beat_01',
        action: {
          visualDescription: 'Macro shot of cold condensation droplets sliding down titanium flask as hands reach to grip it.',
          choreography: [
            {
              relativeStart: 0.0,
              relativeEnd: 1.5,
              action: 'Droplets bead on matte surface catching blue morning light',
              bodyMechanics: 'Static macro focus'
            },
            {
              relativeStart: 1.5,
              relativeEnd: 3.5,
              action: 'Alex runner hand grips the bottle texture firmly',
              bodyMechanics: 'Decisive forward grip',
              interaction: 'Hand wraps around knurled silicone band'
            }
          ],
          featuredCharacters: ['char_alex'],
          featuredProducts: ['prod_hydra_titanium'],
          locationRef: 'loc_gym_dawn'
        },
        camera: {
          shotFraming: 'extreme_close_up',
          framing: 'extreme_close_up',
          cameraAngle: 'low_angle',
          angle: 'low_angle',
          cameraMovement: 'push_in',
          movement: 'push_in',
          lensFocalLength: '100mm Macro Prime',
          depthOfField: 'shallow'
        },
        lighting: {
          mood: 'Cool blue hour dawn with warm specular reflections',
          contrast: 'high',
          source: 'Dawn window light'
        },
        audio: {
          soundEffects: ['Sharp intake of breath', 'Crisp condensation droplet slide'],
          musicCue: 'Deep rhythmic sub-bass pulse begins',
          ambientAudio: 'Subtle resonant morning quiet'
        },
        continuity: {
          inheritedStates: [],
          producedStates: [
            {
              entityId: 'prod_hydra_titanium',
              aspect: 'condensation',
              description: 'Active cold mist condensation'
            },
            {
              entityId: 'char_alex',
              aspect: 'wardrobe',
              description: 'Charcoal technical running shirt'
            }
          ]
        },
        qaExpectations: {
          mustShow: ['Laser-etched brand logo', 'Micro condensation droplets'],
          mustNotShow: ['Motion blur on logo text', 'Hand anatomical artifacts'],
          subjectProminence: 'hero_focus',
          textLegibilityRequired: true
        }
      },
      {
        shotId: 'shot_02',
        sequence: 2,
        durationSeconds: 3.5,
        beatRef: 'beat_02',
        action: {
          visualDescription: 'Dynamic tracking shot following Alex sprinting along the concrete waterfront path under rising sun.',
          choreography: [
            {
              relativeStart: 0.0,
              relativeEnd: 3.5,
              action: 'Full-stride sprint, cadence accelerating as light glints off path',
              bodyMechanics: 'Athletic forward lean and rhythmic arm drive'
            }
          ],
          featuredCharacters: ['char_alex'],
          featuredProducts: [],
          locationRef: 'loc_street_sun'
        },
        camera: {
          shotFraming: 'medium_shot',
          framing: 'medium_shot',
          cameraAngle: 'low_angle',
          angle: 'low_angle',
          cameraMovement: 'tracking',
          movement: 'tracking',
          lensFocalLength: '35mm High-Speed Prime',
          depthOfField: 'shallow'
        },
        lighting: {
          mood: 'Vibrant golden hour sun flare slicing across frame',
          contrast: 'high',
          source: 'Natural low angle sun'
        },
        audio: {
          voiceover: 'When performance demands everything...',
          soundEffects: ['Rhythmic sneaker strikes on concrete', 'Exhale cadence'],
          musicCue: 'Bassline drives forward with percussive tempo'
        },
        continuity: {
          inheritedStates: [
            {
              sourceShotId: 'shot_01',
              entityId: 'char_alex',
              aspect: 'wardrobe',
              requirement: 'Must preserve charcoal running shirt'
            }
          ],
          producedStates: []
        },
        qaExpectations: {
          mustShow: ['Consistent facial identity for Alex', 'Smooth non-jittery camera tracking'],
          mustNotShow: ['Floating limbs', 'Background warping'],
          subjectProminence: 'featured'
        }
      },
      {
        shotId: 'shot_03',
        sequence: 3,
        durationSeconds: 4.0,
        beatRef: 'beat_03',
        action: {
          visualDescription: 'Alex slows to a halt and twists open the knurled titanium cap; cold pressurized vapor escapes with an audible hiss.',
          choreography: [
            {
              relativeStart: 0.0,
              relativeEnd: 2.0,
              action: 'Runner chest rises as Alex halts and raises bottle',
              bodyMechanics: 'Deep breath recovery posture'
            },
            {
              relativeStart: 2.0,
              relativeEnd: 4.0,
              action: 'Fingers twist knurled cap; micro vapor hiss',
              bodyMechanics: 'Precise two-hand grip and twist'
            }
          ],
          featuredCharacters: ['char_alex'],
          featuredProducts: ['prod_hydra_titanium'],
          locationRef: 'loc_street_sun'
        },
        camera: {
          shotFraming: 'close_up',
          framing: 'close_up',
          cameraAngle: 'eye_level',
          angle: 'eye_level',
          cameraMovement: 'push_in',
          movement: 'push_in',
          lensFocalLength: '50mm Cinema Prime',
          depthOfField: 'shallow'
        },
        lighting: {
          mood: 'Warm side backlight catching the cold vapor particles',
          contrast: 'medium',
          source: 'Golden rim flare'
        },
        audio: {
          soundEffects: ['Metallic cap twist click', 'Pressurized cold vapor hiss'],
          musicCue: 'Music drops to a tense atmospheric shimmer'
        },
        continuity: {
          inheritedStates: [
            {
              sourceShotId: 'shot_02',
              entityId: 'char_alex',
              aspect: 'wardrobe',
              requirement: 'Same charcoal shirt'
            }
          ],
          producedStates: [
            {
              entityId: 'prod_hydra_titanium',
              aspect: 'cap_state',
              description: 'Cap unthreaded and removed'
            }
          ]
        },
        qaExpectations: {
          mustShow: ['Crisp vapor mist effect', 'Legible brand typography on bottle'],
          mustNotShow: ['Distorted hands'],
          subjectProminence: 'hero_focus'
        }
      },
      {
        shotId: 'shot_04',
        sequence: 4,
        durationSeconds: 3.5,
        beatRef: 'beat_04',
        action: {
          visualDescription: 'Alex takes a revitalizing drink; camera captures pure relief and renewed determination in the eyes.',
          choreography: [
            {
              relativeStart: 0.0,
              relativeEnd: 3.5,
              action: 'Drinking flow followed by a decisive exhale and forward gaze',
              bodyMechanics: 'Relaxed shoulders and focused eye contact'
            }
          ],
          featuredCharacters: ['char_alex'],
          featuredProducts: ['prod_hydra_titanium'],
          locationRef: 'loc_street_sun'
        },
        camera: {
          shotFraming: 'close_up',
          framing: 'close_up',
          cameraAngle: 'low_angle',
          angle: 'low_angle',
          cameraMovement: 'orbital_arc',
          movement: 'orbital_arc',
          lensFocalLength: '50mm Cinema Prime',
          depthOfField: 'shallow'
        },
        lighting: {
          mood: 'Heroic warm sunrise glow across jawline',
          contrast: 'medium'
        },
        audio: {
          voiceover: '...never settle for second best.',
          soundEffects: ['Water gulping cadence', 'Revitalized breath'],
          musicCue: 'Inspiring orchestral crescendo swells'
        },
        continuity: {
          inheritedStates: [
            {
              sourceShotId: 'shot_03',
              entityId: 'char_alex',
              aspect: 'wardrobe',
              requirement: 'Preserve outfit'
            }
          ],
          producedStates: []
        },
        qaExpectations: {
          mustShow: ['Heroic profile lighting', 'Authentic runner perspiration'],
          mustNotShow: ['Glitchy water physics'],
          subjectProminence: 'featured'
        }
      },
      {
        shotId: 'shot_05',
        sequence: 5,
        durationSeconds: 3.5,
        beatRef: 'beat_05',
        action: {
          visualDescription: 'Hero pedestal packshot of the HydraFlow titanium flask against minimal stone slab with overlaid CTA.',
          choreography: [
            {
              relativeStart: 0.0,
              relativeEnd: 3.5,
              action: 'Subtle slow orbital spin settling into perfect centered alignment',
              bodyMechanics: 'Product center focus'
            }
          ],
          featuredCharacters: [],
          featuredProducts: ['prod_hydra_titanium'],
          locationRef: 'loc_gym_dawn'
        },
        camera: {
          shotFraming: 'close_up',
          framing: 'close_up',
          cameraAngle: 'eye_level',
          angle: 'eye_level',
          cameraMovement: 'static',
          movement: 'static',
          lensFocalLength: '85mm Portrait Prime',
          depthOfField: 'shallow'
        },
        lighting: {
          mood: 'Studio luxury lighting with soft specular rim cards',
          contrast: 'high'
        },
        audio: {
          voiceover: 'HydraFlow. Engineered for what’s next.',
          soundEffects: ['Crisp glass contact chime'],
          musicCue: 'Final resonant brand chord resolve'
        },
        continuity: {
          inheritedStates: [],
          producedStates: []
        },
        qaExpectations: {
          mustShow: ['Flawless brand logo', 'On-screen visual CTA text: Experience Pure Hydration — Shop Now'],
          mustNotShow: ['Flicker on text', 'Distorted geometry'],
          subjectProminence: 'hero_focus',
          textLegibilityRequired: true
        }
      }
    ],
    continuity: {
      globalRules: [
        'Alex Rivera must maintain consistent facial structure and short textured dark hair across all shots.',
        'Alex must wear the charcoal running shirt across shots 1 through 4.',
        'The HydraFlow titanium flask packaging geometry and laser-etched logo remain invariant.'
      ],
      trackers: [
        {
          trackerId: 'track_alex_wardrobe',
          entityId: 'char_alex',
          aspect: 'wardrobe',
          baselineState: 'Charcoal technical running shirt',
          shotStates: {
            shot_01: 'Charcoal running shirt',
            shot_02: 'Charcoal running shirt',
            shot_03: 'Charcoal running shirt',
            shot_04: 'Charcoal running shirt'
          }
        },
        {
          trackerId: 'track_bottle_branding',
          entityId: 'prod_hydra_titanium',
          aspect: 'branding',
          baselineState: 'Laser-etched titanium logo',
          shotStates: {
            shot_01: 'Etched logo front facing',
            shot_03: 'Etched logo side visible',
            shot_04: 'Etched logo in hand grip',
            shot_05: 'Etched logo hero centered'
          }
        }
      ]
    },
    constraints: {
      must: ['Include brand logo on bottle', 'Display CTA text in final shot'],
      should: ['Emphasize natural outdoor sunlight in sprint shot'],
      mustNot: ['Show competitive beverage brands', 'Introduce motion blur over typographic text']
    },
    generationRequirements: {
      firstFrameRequired: false,
      lastFrameRequired: true,
      minimumReferenceCount: 2,
      nativeAudioRequired: true,
      supportedAspectRatios: ['9:16', '16:9'],
      maxShotDurationSeconds: 4.0,
      minResolution: '1080p'
    },
    metadata: {
      author: 'AI Advertising Director',
      createdAt: new Date().toISOString(),
      tags: ['commercial', 'social_video', 'instagram_reels', 'athletic', 'hydration']
    }
  };
}
