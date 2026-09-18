/**
 * Targeted Patch-Based Revision Engine for AdSpec v1.
 * Supports scoped shot, entity, brief, and constraint updates while guaranteeing:
 * 1. Confirmed user state protection (AI cannot overwrite user-confirmed values).
 * 2. Shot revision invariance (modifying one shot leaves unrelated shots completely untouched).
 * 3. Exact delta tracking and immutable version lineage.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  AdSpec,
  AdSpecPatch,
  AdSpecDelta,
  ProvenanceValue
} from '@shared-types/adSpec.js';

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
 * Normalizes intuitive shot property paths:
 * e.g. "camera.movement" -> "camera.cameraMovement"
 * e.g. "lighting.contrast" -> "lighting.contrast"
 */
function normalizeShotKey(path: string): string {
  if (path.startsWith('camera.')) {
    const sub = path.replace('camera.', '');
    if (sub === 'movement') return 'camera.cameraMovement';
    if (sub === 'framing') return 'camera.framing';
    return `camera.${sub}`;
  }
  return path;
}

export function applyAdSpecPatch(
  currentSpec: AdSpec,
  patch: AdSpecPatch
): { newSpec: AdSpec; delta: AdSpecDelta } {
  if (!currentSpec) {
    throw new Error('Cannot apply patch to a null or undefined AdSpec');
  }
  if (!patch || !patch.changes) {
    throw new Error('Invalid patch: changes payload is required');
  }

  const newSpec: AdSpec = deepClone(currentSpec);
  const modifiedPaths: string[] = [];
  const previousValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  const scope = patch.targetScope;
  const targetId = patch.targetEntityId;
  const isAiActor = patch.actor.role !== 'user';

  switch (scope) {
    case 'shot': {
      if (!targetId) {
        throw new Error('Shot revision requires targetEntityId (e.g. "shot_03")');
      }
      const shotIndex = newSpec.shots.findIndex(s => s.shotId === targetId);
      if (shotIndex === -1) {
        throw new Error(`Target shot "${targetId}" not found in AdSpec`);
      }

      const targetShot = newSpec.shots[shotIndex];
      for (const [key, value] of Object.entries(patch.changes)) {
        const normalizedKey = normalizeShotKey(key);
        previousValues[normalizedKey] = deepClone(getValueByPath(targetShot, normalizedKey));
        setValueByPath(targetShot, normalizedKey, deepClone(value));
        newValues[normalizedKey] = deepClone(value);
        modifiedPaths.push(normalizedKey);
      }
      break;
    }

    case 'character': {
      if (!targetId) {
        throw new Error('Character revision requires targetEntityId');
      }
      const charIndex = newSpec.characters.findIndex(c => c.id === targetId);
      if (charIndex === -1) {
        throw new Error(`Target character "${targetId}" not found in AdSpec`);
      }
      const targetChar = newSpec.characters[charIndex];

      if (isAiActor && targetChar.locks && targetChar.locks.length > 0) {
        const charLocks = new Set(targetChar.locks);
        for (const key of Object.keys(patch.changes)) {
          if (charLocks.has('wardrobe') && (key === 'wardrobe' || key.startsWith('wardrobe.'))) {
            throw new Error(`Confirmed state protection violation: Character "${targetChar.id}" wardrobe is locked.`);
          }
          if (charLocks.has('hair') && (key.includes('hair') || key.includes('hairColor') || key.includes('hairStyle'))) {
            throw new Error(`Confirmed state protection violation: Character "${targetChar.id}" hair styling is locked.`);
          }
          if (charLocks.has('identity') && (key === 'appearance' || key === 'displayName' || key === 'name')) {
            throw new Error(`Confirmed state protection violation: Character "${targetChar.id}" identity is locked.`);
          }
        }
      }

      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = deepClone(getValueByPath(targetChar, key));
        setValueByPath(targetChar, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    case 'product': {
      if (!targetId) {
        throw new Error('Product revision requires targetEntityId');
      }
      const prodIndex = newSpec.products.findIndex(p => p.id === targetId);
      if (prodIndex === -1) {
        throw new Error(`Target product "${targetId}" not found in AdSpec`);
      }
      const targetProd = newSpec.products[prodIndex];

      if (isAiActor && targetProd.locks && targetProd.locks.length > 0) {
        const prodLocks = new Set(targetProd.locks);
        for (const key of Object.keys(patch.changes)) {
          if (prodLocks.has('geometry') && (key === 'shapeForm' || key === 'geometry' || key === 'packaging')) {
            throw new Error(`Confirmed state protection violation: Product "${targetProd.id}" geometry is locked.`);
          }
          if (prodLocks.has('packaging') && key === 'packaging') {
            throw new Error(`Confirmed state protection violation: Product "${targetProd.id}" packaging is locked.`);
          }
          if (prodLocks.has('logo') && (key === 'branding' || key === 'logo' || key.startsWith('branding.'))) {
            throw new Error(`Confirmed state protection violation: Product "${targetProd.id}" logo is locked.`);
          }
        }
      }

      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = deepClone(getValueByPath(targetProd, key));
        setValueByPath(targetProd, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    case 'location': {
      if (!targetId) {
        throw new Error('Location revision requires targetEntityId');
      }
      const locIndex = newSpec.locations.findIndex(l => l.id === targetId);
      if (locIndex === -1) {
        throw new Error(`Target location "${targetId}" not found in AdSpec`);
      }
      const targetLoc = newSpec.locations[locIndex];
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = deepClone(getValueByPath(targetLoc, key));
        setValueByPath(targetLoc, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    case 'brief': {
      for (const [key, value] of Object.entries(patch.changes)) {
        const rootKey = key.split('.')[0];
        const rootField = (newSpec.brief as any)[rootKey];
        const currentField = getValueByPath(newSpec.brief, key);

        // CONFIRMED STATE PROTECTION:
        // Check both inline ProvenanceValue and decisionMetadata / provenanceRegistry
        const decisionMeta = (newSpec.decisionMetadata || newSpec.provenanceRegistry) as Record<string, any> | undefined;
        const regEntry = decisionMeta?.[`brief.${key}`] || decisionMeta?.[`brief.${rootKey}`];
        const isRegistryConfirmed = regEntry && (regEntry.locked === true || regEntry.status === 'confirmed' || regEntry.status === 'approved' || regEntry.status === 'user_confirmed') && (regEntry.source === 'user' || regEntry.source === 'user_provided');

        const isRootConfirmed = rootField && typeof rootField === 'object' && rootField.confirmed === true && (rootField.source === 'user' || rootField.source === 'user_provided');
        const isFieldConfirmed = currentField && typeof currentField === 'object' && currentField.confirmed === true && (currentField.source === 'user' || currentField.source === 'user_provided');

        if (isAiActor && (isRegistryConfirmed || isRootConfirmed || isFieldConfirmed)) {
          throw new Error(
            `Confirmed state protection violation: Cannot mutate user-confirmed brief field "${rootKey}" via AI proposal without explicit user confirmation.`
          );
        }

        previousValues[key] = deepClone(currentField);
        setValueByPath(newSpec.brief, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    case 'creative': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = deepClone(getValueByPath(newSpec.creative, key));
        setValueByPath(newSpec.creative, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    case 'brand': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = deepClone(getValueByPath(newSpec.brand, key));
        setValueByPath(newSpec.brand, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    case 'story': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = deepClone(getValueByPath(newSpec.story, key));
        setValueByPath(newSpec.story, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    case 'constraint': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = deepClone(getValueByPath(newSpec.constraints, key));
        setValueByPath(newSpec.constraints, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    case 'generationIntent': {
      for (const [key, value] of Object.entries(patch.changes)) {
        previousValues[key] = deepClone(getValueByPath(newSpec.generationIntent, key));
        setValueByPath(newSpec.generationIntent, key, deepClone(value));
        newValues[key] = deepClone(value);
        modifiedPaths.push(key);
      }
      break;
    }

    default:
      throw new Error(`Unsupported patch targetScope: "${scope}"`);
  }

  // Update lineage & versioning
  const parentVersionId = `${newSpec.identity.adId}_v${newSpec.identity.specVersion}`;
  newSpec.identity.specVersion = (currentSpec.identity.specVersion || 1) + 1;
  newSpec.identity.parentVersionId = parentVersionId;
  newSpec.identity.revisionId = patch.revisionId || `rev_${Date.now()}`;
  newSpec.identity.updatedAt = new Date().toISOString();

  // Invalidate previous validation status - old validation is now stale
  if (newSpec.validationStatus) {
    newSpec.validationStatus = {
      ...newSpec.validationStatus,
      isAuthoritative: false
    };
  }

  // If in approved state, moving to revision reverts creativeState to 'director_plan_draft'
  if (newSpec.identity.creativeState === 'approved') {
    newSpec.identity.creativeState = 'director_plan_draft';
  }

  const delta: AdSpecDelta = {
    revisionId: patch.revisionId,
    targetScope: patch.targetScope,
    targetEntityId: patch.targetEntityId,
    modifiedPaths,
    previousValues,
    newValues,
    timestamp: new Date().toISOString()
  };

  return { newSpec, delta };
}
