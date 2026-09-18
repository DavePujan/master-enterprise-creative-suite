/**
 * Deterministic Structural Validator for AdSpec v1.
 * Validates timing invariants, duration contiguity, entity integrity,
 * canonical asset references, continuity cycles, and duplicate IDs.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { AdSpec } from '@shared-types/adSpec.js';
import type {
  ValidateAdSpecResponse,
  AdSpecValidationIssue
} from '@contracts/adSpecContracts.js';

export function validateAdSpec(adSpec: AdSpec): ValidateAdSpecResponse {
  const errors: AdSpecValidationIssue[] = [];
  const warnings: AdSpecValidationIssue[] = [];

  if (!adSpec) {
    return {
      valid: false,
      errors: [{ code: 'ADSPEC_NULL', message: 'AdSpec cannot be null or undefined', path: 'root', severity: 'error' }],
      warnings: [],
      metrics: {
        shotCount: 0,
        calculatedDuration: 0,
        characterCount: 0,
        productCount: 0,
        locationCount: 0,
        assetCount: 0,
        constraintCount: 0,
        confirmedFieldsCount: 0
      }
    };
  }

  // 1. Schema Version & Identity
  if (adSpec.schemaVersion !== '1.0.0') {
    errors.push({
      code: 'INVALID_SCHEMA_VERSION',
      message: `Unsupported schema version: "${adSpec.schemaVersion}". Expected "1.0.0"`,
      path: 'schemaVersion',
      severity: 'error'
    });
  }

  const identity = adSpec.identity;
  if (!identity?.adId || typeof identity.adId !== 'string') {
    errors.push({ code: 'AD_ID_INVALID', message: 'Identity adId must be a non-empty string', path: 'identity.adId', severity: 'error' });
  }
  if (!identity?.title || identity.title.trim().length === 0) {
    errors.push({ code: 'AD_TITLE_EMPTY', message: 'Identity title cannot be empty', path: 'identity.title', severity: 'error' });
  }
  if (typeof identity?.specVersion !== 'number' || identity.specVersion < 1) {
    errors.push({ code: 'AD_VERSION_INVALID', message: 'specVersion must be a positive integer', path: 'identity.specVersion', severity: 'error' });
  }

  // Count confirmed user fields from both decisionMetadata and inline provenance
  let confirmedFieldsCount = 0;
  const countedKeys = new Set<string>();

  // 1. Inspect decisionMetadata registry
  const decisionMeta = (adSpec.decisionMetadata || adSpec.provenanceRegistry || {}) as Record<string, any>;
  for (const [key, prov] of Object.entries(decisionMeta)) {
    if (prov && typeof prov === 'object') {
      const isConfirmed = prov.status === 'confirmed' || prov.status === 'approved' || prov.status === 'user_confirmed' || prov.locked === true;
      const isUser = prov.source === 'user' || prov.source === 'user_provided' || prov.source === 'user_selected';
      if (isConfirmed && isUser) {
        confirmedFieldsCount++;
        countedKeys.add(key);
      }
    }
  }

  // 2. Inspect inline wrapped fields if not already counted via registry
  function inspectProvenance(key: string, provVal: any) {
    if (countedKeys.has(key)) return;
    if (provVal && typeof provVal === 'object' && 'confirmed' in provVal && 'source' in provVal) {
      if (provVal.confirmed === true && (provVal.source === 'user' || provVal.source === 'user_provided')) {
        confirmedFieldsCount++;
        countedKeys.add(key);
      }
    }
  }

  inspectProvenance('brief.objective', adSpec.brief?.objective);
  inspectProvenance('brief.targetAudience', adSpec.brief?.targetAudience);
  inspectProvenance('brief.desiredDurationSeconds', adSpec.brief?.desiredDurationSeconds);
  inspectProvenance('brief.cta', adSpec.brief?.cta);
  inspectProvenance('brief.keyMessage', adSpec.brief?.keyMessage);
  inspectProvenance('brief.tone', adSpec.brief?.tone);

  // 2. Entity Dictionaries & Uniqueness Checks
  const characters = Array.isArray(adSpec.characters) ? adSpec.characters : [];
  const products = Array.isArray(adSpec.products) ? adSpec.products : [];
  const locations = Array.isArray(adSpec.locations) ? adSpec.locations : [];
  const assets = Array.isArray(adSpec.assets?.assets) ? adSpec.assets.assets : [];
  const shots = Array.isArray(adSpec.shots) ? adSpec.shots : [];
  const constraints = Array.isArray(adSpec.constraints) ? adSpec.constraints : [];

  if (shots.length === 0) {
    errors.push({ code: 'SHOTS_EMPTY', message: 'AdSpec must contain at least one shot', path: 'shots', severity: 'error' });
  }

  function checkDuplicates(items: { id: string }[], scope: string) {
    const seen = new Set<string>();
    items.forEach((item, idx) => {
      if (!item.id) {
        errors.push({ code: 'ENTITY_ID_MISSING', message: `${scope} item at index ${idx} is missing an ID`, path: `${scope}[${idx}].id`, severity: 'error' });
        return;
      }
      if (seen.has(item.id)) {
        errors.push({ code: 'DUPLICATE_ENTITY_ID', message: `Duplicate ${scope} ID: "${item.id}"`, path: `${scope}[${idx}].id`, severity: 'error', targetEntityId: item.id });
      }
      seen.add(item.id);
    });
  }

  checkDuplicates(characters, 'characters');
  checkDuplicates(products, 'products');
  checkDuplicates(locations, 'locations');
  checkDuplicates(constraints, 'constraints');

  const charIdSet = new Set(characters.map(c => c.id));
  const prodIdSet = new Set(products.map(p => p.id));
  const locIdSet = new Set(locations.map(l => l.id));
  const assetIdSet = new Set(assets.map(a => a.assetId));

  // Check unique Shot IDs
  const shotIdSet = new Set<string>();
  const shotMap = new Map<string, typeof shots[0]>();

  shots.forEach((shot, idx) => {
    if (!shot.shotId) {
      errors.push({ code: 'SHOT_ID_MISSING', message: `Shot at index ${idx} is missing shotId`, path: `shots[${idx}].shotId`, severity: 'error' });
      return;
    }
    if (shotIdSet.has(shot.shotId)) {
      errors.push({ code: 'DUPLICATE_SHOT_ID', message: `Duplicate shotId: "${shot.shotId}"`, path: `shots[${idx}].shotId`, severity: 'error', targetShotId: shot.shotId });
    }
    shotIdSet.add(shot.shotId);
    shotMap.set(shot.shotId, shot);
  });

  // 3. Timing Invariants & Contiguity
  let calculatedDuration = 0;

  shots.forEach((shot, idx) => {
    const shotPath = `shots[${idx}]`;
    const { startTime, endTime, duration } = shot.timing || {};

    if (typeof startTime !== 'number' || startTime < 0) {
      errors.push({ code: 'TIMING_START_INVALID', message: `Shot "${shot.shotId}" startTime (${startTime}) must be >= 0`, path: `${shotPath}.timing.startTime`, severity: 'error', targetShotId: shot.shotId });
    }
    if (typeof endTime !== 'number' || endTime <= startTime) {
      errors.push({ code: 'TIMING_END_INVALID', message: `Shot "${shot.shotId}" endTime (${endTime}) must be strictly greater than startTime (${startTime})`, path: `${shotPath}.timing.endTime`, severity: 'error', targetShotId: shot.shotId });
    }
    if (typeof duration !== 'number' || duration <= 0) {
      errors.push({ code: 'TIMING_DURATION_INVALID', message: `Shot "${shot.shotId}" duration must be positive`, path: `${shotPath}.timing.duration`, severity: 'error', targetShotId: shot.shotId });
    }

    if (typeof startTime === 'number' && typeof endTime === 'number' && typeof duration === 'number') {
      const calculatedShotDuration = +(endTime - startTime).toFixed(3);
      if (Math.abs(duration - calculatedShotDuration) > 0.05) {
        errors.push({
          code: 'TIMING_DURATION_MISMATCH',
          message: `Shot "${shot.shotId}" duration (${duration}s) does not match endTime - startTime (${calculatedShotDuration}s)`,
          path: `${shotPath}.timing.duration`,
          severity: 'error',
          targetShotId: shot.shotId
        });
      }
    }

    // Sequence contiguity with preceding shot
    if (idx > 0) {
      const prevShot = shots[idx - 1];
      if (prevShot.timing && typeof prevShot.timing.endTime === 'number' && typeof startTime === 'number') {
        if (startTime < prevShot.timing.endTime - 0.001) {
          errors.push({
            code: 'TIMING_SHOT_OVERLAP',
            message: `Shot "${shot.shotId}" starts at ${startTime}s, overlapping preceding shot "${prevShot.shotId}" ending at ${prevShot.timing.endTime}s`,
            path: `${shotPath}.timing.startTime`,
            severity: 'error',
            targetShotId: shot.shotId
          });
        } else if (startTime > prevShot.timing.endTime + 0.1) {
          warnings.push({
            code: 'TIMING_SHOT_GAP',
            message: `Time gap detected: shot "${prevShot.shotId}" ends at ${prevShot.timing.endTime}s, but shot "${shot.shotId}" starts at ${startTime}s`,
            path: `${shotPath}.timing.startTime`,
            severity: 'warning',
            targetShotId: shot.shotId
          });
        }
      }
    }

    calculatedDuration += (duration || 0);

    // 4. Subject Entity References
    (shot.subjects || []).forEach((sub, subIdx) => {
      const subPath = `${shotPath}.subjects[${subIdx}]`;
      if (sub.entityType === 'character' && !charIdSet.has(sub.entityId)) {
        errors.push({
          code: 'CHARACTER_NOT_FOUND',
          message: `Shot "${shot.shotId}" references nonexistent character "${sub.entityId}"`,
          path: subPath,
          severity: 'error',
          targetShotId: shot.shotId,
          targetEntityId: sub.entityId
        });
      } else if (sub.entityType === 'product' && !prodIdSet.has(sub.entityId)) {
        errors.push({
          code: 'PRODUCT_NOT_FOUND',
          message: `Shot "${shot.shotId}" references nonexistent product "${sub.entityId}"`,
          path: subPath,
          severity: 'error',
          targetShotId: shot.shotId,
          targetEntityId: sub.entityId
        });
      }
    });

    // Location reference
    const locationId = shot.environment?.locationId;
    if (locationId && !locIdSet.has(locationId)) {
      errors.push({
        code: 'LOCATION_NOT_FOUND',
        message: `Shot "${shot.shotId}" references nonexistent location "${locationId}"`,
        path: `${shotPath}.environment.locationId`,
        severity: 'error',
        targetShotId: shot.shotId,
        targetEntityId: locationId
      });
    }

    // Asset references
    (shot.referencedAssetIds || []).forEach((assetId, aIdx) => {
      if (!assetId || typeof assetId !== 'string' || assetId.trim().length === 0) {
        errors.push({
          code: 'ASSET_REF_INVALID',
          message: `Shot "${shot.shotId}" contains empty or invalid asset reference at index ${aIdx}`,
          path: `${shotPath}.referencedAssetIds[${aIdx}]`,
          severity: 'error',
          targetShotId: shot.shotId
        });
      } else if (assets.length > 0 && !assetIdSet.has(assetId)) {
        warnings.push({
          code: 'ASSET_NOT_IN_BIBLE',
          message: `Shot "${shot.shotId}" references asset "${assetId}" which is not cataloged in assets.assets`,
          path: `${shotPath}.referencedAssetIds[${aIdx}]`,
          severity: 'warning',
          targetShotId: shot.shotId
        });
      }
    });

    // Continuity state dependencies
    (shot.continuity?.inheritedStates || []).forEach((dep, depIdx) => {
      const depPath = `${shotPath}.continuity.inheritedStates[${depIdx}]`;
      const sourceShot = shotMap.get(dep.sourceShotId);
      if (!sourceShot) {
        errors.push({
          code: 'CONTINUITY_SOURCE_NOT_FOUND',
          message: `Shot "${shot.shotId}" inherits state from nonexistent shot "${dep.sourceShotId}"`,
          path: depPath,
          severity: 'error',
          targetShotId: shot.shotId
        });
      } else if (sourceShot.sequence >= shot.sequence) {
        errors.push({
          code: 'CONTINUITY_CYCLE_OR_FORWARD_DEP',
          message: `Shot "${shot.shotId}" (seq ${shot.sequence}) cannot inherit state from future/contemporaneous shot "${dep.sourceShotId}" (seq ${sourceShot.sequence})`,
          path: depPath,
          severity: 'error',
          targetShotId: shot.shotId
        });
      }
    });
  });

  // 5. Total Duration Invariant
  calculatedDuration = +calculatedDuration.toFixed(3);
  const rawBriefDuration = adSpec.brief?.desiredDurationSeconds;
  const briefDuration = typeof rawBriefDuration === 'number'
    ? rawBriefDuration
    : (typeof rawBriefDuration === 'object' && rawBriefDuration !== null && 'value' in rawBriefDuration)
      ? (rawBriefDuration as any).value
      : undefined;

  if (typeof briefDuration === 'number' && Math.abs(briefDuration - calculatedDuration) > 0.15) {
    errors.push({
      code: 'TOTAL_DURATION_MISMATCH',
      message: `Brief desired duration (${briefDuration}s) does not match sum of shot durations (${calculatedDuration}s)`,
      path: 'brief.desiredDurationSeconds',
      severity: 'error'
    });
  }

  // 6. Continuity Graph Cycle Detection
  (adSpec.continuity?.links || []).forEach((link, linkIdx) => {
    const linkPath = `continuity.links[${linkIdx}]`;
    const fromShot = shotMap.get(link.fromShotId);
    const toShot = shotMap.get(link.toShotId);

    if (!fromShot || !toShot) {
      errors.push({
        code: 'CONTINUITY_LINK_INVALID',
        message: `Continuity link references nonexistent shot(s): "${link.fromShotId}" -> "${link.toShotId}"`,
        path: linkPath,
        severity: 'error'
      });
    } else if (fromShot.sequence >= toShot.sequence) {
      errors.push({
        code: 'CONTINUITY_CYCLE_OR_FORWARD_DEP',
        message: `Continuity link from "${link.fromShotId}" (seq ${fromShot.sequence}) to "${link.toShotId}" (seq ${toShot.sequence}) is an invalid forward or self-cycle`,
        path: linkPath,
        severity: 'error'
      });
    }
  });

  // 7. Validate Granular Lock Properties
  const validCharLocks = new Set(['identity', 'face', 'hair', 'wardrobe', 'accessories']);
  characters.forEach((char, cIdx) => {
    (char.locks || []).forEach((lock) => {
      if (!validCharLocks.has(lock)) {
        warnings.push({
          code: 'UNKNOWN_CHARACTER_LOCK',
          message: `Character "${char.id}" specifies non-standard lock property "${lock}"`,
          path: `characters[${cIdx}].locks`,
          severity: 'warning',
          targetEntityId: char.id
        });
      }
    });
  });

  const validProdLocks = new Set(['geometry', 'logo', 'packaging', 'brandColors', 'label', 'material']);
  products.forEach((prod, pIdx) => {
    (prod.locks || []).forEach((lock) => {
      if (!validProdLocks.has(lock)) {
        warnings.push({
          code: 'UNKNOWN_PRODUCT_LOCK',
          message: `Product "${prod.id}" specifies non-standard lock property "${lock}"`,
          path: `products[${pIdx}].locks`,
          severity: 'warning',
          targetEntityId: prod.id
        });
      }
    });
  });

  const validLocLocks = new Set(['architecture', 'spatial', 'lighting', 'atmosphere']);
  locations.forEach((loc, lIdx) => {
    (loc.locks || []).forEach((lock) => {
      if (!validLocLocks.has(lock)) {
        warnings.push({
          code: 'UNKNOWN_LOCATION_LOCK',
          message: `Location "${loc.id}" specifies non-standard lock property "${lock}"`,
          path: `locations[${lIdx}].locks`,
          severity: 'warning',
          targetEntityId: loc.id
        });
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    evaluatedAtVersion: identity?.specVersion,
    evaluatedAtRevisionId: identity?.revisionId,
    isAuthoritative: true,
    metrics: {
      shotCount: shots.length,
      calculatedDuration,
      characterCount: characters.length,
      productCount: products.length,
      locationCount: locations.length,
      assetCount: assets.length,
      constraintCount: constraints.length,
      confirmedFieldsCount
    }
  };
}

/**
 * Checks whether an AdSpec's validation status matches its current revision/version state.
 * Returns false if the validation status is missing, not authoritative, or stale.
 */
export function isValidationFresh(adSpec: AdSpec): boolean {
  if (!adSpec?.validationStatus) return false;
  return (
    adSpec.validationStatus.isAuthoritative === true &&
    adSpec.validationStatus.evaluatedAtVersion === adSpec.identity?.specVersion &&
    adSpec.validationStatus.evaluatedAtRevisionId === adSpec.identity?.revisionId
  );
}
