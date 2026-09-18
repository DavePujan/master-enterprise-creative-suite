/**
 * Shared Reference Resolution Layer for Video Gem Provider Adapters.
 * Translates canonical CompiledReferenceBinding records into provider-specific
 * reference payloads (Google Veo, Fal.ai Kling/Runway, and Seedance-via-Fal).
 *
 * Guarantees zero leakage of provider specifics into AdSpec.
 */

import type { CompiledReferenceBinding } from '@contracts/providerAdapterContracts.js';

export interface GoogleVeoReferencePayload {
  firstFrameUrl?: string;
  referenceImageUrls: string[];
}

export interface FalReferencePayload {
  imageUrl?: string;
  tailImageUrl?: string;
  elementUrls: string[];
}

export interface SeedanceFalReferencePayload {
  firstFrameUrl?: string;
  characterImageUrls: string[];
  productImageUrls: string[];
  allReferenceUrls: string[];
}

export class AdapterReferenceResolver {
  /**
   * Resolves references into Google Veo format.
   * Google Veo accepts a primary first frame keyframe and supporting subject images.
   */
  public resolveForGoogleVeo(references: CompiledReferenceBinding[]): GoogleVeoReferencePayload {
    let firstFrameUrl: string | undefined;
    const referenceImageUrls: string[] = [];

    for (const ref of references) {
      if (ref.role === 'first_frame' && !firstFrameUrl) {
        firstFrameUrl = ref.url;
      } else if (ref.role === 'character_ref' || ref.role === 'product_ref' || ref.role === 'style_ref') {
        if (!referenceImageUrls.includes(ref.url)) {
          referenceImageUrls.push(ref.url);
        }
      }
    }

    return {
      firstFrameUrl,
      referenceImageUrls
    };
  }

  /**
   * Resolves references into Fal standard format (Kling 3.0, Runway Gen-3, Luma 1.6).
   * Supports image_url (start frame), tail_image_url (end frame), and element references.
   */
  public resolveForFal(references: CompiledReferenceBinding[]): FalReferencePayload {
    let imageUrl: string | undefined;
    let tailImageUrl: string | undefined;
    const elementUrls: string[] = [];

    for (const ref of references) {
      if (ref.role === 'first_frame' && !imageUrl) {
        imageUrl = ref.url;
      } else if (ref.role === 'last_frame' && !tailImageUrl) {
        tailImageUrl = ref.url;
      } else if (ref.role === 'character_ref' || ref.role === 'product_ref') {
        if (!elementUrls.includes(ref.url)) {
          elementUrls.push(ref.url);
        }
      }
    }

    return {
      imageUrl,
      tailImageUrl,
      elementUrls
    };
  }

  /**
   * Resolves references into Seedance 2.0 (via Fal.ai API) multimodal array format.
   * Supports up to 9 reference images categorized by character, product, and keyframe.
   */
  public resolveForSeedance(references: CompiledReferenceBinding[]): SeedanceFalReferencePayload {
    let firstFrameUrl: string | undefined;
    const characterImageUrls: string[] = [];
    const productImageUrls: string[] = [];
    const allReferenceUrls: string[] = [];

    for (const ref of references) {
      if (ref.role === 'first_frame' && !firstFrameUrl) {
        firstFrameUrl = ref.url;
      }

      if (ref.role === 'character_ref' && !characterImageUrls.includes(ref.url)) {
        characterImageUrls.push(ref.url);
      } else if (ref.role === 'product_ref' && !productImageUrls.includes(ref.url)) {
        productImageUrls.push(ref.url);
      }

      if (!allReferenceUrls.includes(ref.url) && allReferenceUrls.length < 9) {
        allReferenceUrls.push(ref.url);
      }
    }

    return {
      firstFrameUrl,
      characterImageUrls,
      productImageUrls,
      allReferenceUrls
    };
  }
}

export const adapterReferenceResolver = new AdapterReferenceResolver();
