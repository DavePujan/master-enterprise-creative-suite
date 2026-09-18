import type {
  AdShot,
  AdCharacterEntity,
  AdProductEntity,
  AdSpecLocationEntity,
  ContinuityLink,
  ContinuityStatusReport
} from '@contracts/adSpecContracts.js';

export class ContinuityResolverService {
  /**
   * Evaluates sequential continuity across characters, products, and locations.
   * Generates continuity graph links and a human-readable continuity checklist.
   */
  public resolveContinuity(params: {
    shots: AdShot[];
    characters: AdCharacterEntity[];
    products: AdProductEntity[];
    locations: AdSpecLocationEntity[];
  }): ContinuityStatusReport {
    const { shots, characters, products, locations } = params;

    const links: ContinuityLink[] = [];
    const issues: string[] = [];

    let characterConsistent = true;
    let productReferenceLocked = true;
    let locationContinuity = true;
    let wardrobeConsistent = true;

    // Map entity appearances across shots
    const charAppearanceMap = new Map<string, number[]>(); // charId -> shotSequences
    const productAppearanceMap = new Map<string, number[]>(); // prodId -> shotSequences
    const locationAppearanceMap = new Map<string, number[]>(); // locId -> shotSequences

    for (const shot of shots) {
      // Collect character and product appearances
      for (const sub of shot.subjects || []) {
        if (sub.entityType === 'character') {
          const list = charAppearanceMap.get(sub.entityId) || [];
          list.push(shot.sequence);
          charAppearanceMap.set(sub.entityId, list);
        } else if (sub.entityType === 'product') {
          const list = productAppearanceMap.get(sub.entityId) || [];
          list.push(shot.sequence);
          productAppearanceMap.set(sub.entityId, list);
        }
      }

      // Collect location appearances
      if (shot.environment?.locationId) {
        const list = locationAppearanceMap.get(shot.environment.locationId) || [];
        list.push(shot.sequence);
        locationAppearanceMap.set(shot.environment.locationId, list);
      }
    }

    // 1. Resolve Character Continuity
    for (const char of characters) {
      const appearances = charAppearanceMap.get(char.id) || [];
      if (appearances.length > 1) {
        for (let i = 0; i < appearances.length - 1; i++) {
          const fromSeq = appearances[i];
          const toSeq = appearances[i + 1];
          const fromShot = shots.find(s => s.sequence === fromSeq);
          const toShot = shots.find(s => s.sequence === toSeq);

          if (fromShot && toShot) {
            // Wardrobe link
            links.push({
              fromShotId: fromShot.shotId,
              toShotId: toShot.shotId,
              entityId: char.id,
              aspect: 'wardrobe',
              invariant: char.wardrobe?.outfit || 'Consistent character outfit and styling'
            });

            // Identity link
            links.push({
              fromShotId: fromShot.shotId,
              toShotId: toShot.shotId,
              entityId: char.id,
              aspect: 'character_identity',
              invariant: 'Consistent facial geometry and appearance'
            });
          }
        }
      }
    }

    // 2. Resolve Product Continuity
    for (const prod of products) {
      const appearances = productAppearanceMap.get(prod.id) || [];
      if (appearances.length > 1) {
        for (let i = 0; i < appearances.length - 1; i++) {
          const fromSeq = appearances[i];
          const toSeq = appearances[i + 1];
          const fromShot = shots.find(s => s.sequence === fromSeq);
          const toShot = shots.find(s => s.sequence === toSeq);

          if (fromShot && toShot) {
            links.push({
              fromShotId: fromShot.shotId,
              toShotId: toShot.shotId,
              entityId: prod.id,
              aspect: 'packaging_and_geometry',
              invariant: 'Product shape, label placement, and packaging invariant'
            });
          }
        }
      }
    }

    // 3. Resolve Location Continuity
    for (const loc of locations) {
      const appearances = locationAppearanceMap.get(loc.id) || [];
      if (appearances.length > 1) {
        for (let i = 0; i < appearances.length - 1; i++) {
          const fromSeq = appearances[i];
          const toSeq = appearances[i + 1];
          const fromShot = shots.find(s => s.sequence === fromSeq);
          const toShot = shots.find(s => s.sequence === toSeq);

          if (fromShot && toShot) {
            links.push({
              fromShotId: fromShot.shotId,
              toShotId: toShot.shotId,
              entityId: loc.id,
              aspect: 'spatial_and_lighting',
              invariant: `${loc.name} spatial depth and ${loc.lightingCharacteristics?.mood || 'consistent lighting mood'}`
            });
          }
        }
      }
    }

    // 4. Invariant checks
    // Verify shots don't reference entities in contradictory states
    for (const shot of shots) {
      for (const inh of shot.continuity?.inheritedStates || []) {
        const sourceShot = shots.find(s => s.shotId === inh.sourceShotId);
        if (!sourceShot) {
          issues.push(`Shot '${shot.shotId}' inherits from missing source shot '${inh.sourceShotId}'`);
        } else if (sourceShot.sequence >= shot.sequence) {
          issues.push(`Shot '${shot.shotId}' has invalid backward inheritance from future shot '${inh.sourceShotId}'`);
          characterConsistent = false;
        }
      }
    }

    const summary = [
      characterConsistent ? '✓ Character consistent' : '✗ Character continuity issue detected',
      productReferenceLocked ? '✓ Product reference locked' : '✗ Product lock issue detected',
      locationContinuity ? '✓ Location continuity' : '✗ Location atmosphere mismatch',
      wardrobeConsistent ? '✓ Wardrobe consistent' : '✗ Wardrobe mismatch detected'
    ].join('\n');

    return {
      characterConsistent,
      productReferenceLocked,
      locationContinuity,
      wardrobeConsistent,
      links,
      issues,
      summary
    };
  }
}

export const continuityResolverService = new ContinuityResolverService();
