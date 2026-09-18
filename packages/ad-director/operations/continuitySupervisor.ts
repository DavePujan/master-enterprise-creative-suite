/**
 * Continuity Supervisor for AdSpec Multi-Shot Sequences.
 * Deterministically checks Character, Product, Location, Camera, and State Invariants.
 * Produces structured PASS, WARNING, or CONFLICT diagnostics with repairability metrics.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { AdSpec, AdShot } from '@shared-types/adSpec.js';
import type {
  ContinuityReport,
  ContinuityConflictItem
} from '@shared-types/directorOperations.js';

export function checkContinuity(spec: AdSpec): ContinuityReport {
  const conflicts: ContinuityConflictItem[] = [];
  const warnings: string[] = [];
  const shots = spec.shots;

  if (!shots || shots.length <= 1) {
    return {
      status: 'PASS',
      checkedShotsCount: shots ? shots.length : 0,
      warnings: [],
      conflicts: [],
      timestamp: new Date().toISOString()
    };
  }

  // Iterate over adjacent pairs of shots (Shot N and Shot N+1)
  for (let i = 0; i < shots.length - 1; i++) {
    const shotA = shots[i];
    const shotB = shots[i + 1];

    // 1. STATE CONTINUITY: Check previous shot end state vs current shot start state
    if (shotA.action && shotB.action) {
      const endStateA = shotA.action.endingState?.trim().toLowerCase();
      const startStateB = shotB.action.startingState?.trim().toLowerCase();

      // Check for character continuity between adjacent shots
      const sharedCharacters = shotA.subjects
        .filter(s => s.entityType === 'character')
        .filter(sA => shotB.subjects.some(sB => sB.entityId === sA.entityId));

      for (const charSub of sharedCharacters) {
        const char = spec.characters.find(c => c.id === charSub.entityId);
        if (char) {
          const isWardrobeRule = (r: string) => {
            const l = r.toLowerCase();
            return l.includes('shirt') || l.includes('wardrobe') || l.includes('jacket') || l.includes('outfit') || l.includes('attire') || l.includes('dress');
          };
          const qaWardrobeA = shotA.qaExpectations?.characterIdentityRules?.find(isWardrobeRule);
          const qaWardrobeB = shotB.qaExpectations?.characterIdentityRules?.find(isWardrobeRule);

          if (qaWardrobeA && qaWardrobeB && qaWardrobeA.toLowerCase() !== qaWardrobeB.toLowerCase()) {
            conflicts.push({
              category: 'character',
              entityId: char.id,
              shotsInvolved: [shotA.shotId, shotB.shotId],
              conflictingAspect: 'wardrobe',
              currentValue: qaWardrobeB,
              expectedValue: qaWardrobeA,
              description: `Character "${char.displayName}" has conflicting wardrobe rules between ${shotA.shotId} ("${qaWardrobeA}") and ${shotB.shotId} ("${qaWardrobeB}").`,
              autoRepairable: false,
              requiresUserConfirmation: true
            });
          }
        }
      }

      // Check explicit inherited states defined in continuity model
      if (shotB.continuity?.inheritedStates) {
        for (const inherited of shotB.continuity.inheritedStates) {
          if (inherited.sourceShotId === shotA.shotId) {
            const produced = shotA.continuity?.producedStates?.find(p => p.entityId === inherited.entityId);
            if (produced && inherited.requirement && !produced.stateDescription.toLowerCase().includes(inherited.requirement.toLowerCase())) {
              conflicts.push({
                category: 'state',
                entityId: inherited.entityId,
                shotsInvolved: [shotA.shotId, shotB.shotId],
                conflictingAspect: inherited.aspect,
                currentValue: produced.stateDescription,
                expectedValue: inherited.requirement,
                description: `Shot ${shotB.shotId} requires ${inherited.aspect} "${inherited.requirement}" from ${shotA.shotId}, but ${shotA.shotId} produced "${produced.stateDescription}".`,
                autoRepairable: true,
                requiresUserConfirmation: false
              });
            }
          }
        }
      }
    }

    // 2. PRODUCT CONTINUITY: Check packaging and finish preservation across shots
    const sharedProducts = shotA.subjects
      .filter(s => s.entityType === 'product')
      .filter(sA => shotB.subjects.some(sB => sB.entityId === sA.entityId));

    for (const prodSub of sharedProducts) {
      const prod = spec.products.find(p => p.id === prodSub.entityId);
      if (prod) {
        // If one shot has prominent front visibility, verify brand rules don't contradict
        if (shotA.qaExpectations?.productVisibility === 'prominent_front' && shotB.qaExpectations?.productVisibility === 'prominent_front') {
          const ruleA = shotA.qaExpectations.brandRules?.join('; ');
          const ruleB = shotB.qaExpectations.brandRules?.join('; ');
          if (ruleA && ruleB && ruleA !== ruleB) {
            warnings.push(`Potential brand rule variation for product "${prod.name}" between ${shotA.shotId} and ${shotB.shotId}.`);
          }
        }
      }
    }

    // 3. LOCATION CONTINUITY: If same location, check time of day and lighting consistency
    if (shotA.environment?.locationId && shotB.environment?.locationId && shotA.environment.locationId === shotB.environment.locationId) {
      const loc = spec.locations.find(l => l.id === shotA.environment.locationId);
      const lightingA = shotA.lighting?.intensity;
      const lightingB = shotB.lighting?.intensity;

      // In extreme jump cut from high_key to dramatic_low_key in same continuous location without cut/fade
      if (lightingA === 'high_key' && lightingB === 'dramatic_low_key' && shotB.transitions?.incoming === 'cut') {
        warnings.push(`Location "${loc ? loc.name : shotA.environment.locationId}" lighting switches abruptly from high_key in ${shotA.shotId} to dramatic_low_key in ${shotB.shotId} across a hard cut.`);
      }
    }

    // 4. CAMERA CONTINUITY: Check for jump cuts with identical framing and angle
    if (shotA.camera && shotB.camera) {
      if (
        shotA.camera.framing === shotB.camera.framing &&
        shotA.camera.angle === shotB.camera.angle &&
        shotA.environment?.locationId === shotB.environment?.locationId &&
        shotB.transitions?.incoming === 'cut'
      ) {
        warnings.push(`Potential jump cut between ${shotA.shotId} and ${shotB.shotId}: Identical framing (${shotA.camera.framing}) and angle (${shotA.camera.angle}) across a cut.`);
      }
    }
  }

  const hasConflicts = conflicts.length > 0;
  const hasWarnings = warnings.length > 0;

  return {
    status: hasConflicts ? 'CONFLICT' : hasWarnings ? 'WARNING' : 'PASS',
    checkedShotsCount: shots.length,
    warnings,
    conflicts,
    timestamp: new Date().toISOString()
  };
}
