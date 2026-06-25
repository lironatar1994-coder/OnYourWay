// Mirrors backend/prisma/schema.prisma. Keep in sync with the Express API.

export type LeadStatus = 'NEW' | 'ASSIGNED' | 'UNASSIGNED' | 'CLOSED';
export type LeadSource = 'web-form' | 'phone-call' | string;
export type AssignmentStatus = 'ASSIGNED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface Provider {
  id: string;
  name: string;
  phoneNumber: string;
  whatsappJid: string | null;
  category: string | null;
  serviceText: string | null;
  serviceArea: string | null;
  priority: number;
  dailyLeadLimit: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAssignment {
  id: string;
  leadId: string;
  providerId: string;
  status: AssignmentStatus;
  notificationStatus: NotificationStatus;
  notificationError: string | null;
  notificationAttemptedAt: string | null;
  notifiedAt: string | null;
  createdAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
}

export interface Lead {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  serviceType: string | null;
  requestText: string | null;
  city: string | null;
  notes: string | null;
  resolutionStatus: string | null;
  source: LeadSource | null;
  status: LeadStatus;
  assignedProviderId: string | null;
  assignedProvider?: Provider | null;
  assignments?: LeadAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderSuggestion {
  provider: Provider;
  reasons: string[];
  score: number;
}

export interface Health {
  status: string;
  service: string;
}

// Request payloads
export interface CreateProviderInput {
  name: string;
  phoneNumber: string;
  whatsappJid?: string;
  category?: string;
  serviceText?: string;
  serviceArea?: string;
  priority?: number;
  dailyLeadLimit?: number;
  isActive?: boolean;
}

export type UpdateProviderInput = Partial<CreateProviderInput>;

export interface CreateLeadInput {
  fullName: string;
  phoneNumber: string;
  serviceType: string;
  email?: string;
  requestText?: string;
  city?: string;
  notes?: string;
  source?: string;
}

export type UpdateLeadInput = Partial<
  Pick<
    Lead,
    'fullName' | 'phoneNumber' | 'email' | 'serviceType' | 'requestText' | 'city' | 'notes'
  >
>;

export interface CreateLeadResult {
  lead: Lead;
  assignment?: LeadAssignment;
  provider?: Provider;
  providerSuggestions: ProviderSuggestion[];
}

export interface LeadSuggestionsResult {
  lead: Lead;
  providerSuggestions: ProviderSuggestion[];
}

export interface LeadActionResult {
  assignment?: LeadAssignment;
  lead: Lead;
  provider?: Provider;
}
