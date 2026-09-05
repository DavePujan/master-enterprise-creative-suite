/**
 * Video Generation Frontend Client.
 * Communicates with /api/video endpoints for generation dispatch, job status polling,
 * cancellation, Auto-Write director planning, and capability matrices.
 */

import { apiClient } from '../../../infrastructure/api/apiClient.js';
import {
  VideoGenerationRequest,
  VideoJob,
  VideoPlan,
  VideoEngineKey,
  VideoEngineCapability,
  VideoAutoWriteRequest
} from '../../../../../../packages/types/videoGeneration.js';

export class VideoClient {
  async generateVideo(request: VideoGenerationRequest): Promise<{ job: VideoJob }> {
    return apiClient.post<{ job: VideoJob }>('/api/video/generate', request);
  }

  async getJobStatus(jobId: string): Promise<{ job: VideoJob }> {
    return apiClient.get<{ job: VideoJob }>(`/api/video/jobs/${jobId}`);
  }

  async cancelJob(jobId: string): Promise<{ success: boolean; status: string; message: string }> {
    return apiClient.post<{ success: boolean; status: string; message: string }>(
      `/api/video/jobs/${jobId}/cancel`
    );
  }

  async editVideo(jobId: string, editInstruction: string): Promise<{ job: VideoJob }> {
    return apiClient.post<{ job: VideoJob }>(`/api/video/jobs/${jobId}/edit`, { editInstruction });
  }

  async extendVideo(jobId: string, durationSeconds?: number): Promise<{ job: VideoJob }> {
    return apiClient.post<{ job: VideoJob }>(`/api/video/jobs/${jobId}/extend`, { durationSeconds });
  }

  async generatePlan(request: VideoAutoWriteRequest): Promise<{ plan: VideoPlan }> {
    return apiClient.post<{ plan: VideoPlan }>('/api/video/plan', request);
  }

  async getCapabilities(): Promise<{ capabilities: Record<VideoEngineKey, VideoEngineCapability> }> {
    return apiClient.get<{ capabilities: Record<VideoEngineKey, VideoEngineCapability> }>(
      '/api/video/capabilities'
    );
  }
}

export const videoClient = new VideoClient();
