/**
 * Prompt Compiler Application Service.
 * Coordinates model capability discovery, pre-flight compatibility evaluation,
 * and provider-neutral execution payload compilation for Canonical AdSpec.
 */

import {
  getModelCapability,
  getAllModelCapabilities,
  getModelsByProvider,
  adSpecCapabilityValidator,
  adSpecPromptCompiler,
  PromptCompilerOptions
} from '../../../../../../packages/ad-director/index.js';
import type {
  ModelCapability,
  ProjectCompatibilityReport,
  ShotCompatibilityReport,
  AdProjectExecutionPlan,
  CompiledShotExecutionPayload,
  VideoProviderId
} from '@contracts/modelCapabilityContracts.js';
import { videoAdProjectRepository } from '../repositories/videoAdProjectRepository.js';

export class PromptCompilerService {
  /**
   * Lists all available video generation models and their capabilities.
   */
  public listModels(provider?: VideoProviderId): ModelCapability[] {
    if (provider) {
      return getModelsByProvider(provider);
    }
    return getAllModelCapabilities();
  }

  /**
   * Retrieves specific model capability by modelId.
   */
  public getModel(modelId: string): ModelCapability {
    return getModelCapability(modelId);
  }

  /**
   * Evaluates compatibility of an entire AdSpec project against a target model.
   */
  public async validateProjectCompatibility(
    projectId: string,
    workspaceId: string,
    modelId: string
  ): Promise<ProjectCompatibilityReport> {
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`Ad project "${projectId}" not found in workspace "${workspaceId}".`);
    }

    const capability = getModelCapability(modelId);
    return adSpecCapabilityValidator.validateProject(currentSpec, capability);
  }

  /**
   * Evaluates compatibility of an individual shot against a target model.
   */
  public async validateShotCompatibility(
    projectId: string,
    workspaceId: string,
    shotId: string,
    modelId: string
  ): Promise<ShotCompatibilityReport> {
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`Ad project "${projectId}" not found in workspace "${workspaceId}".`);
    }

    const shot = (currentSpec.shots || []).find(s => s.shotId === shotId);
    if (!shot) {
      throw new Error(`Shot "${shotId}" not found in project "${projectId}".`);
    }

    const capability = getModelCapability(modelId);
    return adSpecCapabilityValidator.validateShot(shot, currentSpec, capability);
  }

  /**
   * Compiles an AdProjectExecutionPlan for the project and target model.
   * Guarantees zero mutation to the creative AdSpec.
   */
  public async compileExecutionPlan(
    projectId: string,
    workspaceId: string,
    modelId: string,
    options: PromptCompilerOptions = {}
  ): Promise<AdProjectExecutionPlan> {
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`Ad project "${projectId}" not found in workspace "${workspaceId}".`);
    }

    const capability = getModelCapability(modelId);
    return adSpecPromptCompiler.compileProjectExecutionPlan(currentSpec, capability, options);
  }

  /**
   * Compiles a single shot execution payload.
   * Guarantees zero mutation to the creative AdSpec.
   */
  public async compileShotPayload(
    projectId: string,
    workspaceId: string,
    shotId: string,
    modelId: string,
    options: PromptCompilerOptions = {}
  ): Promise<CompiledShotExecutionPayload> {
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`Ad project "${projectId}" not found in workspace "${workspaceId}".`);
    }

    const shot = (currentSpec.shots || []).find(s => s.shotId === shotId);
    if (!shot) {
      throw new Error(`Shot "${shotId}" not found in project "${projectId}".`);
    }

    const capability = getModelCapability(modelId);
    return adSpecPromptCompiler.compileShot(shot, currentSpec, capability, options);
  }
}

export const promptCompilerService = new PromptCompilerService();
