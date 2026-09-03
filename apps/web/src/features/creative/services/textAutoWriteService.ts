/**
 * Client Service for Text & Caption Auto-Write Creative Idea Engine.
 * Sends user intent, active brand guidelines, voice emotion, and product context
 * to the backend AI Senior Copywriter service.
 */

import { apiClient } from "../../../infrastructure/api/apiClient.js";
import type {
  TextAutoWriteRequest,
  TextAutoWriteResponse,
} from "@shared-types/textAutoWrite.js";

/**
 * Dispatches a request to generate a structured social caption idea and platform copy.
 */
export async function generateTextAutoWriteIdea(
  request: TextAutoWriteRequest
): Promise<TextAutoWriteResponse> {
  return apiClient.post<TextAutoWriteResponse>(
    "/api/text/autowrite",
    request
  );
}
