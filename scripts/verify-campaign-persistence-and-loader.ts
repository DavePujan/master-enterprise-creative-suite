import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🧪 VERIFYING CAMPAIGN PERSISTENCE & LOADER OVERHAUL');
console.log('====================================================\n');

// 1. Verify historyFormatters utilities
console.log('1. Checking historyFormatters.ts...');
const formattersPath = path.join(rootDir, 'apps/web/src/features/history/utils/historyFormatters.ts');
const formattersContent = fs.readFileSync(formattersPath, 'utf8');

assert(
  formattersContent.includes("if (gemId === 'campaign-strategist-y') return 'Campaign Strategy';"),
  'getGemName should explicitly return Campaign Strategy for campaign-strategist-y'
);
assert(
  formattersContent.includes("item.result?.campaignTitle"),
  'getCreativeDisplayTitle should recognize item.result.campaignTitle'
);
assert(
  formattersContent.includes("item.result?.masterStrategy?.coreBigIdea"),
  'getCreativeDisplayTitle should recognize item.result.masterStrategy.coreBigIdea'
);
assert(
  formattersContent.includes("res.type === 'campaign-strategy' || item.gemId === 'campaign-strategist-y'"),
  'extractHistoryMedia should recognize campaign-strategy items'
);
console.log('✅ historyFormatters.ts verified successfully.\n');

// 2. Verify CampaignStrategyContext.tsx persistence & rehydration
console.log('2. Checking CampaignStrategyContext.tsx...');
const contextPath = path.join(rootDir, 'apps/web/src/features/campaigns/context/CampaignStrategyContext.tsx');
const contextContent = fs.readFileSync(contextPath, 'utf8');

assert(
  contextContent.includes("export const CAMPAIGN_DRAFT_STORAGE_KEY = 'writopedia_campaign_strategy_draft_v1';"),
  'CAMPAIGN_DRAFT_STORAGE_KEY should be defined'
);
assert(
  contextContent.includes('loadDraftFromStorage'),
  'loadDraftFromStorage helper should be present'
);
assert(
  contextContent.includes('saveDraftToStorage'),
  'saveDraftToStorage helper should be present'
);
assert(
  contextContent.includes('clearDraftFromStorage'),
  'clearDraftFromStorage helper should be present'
);
assert(
  contextContent.includes("case 'REHYDRATE_STATE':"),
  'REHYDRATE_STATE action must be handled in reducer'
);
assert(
  contextContent.includes("case 'RESET_CAMPAIGN':"),
  'RESET_CAMPAIGN action must be handled in reducer'
);
assert(
  contextContent.includes('loadDraftFromStorage()'),
  'CampaignStrategyProvider must initialize from loadDraftFromStorage()'
);
assert(
  contextContent.includes('saveDraftToStorage(state)'),
  'CampaignStrategyProvider must auto-save on state changes'
);
console.log('✅ CampaignStrategyContext.tsx verified successfully.\n');

// 3. Verify CampaignStrategistWorkspace.tsx history & restoration
console.log('3. Checking CampaignStrategistWorkspace.tsx...');
const workspacePath = path.join(rootDir, 'apps/web/src/features/campaigns/components/CampaignStrategistWorkspace.tsx');
const workspaceContent = fs.readFileSync(workspacePath, 'utf8');

assert(
  workspaceContent.includes('currentActiveResult?: any;'),
  'WorkspaceProps should include currentActiveResult'
);
assert(
  workspaceContent.includes('onClearActiveResult?: () => void;'),
  'WorkspaceProps should include onClearActiveResult'
);
assert(
  workspaceContent.includes("currentActiveResult.type === 'campaign-strategy'"),
  'Workspace should have an auto-rehydration effect for campaign-strategy'
);
assert(
  workspaceContent.includes("type: 'campaign-strategy'"),
  'Workspace handleLockTerritory must call onSaveHistory with campaign-strategy payload'
);
assert(
  workspaceContent.includes('/api/campaign/strategy/workspace-history'),
  'Workspace should support fetching past workspace strategies'
);
assert(
  workspaceContent.includes('/api/campaign/strategy/${stratId}'),
  'Workspace should support loading a past strategy by ID'
);
console.log('✅ CampaignStrategistWorkspace.tsx verified successfully.\n');

// 4. Verify AppShell.tsx passes currentActiveResult
console.log('4. Checking AppShell.tsx...');
const appShellPath = path.join(rootDir, 'apps/web/src/app/AppShell.tsx');
const appShellContent = fs.readFileSync(appShellPath, 'utf8');

assert(
  appShellContent.includes('currentActiveResult={result}'),
  'AppShell must pass currentActiveResult to CampaignStrategistWorkspace'
);
assert(
  appShellContent.includes('onClearActiveResult={() => setResult(null)}'),
  'AppShell must pass onClearActiveResult to CampaignStrategistWorkspace'
);
console.log('✅ AppShell.tsx verified successfully.\n');

// 5. Verify backend campaignStrategyService.ts logs to history_logs
console.log('5. Checking campaignStrategyService.ts...');
const backendServicePath = path.join(rootDir, 'apps/api/src/modules/campaigns/campaignStrategyService.ts');
const backendServiceContent = fs.readFileSync(backendServicePath, 'utf8');

assert(
  backendServiceContent.includes('historyRepository.addHistory'),
  'Backend synthesizeStrategy must call historyRepository.addHistory'
);
assert(
  backendServiceContent.includes("gemId: 'campaign-strategist-y'"),
  'Backend history item must use gemId campaign-strategist-y'
);
console.log('✅ campaignStrategyService.ts verified successfully.\n');

// 6. Verify CampaignProcessLoader.tsx overhaul
console.log('6. Checking CampaignProcessLoader.tsx...');
const loaderPath = path.join(rootDir, 'apps/web/src/features/campaigns/components/shared/CampaignProcessLoader.tsx');
const loaderContent = fs.readFileSync(loaderPath, 'utf8');

assert(
  loaderContent.includes('WORKFLOW_STEPS = ['),
  'Loader must define 5-stage workflow steps'
);
assert(
  loaderContent.includes('isCompleted'),
  'Loader stepper must calculate isCompleted step state'
);
assert(
  loaderContent.includes('isActive'),
  'Loader stepper must calculate isActive step state'
);
assert(
  loaderContent.includes('isPending'),
  'Loader stepper must calculate isPending step state'
);
assert(
  loaderContent.includes('text-xl font-extrabold'),
  'Loader must use scaled-up heading typography (text-xl)'
);
assert(
  loaderContent.includes('text-xs sm:text-sm font-semibold'),
  'Loader must use scaled-up live activity typography'
);
assert(
  loaderContent.includes('AI Strategic Engine Running'),
  'Loader must replace ambiguous deterministic verification with AI Strategic Engine Running'
);
assert(
  loaderContent.includes('elapsedSeconds > 15'),
  'Loader must show reassurance message when elapsedSeconds > 15'
);
assert(
  loaderContent.includes('onCancel'),
  'Loader must support onCancel recovery handler'
);
console.log('✅ CampaignProcessLoader.tsx verified successfully.\n');

// 7. Verify StrategyJourneyHeader.tsx
console.log('7. Checking StrategyJourneyHeader.tsx...');
const headerPath = path.join(rootDir, 'apps/web/src/features/campaigns/components/header/StrategyJourneyHeader.tsx');
const headerContent = fs.readFileSync(headerPath, 'utf8');

assert(
  headerContent.includes('Auto-Saved'),
  'Header must render Auto-Saved indicator'
);
assert(
  headerContent.includes('onOpenHistory'),
  'Header must accept onOpenHistory prop'
);
assert(
  headerContent.includes('onNewCampaign'),
  'Header must accept onNewCampaign prop'
);
console.log('✅ StrategyJourneyHeader.tsx verified successfully.\n');

console.log('🎉 ALL PERSISTENCE, HISTORY, AND LOADER AUDIT CHECKS PASSED PERFECTLY!');
