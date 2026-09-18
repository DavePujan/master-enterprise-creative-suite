/**
 * Writopedia Ad Director Engine
 * Canonical internal representation, validation, capability evaluation,
 * and compilation interfaces for structured advertising plans.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

export * from './validation/validator.js';
export * from './revision/patchEngine.js';
export * from './capabilities/capabilityValidator.js';
export * from './compiler/compilerContract.js';

// AdSpec v1 Canonical Modules
export * from './adspec/validator.js';
export * from './adspec/revisionEngine.js';
export * from './adspec/snapshotEngine.js';
export * from './adspec/legacyAdapter.js';

// Operation-Based AI Boundary & Orchestration
export * from './operations/approvalPolicy.js';
export * from './operations/changeImpact.js';
export * from './operations/continuitySupervisor.js';
export * from './operations/operationValidator.js';
export * from './operations/stateManager.js';
export * from './stages/orchestrator.js';

// Phase 6: Model Capability Registry, AdSpec Capability Validator, & Prompt Compiler
export * from './capabilities/modelCapabilityRegistry.js';
export * from './capabilities/adSpecCapabilityValidator.js';
export * from './compiler/adSpecPromptCompiler.js';

// Phase 9: Video QA Engine, Plan-vs-Result Evaluator, & Repair Planner
export * from './qa/qaPlanExtractor.js';
export * from './qa/technicalValidator.js';
export * from './qa/visualQaEvaluator.js';
export * from './qa/repairPlanner.js';

// Phase 10: Assembly Specification, Pre-Flight Validator, & FFmpeg Pipeline
export * from './assembly/assemblySpecBuilder.js';
export * from './assembly/assemblyValidator.js';
export * from './assembly/ffmpegPipeline.js';


