import {
  AdSpec,
  AdSpecValidationIssue,
  AdSpecZodSchema,
  StableEntityIdRegex
} from '@contracts/adSpecContracts.js';


export interface ValidationResult {
  valid: boolean;
  errors: AdSpecValidationIssue[];
  warnings: AdSpecValidationIssue[];
}

export class VideoAdValidationService {
  /**
   * Deterministic multi-stage validation for AdSpec v1.
   * 1. Structural Schema Validation (Zod)
   * 2. Referential Integrity (Characters, Products, Locations, Assets)
   * 3. Temporal & Duration Consistency
   * 4. Continuity & Dependency Sanity
   * 5. Decision Lock Protection
   */
  public validateAdSpec(spec: AdSpec, previousVersionSpec?: AdSpec): ValidationResult {
    const errors: AdSpecValidationIssue[] = [];
    const warnings: AdSpecValidationIssue[] = [];

    // 1. STRUCTURAL VALIDATION (ZOD)
    const parseResult = AdSpecZodSchema.safeParse(spec);
    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        errors.push({
          code: 'SCHEMA_VALIDATION_ERROR',
          message: issue.message,
          path: issue.path.join('.'),
          severity: 'error',
        });
      }
      return { valid: false, errors, warnings };
    }

    // 2. REFERENTIAL INTEGRITY
    const declaredCharacters = new Set((spec.characters || []).map(c => c.id));
    const declaredProducts = new Set((spec.products || []).map(p => p.id));
    const declaredLocations = new Set((spec.locations || []).map(l => l.id));
    const declaredAssets = new Set((spec.assets?.assets || []).map(a => a.assetId));

    // Verify entity ID formats
    for (const char of spec.characters || []) {
      if (!StableEntityIdRegex.character.test(char.id)) {
        errors.push({
          code: 'INVALID_CHARACTER_ID_FORMAT',
          message: `Character ID '${char.id}' must follow format char_*`,
          path: `characters.${char.id}`,
          severity: 'error',
          targetEntityId: char.id,
        });
      }
      for (const assetId of char.referenceAssetIds || []) {
        if (!declaredAssets.has(assetId)) {
          warnings.push({
            code: 'UNDECLARED_ASSET_REFERENCE',
            message: `Character '${char.id}' references undeclared assetId '${assetId}'`,
            path: `characters.${char.id}.referenceAssetIds`,
            severity: 'warning',
            targetEntityId: char.id,
          });
        }
      }
    }

    for (const prod of spec.products || []) {
      if (!StableEntityIdRegex.product.test(prod.id)) {
        errors.push({
          code: 'INVALID_PRODUCT_ID_FORMAT',
          message: `Product ID '${prod.id}' must follow format product_* or prod_*`,
          path: `products.${prod.id}`,
          severity: 'error',
          targetEntityId: prod.id,
        });
      }
      for (const assetId of prod.referenceAssetIds || []) {
        if (!declaredAssets.has(assetId)) {
          warnings.push({
            code: 'UNDECLARED_ASSET_REFERENCE',
            message: `Product '${prod.id}' references undeclared assetId '${assetId}'`,
            path: `products.${prod.id}.referenceAssetIds`,
            severity: 'warning',
            targetEntityId: prod.id,
          });
        }
      }
    }

    for (const loc of spec.locations || []) {
      if (!StableEntityIdRegex.location.test(loc.id)) {
        errors.push({
          code: 'INVALID_LOCATION_ID_FORMAT',
          message: `Location ID '${loc.id}' must follow format location_* or loc_*`,
          path: `locations.${loc.id}`,
          severity: 'error',
          targetEntityId: loc.id,
        });
      }
      for (const assetId of loc.referenceAssetIds || []) {
        if (!declaredAssets.has(assetId)) {
          warnings.push({
            code: 'UNDECLARED_ASSET_REFERENCE',
            message: `Location '${loc.id}' references undeclared assetId '${assetId}'`,
            path: `locations.${loc.id}.referenceAssetIds`,
            severity: 'warning',
            targetEntityId: loc.id,
          });
        }
      }
    }

    // 3. SHOT INTEGRITY & SUBJECT REFERENCES
    let calculatedDuration = 0;
    const shotSequences = new Set<number>();
    const shotIdMap = new Map<string, number>();

    for (const shot of spec.shots || []) {
      if (!StableEntityIdRegex.shot.test(shot.shotId)) {
        errors.push({
          code: 'INVALID_SHOT_ID_FORMAT',
          message: `Shot ID '${shot.shotId}' must follow format shot_*`,
          path: `shots.${shot.shotId}`,
          severity: 'error',
          targetShotId: shot.shotId,
        });
      }

      if (shotSequences.has(shot.sequence)) {
        errors.push({
          code: 'DUPLICATE_SHOT_SEQUENCE',
          message: `Duplicate sequence number ${shot.sequence} found for shot '${shot.shotId}'`,
          path: `shots.${shot.shotId}.sequence`,
          severity: 'error',
          targetShotId: shot.shotId,
        });
      }
      shotSequences.add(shot.sequence);
      shotIdMap.set(shot.shotId, shot.sequence);

      calculatedDuration += shot.timing?.duration || 0;

      // Location reference check
      if (shot.environment?.locationId && !declaredLocations.has(shot.environment.locationId)) {
        errors.push({
          code: 'LOCATION_NOT_FOUND',
          message: `Shot '${shot.shotId}' references undeclared location '${shot.environment.locationId}'`,
          path: `shots.${shot.shotId}.environment.locationId`,
          severity: 'error',
          targetShotId: shot.shotId,
          targetEntityId: shot.environment.locationId,
        });
      }

      // Subject reference check
      for (const subject of shot.subjects || []) {
        if (subject.entityType === 'character' && !declaredCharacters.has(subject.entityId)) {
          errors.push({
            code: 'CHARACTER_NOT_FOUND',
            message: `Shot '${shot.shotId}' references undeclared character '${subject.entityId}'`,
            path: `shots.${shot.shotId}.subjects`,
            severity: 'error',
            targetShotId: shot.shotId,
            targetEntityId: subject.entityId,
          });
        } else if (subject.entityType === 'product' && !declaredProducts.has(subject.entityId)) {
          errors.push({
            code: 'PRODUCT_NOT_FOUND',
            message: `Shot '${shot.shotId}' references undeclared product '${subject.entityId}'`,
            path: `shots.${shot.shotId}.subjects`,
            severity: 'error',
            targetShotId: shot.shotId,
            targetEntityId: subject.entityId,
          });
        }
      }

      // Referenced asset IDs check
      for (const assetId of shot.referencedAssetIds || []) {
        if (!declaredAssets.has(assetId)) {
          warnings.push({
            code: 'UNDECLARED_ASSET_REFERENCE',
            message: `Shot '${shot.shotId}' references undeclared assetId '${assetId}'`,
            path: `shots.${shot.shotId}.referencedAssetIds`,
            severity: 'warning',
            targetShotId: shot.shotId,
          });
        }
      }
    }

    // 4. TEMPORAL DURATION CONSISTENCY
    const desiredDuration = typeof spec.brief?.desiredDurationSeconds === 'object' && spec.brief.desiredDurationSeconds !== null && 'value' in spec.brief.desiredDurationSeconds
      ? Number((spec.brief.desiredDurationSeconds as any).value)
      : Number(spec.brief?.desiredDurationSeconds || 0);

    if (desiredDuration > 0 && Math.abs(calculatedDuration - desiredDuration) > 0.5) {
      errors.push({
        code: 'TOTAL_DURATION_MISMATCH',
        message: `Sum of shot durations (${calculatedDuration.toFixed(1)}s) does not match brief desired duration (${desiredDuration.toFixed(1)}s)`,
        path: 'brief.desiredDurationSeconds',
        severity: 'error',
      });
    }

    // 5. CONTINUITY DEPENDENCY SANITY (No forward dependencies or cycles)
    for (const shot of spec.shots || []) {
      const currentSeq = shot.sequence;
      const inheritedStates = shot.continuity?.inheritedStates || [];

      for (const inherited of inheritedStates) {
        const sourceSeq = shotIdMap.get(inherited.sourceShotId);
        if (sourceSeq === undefined) {
          errors.push({
            code: 'CONTINUITY_SOURCE_NOT_FOUND',
            message: `Shot '${shot.shotId}' inherits from nonexistent shot '${inherited.sourceShotId}'`,
            path: `shots.${shot.shotId}.continuity`,
            severity: 'error',
            targetShotId: shot.shotId,
          });
        } else if (sourceSeq >= currentSeq) {
          errors.push({
            code: 'CONTINUITY_CYCLE_OR_FORWARD_DEP',
            message: `Shot '${shot.shotId}' (seq ${currentSeq}) has invalid forward/circular dependency on shot '${inherited.sourceShotId}' (seq ${sourceSeq})`,
            path: `shots.${shot.shotId}.continuity`,
            severity: 'error',
            targetShotId: shot.shotId,
          });
        }
      }
    }

    // 6. LOCKED DECISIONS PROTECTION (Compare against previous version if supplied)
    if (previousVersionSpec) {
      const lockedDecisions = previousVersionSpec.decisionMetadata || {};
      for (const [fieldPath, decision] of Object.entries(lockedDecisions)) {
        if (decision.locked) {
          const prevVal = this.getValueAtPath(previousVersionSpec, fieldPath);
          const currentVal = this.getValueAtPath(spec, fieldPath);
          if (prevVal !== undefined && currentVal !== undefined && JSON.stringify(prevVal) !== JSON.stringify(currentVal)) {
            errors.push({
              code: 'LOCKED_DECISION_MUTATION',
              message: `Field '${fieldPath}' is locked by decision '${decision.reason || 'user_confirmed'}' and cannot be mutated without explicit unlock`,
              path: fieldPath,
              severity: 'error',
            });
          }
        }
      }

      // Check entity-level locks on products
      for (const prevProd of previousVersionSpec.products || []) {
        const currProd = (spec.products || []).find(p => p.id === prevProd.id);
        if (currProd) {
          const prodLocks = prevProd.locks || [];
          if (prodLocks.includes('geometry') && prevProd.shapeForm !== currProd.shapeForm) {
            errors.push({
              code: 'LOCKED_DECISION_MUTATION',
              message: `Product '${prevProd.id}' geometry is locked and cannot be mutated without explicit unlock`,
              path: `products.${prevProd.id}.geometry`,
              severity: 'error',
              targetEntityId: prevProd.id,
            });
          }
          if (prodLocks.includes('packaging') && JSON.stringify(prevProd.packaging) !== JSON.stringify(currProd.packaging)) {
            errors.push({
              code: 'LOCKED_DECISION_MUTATION',
              message: `Product '${prevProd.id}' packaging is locked and cannot be mutated without explicit unlock`,
              path: `products.${prevProd.id}.packaging`,
              severity: 'error',
              targetEntityId: prevProd.id,
            });
          }
        }
      }

      // Check entity-level locks on characters
      for (const prevChar of previousVersionSpec.characters || []) {
        const currChar = (spec.characters || []).find(c => c.id === prevChar.id);
        if (currChar) {
          const charLocks = prevChar.locks || [];
          if (charLocks.includes('wardrobe') && JSON.stringify(prevChar.wardrobe) !== JSON.stringify(currChar.wardrobe)) {
            errors.push({
              code: 'LOCKED_DECISION_MUTATION',
              message: `Character '${prevChar.id}' wardrobe is locked and cannot be mutated without explicit unlock`,
              path: `characters.${prevChar.id}.wardrobe`,
              severity: 'error',
              targetEntityId: prevChar.id,
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length; i++) {
      if (curr === null || curr === undefined) return undefined;
      const part = parts[i];

      if (Array.isArray(curr)) {
        const item = curr.find((el: any) => el?.id === part || el?.shotId === part);
        if (item) {
          curr = item;
          continue;
        }
      }

      if (curr && typeof curr === 'object' && part === 'geometry' && 'shapeForm' in curr) {
        curr = curr.shapeForm;
        continue;
      }

      curr = curr[part];
    }
    return curr;
  }
}

export const videoAdValidationService = new VideoAdValidationService();

