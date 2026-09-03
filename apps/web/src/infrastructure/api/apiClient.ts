/**
 * Centralized Authenticated API Client.
 * Automatically attaches Supabase JWT Bearer token to all outgoing API requests.
 */

import { getCurrentAccessToken } from '../supabase/auth.js';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClient {
  private async getAuthToken(): Promise<string | null> {
    try {
      const supaToken = await getCurrentAccessToken();
      if (supaToken) {
        return supaToken;
      }
    } catch (err) {
      console.warn("[ApiClient] Failed to obtain Supabase access token:", err);
    }
    return null;
  }

  private async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers = {}, ...rest } = options;

    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const token = await this.getAuthToken();
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    };

    const res = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
    });

    if (!res.ok) {
      let errData: any;
      try {
        errData = await res.json();
      } catch {
        errData = { error: res.statusText || `Request failed with status ${res.status}` };
      }

      console.error(`[ApiClient Error] ${rest.method || 'GET'} ${url} -> ${res.status}:`, errData);

      const errorMessage = errData?.error || errData?.message || `HTTP ${res.status}: ${res.statusText || 'Request failed'}`;
      const error: any = new Error(errorMessage);
      error.status = res.status;
      error.code = errData?.code || res.status;
      error.data = errData;
      throw error;
    }

    return await res.json();
  }

  get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
