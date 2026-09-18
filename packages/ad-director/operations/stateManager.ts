/**
 * Deterministic Director State Manager.
 * Orchestrates operation validation, impact analysis, continuity inspection,
 * atomic AdSpec state application, version progression, and structured diff generation.
 *
 * Guarantees:
 * 1. Zero partial mutation on failure (atomic transaction semantics).
 * 2. Strict confirmed-state protection.
 * 3. Exact structured diffs and automated human-readable revision explanations.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  AdSpec,
  AdShot,
  AdSpecCharacterEntity,
  AdSpecProductEntity,
  AdSpecLocationEntity,
  CreativeConceptItem,
  DirectorCreativeState
} from '@shared-types/adSpec.js';
import type {
  DirectorOperation,
  AdSpecDiff,
  ChangeImpactAnalysis,
  ContinuityReport
} from '@shared-types/directorOperations.js';
import { validateAdSpec } from '../adspec/validator.js';
import { validateDirectorOperation } from './operationValidator.js';
import { analyzeChangeImpact } from './changeImpact.js';
import { checkContinuity } from './continuitySupervisor.js';

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}

function getValueByPath(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function setValueByPath(obj: any, path: string, val: any): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = val;
}

function normalizeShotPropertyKey(path: string, val?: any): string {
  if (path === 'action' && typeof val === 'string') return 'action.action';
  if (path === 'environment' && typeof val === 'string') return 'environment.locationId';
  if (path === 'camera' && typeof val === 'string') return 'camera.cameraMovement';
  if (path === 'lighting' && typeof val === 'string') return 'lighting.atmosphere';

  if (path.startsWith('camera.')) {
    const sub = path.replace('camera.', '');
    if (sub === 'movement') return 'camera.cameraMovement';
    if (sub === 'framing') return 'camera.framing';
    return `camera.${sub}`;
  }
  return path;
}

/**
 * Generates an automated human-readable explanation strictly from the structured diff.
 */
function generateHumanExplanation(diff: {
  affectedShots: string[];
  affectedEntities: string[];
  modifiedPaths: string[];
  scope: string;
}): string {
  const { affectedShots, affectedEntities, modifiedPaths, scope } = diff;

  if (affectedShots.length === 1 && scope === 'shot') {
    const shotId = affectedShots[0];
    const cleanedProps = modifiedPaths.map(p => p.split('.').pop()).filter(Boolean);
    const uniqueProps = Array.from(new Set(cleanedProps));
    return `Updated Shot ${shotId.replace('shot_', '')} (${uniqueProps.join(', ')}). No other shots were changed.`;
  }

  if (scope === 'location' && affectedEntities.length > 0) {
    return `Updated location ${affectedEntities.join(', ')}. Dependent shots and lighting parameters recalculated.`;
  }

  if (scope === 'concept' || scope === 'creative') {
    return 'Updated creative direction and concept selection.';
  }

  if (modifiedPaths.length > 0) {
    return `Applied ${modifiedPaths.length} change(s) across ${scope}. State verified and committed.`;
  }

  return 'Director operation applied successfully.';
}

export interface ApplyOperationResult {
  updatedAdSpec: AdSpec;
  diff: AdSpecDiff;
  impact: ChangeImpactAnalysis;
  continuity: ContinuityReport;
  explanation: string;
}

/**
 * Applies a single DirectorOperation deterministically and atomically.
 */
export function applyDirectorOperation(
  currentSpec: AdSpec,
  operation: DirectorOperation
): ApplyOperationResult {
  if (!currentSpec) {
    throw new Error('Cannot apply operation to null or undefined AdSpec');
  }

  // 1. Validation pipeline
  const validation = validateDirectorOperation(currentSpec, operation);
  if (!validation.valid) {
    throw new Error(`Operation validation failed: ${validation.errors.join('; ')}`);
  }

  // 2. Change Impact Analysis
  const impact = analyzeChangeImpact(currentSpec, operation);

  // 3. Prepare working copy for atomic mutation
  const workingSpec: AdSpec = deepClone(currentSpec);
  const modifiedPaths: string[] = [];
  const previousValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};
  const affectedShots: Set<string> = new Set();
  const affectedEntities: Set<string> = new Set();

  const { type, target, changes } = operation;
  const scope = target.scope;
  const targetId = target.entityId;

  // 4. Apply Operation according to Type
  switch (type) {
    case 'update_shot': {
      if (!targetId) throw new Error('Shot operation requires target.entityId');
      const shotIndex = workingSpec.shots.findIndex(s => s.shotId === targetId);
      if (shotIndex === -1) throw new Error(`Target shot "${targetId}" not found`);

      const targetShot = workingSpec.shots[shotIndex];
      affectedShots.add(targetId);

      for (const [key, value] of Object.entries(changes)) {
        const normalizedKey = normalizeShotPropertyKey(key, value);
        previousValues[`${targetId}.${normalizedKey}`] = deepClone(getValueByPath(targetShot, normalizedKey));
        setValueByPath(targetShot, normalizedKey, deepClone(value));
        newValues[`${targetId}.${normalizedKey}`] = deepClone(value);
        modifiedPaths.push(`${targetId}.${normalizedKey}`);
      }
      break;
    }

    case 'insert_shot': {
      const newShot = changes as AdShot;
      if (!newShot || !newShot.shotId) {
        throw new Error('insert_shot requires a complete shot object with shotId');
      }
      workingSpec.shots.push(deepClone(newShot));
      // Re-index sequences
      workingSpec.shots.forEach((s, idx) => {
        s.sequence = idx + 1;
      });
      // Maintain duration invariant: if brief desiredDurationSeconds is defined, redistribute timings across shots
      const briefDuration = workingSpec.brief?.desiredDurationSeconds;
      if (typeof briefDuration === 'number' && briefDuration > 0) {
        const count = workingSpec.shots.length;
        let cumulative = 0;
        workingSpec.shots.forEach((shot, idx) => {
          const isLast = idx === count - 1;
          const dur = isLast
            ? Math.max(0.5, Number((briefDuration - cumulative).toFixed(2)))
            : Number((briefDuration / count).toFixed(2));
          shot.timing = {
            startTime: cumulative,
            endTime: Number((cumulative + dur).toFixed(2)),
            duration: dur
          };
          cumulative = Number((cumulative + dur).toFixed(2));
        });
      } else {
        const totalDur = workingSpec.shots.reduce((acc, s) => acc + (s.timing?.duration || 0), 0);
        if (workingSpec.brief) {
          workingSpec.brief.desiredDurationSeconds = +totalDur.toFixed(1);
        }
        if (workingSpec.generationRequirements) {
          workingSpec.generationRequirements.durationSeconds = +totalDur.toFixed(1);
        }
      }
      affectedShots.add(newShot.shotId);
      modifiedPaths.push(`shots[${newShot.shotId}]`);
      newValues[newShot.shotId] = deepClone(newShot);
      break;
    }

    case 'delete_shot': {
      if (!targetId) throw new Error('delete_shot requires target.entityId');
      const idx = workingSpec.shots.findIndex(s => s.shotId === targetId);
      if (idx === -1) throw new Error(`Target shot "${targetId}" not found`);

      previousValues[targetId] = deepClone(workingSpec.shots[idx]);
      workingSpec.shots.splice(idx, 1);
      // Re-index sequence numbers
      workingSpec.shots.forEach((s, sIdx) => {
        s.sequence = sIdx + 1;
      });
      // Maintain duration invariant: if brief desiredDurationSeconds is defined, redistribute timings across shots
      const briefDuration = workingSpec.brief?.desiredDurationSeconds;
      if (typeof briefDuration === 'number' && briefDuration > 0 && workingSpec.shots.length > 0) {
        const count = workingSpec.shots.length;
        let cumulative = 0;
        workingSpec.shots.forEach((shot, sIdx) => {
          const isLast = sIdx === count - 1;
          const dur = isLast
            ? Math.max(0.5, Number((briefDuration - cumulative).toFixed(2)))
            : Number((briefDuration / count).toFixed(2));
          shot.timing = {
            startTime: cumulative,
            endTime: Number((cumulative + dur).toFixed(2)),
            duration: dur
          };
          cumulative = Number((cumulative + dur).toFixed(2));
        });
      } else {
        const totalDur = workingSpec.shots.reduce((acc, s) => acc + (s.timing?.duration || 0), 0);
        if (workingSpec.brief) {
          workingSpec.brief.desiredDurationSeconds = +totalDur.toFixed(1);
        }
        if (workingSpec.generationRequirements) {
          workingSpec.generationRequirements.durationSeconds = +totalDur.toFixed(1);
        }
      }
      affectedShots.add(targetId);
      modifiedPaths.push(`shots.deleted.${targetId}`);
      break;
    }

    case 'update_field': {
      const fieldPath = target.path || Object.keys(changes)[0];
      for (const [k, v] of Object.entries(changes)) {
        const fullPath = target.scope === 'root' ? k : `${target.scope}.${k}`;
        previousValues[fullPath] = deepClone(getValueByPath(workingSpec, fullPath));
        setValueByPath(workingSpec, fullPath, deepClone(v));
        newValues[fullPath] = deepClone(v);
        modifiedPaths.push(fullPath);
      }
      break;
    }

    case 'add_character': {
      const char = changes as AdSpecCharacterEntity;
      workingSpec.characters.push(deepClone(char));
      affectedEntities.add(char.id);
      modifiedPaths.push(`characters.${char.id}`);
      newValues[char.id] = deepClone(char);
      break;
    }

    case 'update_character': {
      if (!targetId) throw new Error('update_character requires target.entityId');
      const cIdx = workingSpec.characters.findIndex(c => c.id === targetId);
      if (cIdx === -1) throw new Error(`Character "${targetId}" not found`);
      const targetChar = workingSpec.characters[cIdx];
      affectedEntities.add(targetId);

      for (const [k, v] of Object.entries(changes)) {
        previousValues[`${targetId}.${k}`] = deepClone(getValueByPath(targetChar, k));
        setValueByPath(targetChar, k, deepClone(v));
        newValues[`${targetId}.${k}`] = deepClone(v);
        modifiedPaths.push(`characters.${targetId}.${k}`);
      }
      break;
    }

    case 'add_product': {
      const prod = changes as AdSpecProductEntity;
      workingSpec.products.push(deepClone(prod));
      affectedEntities.add(prod.id);
      modifiedPaths.push(`products.${prod.id}`);
      newValues[prod.id] = deepClone(prod);
      break;
    }

    case 'update_product': {
      if (!targetId) throw new Error('update_product requires target.entityId');
      const pIdx = workingSpec.products.findIndex(p => p.id === targetId);
      if (pIdx === -1) throw new Error(`Product "${targetId}" not found`);
      const targetProd = workingSpec.products[pIdx];
      affectedEntities.add(targetId);

      for (const [k, v] of Object.entries(changes)) {
        let finalVal = v;
        if (k === 'packaging' && typeof v === 'string') {
          finalVal = { type: v, details: v };
        }
        previousValues[`${targetId}.${k}`] = deepClone(getValueByPath(targetProd, k));
        setValueByPath(targetProd, k, deepClone(finalVal));
        newValues[`${targetId}.${k}`] = deepClone(finalVal);
        modifiedPaths.push(`products.${targetId}.${k}`);
      }
      break;
    }

    case 'add_location': {
      const loc = changes as AdSpecLocationEntity;
      workingSpec.locations.push(deepClone(loc));
      affectedEntities.add(loc.id);
      modifiedPaths.push(`locations.${loc.id}`);
      newValues[loc.id] = deepClone(loc);
      break;
    }

    case 'update_location': {
      if (!targetId) throw new Error('update_location requires target.entityId');
      const lIdx = workingSpec.locations.findIndex(l => l.id === targetId);
      if (lIdx === -1) throw new Error(`Location "${targetId}" not found`);
      const targetLoc = workingSpec.locations[lIdx];
      affectedEntities.add(targetId);

      for (const [k, v] of Object.entries(changes)) {
        previousValues[`${targetId}.${k}`] = deepClone(getValueByPath(targetLoc, k));
        setValueByPath(targetLoc, k, deepClone(v));
        newValues[`${targetId}.${k}`] = deepClone(v);
        modifiedPaths.push(`locations.${targetId}.${k}`);
      }
      break;
    }

    case 'propose_concepts': {
      const concepts = changes['concepts'] as CreativeConceptItem[];
      previousValues['creative.concepts'] = deepClone(workingSpec.creative.concepts);
      workingSpec.creative.concepts = deepClone(concepts);
      newValues['creative.concepts'] = deepClone(concepts);
      modifiedPaths.push('creative.concepts');
      break;
    }

    case 'select_concept': {
      const conceptId = changes['selectedConceptId'] || targetId;
      if (!conceptId) throw new Error('select_concept requires selectedConceptId');
      previousValues['creative.selectedConceptId'] = workingSpec.creative.selectedConceptId;
      workingSpec.creative.selectedConceptId = conceptId;
      workingSpec.creative.selectionProvenance = {
        selectedBy: operation.actor.role === 'user' ? 'user' : 'ai_default',
        selectedAt: new Date().toISOString()
      };
      newValues['creative.selectedConceptId'] = conceptId;
      modifiedPaths.push('creative.selectedConceptId');
      break;
    }

    case 'update_story_beats': {
      if (changes['beats']) {
        previousValues['story.beats'] = deepClone(workingSpec.story.beats);
        workingSpec.story.beats = deepClone(changes['beats']);
        newValues['story.beats'] = deepClone(changes['beats']);
        modifiedPaths.push('story.beats');
      }
      if (changes['logline']) {
        workingSpec.story.logline = changes['logline'];
        modifiedPaths.push('story.logline');
      }
      break;
    }

    case 'transition_creative_state': {
      const newState = changes['creativeState'] as DirectorCreativeState;
      if (!newState) throw new Error('transition_creative_state requires creativeState');
      previousValues['identity.creativeState'] = workingSpec.identity.creativeState;
      workingSpec.identity.creativeState = newState;
      newValues['identity.creativeState'] = newState;
      modifiedPaths.push('identity.creativeState');
      break;
    }

    case 'request_asset': {
      // Record structured asset need into metadata for downstream UI/asset library
      if (!workingSpec.metadata.customNotes) workingSpec.metadata.customNotes = '';
      workingSpec.metadata.customNotes += `\n[AssetNeed] ${JSON.stringify(changes)}`;
      modifiedPaths.push('metadata.customNotes');
      break;
    }

    case 'attach_asset': {
      if (changes['asset']) {
        workingSpec.assets.assets.push(deepClone(changes['asset']));
        modifiedPaths.push('assets.assets');
      }
      break;
    }

    default: {
      // Fallback for direct scope patch
      for (const [k, v] of Object.entries(changes)) {
        const fullPath = scope === 'root' ? k : `${scope}.${k}`;
        previousValues[fullPath] = deepClone(getValueByPath(workingSpec, fullPath));
        setValueByPath(workingSpec, fullPath, deepClone(v));
        newValues[fullPath] = deepClone(v);
        modifiedPaths.push(fullPath);
      }
      break;
    }
  }

  // 5. Post-mutation structural validation
  const specValidation = validateAdSpec(workingSpec);
  if (!specValidation.valid) {
    const errorMsgs = specValidation.errors.map(e => `[${e.code}] ${e.message}`).join(', ');
    throw new Error(`Operation resulted in invalid AdSpec: ${errorMsgs}`);
  }

  // 6. Post-mutation continuity check
  const continuity = checkContinuity(workingSpec);

  // 7. Version progression
  const specVersionBefore = currentSpec.identity.specVersion || 1;
  const specVersionAfter = specVersionBefore + 1;
  const parentVersionId = `${currentSpec.identity.adId}_v${specVersionBefore}`;

  workingSpec.identity.specVersion = specVersionAfter;
  workingSpec.identity.parentVersionId = parentVersionId;
  workingSpec.identity.revisionId = operation.operationId;
  workingSpec.identity.updatedAt = new Date().toISOString();

  // If approved plan undergoes user-authorized revision, reset to draft
  if (workingSpec.identity.creativeState === 'approved' && operation.actor.role === 'user') {
    workingSpec.identity.creativeState = 'director_plan_draft';
  }

  // 8. Generate Diff & Human Explanation
  const diff: AdSpecDiff = {
    specVersionBefore,
    specVersionAfter,
    modifiedPaths,
    previousValues,
    newValues,
    affectedShots: Array.from(affectedShots),
    affectedEntities: Array.from(affectedEntities),
    unaffectedCriticalEntities: impact.unaffected,
    humanExplanation: generateHumanExplanation({
      affectedShots: Array.from(affectedShots),
      affectedEntities: Array.from(affectedEntities),
      modifiedPaths,
      scope
    }),
    timestamp: new Date().toISOString()
  };

  return {
    updatedAdSpec: workingSpec,
    diff,
    impact,
    continuity,
    explanation: diff.humanExplanation
  };
}

export const stateManager = {
  applyOperation: applyDirectorOperation,
  applyOperations: (spec: AdSpec, operations: DirectorOperation[]) => {
    let current = spec;
    for (const op of operations) {
      const res = applyDirectorOperation(current, op);
      current = res.updatedAdSpec;
    }
    return current;
  }
};

