/**
 * Google Omni 1.1 Flash Payload Builder.
 * Prepares semantic prompt compilation and parameters for the Google Interactions API.
 * Enforces negative constraint embedding and conversational edit preservation.
 */

import { VideoGenerationRequest } from '../../../../../../packages/types/videoGeneration.js';
import { videoAssetResolver, ResolvedAsset } from '../videoAssetResolver.js';

export interface OmniInteractionPayload {
  model: string;
  input: Array<{
    type?: string;
    text?: string;
    media?: {
      mime_type: string;
      data?: string;
      uri?: string;
    };
  }>;
  previous_interaction_id?: string;
  store: boolean;
  response_format?: {
    type: 'video';
    delivery?: 'uri';
  };
}

export class OmniPayloadBuilder {
  /**
   * Compiles the visual prompt with integrated negative constraints and edit invariants.
   */
  compilePrompt(request: VideoGenerationRequest): string {
    const parts: string[] = [];

    // If conversational editing mode
    if (request.mode === 'edit_video' && request.editInstruction) {
      let editCmd = request.editInstruction.trim();
      // Ensure preservation phrase if targeted edit
      if (!editCmd.toLowerCase().includes('keep everything else')) {
        editCmd += '. Keep everything else the same.';
      }
      parts.push(editCmd);
    } else {
      // Base visual prompt
      parts.push(request.prompt.trim());

      // Audio intent directive if requested
      if (request.audioIntent && request.audioIntent !== 'none') {
        const audioMap: Record<string, string> = {
          ambient: 'Include atmospheric natural environmental ambient sound matching the scene.',
          music: 'Include cinematic background musical score matching the rhythm and tone.',
          sfx: 'Include synchronized Foley and realistic sound effects for actions.',
          dialogue: 'Include clear, natural spoken character dialogue.',
          dialogue_sfx: 'Include synchronized character dialogue and rich Foley sound effects.',
          cinematic_soundscape: 'Include a full cinematic soundscape with synchronized dialogue, orchestral music, and dynamic Foley.'
        };
        const directive = audioMap[request.audioIntent];
        if (directive) {
          parts.push(`Audio Direction: ${directive}`);
        }
      }

      // Multi-scene timing if provided
      if (request.scenes && request.scenes.length > 0) {
        const sceneScript = request.scenes.map((s, idx) =>
          `[Scene ${idx + 1} (${s.timeRange || s.durationSeconds + 's'})]: ${s.description}. Camera: ${s.camera}. Action: ${s.subjectAction}.`
        ).join(' ');
        parts.push(`Shot Sequence: ${sceneScript}`);
      }
    }

    // Embed negative constraints naturally into the text
    const defaultNegativeConstraints = [
      'No sudden camera glitches',
      'no morphing anatomy',
      'no frame stutter',
      'no text artifacts',
      'no watermark'
    ];
    parts.push(`Quality Constraints: ${defaultNegativeConstraints.join(', ')}.`);

    return parts.join('\n\n');
  }

  /**
   * Builds the full Omni Interaction API submission payload.
   */
  async build(request: VideoGenerationRequest, workspaceId: string): Promise<OmniInteractionPayload> {
    const compiledText = this.compilePrompt(request);
    const inputParts: OmniInteractionPayload['input'] = [
      { text: compiledText }
    ];

    // Resolve reference images or conditioning assets if present
    if (request.references && request.references.length > 0) {
      for (const ref of request.references.slice(0, 3)) {
        const resolved: ResolvedAsset | null = await videoAssetResolver.resolveAsBuffer(ref.assetId, workspaceId);
        if (resolved?.buffer) {
          inputParts.push({
            media: {
              mime_type: resolved.mimeType,
              data: resolved.buffer.toString('base64')
            }
          });
        }
      }
    } else if (request.startFrameAssetId) {
      const resolved = await videoAssetResolver.resolveAsBuffer(request.startFrameAssetId, workspaceId);
      if (resolved?.buffer) {
        inputParts.push({
          media: {
            mime_type: resolved.mimeType,
            data: resolved.buffer.toString('base64')
          }
        });
      }
    }

    const payload: OmniInteractionPayload = {
      model: 'gemini-omni-1.1-flash',
      input: inputParts,
      store: true, // Always store=true so subsequent previous_interaction_id follow-up edits work
      response_format: {
        type: 'video',
        delivery: 'uri'
      }
    };

    if (request.previousInteractionId) {
      payload.previous_interaction_id = request.previousInteractionId;
    }

    return payload;
  }
}

export const omniPayloadBuilder = new OmniPayloadBuilder();
