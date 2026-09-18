/**
 * Change Impact Analyzer for AdSpec Operations.
 * Computes directly affected, indirectly affected, and unaffected components.
 * Enables targeted revisions without full-document invalidation.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { AdSpec } from '@shared-types/adSpec.js';
import type {
  DirectorOperation,
  ChangeImpactAnalysis,
  ImpactTier
} from '@shared-types/directorOperations.js';

export function analyzeChangeImpact(
  spec: AdSpec,
  operation: DirectorOperation
): ChangeImpactAnalysis {
  const directlyAffected: Set<string> = new Set();
  const indirectlyAffected: Set<string> = new Set();
  const unaffected: Set<string> = new Set();

  const { type, target } = operation;
  const scope = target.scope;
  const targetId = target.entityId;

  // 1. Determine Directly Affected
  if (targetId) {
    directlyAffected.add(targetId);
  } else if (target.path) {
    directlyAffected.add(`${scope}.${target.path}`);
  } else {
    directlyAffected.add(scope);
  }

  // 2. Compute Indirectly Affected based on entity and shot relationships
  switch (scope) {
    case 'location': {
      // Any shot set in this location is indirectly affected
      if (targetId) {
        spec.shots.forEach(shot => {
          if (shot.environment.locationId === targetId) {
            indirectlyAffected.add(shot.shotId);
            indirectlyAffected.add(`${shot.shotId}.lighting`);
            indirectlyAffected.add(`${shot.shotId}.audio.ambience`);
          }
        });
      }
      break;
    }

    case 'character': {
      // Any shot featuring this character is indirectly affected
      if (targetId) {
        spec.shots.forEach(shot => {
          const hasSubject = shot.subjects.some(s => s.entityId === targetId);
          if (hasSubject) {
            indirectlyAffected.add(shot.shotId);
            indirectlyAffected.add(`${shot.shotId}.action`);
          }
        });
        // Continuity links involving this character
        spec.continuity.links.forEach(link => {
          if (link.entityId === targetId) {
            indirectlyAffected.add(`continuity.${link.fromShotId}->${link.toShotId}`);
          }
        });
      }
      break;
    }

    case 'product': {
      // Any shot featuring this product is indirectly affected
      if (targetId) {
        spec.shots.forEach(shot => {
          const hasSubject = shot.subjects.some(s => s.entityId === targetId);
          if (hasSubject) {
            indirectlyAffected.add(shot.shotId);
            indirectlyAffected.add(`${shot.shotId}.qaExpectations.productVisibility`);
          }
        });
      }
      break;
    }

    case 'shot': {
      // Adjacent shots connected by continuity or sequence
      if (targetId) {
        const shotIndex = spec.shots.findIndex(s => s.shotId === targetId);
        if (shotIndex !== -1 && shotIndex < spec.shots.length - 1) {
          const nextShot = spec.shots[shotIndex + 1];
          // If changes affect end state or camera, next shot may have continuity implications
          if (operation.changes['action'] || operation.changes['camera'] || operation.changes['endingState']) {
            indirectlyAffected.add(nextShot.shotId);
            indirectlyAffected.add(`${nextShot.shotId}.continuity.inheritedStates`);
          }
        }
      }
      break;
    }

    case 'creative': {
      // Re-selecting concept affects all storyboard shots and story beats
      if (type === 'select_concept') {
        indirectlyAffected.add('story.beats');
        spec.shots.forEach(s => indirectlyAffected.add(s.shotId));
      }
      break;
    }

    case 'brief': {
      // Duration changes affect shot timing
      if (operation.changes['desiredDurationSeconds']) {
        spec.shots.forEach(s => indirectlyAffected.add(`${s.shotId}.timing`));
      }
      break;
    }
  }

  // 3. Populate Unaffected Components (Key Invariants)
  const allShots = spec.shots.map(s => s.shotId);
  const allChars = spec.characters.map(c => c.id);
  const allProds = spec.products.map(p => p.id);
  const allLocs = spec.locations.map(l => l.id);

  if (scope !== 'brief') unaffected.add('brief.brandRef');
  if (scope !== 'product' && !directlyAffected.has('product')) {
    unaffected.add('product');
    allProds.forEach(p => {
      if (!directlyAffected.has(p) && !indirectlyAffected.has(p)) unaffected.add(p);
    });
  }
  if (scope !== 'brand') unaffected.add('brand');
  if (scope !== 'character') {
    allChars.forEach(c => {
      if (!directlyAffected.has(c) && !indirectlyAffected.has(c)) unaffected.add(c);
    });
  }
  if (scope !== 'location') {
    allLocs.forEach(l => {
      if (!directlyAffected.has(l) && !indirectlyAffected.has(l)) unaffected.add(l);
    });
  }
  allShots.forEach(s => {
    if (!directlyAffected.has(s) && !indirectlyAffected.has(s)) {
      unaffected.add(s);
    }
  });

  const directList = Array.from(directlyAffected);
  const indirectList = Array.from(indirectlyAffected);
  const unaffectedList = Array.from(unaffected);

  let summary = `Directly affected: ${directList.join(', ')}.`;
  if (indirectList.length > 0) {
    summary += ` Indirectly affected: ${indirectList.slice(0, 4).join(', ')}${indirectList.length > 4 ? ` (+${indirectList.length - 4} more)` : ''}.`;
  }
  summary += ` ${unaffectedList.length} critical components remain unchanged.`;

  return {
    directlyAffected: directList,
    indirectlyAffected: indirectList,
    unaffected: unaffectedList,
    summary
  };
}

/**
 * Classifies an operation into one of four canonical impact tiers:
 * - PRODUCT_IDENTITY: Packaging, geometry, logo, materials, or branding modifications.
 * - STRUCTURAL_COST: Shot count changes (e.g. 5 shots -> 8 shots), shot insertions/deletions, or duration alterations.
 * - CREATIVE: Narrative beats, hook, emotional arc, payoff, premise, or character identity/removal.
 * - DIRECT: Targeted modifications to single shot camera, lighting, styling, color grading without affecting duration or narrative.
 */
export function classifyImpactTier(
  spec: AdSpec,
  operation: DirectorOperation
): ImpactTier {
  const { type, target, changes } = operation;
  const scope = target.scope;
  const path = target.path || '';

  // 1. PRODUCT IDENTITY: Any changes to product packaging, form factor, geometry, logo, branding, color palette, label, or materials.
  if (
    scope === 'product' ||
    type === 'update_product' ||
    type === 'remove_product' ||
    type === 'add_product' ||
    path.startsWith('product') ||
    changes['packaging'] ||
    changes['shapeForm'] ||
    changes['geometry'] ||
    changes['branding'] ||
    changes['logo'] ||
    changes['colorPalette'] ||
    changes['materials'] ||
    changes['labelLogoConstraints']
  ) {
    return 'PRODUCT_IDENTITY';
  }

  // 2. STRUCTURAL_COST: Any shot insertion, deletion, reorder, or duration alterations.
  if (
    type === 'insert_shot' ||
    type === 'insertShot' ||
    type === 'delete_shot' ||
    type === 'deleteShot' ||
    type === 'reorder_shots' ||
    type === 'reorderShot' ||
    (scope === 'brief' && (changes['desiredDurationSeconds'] !== undefined || changes['duration'] !== undefined)) ||
    path.includes('desiredDurationSeconds') ||
    changes['timing'] !== undefined ||
    path.endsWith('.timing') ||
    path.endsWith('.timing.duration')
  ) {
    return 'STRUCTURAL_COST';
  }

  // 3. CREATIVE: Any narrative premise, story beats, dialogue, hook, emotional arc, payoff, ending, or character removal.
  if (
    scope === 'story' ||
    scope === 'creative' ||
    type === 'update_story_beats' ||
    type === 'select_concept' ||
    type === 'propose_concepts' ||
    type === 'remove_character' ||
    type === 'add_character' ||
    type === 'update_character' ||
    scope === 'character' ||
    path.startsWith('story.') ||
    path.startsWith('creative.') ||
    changes['beats'] ||
    changes['hook'] ||
    changes['premise'] ||
    changes['emotionalArc'] ||
    changes['narrativeRole'] ||
    changes['dialogue'] ||
    changes['voiceover'] ||
    changes['endingState'] ||
    changes['climax']
  ) {
    return 'CREATIVE';
  }

  // 4. DIRECT: Targeted adjustments to single shot camera, lighting, grading, action, or subjects.
  return 'DIRECT';
}
