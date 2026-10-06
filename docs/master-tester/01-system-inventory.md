# Master Tester: 01 — System Inventory & Test Environment

## Environment Topology
- **Operating System**: Windows 11 (PowerShell terminal)
- **Node.js**: v24.19.0
- **Frontend Stack**: React 19, Tailwind CSS v4, Vite 6, Lucide React
- **Backend Stack**: Node.js Express 4.21, TypeScript, ESBuild, Supabase PostgreSQL, PG pool
- **AI Infrastructure**:
  - Google Gemini API (`@google/genai` v2.21) with Multi-Key Pool (`AIzaSy...`)
  - Models: `gemini-3.8-flash` (Primary GA), `gemini-3.7-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-2.5-flash` (Legacy Fallback)
  - Tool Grounding: Google Search Grounding with Dynamic Retrieval
- **Active Ports & Runtimes**:
  - Express + Vite dev server running on `http://localhost:3000`
  - PostgreSQL database connection: Supabase Pooler (`db.nrhgieqxsedurkpgvdhd.supabase.co:5432`)
- **Key Modules in Scope**:
  - Frontend:
    - [`apps/web/src/features/campaigns/components/CampaignStrategistWorkspace.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/features/campaigns/components/CampaignStrategistWorkspace.tsx)
    - [`apps/web/src/features/campaigns/context/CampaignStrategyContext.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/features/campaigns/context/CampaignStrategyContext.tsx)
    - Stage components: `BriefStage.tsx`, `DiscoveryStage.tsx`, `TerritoryStage.tsx`, `StrategyStage.tsx`, `ActivationStage.tsx`
    - [`apps/web/src/features/video/components/directors-plan/DirectorsPlanWorkspace.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/features/video/components/directors-plan/DirectorsPlanWorkspace.tsx)
  - Backend:
    - [`apps/api/src/modules/campaigns/campaignRoutes.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/modules/campaigns/campaignRoutes.ts)
    - [`apps/api/src/modules/campaigns/campaignStrategyService.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/modules/campaigns/campaignStrategyService.ts)
    - [`apps/api/src/modules/campaigns/campaignDiscoveryEngine.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/modules/campaigns/campaignDiscoveryEngine.ts)
    - [`apps/api/src/modules/campaigns/campaignTerritoryEngine.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/modules/campaigns/campaignTerritoryEngine.ts)
    - [`apps/api/src/modules/campaigns/campaignStrategyCompiler.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/modules/campaigns/campaignStrategyCompiler.ts)
    - [`apps/api/src/modules/campaigns/campaignDownstreamOrchestrator.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/modules/campaigns/campaignDownstreamOrchestrator.ts)
    - [`apps/api/src/modules/adDirector/repositories/videoAdProjectRepository.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/modules/adDirector/repositories/videoAdProjectRepository.ts)
