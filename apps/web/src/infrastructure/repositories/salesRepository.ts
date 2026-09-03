/**
 * Sales Submissions Repository.
 * Backed authoritatively by Supabase PostgreSQL (public.sales_leads) via /api/contact-sales.
 */

import { apiClient } from '../api/apiClient.js';
import type { SalesSubmission } from '@shared-types/user.js';

export async function submitSalesInquiry(
  _submissionId: string,
  data: SalesSubmission
): Promise<void> {
  try {
    await apiClient.post('/api/contact-sales', {
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      teamSize: data.teamSize,
      message: data.message
    });
  } catch (err) {
    console.warn('[SalesRepository] API submit error:', err);
  }
}

export function subscribeSalesSubmissions(
  _onData: (submissions: (SalesSubmission & { id: string })[]) => void,
  _onError?: (err: any) => void
): () => void {
  // Pure Supabase leads are managed directly via Supabase Dashboard / Admin APIs
  return () => {};
}

export async function updateSalesSubmissionStatus(_submissionId: string, _status: string): Promise<void> {
  // Managed directly in Supabase
}

export async function deleteSalesSubmission(_submissionId: string): Promise<void> {
  // Managed directly in Supabase
}
