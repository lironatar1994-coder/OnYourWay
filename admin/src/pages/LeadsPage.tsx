import { AlertTriangle, CheckCircle2, Plus, RotateCcw, Search, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { ApiError } from '../api/client';
import {
  useAssignLead,
  useCloseLead,
  useLeadSuggestions,
  useLeads,
  useRetryLeadNotification,
  useUpdateLead,
} from '../api/hooks';
import { DataTable, type Column } from '../components/DataTable';
import { Drawer } from '../components/Drawer';
import { NewLeadForm } from '../components/NewLeadForm';
import { LeadSourceBadge, LeadStatusBadge, WhatsAppBadge } from '../components/StatusBadge';
import { SuggestionList } from '../components/SuggestionList';
import { formatRelative, formatTime } from '../lib/format';
import type { Lead, LeadStatus } from '../api/types';

const FILTERS: { key: 'ALL' | LeadStatus; label: string }[] = [
  { key: 'ALL', label: 'הכול' },
  { key: 'NEW', label: 'חדש' },
  { key: 'ASSIGNED', label: 'שויכו' },
  { key: 'UNASSIGNED', label: 'ללא שיוך' },
  { key: 'CLOSED', label: 'סגור' },
];

function getLeadQueueWeight(lead: Lead) {
  const failedDispatch = lead.assignments?.some((a) => a.notificationStatus === 'FAILED');
  const needsInformation = lead.source === 'phone-call' && !lead.requestText?.trim();

  if (failedDispatch) return 0;
  if (needsInformation) return 1;
  if (lead.status === 'NEW' || lead.status === 'UNASSIGNED') return 2;
  if (lead.status === 'ASSIGNED') return 3;
  return 4;
}

function getLeadRowClassName(lead: Lead) {
  const failedDispatch = lead.assignments?.some((a) => a.notificationStatus === 'FAILED');
  const needsInformation = lead.source === 'phone-call' && !lead.requestText?.trim();

  if (failedDispatch) return 'lead-row priority-failed-dispatch';
  if (needsInformation) return 'lead-row priority-needs-info';
  if (lead.status === 'NEW' || lead.status === 'UNASSIGNED') return 'lead-row priority-unassigned';
  return 'lead-row';
}

function LeadDetail({ lead }: { lead: Lead }) {
  const [serviceType, setServiceType] = useState(lead.serviceType ?? '');
  const [requestText, setRequestText] = useState(lead.requestText ?? '');
  const [allowSuggestions, setAllowSuggestions] = useState(
    !(lead.source === 'phone-call' && !lead.requestText?.trim()),
  );
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data, isLoading, isFetching } = useLeadSuggestions(allowSuggestions ? lead.id : null);
  const updateLead = useUpdateLead();
  const assignLead = useAssignLead();
  const retryLeadNotification = useRetryLeadNotification();
  const closeLead = useCloseLead();
  const assignment =
    lead.assignments?.find((a) => a.providerId === lead.assignedProviderId) ?? lead.assignments?.[0];
  const needsInformation = lead.source === 'phone-call' && !lead.requestText?.trim();
  const editFormId = `lead-edit-${lead.id}`;
  const isClosed = lead.status === 'CLOSED';
  const retryAllowed =
    Boolean(lead.assignedProviderId) &&
    (assignment?.notificationStatus === 'FAILED' || assignment?.notificationStatus === 'SKIPPED');
  const busy =
    updateLead.isPending ||
    assignLead.isPending ||
    retryLeadNotification.isPending ||
    closeLead.isPending;

  useEffect(() => {
    setServiceType(lead.serviceType ?? '');
    setRequestText(lead.requestText ?? '');
    setAllowSuggestions(!(lead.source === 'phone-call' && !lead.requestText?.trim()));
    setError(null);
    setMessage(null);
    setResolutionStatus(lead.resolutionStatus ?? 'RESOLVED');
  }, [lead.id, lead.requestText, lead.resolutionStatus, lead.serviceType, lead.source]);

  async function saveAndFindProvider(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!serviceType.trim() || !requestText.trim()) {
      setError('יש למלא סוג שירות ותיאור פנייה לפני קבלת הצעות ספקים.');
      return;
    }

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        input: {
          serviceType: serviceType.trim(),
          requestText: requestText.trim(),
        },
      });
      setMessage('הפנייה נשמרה. הצעות הספקים מתרעננות.');
      setAllowSuggestions(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'עדכון הפנייה נכשל.');
    }
  }

  async function assignProvider(providerId: string) {
    setError(null);
    setMessage(null);

    try {
      await assignLead.mutateAsync({ id: lead.id, providerId });
      setMessage('הספק שויך ונשלחה בקשת WhatsApp.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שיוך הספק נכשל.');
    }
  }

  async function retrySend() {
    setError(null);
    setMessage(null);

    try {
      await retryLeadNotification.mutateAsync({ id: lead.id });
      setMessage('שליחת WhatsApp הופעלה מחדש.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ניסיון השליחה נכשל.');
    }
  }

  async function closeTicket() {
    setError(null);
    setMessage(null);

    try {
      await closeLead.mutateAsync({
        id: lead.id,
        resolutionStatus,
      });
      setMessage('הטיפול נסגר.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'סגירת הטיפול נכשלה.');
    }
  }

  return (
    <div className="lead-detail-content">
      {needsInformation ? (
        <div className="banner warn">
          <AlertTriangle size={15} />
          דרוש מידע: יש למלא סוג שירות ותיאור הפנייה לפני התאמת ספקים.
        </div>
      ) : null}

      <div className="subhead">פרטי לקוח</div>
      <dl className="detail-grid">
        <dt>שם</dt>
        <dd className="cell-strong">{lead.fullName}</dd>
        <dt>טלפון</dt>
        <dd className="mono">{lead.phoneNumber}</dd>
        {lead.email ? (
          <>
            <dt>אימייל</dt>
            <dd>{lead.email}</dd>
          </>
        ) : null}
        <dt>שירות</dt>
        <dd>{lead.serviceType || <span className="muted-text">דרוש סוג שירות</span>}</dd>
        {lead.city ? (
          <>
            <dt>עיר</dt>
            <dd>{lead.city}</dd>
          </>
        ) : null}
        <dt>סטטוס</dt>
        <dd>
          <LeadStatusBadge status={lead.status} />
        </dd>
        <dt>נוצר</dt>
        <dd>{formatTime(lead.createdAt)}</dd>
        {lead.source ? (
          <>
            <dt>מקור</dt>
            <dd>
              <LeadSourceBadge source={lead.source} />
            </dd>
          </>
        ) : null}
      </dl>

      <form id={editFormId} className="form-grid compact-form" onSubmit={saveAndFindProvider}>
        {error ? <div className="banner error">{error}</div> : null}
        {message ? <div className="banner success">{message}</div> : null}

        <div className="field">
          <label>סוג שירות</label>
          <input
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="אינסטלציה"
          />
        </div>

        <div className="field">
          <label>תיאור הפנייה</label>
          <textarea
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="האסלה דולפת ודרוש תיקון דחוף."
          />
          <span className="hint">משולב עם פרופיל השירות של הספק לדירוג מומחים.</span>
        </div>

      </form>

      {lead.requestText ? (
        <>
          <div className="subhead">תיאור הפנייה</div>
          <div className="notebox">{lead.requestText}</div>
        </>
      ) : null}
      {lead.notes ? (
        <>
          <div className="subhead">הערות פנימיות</div>
          <div className="notebox">{lead.notes}</div>
        </>
      ) : null}

      <div className="subhead">ספק משויך ושיגור וואטסאפ</div>
      {lead.assignedProvider && assignment ? (
        <dl className="detail-grid">
          <dt>ספק</dt>
          <dd className="cell-strong">{lead.assignedProvider.name}</dd>
          <dt>וואטסאפ</dt>
          <dd>
            <div className="inline-action-row">
              <WhatsAppBadge
                status={assignment.notificationStatus}
                error={assignment.notificationError}
              />
              {retryAllowed ? (
                <button
                  type="button"
                  className="btn sm"
                  disabled={busy}
                  onClick={retrySend}
                >
                  {retryLeadNotification.isPending ? <span className="spinner" /> : <RotateCcw size={13} />}
                  נסה שוב
                </button>
              ) : null}
            </div>
          </dd>
          <dt>נוסה בשעה</dt>
          <dd>{formatTime(assignment.notificationAttemptedAt)}</dd>
          {assignment.notifiedAt ? (
            <>
              <dt>נמסר</dt>
              <dd>{formatTime(assignment.notifiedAt)}</dd>
            </>
          ) : null}
          {assignment.notificationError ? (
            <>
              <dt>שגיאה</dt>
              <dd style={{ color: 'var(--danger)' }}>{assignment.notificationError}</dd>
            </>
          ) : null}
        </dl>
      ) : (
        <div className="muted-text">לא שויך ספק לקריאה זו.</div>
      )}

      <div className="subhead">הצעות ספקים מדורגות</div>
      {!allowSuggestions ? (
        <div className="empty compact-empty">
          שמור את פרטי השיחה כדי לקבל הצעות ספקים חכמות.
        </div>
      ) : isLoading || isFetching ? (
        <div className="loading-row">
          <span className="spinner" /> מדרג ספקים…
        </div>
      ) : (
        <SuggestionList
          suggestions={data?.providerSuggestions ?? []}
          assignedProviderId={lead.assignedProviderId}
          assigningProviderId={assignLead.variables?.providerId}
          disabled={busy || isClosed}
          onAssign={assignProvider}
        />
      )}
      <div className="lead-action-footer">
        <button
          type="submit"
          form={editFormId}
          className="btn primary"
          disabled={busy || !serviceType.trim() || !requestText.trim() || isClosed}
        >
          {updateLead.isPending ? <span className="spinner" /> : <CheckCircle2 size={14} />}
          שמירה ומציאת ספק
        </button>
        <div className="footer-close-group">
          <select
            className="footer-select"
            value={resolutionStatus}
            disabled={busy || isClosed}
            onChange={(e) => setResolutionStatus(e.target.value)}
          >
            <option value="RESOLVED">טופל</option>
            <option value="CANCELLED">בוטל</option>
          </select>
          <button
            type="button"
            className="btn danger"
            disabled={busy || isClosed}
            onClick={closeTicket}
          >
            {closeLead.isPending ? <span className="spinner" /> : <XCircle size={14} />}
            סגור טיפול
          </button>
        </div>
      </div>
    </div>
  );
}

export function LeadsPage() {
  const { data, isLoading } = useLeads();
  const [filter, setFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const leads = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter !== 'ALL' && l.status !== filter) return false;
      if (!q) return true;
      return [l.fullName, l.phoneNumber, l.serviceType, l.city, l.requestText]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    }).sort((a, b) => {
      const weightDiff = getLeadQueueWeight(a) - getLeadQueueWeight(b);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, filter, search]);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const columns: Column<Lead>[] = [
    {
      key: 'customer',
      header: 'לקוח',
      render: (l) => (
        <>
          <span className="cell-strong">{l.fullName}</span>
          <span className="cell-sub mono">{l.phoneNumber}</span>
        </>
      ),
    },
    {
      key: 'source',
      header: 'מקור',
      render: (l) => <LeadSourceBadge source={l.source} />,
    },
    {
      key: 'service',
      header: 'שירות',
      render: (l) => (
        <>
          {l.serviceType || <span className="muted-text">דרוש מידע</span>}
          {l.city ? <span className="cell-sub">{l.city}</span> : null}
        </>
      ),
    },
    { key: 'status', header: 'סטטוס', render: (l) => <LeadStatusBadge status={l.status} /> },
    {
      key: 'provider',
      header: 'ספק',
      render: (l) =>
        l.assignedProvider ? (
          l.assignedProvider.name
        ) : (
          <span className="muted-text">ללא שיוך</span>
        ),
    },
    {
      key: 'wa',
      header: 'וואטסאפ',
      render: (l) => (
        <WhatsAppBadge
          status={l.assignments?.[0]?.notificationStatus}
          error={l.assignments?.[0]?.notificationError}
        />
      ),
    },
    {
      key: 'created',
      header: 'נוצר',
      render: (l) => <span className="muted-text">{formatRelative(l.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <div className="toolbar">
        <div className="segmented">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? 'active' : ''}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="search">
          <Search size={14} />
          <input
            placeholder="חיפוש לפי שם, טלפון, שירות, עיר, תיאור…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <span className="count muted-text">{filtered.length} מוצגות</span>
        <button className="btn primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> פנייה חדשה
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(l) => l.id}
        onRowClick={(l) => setSelectedId(l.id)}
        rowClassName={getLeadRowClassName}
        selectedId={selectedId}
        isLoading={isLoading}
        emptyLabel="אין פניות תואמות — שנה סינון או קלוט פנייה חדשה."
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.fullName ?? 'קריאה'}
        subtitle={
          selected
            ? `${selected.serviceType || 'דרוש מידע'}${selected.city ? ` · ${selected.city}` : ''}`
            : ''
        }
      >
        {selected ? <LeadDetail lead={selected} /> : null}
      </Drawer>

      <Drawer
        open={creating}
        onClose={() => setCreating(false)}
        title="פנייה חדשה"
        subtitle="קליטת פנייה וניתוב אוטומטי לספק"
      >
        <NewLeadForm onClose={() => setCreating(false)} />
      </Drawer>
    </div>
  );
}
