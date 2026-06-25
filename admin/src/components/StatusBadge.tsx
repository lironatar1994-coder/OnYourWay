import { FileText, PhoneCall } from 'lucide-react';

import type { LeadStatus, NotificationStatus } from '../api/types';

type Variant = 'ok' | 'warn' | 'danger' | 'info' | 'muted';

function Badge({ variant, label, title }: { variant: Variant; label: string; title?: string }) {
  return (
    <span className={`badge ${variant}`} title={title}>
      <span className="dot" />
      {label}
    </span>
  );
}

const LEAD_MAP: Record<LeadStatus, { variant: Variant; label: string }> = {
  NEW: { variant: 'info', label: 'חדש' },
  ASSIGNED: { variant: 'ok', label: 'שויך' },
  UNASSIGNED: { variant: 'warn', label: 'ללא שיוך' },
  CLOSED: { variant: 'muted', label: 'סגור' },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { variant, label } = LEAD_MAP[status] ?? { variant: 'muted', label: status };
  return <Badge variant={variant} label={label} />;
}

export function LeadSourceBadge({ source }: { source: string | null | undefined }) {
  const isPhoneCall = source === 'phone-call';
  const Icon = isPhoneCall ? PhoneCall : FileText;
  const label = isPhoneCall ? 'שיחת טלפון' : 'טופס אתר';

  return (
    <span className={`badge ${isPhoneCall ? 'warn' : 'info'}`} title={source ?? label}>
      <Icon size={12} strokeWidth={2.2} />
      {label}
    </span>
  );
}

const WA_MAP: Record<NotificationStatus, { variant: Variant; label: string }> = {
  SENT: { variant: 'ok', label: 'נשלח' },
  PENDING: { variant: 'warn', label: 'ממתין' },
  FAILED: { variant: 'danger', label: 'נכשל' },
  SKIPPED: { variant: 'muted', label: 'דולג' },
};

export function WhatsAppBadge({
  status,
  error,
}: {
  status: NotificationStatus | null | undefined;
  error?: string | null;
}) {
  if (!status) return <span className="muted-text">—</span>;
  const { variant, label } = WA_MAP[status] ?? { variant: 'muted', label: status };
  return <Badge variant={variant} label={label} title={error ?? undefined} />;
}
