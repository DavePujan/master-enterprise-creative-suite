/**
 * Brand Guidelines Repository.
 * Direct persistence interface to public.brand_guidelines.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";
import type { BrandGuidelines } from "@shared-types/brand.js";

export interface BrandGuidelineRow {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  industry: string;
  tone: string;
  pillars: string[];
  colors: string[];
  typography: { primary: string; secondary: string };
  logo_storage_path?: string | null;
  logo_description?: string | null;
  location?: string | null;
  voice_accent_style?: string | null;
  visual_ethnicity_style?: string | null;
  mission?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export class BrandRepository {
  /**
   * Retrieves the default brand guidelines for a workspace.
   */
  async getDefaultGuidelines(workspaceId: string): Promise<BrandGuidelines | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    const { data, error } = await supabase
      .from("brand_guidelines")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_default", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("BrandRepository.getDefaultGuidelines error:", error);
      throw new Error(`Failed to load brand guidelines: ${error.message}`);
    }

    if (!data) return null;

    return {
      name: data.name,
      industry: data.industry || "",
      tone: data.tone || "",
      pillars: Array.isArray(data.pillars) ? data.pillars : [],
      colors: Array.isArray(data.colors) ? data.colors : [],
      typography: data.typography || { primary: "Inter", secondary: "Inter" },
      logo: data.logo_storage_path || undefined,
      logoDescription: data.logo_description || undefined,
      location: data.location || undefined,
      voiceAccentStyle: data.voice_accent_style || undefined,
      visualEthnicityStyle: data.visual_ethnicity_style || undefined,
      mission: data.mission || undefined,
      updatedAt: new Date(data.updated_at).getTime()
    };
  }

  /**
   * Saves or updates the brand guidelines for a workspace.
   */
  async saveDefaultGuidelines(
    workspaceId: string,
    userId: string,
    guidelines: BrandGuidelines
  ): Promise<BrandGuidelineRow> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    // Check if a default guideline already exists
    const { data: existing } = await supabase
      .from("brand_guidelines")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("is_default", true)
      .maybeSingle();

    const payload = {
      workspace_id: workspaceId,
      created_by: userId,
      name: guidelines.name || "Default Brand",
      industry: guidelines.industry || "",
      tone: guidelines.tone || "",
      pillars: guidelines.pillars || [],
      colors: guidelines.colors || [],
      typography: guidelines.typography || { primary: "Inter", secondary: "Inter" },
      logo_storage_path: guidelines.logo || null,
      logo_description: guidelines.logoDescription || null,
      location: guidelines.location || null,
      voice_accent_style: guidelines.voiceAccentStyle || null,
      visual_ethnicity_style: guidelines.visualEthnicityStyle || null,
      mission: guidelines.mission || null,
      is_default: true,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      const { data, error } = await supabase
        .from("brand_guidelines")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();

      if (error || !data) {
        console.error("BrandRepository.saveDefaultGuidelines update error:", error);
        throw new Error(`Failed to update brand guidelines: ${error?.message}`);
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from("brand_guidelines")
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        console.error("BrandRepository.saveDefaultGuidelines insert error:", error);
        throw new Error(`Failed to insert brand guidelines: ${error?.message}`);
      }
      return data;
    }
  }
}

export const brandRepository = new BrandRepository();
