import type {
  CreateLeadInput,
  CreateLeadResult,
  CreateProviderInput,
  Health,
  Lead,
  LeadActionResult,
  LeadSuggestionsResult,
  Provider,
  SosAnalyticsFilters,
  SosAnalyticsResponse,
  UpdateLeadInput,
  UpdateProviderInput,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    // Network-level failure (backend down, CORS, DNS).
    throw new ApiError('Cannot reach the API. Is the backend running on :3000?', 0);
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

function toQueryString(filters: SosAnalyticsFilters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  apiUrl: API_URL,

  getHealth: () => request<Health>('/health'),

  listProviders: () => request<{ providers: Provider[] }>('/providers').then((r) => r.providers),

  createProvider: (input: CreateProviderInput) =>
    request<{ provider: Provider }>('/providers', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.provider),

  updateProvider: (id: string, input: UpdateProviderInput) =>
    request<{ provider: Provider }>(`/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then((r) => r.provider),

  listLeads: () => request<{ leads: Lead[] }>('/leads').then((r) => r.leads),

  getLeadSuggestions: (id: string) =>
    request<LeadSuggestionsResult>(`/leads/${id}/suggestions`),

  createLead: (input: CreateLeadInput) =>
    request<CreateLeadResult>('/leads', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateLead: (id: string, input: UpdateLeadInput) =>
    request<{ lead: Lead }>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then((r) => r.lead),

  assignLead: (id: string, providerId: string) =>
    request<LeadActionResult>(`/leads/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ providerId }),
    }),

  retryLeadNotification: (id: string) =>
    request<LeadActionResult>(`/leads/${id}/retry`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  closeLead: (id: string, resolutionStatus: string) =>
    request<{ lead: Lead }>(`/leads/${id}/close`, {
      method: 'PATCH',
      body: JSON.stringify({ resolutionStatus }),
    }).then((r) => r.lead),

  getSosAnalytics: (filters: SosAnalyticsFilters) =>
    request<SosAnalyticsResponse>(`/analytics/sos${toQueryString(filters)}`),
};
