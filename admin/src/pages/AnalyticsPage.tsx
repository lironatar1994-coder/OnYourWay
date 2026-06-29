import {
  Activity,
  BarChart3,
  Filter,
  MousePointerClick,
  Percent,
  ShieldCheck,
  Timer,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useSosAnalytics } from '../api/hooks';
import type { SosAnalyticsFilters } from '../api/types';
import { Metric, MetricStrip } from '../components/MetricStrip';

function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatMs(value: number | null) {
  if (value == null) return '-';
  if (value < 1000) return `${value}ms`;
  return `${Math.round((value / 1000) * 10) / 10}s`;
}

function formatDate(value: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('he-IL').format(value);
}

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<SosAnalyticsFilters>(
    () => ({
      service: searchParams.get('service') ?? undefined,
      city: searchParams.get('city') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }),
    [searchParams],
  );

  const analyticsQuery = useSosAnalytics(filters);
  const analytics = analyticsQuery.data;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();

    for (const key of ['service', 'city', 'source', 'from', 'to']) {
      const value = String(form.get(key) ?? '').trim();
      if (value) next.set(key, value);
    }

    setSearchParams(next);
  }

  return (
    <div>
      {analyticsQuery.isError ? (
        <div className="banner warn">
          <BarChart3 size={15} />
          אי אפשר לטעון כרגע את אנליטיקת דפי SOS. בדוק שהאתר הציבורי פעיל ושהבקאנד מחובר.
        </div>
      ) : null}

      <MetricStrip>
        <Metric
          label="ביקורים"
          value={compactNumber(analytics?.totals.visits ?? 0)}
          foot="צפיות בדפי SOS"
          accent="info"
        />
        <Metric
          label="ביקורים אנושיים"
          value={compactNumber(analytics?.totals.humanSignalVisits ?? 0)}
          foot="גלילה, מגע, מקלדת או שהייה"
        />
        <Metric
          label="לחיצות חיוג"
          value={compactNumber(analytics?.totals.callClicks ?? 0)}
          foot={`${compactNumber(analytics?.totals.fastCallClicks ?? 0)} מהן מהירות`}
          accent={(analytics?.totals.callClicks ?? 0) > 0 ? 'ok' : undefined}
        />
        <Metric
          label="המרה אנושית"
          value={formatPercent(analytics?.totals.qualifiedConversionRate ?? 0)}
          foot="לחיצות מתוך ביקורים עם סימן אנושי"
        />
        <Metric
          label="זמן עד חיוג"
          value={formatMs(analytics?.totals.avgTimeToCallMs ?? null)}
          foot="ממוצע לקליק הראשון"
        />
      </MetricStrip>

      <form
        key={searchParams.toString()}
        className="toolbar analytics-filterbar"
        onSubmit={applyFilters}
      >
        <div className="filter-title">
          <Filter size={15} />
          סינון ביצועי דפים
        </div>
        <label className="compact-field">
          שירות
          <input name="service" placeholder="locksmith" defaultValue={filters.service ?? ''} dir="ltr" />
        </label>
        <label className="compact-field">
          עיר
          <input name="city" placeholder="tel-aviv" defaultValue={filters.city ?? ''} dir="ltr" />
        </label>
        <label className="compact-field">
          מקור
          <input name="source" placeholder="google" defaultValue={filters.source ?? ''} dir="ltr" />
        </label>
        <label className="compact-field">
          מתאריך
          <input name="from" type="date" defaultValue={filters.from ?? ''} />
        </label>
        <label className="compact-field">
          עד תאריך
          <input name="to" type="date" defaultValue={filters.to ?? ''} />
        </label>
        <button className="btn primary" type="submit">
          סנן
        </button>
        <button className="btn ghost" type="button" onClick={() => setSearchParams(new URLSearchParams())}>
          נקה
        </button>
      </form>

      <div className="analytics-summary">
        <div className="summary-item">
          <Users size={16} />
          <span>מבקרים ייחודיים</span>
          <strong>{compactNumber(analytics?.totals.uniqueVisitors ?? 0)}</strong>
        </div>
        <div className="summary-item">
          <MousePointerClick size={16} />
          <span>המרה כללית</span>
          <strong>{formatPercent(analytics?.totals.conversionRate ?? 0)}</strong>
        </div>
        <div className="summary-item">
          <Activity size={16} />
          <span>WhatsApp / העתקת טלפון</span>
          <strong>
            {compactNumber(
              (analytics?.totals.whatsappClicks ?? 0) + (analytics?.totals.copyPhoneClicks ?? 0),
            )}
          </strong>
        </div>
        <div className="summary-item">
          <ShieldCheck size={16} />
          <span>דפים במדידה</span>
          <strong>{compactNumber(analytics?.rows.length ?? 0)}</strong>
        </div>
        <div className="summary-item">
          <Percent size={16} />
          <span>המרה איכותית</span>
          <strong>{formatPercent(analytics?.totals.qualifiedConversionRate ?? 0)}</strong>
        </div>
        <div className="summary-item">
          <Timer size={16} />
          <span>זמן ממוצע</span>
          <strong>{formatMs(analytics?.totals.avgTimeToCallMs ?? null)}</strong>
        </div>
      </div>

      <section className="panel analytics-panel">
        <div className="section-head">
          <h2>ביצועים לפי דף</h2>
          <span className="count">
            {analyticsQuery.isFetching ? 'מרענן נתונים...' : `${analytics?.rows.length ?? 0} דפים`}
          </span>
        </div>

        {analyticsQuery.isLoading ? (
          <div className="loading-row">
            <span className="spinner" />
            טוען אנליטיקה...
          </div>
        ) : !analytics || analytics.rows.length === 0 ? (
          <div className="empty compact-empty">אין עדיין נתוני ביצועים לסינון הנוכחי.</div>
        ) : (
          <div className="table-wrap analytics-table">
            <table className="data">
              <thead>
                <tr>
                  <th>שירות</th>
                  <th>עיר</th>
                  <th>דף</th>
                  <th>ביקורים</th>
                  <th>אנושי</th>
                  <th>חיוגים</th>
                  <th>מהיר</th>
                  <th>המרה</th>
                  <th>זמן לחיוג</th>
                  <th>מקור מוביל</th>
                  <th>פעילות אחרונה</th>
                </tr>
              </thead>
              <tbody>
                {analytics.rows.map((row) => (
                  <tr key={`${row.serviceSlug}-${row.citySlug}-${row.path}`}>
                    <td>
                      <span className="cell-strong">{row.service}</span>
                      <span className="cell-sub mono">{row.serviceSlug}</span>
                    </td>
                    <td>
                      {row.city}
                      <span className="cell-sub mono">{row.citySlug}</span>
                    </td>
                    <td className="mono" dir="ltr">
                      {row.path}
                    </td>
                    <td>{compactNumber(row.visits)}</td>
                    <td>{compactNumber(row.humanSignalVisits)}</td>
                    <td>{compactNumber(row.callClicks)}</td>
                    <td>{compactNumber(row.fastCallClicks)}</td>
                    <td>{formatPercent(row.qualifiedConversionRate)}</td>
                    <td>{formatMs(row.avgTimeToCallMs)}</td>
                    <td className="mono">{row.topSource}</td>
                    <td>{formatDate(row.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
