'use client';

import { useState, type FormEvent } from 'react';

const SERVICE_TYPES = [
  'אינסטלציה',
  'חשמל',
  'מנעולן',
  'מיזוג אוויר',
  'תיקון מכשירי חשמל',
  'ניקיון',
  'הובלות',
  'הנדימן',
  'הדברה',
  'אחר',
];

interface FormState {
  fullName: string;
  phoneNumber: string;
  email: string;
  serviceType: string;
  city: string;
  requestText: string;
}

const EMPTY: FormState = {
  fullName: '',
  phoneNumber: '',
  email: '',
  serviceType: '',
  city: '',
  requestText: '',
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function LeadForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ providerCategory?: string; routed: boolean } | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.fullName.trim() || !form.phoneNumber.trim() || !form.serviceType.trim()) {
      setError('נא למלא שם, טלפון וסוג השירות הדרוש.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => String(v ?? '').trim() !== ''),
      );
      const res = await fetch(`${BASE_PATH}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? 'משהו השתבש. נא לנסות שוב.');
        return;
      }

      setDone({
        routed: Boolean(data?.provider),
        providerCategory: data?.provider?.category ?? data?.provider?.name,
      });
    } catch {
      setError('שגיאת רשת. בדקו את החיבור ונסו שוב.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card">
        <div className="success">
          <div className="check">✓</div>
          <h2>הכול מוכן!</h2>
          <p>קיבלנו את הבקשה, ובעל מקצוע מקומי מקבל כעת התראה בוואטסאפ.</p>
          {done.routed ? (
            <span className="routed">
              הותאם מומחה {done.providerCategory ?? 'מקומי'}
            </span>
          ) : (
            <p>אנחנו מאתרים את המומחה המתאים וניצור קשר בקרוב.</p>
          )}
          <div>
            <button
              className="linklike"
              onClick={() => {
                setForm(EMPTY);
                setDone(null);
              }}
            >
              שליחת בקשה נוספת
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>בעל מקצוע בדרך אליכם</h2>
      <p className="card-sub">חינם לבקשה · ללא התחייבות · מענה תוך דקות</p>

      <form className="form" onSubmit={onSubmit}>
        {error ? <div className="banner error">{error}</div> : null}

        <div className="field">
          <label htmlFor="serviceType">
            מה דרוש לכם? <span className="req">*</span>
          </label>
          <select
            id="serviceType"
            value={form.serviceType}
            onChange={(e) => set('serviceType', e.target.value)}
          >
            <option value="">בחרו שירות…</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="requestText">ספרו לנו מה קורה</label>
          <textarea
            id="requestText"
            value={form.requestText}
            onChange={(e) => set('requestText', e.target.value)}
            placeholder="לדוגמה: האסלה דולפת ודרוש תיקון דחוף."
          />
        </div>

        <div className="row-2">
          <div className="field">
            <label htmlFor="fullName">
              השם שלכם <span className="req">*</span>
            </label>
            <input
              id="fullName"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="דנה כהן"
            />
          </div>
          <div className="field">
            <label htmlFor="phoneNumber">
              טלפון <span className="req">*</span>
            </label>
            <input
              id="phoneNumber"
              inputMode="tel"
              dir="ltr"
              value={form.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              placeholder="050-000-0000"
            />
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label htmlFor="city">עיר</label>
            <input
              id="city"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="תל אביב"
            />
          </div>
          <div className="field">
            <label htmlFor="email">אימייל</label>
            <input
              id="email"
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <button className="submit" type="submit" disabled={submitting}>
          {submitting ? 'שולח…' : 'שלחו בקשה עכשיו'}
        </button>
        <p className="fineprint">בשליחת הבקשה אתם מאשרים שניצור עמכם קשר בנוגע לפנייה.</p>
      </form>
    </div>
  );
}
