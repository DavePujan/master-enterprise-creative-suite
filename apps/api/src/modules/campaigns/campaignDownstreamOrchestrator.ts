/**
 * Deterministic Downstream Brief & Production Plan Compiler for Campaign Strategist 2.0.
 * Translates the MasterCampaignStrategy and selected Strategic Territory into:
 * 1. Semantic, provider-neutral briefs for Text, Image, Video, Audio, and Presentations.
 * 2. A dynamic 5-tier Campaign Production Plan with explicit asset dependencies and Gem-resolved cost estimates.
 *
 * Runs deterministically to guarantee alignment across all Creative Gems without extra LLM latency.
 */

import {
  MasterCampaignStrategy,
  StrategicTerritory,
  DownstreamBriefs,
  TextGemBrief,
  ImageGemBrief,
  VideoGemBrief,
  AudioGemBrief,
  MusicBrief,
  CampaignDeckBrief,
  CampaignDeckSlideBrief,
  CampaignProductionPlan,
  ProductionTierPlan,
  ProductionPlanAsset,
  ImageReferenceRequirement,
  CampaignBriefControls
} from '../../../../../packages/types/campaignStrategy.js';

export class CampaignDownstreamOrchestrator {
  /**
   * Compiles all downstream briefs deterministically from the strategy and territory.
   */
  compileBriefs(
    strategy: MasterCampaignStrategy,
    territory: StrategicTerritory,
    language = 'English'
  ): DownstreamBriefs {
    const textBrief = this.compileTextBrief(strategy, territory);
    const imageBrief = this.compileImageBrief(strategy, territory);
    const videoBrief = this.compileVideoBrief(strategy, territory);
    const audioBrief = this.compileAudioBrief(strategy, territory, language);
    const deckBrief = this.compileDeckBrief(strategy, territory);

    return {
      textBrief,
      imageBrief,
      videoBrief,
      audioBrief,
      deckBrief
    };
  }

  /**
   * Builds the dynamic 5-tier Campaign Production Plan.
   */
  compileProductionPlan(
    strategy: MasterCampaignStrategy,
    territory: StrategicTerritory,
    controls?: Partial<CampaignBriefControls>
  ): CampaignProductionPlan {
    const budgetReality = controls?.budgetReality || 'moderate';
    const isLean = budgetReality === 'no_paid_organic' || budgetReality === 'lean';
    const isEventOrFlash = controls?.timelineHorizon === 'urgent_under_1_week';

    const heroAssets: ProductionPlanAsset[] = [
      {
        id: 'hero-visual-01',
        title: `${strategy.campaignTitle} Master Key Visual`,
        tier: 'hero',
        assetType: 'image',
        strategicPurpose: `Anchor creative establishing the core visual world: ${territory.creativeWorld}`,
        coreHook: strategy.coreBigIdea.text,
        targetChannel: strategy.platformMatrix[0]?.platform || 'instagram',
        status: 'planned'
      },
      {
        id: 'hero-manifesto-audio-01',
        title: `${strategy.brandName} Manifesto Audio Track`,
        tier: 'hero',
        assetType: 'audio',
        strategicPurpose: `Sonic and vocal embodiment of the campaign breakthrough angle`,
        coreHook: strategy.positioningManifesto[0]?.text || strategy.coreBigIdea.text,
        targetChannel: 'youtube',
        status: 'planned'
      }
    ];

    if (!isLean) {
      heroAssets.push({
        id: 'hero-film-01',
        title: `15s Hero Cinematic Film`,
        tier: 'hero',
        assetType: 'video',
        strategicPurpose: `Main theatrical hook resolving ${strategy.creativeTension.currentBelief}`,
        coreHook: strategy.coreBigIdea.text,
        targetChannel: 'youtube',
        dependsOn: ['hero-visual-01'],
        status: 'planned'
      });
    }

    const awarenessAssets: ProductionPlanAsset[] = [
      {
        id: 'awareness-hook-reels-01',
        title: `Pattern-Interrupt Reels / Shorts`,
        tier: 'awareness',
        assetType: 'video',
        strategicPurpose: `High-velocity pattern interrupt driving curiosity`,
        coreHook: strategy.contentPillars[0]?.exampleHook || strategy.coreBigIdea.text,
        targetChannel: 'instagram',
        dependsOn: ['hero-visual-01'],
        status: 'planned'
      },
      {
        id: 'awareness-social-feed-01',
        title: `Declarative Contrast Carousel`,
        tier: 'awareness',
        assetType: 'text',
        strategicPurpose: `Visual breakdown of the category status quo vs new standard`,
        coreHook: strategy.contentPillars[0]?.exampleHook || territory.oneLinePremise,
        targetChannel: 'instagram',
        status: 'planned'
      },
      {
        id: 'awareness-provocative-copy-01',
        title: `Category White Space Social Posts (x3)`,
        tier: 'awareness',
        assetType: 'text',
        strategicPurpose: `Unapologetic contrast against overused category clichés`,
        coreHook: territory.oneLinePremise,
        targetChannel: strategy.platformMatrix[1]?.platform || 'linkedin',
        status: 'planned'
      }
    ];

    const considerationAssets: ProductionPlanAsset[] = [
      {
        id: 'consideration-proof-carousel-01',
        title: `Verifiable Proof & Teardown Carousel`,
        tier: 'consideration',
        assetType: 'image',
        strategicPurpose: `Substantiates claims with live proof, receipts, or case studies`,
        coreHook: strategy.creativeTension.breakthroughAngle,
        targetChannel: 'instagram',
        dependsOn: ['hero-visual-01'],
        status: 'planned'
      },
      {
        id: 'consideration-explainer-script-01',
        title: `How It Works Mechanism Audio Explainer`,
        tier: 'consideration',
        assetType: 'audio',
        strategicPurpose: `Deconstructs why the mechanism succeeds where competitors fail`,
        coreHook: territory.theMechanism,
        targetChannel: 'podcast-ads',
        status: 'planned'
      }
    ];

    const conversionAssets: ProductionPlanAsset[] = [
      {
        id: 'conversion-offer-visual-01',
        title: `Direct Value Proposition Ad Visual`,
        tier: 'conversion',
        assetType: 'image',
        strategicPurpose: `Uncluttered transactional conversion asset with high CTA clarity`,
        coreHook: `Explore ${strategy.brandName} now.`,
        targetChannel: 'meta-ads',
        dependsOn: ['hero-visual-01'],
        status: 'planned'
      },
      {
        id: 'conversion-retargeting-copy-01',
        title: `High-Intent Retargeting Ad Angles (x3)`,
        tier: 'conversion',
        assetType: 'text',
        strategicPurpose: `Addresses residual customer skepticism and closes the transaction`,
        coreHook: strategy.creativeTension.breakthroughAngle,
        targetChannel: 'meta-ads',
        status: 'planned'
      }
    ];

    const retentionAssets: ProductionPlanAsset[] = isEventOrFlash
      ? []
      : [
          {
            id: 'retention-advocacy-guide-01',
            title: `Customer Ritual & Onboarding Copy`,
            tier: 'retention_advocacy',
            assetType: 'text',
            strategicPurpose: `Turns new purchasers into passionate advocates through ritualized onboarding`,
            coreHook: `Welcome to the standard.`,
            targetChannel: 'newsletter',
            status: 'planned'
          },
          {
            id: 'retention-ugc-community-brief-01',
            title: `Community Reaction & Review Creator Brief`,
            tier: 'retention_advocacy',
            assetType: 'text',
            strategicPurpose: `Encourages authentic customer receipts and organic reviews`,
            coreHook: territory.oneLinePremise,
            targetChannel: 'instagram',
            status: 'planned'
          }
        ];

    const tiers: Record<string, ProductionTierPlan> = {
      hero: {
        tier: 'hero',
        tierLabel: 'Hero Creative (Anchor Assets)',
        isRecommended: true,
        assets: heroAssets
      },
      awareness: {
        tier: 'awareness',
        tierLabel: 'Top-of-Funnel Awareness',
        isRecommended: true,
        assets: awarenessAssets
      },
      consideration: {
        tier: 'consideration',
        tierLabel: 'Mid-Funnel Consideration & Proof',
        isRecommended: true,
        assets: considerationAssets
      },
      conversion: {
        tier: 'conversion',
        tierLabel: 'Bottom-of-Funnel Conversion',
        isRecommended: true,
        assets: conversionAssets
      },
      retention_advocacy: {
        tier: 'retention_advocacy',
        tierLabel: 'Post-Purchase Retention & Advocacy',
        isRecommended: !isEventOrFlash,
        omissionRationale: isEventOrFlash
          ? 'Retention not prioritized for this acute 1-week flash acquisition flight.'
          : undefined,
        assets: retentionAssets
      }
    };

    // Calculate dynamic Gem cost range
    let totalAssets = 0;
    let minCredits = 0;
    let maxCredits = 0;

    Object.values(tiers).forEach(t => {
      t.assets.forEach(a => {
        totalAssets++;
        if (a.assetType === 'text') {
          minCredits += 1;
          maxCredits += 1;
        } else if (a.assetType === 'image') {
          minCredits += 1;
          maxCredits += 3;
        } else if (a.assetType === 'video') {
          minCredits += 10;
          maxCredits += 20;
        } else if (a.assetType === 'audio') {
          minCredits += 2;
          maxCredits += 5;
        } else if (a.assetType === 'deck') {
          minCredits += 5;
          maxCredits += 5;
        }
      });
    });

    return {
      strategyId: strategy.strategyId,
      campaignTitle: strategy.campaignTitle,
      totalAssetsCount: totalAssets,
      estimatedProductionCreditRange: {
        min: minCredits,
        max: maxCredits
      },
      tiers: tiers as any
    };
  }

  private compileTextBrief(
    strategy: MasterCampaignStrategy,
    territory: StrategicTerritory
  ): TextGemBrief {
    const primaryPlatform = strategy.platformMatrix[0]?.platform || 'instagram';
    const heroHook = strategy.contentPillars[0]?.exampleHook || strategy.coreBigIdea.text;
    const manifestoLines = strategy.positioningManifesto.map(m => m.text);
    const copyCodes = territory.creativeCodes?.copyCodes?.join('; ') || 'Declarative, authentic tone';

    return {
      platform: primaryPlatform,
      targetAudience: strategy.audienceDiagnosis.demographics,
      coreHook: heroHook,
      angle: strategy.contentPillars[0]?.narrativeAngle || territory.oneLinePremise,
      tone: `${territory.creativeWorld} • Copy Codes: ${copyCodes}`,
      copyVariants: {
        shortFeedCopy: `${heroHook}\n\n${strategy.coreBigIdea.text}`,
        longFormPost: `${heroHook}\n\n${manifestoLines.join('\n\n')}\n\n${territory.theMechanism}`,
        threadOrCarouselCaptions: [
          `Slide 1: ${strategy.creativeTension.currentBelief}`,
          `Slide 2: ${strategy.creativeTension.behavioralBarrier}`,
          `Slide 3: ${strategy.creativeTension.breakthroughAngle}`,
          `Slide 4: ${strategy.coreBigIdea.text}`
        ]
      },
      callToAction: `Explore ${strategy.brandName} now.`,
      constraints: [
        'Zero banned marketing clichés (no "elevate", "unlock", "game-changer", "seamless")',
        `Strict adherence to campaign vocabulary: ${territory.creativeCodes?.vocabulary?.join(', ') || 'Authentic vernacular'}`,
        'Platform-native formatting with clear visual hierarchy'
      ]
    };
  }

  private compileImageBrief(
    strategy: MasterCampaignStrategy,
    territory: StrategicTerritory
  ): ImageGemBrief {
    const heroExecution = strategy.creativeExecutions[0];
    const visualConcept = heroExecution?.visualDirection || territory.creativeWorld;
    const visualCodes = territory.creativeCodes?.visualCodes?.join(', ') || 'Editorial commercial lighting';

    const isFashionOrBeauty = territory.frameworkId.includes('luxury') || territory.frameworkId.includes('beauty');
    const refReq: ImageReferenceRequirement = isFashionOrBeauty ? 'product+face' : 'product';

    return {
      assetRole: 'hero-shot',
      visualConcept,
      composition: 'Rule of thirds, strong central subject with natural depth of field, uncluttered environment',
      aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
      referenceRequirements: refReq,
      lighting: `Atmospheric cinematic key light with soft natural fill • Visual Codes: ${visualCodes}`,
      cameraAngle: 'Eye-level editorial commercial perspective',
      negativeSpaceDirection: 'Top third negative space reserved for headline typography',
      textlessPrompt: `High-end commercial photograph representing ${strategy.brandName}. ${visualConcept}. ${visualCodes}. Masterpiece lighting, 8k, crisp texture, authentic realism, textless, no watermarks, no typography.`,
      capabilityRequirements: {
        requiresConsistency: true,
        negativePrompt: 'blurry, oversaturated, plastic skin, rendered typography, watermarks'
      }
    };
  }

  private compileVideoBrief(
    strategy: MasterCampaignStrategy,
    territory: StrategicTerritory
  ): VideoGemBrief {
    const heroExecution = strategy.creativeExecutions[0];
    const motionCodes = territory.creativeCodes?.motionCodes?.join(', ') || 'Smooth slow push-in';

    return {
      shotPurpose: 'hook-3sec',
      narrativeArc: heroExecution?.narrativeArc || `Tension between ${strategy.creativeTension.currentBelief} and ${strategy.coreBigIdea.text}`,
      sceneDescription: heroExecution?.visualDirection || territory.creativeWorld,
      cameraMovement: 'push-in',
      subjectAction: 'Subject engages in deliberate, decisive action embodying the breakthrough angle',
      durationSec: 15,
      aspectRatio: '9:16',
      textlessPrompt: `Cinematic 9:16 commercial video for ${strategy.brandName}. ${heroExecution?.visualDirection || territory.creativeWorld}. Motion Codes: ${motionCodes}. Continuous lighting, photorealistic, textless, zero on-screen text.`,
      pacingNote: `Opening 3 seconds deliver high visual pattern-interrupt; steady build-up adhering to: ${motionCodes}.`
    };
  }

  private compileAudioBrief(
    strategy: MasterCampaignStrategy,
    territory: StrategicTerritory,
    language: string
  ): AudioGemBrief {
    const isHindi = language.toLowerCase().includes('hindi');
    const scriptLines = strategy.positioningManifesto.map(m => m.text);
    const spokenScript = scriptLines.join('. ') || strategy.coreBigIdea.text;
    const soundCodes = territory.creativeCodes?.soundCodes?.join(', ') || 'Conversational, warm acoustic resonance';

    const musicBrief: MusicBrief = {
      role: 'cinematic-swell',
      mood: `Subtle atmospheric acoustic bed swelling into modern rhythmic pulse (${territory.creativeWorld})`,
      genre: 'Acoustic Ambient / Modern Cinematic',
      energy: 'moderate',
      durationSec: 30,
      lyricPolicy: 'instrumental-only',
      usageContext: `Campaign anthem soundtrack backing ${strategy.campaignTitle}`
    };

    return {
      voPurpose: 'brand-manifesto',
      scriptIntent: `Deliver the core emotional conviction of "${strategy.coreBigIdea.text}"`,
      spokenScriptText: spokenScript,
      language: isHindi ? 'Hindi' : 'English',
      dialectOrAccent: isHindi ? 'Contemporary Urban Hindi' : 'Modern Neutral English',
      speakerCount: 1,
      speakerRoles: ['Authoritative Visionary Narrator'],
      performanceStyle: 'authoritative',
      pace: 'measured',
      emotionalArc: `Starts with quiet reflection on ${strategy.creativeTension.currentBelief}, builds confidence, concludes with resounding clarity on ${strategy.coreBigIdea.text}`,
      musicRole: 'cinematic-swell',
      musicMood: musicBrief.mood,
      musicBrief
    };
  }

  private compileDeckBrief(
    strategy: MasterCampaignStrategy,
    territory: StrategicTerritory
  ): CampaignDeckBrief {
    const slides: CampaignDeckSlideBrief[] = [
      {
        slideNumber: 1,
        purpose: 'cover',
        slideTitle: strategy.campaignTitle,
        executiveTakeaway: strategy.coreBigIdea.text,
        bulletPoints: [
          `Brand: ${strategy.brandName}`,
          `Strategic Framework: ${territory.title}`,
          `Campaign Direction: ${territory.oneLinePremise}`
        ],
        visualDirection: 'Bold minimalist cover with high-contrast brand typography and dark gradient background'
      },
      {
        slideNumber: 2,
        purpose: 'problem',
        slideTitle: 'The Cultural & Behavioral Tension',
        executiveTakeaway: strategy.creativeTension.currentBelief,
        bulletPoints: [
          `Current Audience Mindset: ${strategy.creativeTension.currentBelief}`,
          `Core Behavioral Friction: ${strategy.creativeTension.behavioralBarrier}`,
          `Category Inertia: The status quo fails to solve root customer pain`
        ],
        visualDirection: 'Split contrast layout illustrating audience dilemma'
      },
      {
        slideNumber: 3,
        purpose: 'opportunity',
        slideTitle: 'The Strategic Breakthrough',
        executiveTakeaway: strategy.creativeTension.breakthroughAngle,
        bulletPoints: [
          `Desired Belief: ${strategy.creativeTension.desiredBelief}`,
          `The Mechanism: ${territory.theMechanism}`,
          `Why It Works: ${territory.whyItWorks}`
        ],
        visualDirection: 'Clean bento grid highlighting the breakthrough mechanism'
      },
      {
        slideNumber: 4,
        purpose: 'strategy',
        slideTitle: 'Core Big Idea & Manifesto',
        executiveTakeaway: strategy.coreBigIdea.text,
        bulletPoints: strategy.positioningManifesto.slice(0, 3).map(m => m.text),
        visualDirection: 'Hero manifesto typography layout with bold accent callout'
      },
      {
        slideNumber: 5,
        purpose: 'solution',
        slideTitle: 'Content Mix & Channel Matrix',
        executiveTakeaway: `Multi-channel distribution across ${strategy.platformMatrix.map(p => p.platform).join(', ')}`,
        bulletPoints: strategy.contentPillars.map(p => `${p.name} (${p.shareOfVoicePercent}% Mix): ${p.strategicPurpose}`),
        visualDirection: 'Multi-column matrix showing platform formats and cadences'
      },
      {
        slideNumber: 6,
        purpose: 'timeline',
        slideTitle: 'Rollout Phases & Momentum',
        executiveTakeaway: `${strategy.rolloutPhases.length}-phase activation schedule from spark to conversion`,
        bulletPoints: strategy.rolloutPhases.map(r => `${r.phase} (${r.duration}): ${r.strategicFocus}`),
        visualDirection: 'Horizontal timeline roadmap with milestone nodes'
      },
      {
        slideNumber: 7,
        purpose: 'metrics',
        slideTitle: 'Performance Measurement & Success KPIs',
        executiveTakeaway: `Primary Metric: ${strategy.performanceKPIs.primarySuccessMetric}`,
        bulletPoints: [
          `Primary: ${strategy.performanceKPIs.primarySuccessMetric}`,
          `Secondary Metrics: ${strategy.performanceKPIs.secondaryMetrics.join(', ')}`,
          `Audited Target Benchmark: ${strategy.performanceKPIs.unverifiedBenchmarkPlaceholders[0] || '[Insert verified CPA]'}`
        ],
        metricPlaceholder: strategy.performanceKPIs.unverifiedBenchmarkPlaceholders[0],
        visualDirection: 'Metric stat callouts with benchmark placeholders'
      },
      {
        slideNumber: 8,
        purpose: 'closing',
        slideTitle: 'Execution Roadmap & Production Plan',
        executiveTakeaway: 'Immediate creative production across Text, Image, Video, and Audio gems',
        bulletPoints: [
          'Approve Creative Gem briefs',
          'Dispatch generation jobs to multimodal pipeline',
          'Deploy pilot assets to Phase 1 channels'
        ],
        visualDirection: 'Clean executive sign-off layout with next milestone checkmarks'
      }
    ];

    return {
      narrativeArc: 'Executive Presentation Arc: Problem Tension -> Breakthrough -> Big Idea -> Multi-Platform Strategy -> Rollout -> KPIs',
      slideCount: slides.length,
      slides,
      presentationThemeSuggestion: 'modern-dark'
    };
  }
}

export const campaignDownstreamOrchestrator = new CampaignDownstreamOrchestrator();
