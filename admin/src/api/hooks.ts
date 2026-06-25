import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import type {
  CreateLeadInput,
  CreateProviderInput,
  UpdateLeadInput,
  UpdateProviderInput,
} from './types';

// Polling keeps the console live: async WhatsApp status flips PENDING -> SENT/FAILED/SKIPPED
// shortly after a lead is created, and new leads arrive from the public landing page.
const LIVE_REFETCH_MS = 5000;

export const queryKeys = {
  health: ['health'] as const,
  providers: ['providers'] as const,
  leads: ['leads'] as const,
  leadSuggestions: (id: string) => ['leads', id, 'suggestions'] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.getHealth,
    refetchInterval: LIVE_REFETCH_MS,
    retry: false,
  });
}

export function useProviders() {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: api.listProviders,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useLeads() {
  return useQuery({
    queryKey: queryKeys.leads,
    queryFn: api.listLeads,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useLeadSuggestions(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.leadSuggestions(id) : ['leads', 'none', 'suggestions'],
    queryFn: () => api.getLeadSuggestions(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProviderInput) => api.createProvider(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.providers }),
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProviderInput }) =>
      api.updateProvider(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.providers }),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) => api.createLead(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads });
      qc.invalidateQueries({ queryKey: queryKeys.providers });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLeadInput }) =>
      api.updateLead(id, input),
    onSuccess: (_lead, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads });
      qc.invalidateQueries({ queryKey: queryKeys.leadSuggestions(variables.id) });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, providerId }: { id: string; providerId: string }) =>
      api.assignLead(id, providerId),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads });
      qc.invalidateQueries({ queryKey: queryKeys.leadSuggestions(variables.id) });
    },
  });
}

export function useRetryLeadNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.retryLeadNotification(id),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads });
      qc.invalidateQueries({ queryKey: queryKeys.leadSuggestions(variables.id) });
    },
  });
}

export function useCloseLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionStatus }: { id: string; resolutionStatus: string }) =>
      api.closeLead(id, resolutionStatus),
    onSuccess: (_lead, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads });
      qc.invalidateQueries({ queryKey: queryKeys.leadSuggestions(variables.id) });
    },
  });
}
