/**
 * Deterministic Structural Validator for Ad Director Plans.
 * Validates timing invariants, entity integrity, asset references, and continuity dependencies.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  DirectorPlan,
  DirectorShot,
  ValidationResult,
  ValidationIssue
} from '@shared-types/adDirector.js';

export function validateDirectorPlan(plan: DirectorPlan): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!plan) {
    return {
      valid: false,
      errors: [{ code: 'PLAN_NULL', message: 'DirectorPlan cannot be null or undefined', path: 'root', severity: 'error' }],
      warnings: [],
      metrics: { shotCount: 0, calculatedDuration: 0, characterCount: 0, productCount: 0, locationCount: 0, assetRefCount: 0, dependencyCount: 0 }
    };
  }

  // 1. Root & Metadata Invariants
  if (!plan.id || typeof plan.id !== 'string') {
    errors.push({ code: 'PLAN_ID_INVALID', message: 'Plan ID must be a non-empty string', path: 'id', severity: 'error' });
  }
  if (!plan.title || plan.title.trim().length === 0) {
    errors.push({ code: 'PLAN_TITLE_EMPTY', message: 'Plan title cannot be empty', path: 'title', severity: 'error' });
  }
  if (typeof plan.version !== 'number' || plan.version < 1) {
    errors.push({ code: 'PLAN_VERSION_INVALID', message: 'Plan version must be a positive integer', path: 'version', severity: 'error' });
  }

  const shots = Array.isArray(plan.shots) ? plan.shots : [];
  if (shots.length === 0) {
    errors.push({ code: 'PLAN_SHOTS_EMPTY', message: 'Plan must contain at least one shot', path: 'shots', severity: 'error' });
  }

  // Build Entity Lookups for relational validation
  const characters = plan.assetWorld?.characters || [];
  const products = plan.assetWorld?.products || [];
  const locations = plan.assetWorld?.locations || [];
  const props = plan.assetWorld?.props || [];
  const referenceMedia = plan.assetWorld?.referenceMedia || [];

  const charIdSet = new Set(characters.map(c => c.id));
  const prodIdSet = new Set(products.map(p => p.id));
  const locIdSet = new Set(locations.map(l => l.id));
  const propIdSet = new Set(props.map(p => p.id));
  const mediaAssetIdSet = new Set(referenceMedia.map(m => m.assetId));

  // Check duplicate entity IDs
  function checkDuplicateIds(items: { id: string }[], scope: string) {
    const seen = new Set<string>();
    items.forEach(item => {
      if (seen.has(item.id)) {
        errors.push({ code: 'DUPLICATE_ENTITY_ID', message: `Duplicate ${scope} ID detected: "${item.id}"`, path: `assetWorld.${scope}`, severity: 'error' });
      }
      seen.add(item.id);
    });
  }

  checkDuplicateIds(characters, 'characters');
  checkDuplicateIds(products, 'products');
  checkDuplicateIds(locations, 'locations');
  checkDuplicateIds(props, 'props');

  // Check unique Shot IDs and sequence order
  const shotIdSet = new Set<string>();
  const shotMap = new Map<string, DirectorShot>();

  shots.forEach((shot, index) => {
    if (!shot.id) {
      errors.push({ code: 'SHOT_ID_MISSING', message: `Shot at index ${index} is missing an ID`, path: `shots[${index}].id`, severity: 'error' });
      return;
    }
    if (shotIdSet.has(shot.id)) {
      errors.push({ code: 'DUPLICATE_SHOT_ID', message: `Duplicate Shot ID detected: "${shot.id}"`, path: `shots[${index}].id`, severity: 'error', targetShotId: shot.id });
    }
    shotIdSet.add(shot.id);
    shotMap.set(shot.id, shot);
  });

  // 2. Timing Invariants & Sequence Contiguity
  let calculatedDuration = 0;
  let totalDependencies = 0;

  shots.forEach((shot, index) => {
    const shotPath = `shots[${index}]`;
    const { startTime, endTime, duration } = shot.timing || {};

    if (typeof startTime !== 'number' || startTime < 0) {
      errors.push({ code: 'TIMING_START_INVALID', message: `Shot "${shot.id}" has invalid startTime: ${startTime}`, path: `${shotPath}.timing.startTime`, severity: 'error', targetShotId: shot.id });
    }
    if (typeof endTime !== 'number' || endTime <= startTime) {
      errors.push({ code: 'TIMING_END_INVALID', message: `Shot "${shot.id}" endTime (${endTime}) must be strictly greater than startTime (${startTime})`, path: `${shotPath}.timing.endTime`, severity: 'error', targetShotId: shot.id });
    }
    if (typeof duration !== 'number' || duration <= 0) {
      errors.push({ code: 'TIMING_DURATION_INVALID', message: `Shot "${shot.id}" duration must be positive`, path: `${shotPath}.timing.duration`, severity: 'error', targetShotId: shot.id });
    }

    if (typeof startTime === 'number' && typeof endTime === 'number' && typeof duration === 'number') {
      const calculatedShotDuration = +(endTime - startTime).toFixed(3);
      if (Math.abs(duration - calculatedShotDuration) > 0.05) {
        errors.push({
          code: 'TIMING_DURATION_MISMATCH',
          message: `Shot "${shot.id}" duration (${duration}s) does not match endTime - startTime (${calculatedShotDuration}s)`,
          path: `${shotPath}.timing.duration`,
          severity: 'error',
          targetShotId: shot.id
        });
      }
    }

    // Contiguity with previous shot
    if (index > 0) {
      const prevShot = shots[index - 1];
      if (prevShot.timing && typeof prevShot.timing.endTime === 'number' && typeof startTime === 'number') {
        if (startTime < prevShot.timing.endTime - 0.001) {
          errors.push({
            code: 'TIMING_SHOT_OVERLAP',
            message: `Shot "${shot.id}" starts at ${startTime}s, overlapping with preceding shot "${prevShot.id}" ending at ${prevShot.timing.endTime}s`,
            path: `${shotPath}.timing.startTime`,
            severity: 'error',
            targetShotId: shot.id
          });
        } else if (startTime > prevShot.timing.endTime + 0.1) {
          warnings.push({
            code: 'TIMING_SHOT_GAP',
            message: `Time gap detected: shot "${prevShot.id}" ends at ${prevShot.timing.endTime}s, but shot "${shot.id}" starts at ${startTime}s`,
            path: `${shotPath}.timing.startTime`,
            severity: 'warning',
            targetShotId: shot.id
          });
        }
      }
    }

    calculatedDuration += (duration || 0);

    // 3. Execution Spec & Entity Integrity
    const subjects = shot.executionSpec?.subjects || [];
    subjects.forEach((sub, subIdx) => {
      const subPath = `${shotPath}.executionSpec.subjects[${subIdx}]`;
      if (sub.entityType === 'character' && !charIdSet.has(sub.entityId)) {
        errors.push({
          code: 'ENTITY_NOT_FOUND',
          message: `Shot "${shot.id}" references nonexistent character ID "${sub.entityId}"`,
          path: subPath,
          severity: 'error',
          targetShotId: shot.id,
          targetEntityId: sub.entityId
        });
      } else if (sub.entityType === 'product' && !prodIdSet.has(sub.entityId)) {
        errors.push({
          code: 'ENTITY_NOT_FOUND',
          message: `Shot "${shot.id}" references nonexistent product ID "${sub.entityId}"`,
          path: subPath,
          severity: 'error',
          targetShotId: shot.id,
          targetEntityId: sub.entityId
        });
      } else if (sub.entityType === 'prop' && !propIdSet.has(sub.entityId)) {
        errors.push({
          code: 'ENTITY_NOT_FOUND',
          message: `Shot "${shot.id}" references nonexistent prop ID "${sub.entityId}"`,
          path: subPath,
          severity: 'error',
          targetShotId: shot.id,
          targetEntityId: sub.entityId
        });
      }
    });

    const locationId = shot.executionSpec?.environment?.locationId;
    if (locationId && !locIdSet.has(locationId)) {
      errors.push({
        code: 'LOCATION_NOT_FOUND',
        message: `Shot "${shot.id}" references nonexistent location ID "${locationId}"`,
        path: `${shotPath}.executionSpec.environment.locationId`,
        severity: 'error',
        targetShotId: shot.id,
        targetEntityId: locationId
      });
    }

    // 4. Asset References Integrity
    const visualRefs = shot.visualReferences || [];
    visualRefs.forEach((refId, refIdx) => {
      if (!refId || typeof refId !== 'string' || refId.trim().length === 0) {
        errors.push({
          code: 'ASSET_REF_INVALID',
          message: `Shot "${shot.id}" contains empty or invalid asset reference at index ${refIdx}`,
          path: `${shotPath}.visualReferences[${refIdx}]`,
          severity: 'error',
          targetShotId: shot.id
        });
      } else if (referenceMedia.length > 0 && !mediaAssetIdSet.has(refId)) {
        warnings.push({
          code: 'ASSET_NOT_IN_WORLD_CATALOG',
          message: `Shot "${shot.id}" references asset "${refId}" which is not cataloged in assetWorld.referenceMedia`,
          path: `${shotPath}.visualReferences[${refIdx}]`,
          severity: 'warning',
          targetShotId: shot.id
        });
      }
    });

    // 5. Continuity Model & Dependency Graph
    const dependencies = shot.continuity?.dependencies || [];
    totalDependencies += dependencies.length;

    dependencies.forEach((dep, depIdx) => {
      const depPath = `${shotPath}.continuity.dependencies[${depIdx}]`;
      const targetShot = shotMap.get(dep.targetShotId);

      if (!targetShot) {
        errors.push({
          code: 'CONTINUITY_TARGET_NOT_FOUND',
          message: `Shot "${shot.id}" has continuity dependency on nonexistent shot "${dep.targetShotId}"`,
          path: depPath,
          severity: 'error',
          targetShotId: shot.id
        });
      } else if (targetShot.sequence >= shot.sequence) {
        errors.push({
          code: 'CONTINUITY_CYCLE_OR_FORWARD_DEP',
          message: `Shot "${shot.id}" (seq ${shot.sequence}) cannot depend on future or contemporaneous shot "${dep.targetShotId}" (seq ${targetShot.sequence})`,
          path: depPath,
          severity: 'error',
          targetShotId: shot.id
        });
      }
    });

    // 6. QA Targets Completeness
    if (!shot.qaExpectations) {
      warnings.push({
        code: 'QA_EXPECTATIONS_MISSING',
        message: `Shot "${shot.id}" does not declare measurable QA expectations`,
        path: `${shotPath}.qaExpectations`,
        severity: 'warning',
        targetShotId: shot.id
      });
    }
  });

  // Overall duration check against plan.timing.totalDuration
  calculatedDuration = +calculatedDuration.toFixed(3);
  const planTotalDuration = plan.timing?.totalDuration;

  if (typeof planTotalDuration === 'number' && Math.abs(planTotalDuration - calculatedDuration) > 0.15) {
    errors.push({
      code: 'TOTAL_DURATION_MISMATCH',
      message: `Plan total duration (${planTotalDuration}s) does not match the sum of shot durations (${calculatedDuration}s)`,
      path: 'timing.totalDuration',
      severity: 'error'
    });
  }

  // Commercial CTA Presence
  if (!plan.brief?.cta || !plan.brief.cta.visualText) {
    warnings.push({
      code: 'CTA_MISSING',
      message: 'Brief does not define a visual CTA or action intent',
      path: 'brief.cta',
      severity: 'warning'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      shotCount: shots.length,
      calculatedDuration,
      characterCount: characters.length,
      productCount: products.length,
      locationCount: locations.length,
      assetRefCount: referenceMedia.length,
      dependencyCount: totalDependencies
    }
  };
}
