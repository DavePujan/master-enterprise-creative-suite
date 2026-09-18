import crypto from 'crypto';
import type { AdSpec } from '@contracts/adSpecContracts.js';


/**
 * Deterministic creative state hasher for Video AdSpec.
 * Invariant: Produces an identical SHA-256 digest for identical creative intent
 * regardless of key ordering or volatile metadata (timestamps, DB IDs, author IDs).
 */
export function calculateAdSpecHash(spec: AdSpec): string {
  const normalized = {
    schemaVersion: spec.schemaVersion || '1.0.0',
    brief: {
      brandRef: spec.brief?.brandRef || '',
      product: spec.brief?.product || '',
      objective: typeof spec.brief?.objective === 'object' && spec.brief.objective !== null && 'value' in spec.brief.objective
        ? (spec.brief.objective as any).value
        : spec.brief?.objective,
      targetAudience: spec.brief?.targetAudience,
      platform: spec.brief?.platform,
      placement: spec.brief?.placement || '',
      desiredDurationSeconds: typeof spec.brief?.desiredDurationSeconds === 'object' && spec.brief.desiredDurationSeconds !== null && 'value' in spec.brief.desiredDurationSeconds
        ? (spec.brief.desiredDurationSeconds as any).value
        : spec.brief?.desiredDurationSeconds,
      aspectRatio: spec.brief?.aspectRatio,
      language: spec.brief?.language || 'en',
      cta: spec.brief?.cta,
      offer: spec.brief?.offer || '',
      keyMessage: typeof spec.brief?.keyMessage === 'object' && spec.brief.keyMessage !== null && 'value' in spec.brief.keyMessage
        ? (spec.brief.keyMessage as any).value
        : spec.brief?.keyMessage,
      tone: typeof spec.brief?.tone === 'object' && spec.brief.tone !== null && 'value' in spec.brief.tone
        ? (spec.brief.tone as any).value
        : spec.brief?.tone,
      mustInclude: [...(spec.brief?.mustInclude || [])].sort(),
      mustAvoid: [...(spec.brief?.mustAvoid || [])].sort(),
      userConstraints: [...(spec.brief?.userConstraints || [])].sort(),
    },
    creative: spec.creative ? {
      concepts: (spec.creative.concepts || []).map(c => ({
        conceptId: c.conceptId,
        name: c.name,
        oneLinePremise: c.oneLinePremise,
        coreIdea: c.coreIdea,
        narrativeMechanism: c.narrativeMechanism,
        visualMechanism: c.visualMechanism,
      })).sort((a, b) => a.conceptId.localeCompare(b.conceptId)),
      selectedConceptId: spec.creative.selectedConceptId || null,
    } : null,
    brand: spec.brand ? {
      adSpecificOverrides: spec.brand.adSpecificOverrides || {},
      priorityHierarchy: spec.brand.priorityHierarchy || [],
    } : null,
    assets: (spec.assets?.assets || []).map(a => ({
      assetId: a.assetId,
      semanticRole: a.semanticRole,
      targetEntityId: a.targetEntityId || '',
      priority: a.priority || 1,
    })).sort((a, b) => a.assetId.localeCompare(b.assetId)),
    characters: (Array.isArray(spec.characters) ? spec.characters : (spec.characters as any)?.characters || []).map((c: any) => ({
      id: c.characterId || c.id || '',
      displayName: c.name || c.displayName || '',
      narrativeRole: c.role || c.narrativeRole || '',
      appearance: c.appearance || c.visualDescription || {},
      wardrobe: c.wardrobe || {},
      referenceAssetIds: [...(c.referenceAssetIds || [])].sort(),
      behaviorPersonality: c.behaviorPersonality || '',
      locks: [...(c.locks || [])].sort(),
    })).sort((a: any, b: any) => (a.id || '').localeCompare(b.id || '')),
    products: (Array.isArray(spec.products) ? spec.products : (spec.products as any)?.products || []).map((p: any) => ({
      id: p.productId || p.id || '',
      name: p.name || '',
      visualDescription: p.visualDescription || '',
      shapeForm: p.shapeForm || '',
      materials: [...(p.materials || [])].sort(),
      colorPalette: [...(p.colorPalette || [])].sort(),
      packaging: p.packaging || {},
      branding: p.branding || {},
      referenceAssetIds: [...(p.referenceAssetIds || [])].sort(),
      locks: [...(p.locks || [])].sort(),
    })).sort((a: any, b: any) => (a.id || '').localeCompare(b.id || '')),
    locations: (Array.isArray(spec.locations) ? spec.locations : (spec.locations as any)?.locations || []).map((l: any) => ({
      id: l.locationId || l.id || '',
      name: l.name || '',
      description: l.description || l.visualDescription || '',
      architecture: l.architecture || '',
      spatialCharacteristics: l.spatialCharacteristics || {},
      lightingCharacteristics: l.lightingCharacteristics || {},
      palette: [...(l.palette || [])].sort(),
      referenceAssetIds: [...(l.referenceAssetIds || [])].sort(),
      locks: [...(l.locks || [])].sort(),
    })).sort((a: any, b: any) => (a.id || '').localeCompare(b.id || '')),
    shots: (spec.shots || []).map(s => ({
      shotId: s.shotId,
      sequence: s.sequence,
      purpose: s.purpose || '',
      narrativeRole: s.narrativeRole || '',
      duration: s.timing?.duration || 0,
      locationId: s.environment?.locationId || '',
      subjects: (s.subjects || []).map(sub => ({
        entityId: sub.entityId,
        entityType: sub.entityType,
        roleInShot: sub.roleInShot,
      })).sort((a, b) => a.entityId.localeCompare(b.entityId)),
      camera: s.camera || {},
      lighting: s.lighting || {},
      visualDirection: s.visualDirection || {},
      audio: s.audio || {},
      referencedAssetIds: [...(s.referencedAssetIds || [])].sort(),
      continuity: s.continuity || {},
      constraints: s.constraints || {},
      qaExpectations: s.qaExpectations || {},
    })).sort((a, b) => a.sequence - b.sequence),
    constraints: Array.isArray(spec.constraints) ? spec.constraints.map(c => ({
      id: c.id,
      category: c.category,
      severity: c.severity,
      rule: c.rule,
      targetEntityId: c.targetEntityId || '',
      targetShotId: c.targetShotId || '',
    })).sort((a, b) => (a.id || '').localeCompare(b.id || '')) : [],
    generationRequirements: spec.generationRequirements ? {
      durationSeconds: spec.generationRequirements.durationSeconds,
      aspectRatio: spec.generationRequirements.aspectRatio,
      audioRequired: spec.generationRequirements.audioRequired,
      firstFrameRequired: spec.generationRequirements.firstFrameRequired,
      lastFrameRequired: spec.generationRequirements.lastFrameRequired,
      minimumReferenceCount: spec.generationRequirements.minimumReferenceCount,
    } : null,
  };

  const canonicalJson = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}
