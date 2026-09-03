/**
 * Sales Inquiry & Enterprise Leads Repository.
 * Direct persistence interface to public.sales_leads.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export interface SalesLeadInput {
  companyName: string;
  contactName: string;
  email: string;
  teamSize: string;
  message: string;
}

export interface SalesLeadRecord extends SalesLeadInput {
  id: string;
  status: "new" | "contacted" | "qualified" | "closed" | "archived";
  createdAt: string;
  updatedAt: string;
}

export class SalesRepository {
  async createLead(lead: SalesLeadInput): Promise<SalesLeadRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return {
        id: `mock_lead_${Date.now()}`,
        ...lead,
        status: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from("sales_leads")
      .insert({
        company_name: lead.companyName,
        contact_name: lead.contactName,
        email: lead.email,
        team_size: lead.teamSize,
        message: lead.message,
        status: "new",
      })
      .select()
      .single();

    if (error || !data) {
      console.error("SalesRepository.createLead error:", error);
      return null;
    }

    return {
      id: data.id,
      companyName: data.company_name,
      contactName: data.contact_name,
      email: data.email,
      teamSize: data.team_size,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const salesRepository = new SalesRepository();
