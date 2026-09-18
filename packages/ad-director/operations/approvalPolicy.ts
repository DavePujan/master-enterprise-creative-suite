/**
 * Centralized Approval Policy Engine for Director Operations.
 * Deterministically classifies operation safety and enforces confirmed-state protections.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { AdSpec } from '@shared-types/adSpec.js';
import type {
  DirectorOperation,
  ApprovalPolicyResult,
  ApprovalLevel
} from '@shared-types/directorOperations.js';

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

/**
 * Checks whether a given field path in an AdSpec is confirmed by the user.
 */
export function isFieldUserConfirmed(spec: AdSpec, path: string): boolean {
  // 1. Check first-class decisionMetadata / provenanceRegistry
  const decisionMeta = (spec.decisionMetadata || spec.provenanceRegistry) as Record<string, any> | undefined;
  if (decisionMeta && decisionMeta[path]) {
    const record = decisionMeta[path];
    const isConfirmed = record.locked === true || record.status === 'confirmed' || record.status === 'approved' || record.status === 'user_confirmed';
    const isUser = record.source === 'user' || record.source === 'user_provided' || record.source === 'user_selected';
    if (isConfirmed && isUser) return true;
  }

  // 2. Check inline wrapped value if present
  const value = getValueByPath(spec, path);
  if (value && typeof value === 'object' && value.confirmed === true && (value.source === 'user' || value.source === 'user_provided')) {
    return true;
  }
  return false;
}

/**
 * Evaluates whether an operation can be applied automatically or requires user/execution confirmation.
 */
export function evaluateApprovalPolicy(
  spec: AdSpec,
  operation: DirectorOperation
): ApprovalPolicyResult {
  const reasons: string[] = [];
  const isUserExplicit =
    operation.actor.role === 'user' ||
    operation.reason.type === 'user_requested' ||
    operation.reason.type === 'user_confirmed';
  const isAiActor = !isUserExplicit;
  const isApproved = spec.identity.creativeState === 'approved';

  // 1. REJECTED: Approved AdSpec cannot be mutated directly by AI without explicit un-approval / revision
  if (isApproved && isAiActor) {
    return {
      level: 'REJECTED_UNAUTHORIZED',
      requiresConfirmation: true,
      reasons: ['Approved AdSpec is locked. AI cannot mutate an approved AdSpec directly without user reopening revision.']
    };
  }

  // 2. CONFIRMED STATE & GRANULAR LOCK PROTECTION:
  // If AI attempts to mutate a user-confirmed field or a locked sub-property, it MUST require user confirmation.
  if (isAiActor) {
    const targetPath = operation.target.path;
    const targetScope = operation.target.scope;

    // Check universal decision locks across decisionMetadata/provenanceRegistry
    const fullTargetKey = operation.target.entityId && operation.target.path
      ? `${operation.target.entityId}.${operation.target.path}`
      : (operation.target.path || `${operation.target.scope}.${operation.target.entityId || ''}`);

    if (isFieldUserConfirmed(spec, fullTargetKey) || (operation.target.path && isFieldUserConfirmed(spec, operation.target.path))) {
      reasons.push(`Target field "${fullTargetKey}" is user-confirmed and locked. AI proposed modification requires explicit user confirmation.`);
    }

    // A. Check brief fields
    if (targetScope === 'brief' || (targetPath && targetPath.startsWith('brief.'))) {
      for (const key of Object.keys(operation.changes)) {
        const cleanKey = key.replace(/^brief\./, '');
        const fullPath = `brief.${cleanKey}`;
        if (isFieldUserConfirmed(spec, fullPath) || isFieldUserConfirmed(spec, `brief.${cleanKey.split('.')[0]}`)) {
          reasons.push(`Target field "${fullPath}" is user-confirmed and cannot be silently modified by AI.`);
        }
      }
    }

    // B. Check concept selection
    if ((operation.type === 'select_concept' || (operation.type === 'set' && targetPath === 'creative.selectedConceptId')) && spec.creative.selectedConceptId) {
      if (spec.creative.selectionProvenance?.selectedBy === 'user') {
        reasons.push('User has already confirmed the creative concept. AI cannot silently reselect.');
      }
    }

    // C. Check Granular Product Sub-Property Locks
    const isProductMutation =
      operation.type === 'update_product' ||
      operation.type === 'remove_product' ||
      ((operation.type === 'patch' || operation.type === 'set' || operation.type === 'remove') && targetScope === 'product');

    if (isProductMutation) {
      const prod = spec.products.find(p => p.id === operation.target.entityId);
      if (prod) {
        const prodLocks = new Set(prod.locks || []);

        if ((prodLocks.has('geometry') || prod.forbiddenTransformations?.length > 0) && (operation.changes['shapeForm'] || operation.changes['geometry'])) {
          reasons.push(`Product geometry for "${prod.name}" is locked. AI proposed shape change requires confirmation.`);
        }
        if (prodLocks.has('packaging') && operation.changes['packaging']) {
          reasons.push(`Product packaging for "${prod.name}" is locked and requires explicit confirmation to alter.`);
        }
        if (prodLocks.has('logo') && (operation.changes['branding'] || operation.changes['logo'])) {
          reasons.push(`Product logo specifications for "${prod.name}" are locked.`);
        }
        if (prodLocks.has('brandColors') && operation.changes['colorPalette']) {
          reasons.push(`Product brand colors for "${prod.name}" are locked.`);
        }
        if (prodLocks.has('material') && operation.changes['materials']) {
          reasons.push(`Product materials for "${prod.name}" are locked.`);
        }
        if (prodLocks.has('label') && (operation.changes['branding'] || operation.changes['labelLogoConstraints'])) {
          reasons.push(`Product label details for "${prod.name}" are locked.`);
        }

        // Generic safeguard for un-locked but structural changes
        if (operation.changes['packaging'] || operation.changes['shapeForm'] || operation.changes['branding']) {
          if (!prodLocks.size) {
            reasons.push(`Product identity changes for "${prod.name}" require explicit user confirmation.`);
          }
        }
      }
    }

    // D. Check Granular Character Sub-Property Locks
    const isCharacterMutation =
      operation.type === 'update_character' ||
      operation.type === 'remove_character' ||
      ((operation.type === 'patch' || operation.type === 'set' || operation.type === 'remove') && targetScope === 'character');

    if (isCharacterMutation) {
      const char = spec.characters.find(c => c.id === operation.target.entityId);
      if (char) {
        const charLocks = new Set(char.locks || []);
        if (charLocks.has('wardrobe') && operation.changes['wardrobe']) {
          reasons.push(`Character wardrobe for "${char.displayName}" is locked.`);
        }
        if (charLocks.has('hair') && (operation.changes['appearance']?.['hairColor'] || operation.changes['appearance']?.['hairStyle'])) {
          reasons.push(`Character hair styling for "${char.displayName}" is locked.`);
        }
        if (charLocks.has('face') && (operation.changes['appearance']?.['distinguishingFeatures'] || operation.changes['appearance'])) {
          reasons.push(`Character face identity for "${char.displayName}" is locked.`);
        }
        if (charLocks.has('accessories') && operation.changes['wardrobe']?.['accessories']) {
          reasons.push(`Character accessories for "${char.displayName}" are locked.`);
        }
        if (charLocks.has('identity') && (operation.changes['appearance'] || operation.changes['displayName'])) {
          reasons.push(`Character identity for "${char.displayName}" is locked.`);
        }
      }
    }

    const isCharacterRemoval =
      operation.type === 'remove_character' ||
      (operation.type === 'remove' && targetScope === 'character');

    if (isCharacterRemoval) {
      reasons.push(`Removing character "${operation.target.entityId}" alters narrative structure and requires confirmation.`);
    }

    // E. High shot count change
    const isShotAddition =
      operation.type === 'insert_shot' ||
      operation.type === 'insertShot' ||
      (operation.type === 'add' && targetScope === 'shot');

    if (isShotAddition && spec.shots.length >= 6) {
      reasons.push('Adding shots to an already populated storyboard increases production complexity.');
    }
  }

  // 3. EXECUTION CONFIRMATION:
  // Changes to generation parameters after creative approval
  if (operation.target.scope === 'generationIntent' && isApproved) {
    return {
      level: 'EXECUTION_CONFIRMATION_REQUIRED',
      requiresConfirmation: true,
      reasons: ['Modifying generation intent on an approved plan alters execution parameters and rendering costs.']
    };
  }

  // 4. USER CONFIRMATION REQUIRED if any high-impact rules triggered
  if (reasons.length > 0) {
    return {
      level: 'USER_CONFIRMATION_REQUIRED',
      requiresConfirmation: true,
      reasons
    };
  }

  // 5. Default to AUTO_SAFE for user actions or safe draft AI adjustments
  return {
    level: 'AUTO_SAFE',
    requiresConfirmation: false,
    reasons: ['Operation meets automated safety criteria for draft creative planning.']
  };
}
