/**
 * Deterministic Validator for Director Operations.
 * Enforces schema integrity, actor permissions, target existence, and confirmed-state rules.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { AdSpec } from '@shared-types/adSpec.js';
import type {
  DirectorOperation,
  ApprovalPolicyResult
} from '@shared-types/directorOperations.js';
import { evaluateApprovalPolicy } from './approvalPolicy.js';

export interface OperationValidationResult {
  valid: boolean;
  errors: string[];
  approvalPolicy: ApprovalPolicyResult;
}

export function validateDirectorOperation(
  spec: AdSpec,
  operation: DirectorOperation
): OperationValidationResult {
  const errors: string[] = [];

  // 1. Basic Schema Validation
  if (!operation) {
    return {
      valid: false,
      errors: ['Operation object is missing or null'],
      approvalPolicy: {
        level: 'REJECTED_UNAUTHORIZED',
        requiresConfirmation: true,
        reasons: ['Null operation']
      }
    };
  }

  if (!operation.operationId || typeof operation.operationId !== 'string') {
    errors.push('Operation missing valid operationId');
  }

  if (!operation.type || typeof operation.type !== 'string') {
    errors.push('Operation missing valid type');
  }

  if (!operation.actor || !operation.actor.role) {
    errors.push('Operation missing actor identity or role');
  }

  if (!operation.target || !operation.target.scope) {
    errors.push('Operation missing target scope');
  }

  if (!operation.changes || typeof operation.changes !== 'object') {
    errors.push('Operation missing changes payload');
  }

  if (typeof operation.parentSpecVersion !== 'number') {
    errors.push('Operation missing parentSpecVersion');
  } else if (spec.identity.specVersion && operation.parentSpecVersion !== spec.identity.specVersion) {
    errors.push(
      `Version mismatch: Operation targets base version ${operation.parentSpecVersion}, but active AdSpec version is ${spec.identity.specVersion}`
    );
  }

  // 2. Target Existence Validation
  const targetId = operation.target?.entityId;
  const scope = operation.target?.scope;

  const isShotTargeted =
    operation.type === 'update_shot' ||
    operation.type === 'delete_shot' ||
    operation.type === 'deleteShot' ||
    ((operation.type === 'patch' || operation.type === 'remove' || operation.type === 'replaceReference') && (scope === 'shot' || (targetId && targetId.startsWith('shot_'))));

  if (isShotTargeted) {
    if (!targetId) {
      errors.push('Shot operation requires target.entityId');
    } else {
      const exists = spec.shots.some(s => s.shotId === targetId);
      if (!exists) {
        errors.push(`Target shot "${targetId}" does not exist in AdSpec`);
      }
    }
  }

  const isCharTargeted =
    operation.type === 'update_character' ||
    operation.type === 'remove_character' ||
    ((operation.type === 'patch' || operation.type === 'remove' || operation.type === 'replaceReference') && (scope === 'character' || (targetId && targetId.startsWith('char_'))));

  if (isCharTargeted) {
    if (!targetId) {
      errors.push('Character operation requires target.entityId');
    } else {
      const exists = spec.characters.some(c => c.id === targetId);
      if (!exists) {
        errors.push(`Target character "${targetId}" does not exist in AdSpec`);
      }
    }
  }

  const isProdTargeted =
    operation.type === 'update_product' ||
    operation.type === 'remove_product' ||
    ((operation.type === 'patch' || operation.type === 'remove' || operation.type === 'replaceReference') && (scope === 'product' || (targetId && targetId.startsWith('prod_'))));

  if (isProdTargeted) {
    if (!targetId) {
      errors.push('Product operation requires target.entityId');
    } else {
      const exists = spec.products.some(p => p.id === targetId);
      if (!exists) {
        errors.push(`Target product "${targetId}" does not exist in AdSpec`);
      }
    }
  }

  const isLocTargeted =
    operation.type === 'update_location' ||
    operation.type === 'remove_location' ||
    ((operation.type === 'patch' || operation.type === 'remove') && (scope === 'location' || (targetId && targetId.startsWith('loc_'))));

  if (isLocTargeted) {
    if (!targetId) {
      errors.push('Location operation requires target.entityId');
    } else {
      const exists = spec.locations.some(l => l.id === targetId);
      if (!exists) {
        errors.push(`Target location "${targetId}" does not exist in AdSpec`);
      }
    }
  }

  // 3. Evaluate Approval Policy
  const approvalPolicy = evaluateApprovalPolicy(spec, operation);

  if (approvalPolicy.level === 'REJECTED_UNAUTHORIZED') {
    errors.push(...approvalPolicy.reasons);
  } else if (approvalPolicy.level === 'USER_CONFIRMATION_REQUIRED' && operation.actor.role !== 'user') {
    // If an AI actor attempts a change requiring user confirmation without explicit user instruction
    if (operation.reason.type !== 'user_requested' && operation.reason.type !== 'user_confirmed') {
      errors.push(
        `Operation requires explicit user confirmation: ${approvalPolicy.reasons.join('; ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    approvalPolicy
  };
}
