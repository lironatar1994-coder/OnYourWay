import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLeads, useProviders } from '../api/hooks';
import { Metric, MetricStrip } from '../components/MetricStrip';
import { LeadStatusBadge, WhatsAppBadge } from '../components/StatusBadge';
import { formatRelative, isToday } from '../lib/format';
import type { NotificationStatus } from '../api/types';

export function Dashboard() {
  const navigate = useNavigate();
  const leadsQuery = useLeads();
  const providersQuery = useProviders();

  const leads = leadsQuery.data ?? [];
  const providers = providersQuery.data ?? [];

  const stats = useMemo(() => {
    const total = leads.length;
    const today = leads.filter((l) => isToday(l.createdAt)).length;
    const assigned = leads.filter((l) => l.status === 'ASSIGNED').length;
    const unassigned = leads.filter((l) => l.status === 'UNASSIGNED' || l.status === 'NEW').length;
    const activeProviders = providers.filter((p) => p.isActive).length;

    const wa: Record<NotificationStatus, number> = {
      SENT: 0,
      PENDING: 0,
      FAILED: 0,
      SKIPPED: 0,
    };
    for (const lead of leads) {
      for (const a of lead.assignments ?? []) {
        wa[a.notificationStatus] = (wa[a.notificationStatus] ?? 0) + 1;
      }
    }
    return { total, today, assigned, unassigned, activeProviders, wa };
  }, [leads, providers]);

  const recent = leads.slice(0, 10);
  const failed = stats.wa.FAILED;

  return (
    <div>
      {failed > 0 ? (
        <div className="banner error">
          <AlertTriangle size={15} />
          {failed} התראות וואטסאפ נכשלו במסירה — יש לבדוק את הקריאות המושפעות.
        </div>
      ) : null}

      <MetricStrip>
        <Metric label="סך הפניות" value={stats.total} foot={`${stats.today} נוצרו היום`} />
        <Metric label="שויכו" value={stats.assigned} accent="ok" foot="נותבו לספק" />
        <Metric
          label="ללא שיוך"
          value={stats.unassigned}
          accent={stats.unassigned > 0 ? 'warn' : undefined}
          foot="ממתינות להתאמה"
        />
        <Metric
          label="ספקים פעילים"
          value={stats.activeProviders}
          accent="info"
          foot={`${providers.length} סה״כ ברשת`}
        />
        <Metric
          label="שיגור וואטסאפ"
          value={stats.wa.SENT}
          foot={
            <span className="wa-breakdown">
              <span className="wa-chip" style={{ color: 'var(--warn)' }}>
                {stats.wa.PENDING} ממתינות
              </span>
              <span className="wa-chip" style={{ color: 'var(--danger)' }}>
                {stats.wa.FAILED} נכשלו
              </span>
              <span className="wa-chip" style={{ color: 'var(--muted)' }}>
                {stats.wa.SKIPPED} דולגו
              </span>
            </span>
          }
        />
      </MetricStrip>

      <div className="panel" style={{ padding: 'var(--sp-4)' }}>
        <div className="section-head">
          <h2>פניות אחרונות</h2>
          <button className="btn sm ghost" onClick={() => navigate('/leads')}>
            הצג הכול ←
          </button>
        </div>
        <div className="table-wrap" style={{ borderRadius: 'var(--radius)' }}>
          <table className="data">
            <thead>
              <tr>
                <th>לקוח</th>
                <th>שירות</th>
                <th>סטטוס</th>
                <th>ספק</th>
                <th>וואטסאפ</th>
                <th>מתי</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">אין עדיין פניות — קלוט פנייה מדף הנחיתה.</div>
                  </td>
                </tr>
              ) : (
                recent.map((lead) => {
                  const wa = lead.assignments?.[0]?.notificationStatus;
                  return (
                    <tr key={lead.id} onClick={() => navigate('/leads')}>
                      <td>
                        <span className="cell-strong">{lead.fullName}</span>
                        <span className="cell-sub">{lead.phoneNumber}</span>
                      </td>
                      <td>
                        {lead.serviceType}
                        {lead.city ? <span className="cell-sub">{lead.city}</span> : null}
                      </td>
                      <td>
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className={lead.assignedProvider ? '' : 'muted'}>
                        {lead.assignedProvider?.name ?? 'ללא שיוך'}
                      </td>
                      <td>
                        <WhatsAppBadge status={wa} error={lead.assignments?.[0]?.notificationError} />
                      </td>
                      <td className="muted">{formatRelative(lead.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
