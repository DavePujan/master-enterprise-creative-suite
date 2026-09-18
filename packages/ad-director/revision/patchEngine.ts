/**
 * Patch-based Revision Engine for Ad Director Plans.
 * Applies targeted updates to specific scopes (shot, character, product, location, brief, etc.)
 * without destructively overwriting unrelated creative plan entities.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  DirectorPlan,
  PlanPatch,
  PlanDelta,
  DirectorShot,
  CharacterEntity,
  ProductEntity,
  LocationEntity
} from '@shared-types/adDirector.js';

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

/**
 * Normalizes shot property paths to allow intuitive shorthand keys:
 * e.g. "action" -> "executionSpec.action"
 * e.g. "camera.movement" -> "executionSpec.camera.cameraMovement"
 */
function normalizeShotPath(path: string): string {
  if (path.startsWith('executionSpec.') || path.startsWith('timing.') || path.startsWith('continuity.') || path.startsWith('qaExpectations.')) {
    return path;
  }
  if (path === 'action' || path === 'choreography' || path === 'startingState' || path === 'endingState') {
    return `executionSpec.${path}`;
  }
  if (path.startsWith('camera.')) {
    const sub = path.replace('camera.', '');
    const mapped = sub === 'movement' ? 'cameraMovement' : sub;
    return `executionSpec.camera.${mapped}`;
  }
  if (path.startsWith('audio.')) {
    return `executionSpec.${path}`;
  }
  if (path.startsWith('lighting.')) {
    return `executionSpec.${path}`;
  }
  return path;
}

export function applyPlanPatch(
  currentPlan: DirectorPlan,
  patch: PlanPatch
): { newPlan: DirectorPlan; delta: PlanDelta } {
  if (!currentPlan) {
    throw new Error('Cannot apply patch to a null or undefined plan');
  }
  if (!patch || !patch.changes) {
    throw new Error('Invalid patch: changes payload is required');
  }

  const newPlan: DirectorPlan = deepClone(currentPlan);
  const modifiedKeys: string[] = [];
  const previousValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  const scope = patch.targetScope;
  const targetId = patch.targetId;

  switch (scope) {
    case 'shot': {
      if (!targetId) {
        throw new Error('Shot revision requires targetId specifying the shot ID (e.g. "shot_01")');
      }
      const shotIndex = newPlan.shots.findIndex(s => s.id === targetId);
      if (shotIndex === -1) {
        throw new Error(`Target shot "${targetId}" not found in DirectorPlan`);
      }

      const targetShot = newPlan.shots[shotIndex];
      for (const [key, value] of Object.entries(patch.changes)) {
        const normalizedKey = normalizeShotPath(key);
        previousValues[normalizedKey] = getValueByPath(targetShot, normalizedKey);
        setValueByPath(targetShot, normalizedKey, deepClone(value));
        newValues[normalizedKey] = deepClone(value);
        modifiedKeys.push(normalizedKey);
      }
      break;
    }

    case 'character': {
      if (!targetId) {
        throw new Error('Character revision requires targetId specifying the character ID');
      }
      const charIndex = (newPlan.assetWorld?.characters || []).findIndex(c => c.id === targetId);
      if (charIndex === -1) {
        throw new Error(`Target character "${targetId}" not found in assetWorld`);
      }
      const targetChar = newPlan.assetWorld.characters[charIndex];
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = getValueByPath(targetChar, key);
        setValueByPath(targetChar, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedKeys.push(key);
      }
      break;
    }

    case 'product': {
      if (!targetId) {
        throw new Error('Product revision requires targetId specifying the product ID');
      }
      const prodIndex = (newPlan.assetWorld?.products || []).findIndex(p => p.id === targetId);
      if (prodIndex === -1) {
        throw new Error(`Target product "${targetId}" not found in assetWorld`);
      }
      const targetProd = newPlan.assetWorld.products[prodIndex];
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = getValueByPath(targetProd, key);
        setValueByPath(targetProd, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedKeys.push(key);
      }
      break;
    }

    case 'location': {
      if (!targetId) {
        throw new Error('Location revision requires targetId specifying the location ID');
      }
      const locIndex = (newPlan.assetWorld?.locations || []).findIndex(l => l.id === targetId);
      if (locIndex === -1) {
        throw new Error(`Target location "${targetId}" not found in assetWorld`);
      }
      const targetLoc = newPlan.assetWorld.locations[locIndex];
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = getValueByPath(targetLoc, key);
        setValueByPath(targetLoc, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedKeys.push(key);
      }
      break;
    }

    case 'brief': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = getValueByPath(newPlan.brief, key);
        setValueByPath(newPlan.brief, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedKeys.push(key);
      }
      break;
    }

    case 'audience': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = getValueByPath(newPlan.audience, key);
        setValueByPath(newPlan.audience, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedKeys.push(key);
      }
      break;
    }

    case 'creative': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = getValueByPath(newPlan.creativeDirection, key);
        setValueByPath(newPlan.creativeDirection, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedKeys.push(key);
      }
      break;
    }

    case 'plan': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = getValueByPath(newPlan, key);
        setValueByPath(newPlan, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedKeys.push(key);
      }
      break;
    }

    default:
      throw new Error(`Unsupported patch targetScope: "${scope}"`);
  }

  const parentVersionId = `${newPlan.id}_v${newPlan.version}`;
  newPlan.version = (currentPlan.version || 1) + 1;
  newPlan.parentVersionId = parentVersionId;
  newPlan.updatedAt = new Date().toISOString();

  const delta: PlanDelta = {
    patchId: patch.patchId,
    targetScope: patch.targetScope,
    targetId: patch.targetId,
    modifiedKeys,
    previousValues,
    newValues,
    timestamp: new Date().toISOString()
  };

  return { newPlan, delta };
}
