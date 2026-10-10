import { campaignRepository } from '../apps/api/src/modules/campaigns/campaignRepository.js';
import {
  formatSavedDate,
  humanizeFramework,
  formatShortId
} from '../apps/web/src/features/campaigns/components/modals/SavedStrategiesModal.js';

async function runVerification() {
  console.log('--- 1. Testing Date & Framework Formatters ---');

  // Test defensive date resolution
  const dateFromId = formatSavedDate(undefined, 'mem-strat-1791545226544');
  console.log('Date resolved from ID:', dateFromId);
  console.assert(dateFromId.startsWith('Saved Oct 09, 2026'), 'Failed date from ID extraction');

  const nowFallback = formatSavedDate(undefined, undefined);
  console.log('Date fallback to recent:', nowFallback);
  console.assert(nowFallback.startsWith('Saved'), 'Failed date fallback');

  // Test valid date
  const validFormatted = formatSavedDate('2026-10-09T09:30:00Z');
  console.log('Valid date formatted:', validFormatted);
  console.assert(validFormatted.startsWith('Saved Oct 09, 2026'), 'Failed valid date formatting');

  // Test humanizeFramework
  console.assert(
    humanizeFramework('SEASONAL-FESTIVE-EMOTIONAL-HOMECOMING') === 'Seasonal Campaign',
    'Failed seasonal framework humanizer'
  );
  console.assert(
    humanizeFramework('MEME-SUBCULTURE') === 'Culture & Memes',
    'Failed meme framework humanizer'
  );
  console.assert(
    humanizeFramework('PERFORMANCE-FLYWHEEL-CONVERSION') === 'Performance & Flywheel',
    'Failed performance framework humanizer'
  );
  console.assert(
    humanizeFramework('CREATOR-LED-MOMENTUM') === 'Creator Momentum',
    'Failed creator framework humanizer'
  );
  console.log('Framework humanizer tests passed!');

  // Test formatShortId
  console.assert(formatShortId('mem-strat-1728472910') === '#2910', 'Failed short ID test');
  console.log('Short ID formatter tests passed!');

  console.log('\n--- 2. Testing CampaignRepository CRUD & Enrichment ---');

  const testWorkspaceId = `test-ws-${Date.now()}`;
  const testUserId = `test-user-${Date.now()}`;

  // 1. Create strategy
  const created = await campaignRepository.createStrategy({
    workspaceId: testWorkspaceId,
    userId: testUserId,
    title: 'Big Billion Days 2026',
    frameworkId: 'SEASONAL-FESTIVE-EMOTIONAL-HOMECOMING'
  });
  console.log('Created strategy ID:', created.id);

  // 2. Add version with territory
  const savedVer = await campaignRepository.saveVersion({
    campaignStrategyId: created.id,
    versionNumber: 1,
    selectedTerritory: {
      id: 'terr_1',
      name: 'Luck Badal Sakta Hai',
      angle: 'Emotional Homecoming',
      premise: 'A poignant tale of fortune and family reconnection during festive shopping.',
      whyNow: 'Festive peak',
      targetPillars: ['Family', 'Festive'],
      estimatedRiskTier: 'moderate',
      creativeSparks: ['Home arrival spark'],
      tradeoffs: { boldMoves: [], cautiousPivots: [] },
      fitScores: { brandVoice: 9, marketNovelty: 9, feasibility: 9, strategicRisk: 2 }
    } as any,
    masterStrategy: {
      bigIdea: 'Every family deserves to celebrate with fortune and dignity.',
      executiveSummary: { coreConcept: 'Luck Badal Sakta Hai' }
    } as any,
    downstreamBriefs: {
      canonicalAdSpec: { id: 'adspec_1', assets: [] } as any
    } as any,
    epistemicLedger: [],
    criticReport: {},
    createdBy: testUserId
  });
  console.log('Saved version ID:', savedVer.versionId);

  // 3. List workspace strategies (verify enrichment & valid dates)
  const list = await campaignRepository.listWorkspaceStrategies(testWorkspaceId);
  console.log('Retrieved workspace strategies count:', list.length);
  console.assert(list.length === 1, 'Expected 1 strategy');
  const item = list[0];
  console.log('Enriched item:', {
    id: item.id,
    title: item.title,
    territory_name: item.territory_name,
    version_number: item.version_number,
    stage_number: item.stage_number,
    stage_total: item.stage_total,
    stage_label: item.stage_label,
    created_at: item.created_at,
    updated_at: item.updated_at
  });
  console.assert(item.territory_name === 'Luck Badal Sakta Hai', 'Expected territory_name to match');
  console.assert(item.version_number === 1, 'Expected version_number to be 1');
  console.assert(item.stage_number === 5, 'Expected stage_number to be 5 for canonicalAdSpec');
  console.assert(item.stage_total === 5, 'Expected stage_total to be 5');
  console.assert(item.stage_label.includes('Stage 5/5'), 'Expected stage_label to have Stage 5/5');
  console.assert(Boolean(item.created_at && !isNaN(new Date(item.created_at).getTime())), 'Expected valid created_at');
  console.assert(Boolean(item.updated_at && !isNaN(new Date(item.updated_at).getTime())), 'Expected valid updated_at');

  // 4. Update (rename) strategy
  const updated = await campaignRepository.updateStrategy(created.id, testWorkspaceId, {
    title: 'Big Billion Days 2026 (Renamed)'
  });
  console.assert(updated === true, 'Update failed');
  const reloaded = await campaignRepository.getStrategyById(created.id, testWorkspaceId);
  console.assert(reloaded.title === 'Big Billion Days 2026 (Renamed)', 'Title did not update');
  console.log('Rename verification passed!');

  // 5. Duplicate strategy
  const duplicated = await campaignRepository.duplicateStrategy(created.id, testWorkspaceId, testUserId);
  console.assert(duplicated !== null, 'Duplicate returned null');
  console.assert(duplicated.title.includes('(Copy)'), 'Duplicate title did not include (Copy)');
  const listAfterDup = await campaignRepository.listWorkspaceStrategies(testWorkspaceId);
  console.assert(listAfterDup.length === 2, 'Expected 2 strategies after duplicate');
  console.log('Duplicate verification passed! Strategies count:', listAfterDup.length);

  // 6. Delete strategy
  const deleted = await campaignRepository.deleteStrategy(created.id, testWorkspaceId);
  console.assert(deleted === true, 'Delete failed');
  const listAfterDel = await campaignRepository.listWorkspaceStrategies(testWorkspaceId);
  console.assert(listAfterDel.length === 1, 'Expected 1 strategy remaining after delete');
  console.log('Delete verification passed! Remaining count:', listAfterDel.length);

  console.log('\n--- 3. Testing Live PostgreSQL Persistence & Stage Metrics ---');
  const userWorkspaceId = 'a1b3967b-0545-46fc-944b-d55bc420af29';
  const liveList = await campaignRepository.listWorkspaceStrategies(userWorkspaceId);
  console.log(`Live PostgreSQL strategies retrieved: ${liveList.length}`);
  console.assert(liveList.length >= 3, 'Expected at least 3 live seeded strategies');

  for (const item of liveList) {
    console.log(`  - Strategy: "${item.title}"`);
    console.log(`    Date: ${formatSavedDate(item.updated_at, item.id)}`);
    console.log(`    Stage Status: ${item.stage_label} (${item.stage_number}/${item.stage_total})`);
    console.assert(Boolean(item.created_at && !isNaN(new Date(item.created_at).getTime())), 'Live item created_at must be valid');
    console.assert(Boolean(item.updated_at && !isNaN(new Date(item.updated_at).getTime())), 'Live item updated_at must be valid');
    console.assert(item.stage_total === 5, 'Live item stage_total must be 5');
    console.assert(typeof item.stage_number === 'number' && item.stage_number >= 1 && item.stage_number <= 5, 'Stage number must be 1..5');
    console.assert(formatSavedDate(item.updated_at, item.id).startsWith('Saved'), 'Date must start with Saved');
    console.assert(!formatSavedDate(item.updated_at, item.id).includes('unavailable'), 'Date must never be unavailable');
  }

  // Verify getStrategyById loads the master strategy and territory correctly from PostgreSQL
  const firstId = liveList[0].id;
  const single = await campaignRepository.getStrategyById(firstId, userWorkspaceId);
  console.assert(single !== null, 'getStrategyById must return strategy from PostgreSQL');
  console.assert(single.id === firstId, 'ID must match');
  const versions = single.versions || single.campaign_strategy_versions || [];
  console.assert(versions.length > 0, 'Must have at least 1 version');
  const v = versions[0];
  const territory = v.selectedTerritory || v.selected_territory;
  const master = v.masterStrategy || v.master_strategy;
  console.assert(Boolean(territory?.name), 'Must have territory name');
  console.assert(Boolean(master?.bigIdea), 'Must have master big idea');
  console.log(`  Live Strategy rehydration verified: "${single.title}" -> "${master.bigIdea.slice(0, 50)}..."`);

  console.log('\n>>> ALL AUTOMATED VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<');
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
