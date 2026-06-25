import { CheckCircle2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useCreateLead } from '../api/hooks';
import { ApiError } from '../api/client';
import type { CreateLeadInput, CreateLeadResult } from '../api/types';
import { SuggestionList } from './SuggestionList';

const EMPTY: CreateLeadInput = {
  fullName: '',
  phoneNumber: '',
  serviceType: '',
  city: '',
  email: '',
  requestText: '',
  notes: '',
};

export function NewLeadForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<CreateLeadInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateLeadResult | null>(null);
  const createLead = useCreateLead();

  function update<K extends keyof CreateLeadInput>(key: K, value: CreateLeadInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.fullName?.trim() || !form.phoneNumber?.trim() || !form.serviceType?.trim()) {
      setError('שם, טלפון וסוג שירות הם שדות חובה.');
      return;
    }

    // Strip empty optional fields so the backend stores nulls, not blanks.
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => String(v ?? '').trim() !== ''),
    ) as CreateLeadInput;

    try {
      const res = await createLead.mutateAsync(payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'יצירת הפנייה נכשלה.');
    }
  }

  if (result) {
    return (
      <div>
        <div className="banner success">
          <CheckCircle2 size={15} />
          {result.provider
            ? `הפנייה נוצרה ונותבה אל ${result.provider.name}.`
            : 'הפנייה נוצרה — לא נמצא ספק פעיל מתאים עדיין.'}
        </div>
        <div className="subhead">הצעות ספקים מדורגות</div>
        <SuggestionList
          suggestions={result.providerSuggestions}
          assignedProviderId={result.provider?.id}
        />
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
          <button
            className="btn"
            onClick={() => {
              setForm(EMPTY);
              setResult(null);
            }}
          >
            הוספת פנייה נוספת
          </button>
          <button className="btn primary" onClick={onClose}>
            סיום
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      {error ? <div className="banner error">{error}</div> : null}

      <div className="field row-2">
        <div className="field">
          <label>
            שם מלא <span className="req">*</span>
          </label>
          <input
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            placeholder="דנה כהן"
            autoFocus
          />
        </div>
        <div className="field">
          <label>
            טלפון <span className="req">*</span>
          </label>
          <input
            dir="ltr"
            value={form.phoneNumber}
            onChange={(e) => update('phoneNumber', e.target.value)}
            placeholder="+972 50 000 0000"
          />
        </div>
      </div>

      <div className="field row-2">
        <div className="field">
          <label>
            סוג שירות <span className="req">*</span>
          </label>
          <input
            value={form.serviceType}
            onChange={(e) => update('serviceType', e.target.value)}
            placeholder="אינסטלציה"
          />
        </div>
        <div className="field">
          <label>עיר</label>
          <input
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="תל אביב"
          />
        </div>
      </div>

      <div className="field">
        <label>אימייל</label>
        <input
          type="email"
          dir="ltr"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="dana@example.com"
        />
      </div>

      <div className="field">
        <label>תיאור הפנייה (הבקשה של הלקוח)</label>
        <textarea
          value={form.requestText}
          onChange={(e) => update('requestText', e.target.value)}
          placeholder="האסלה דולפת ודרוש תיקון דחוף."
        />
        <span className="hint">טקסט חופשי — משמש לדירוג ספקים מומחים.</span>
      </div>

      <div className="field">
        <label>הערות פנימיות</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="כל מה שחשוב שהמוקדן יידע."
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
        <button type="button" className="btn" onClick={onClose}>
          ביטול
        </button>
        <button type="submit" className="btn primary" disabled={createLead.isPending}>
          {createLead.isPending ? <span className="spinner" /> : null}
          יצירה וניתוב פנייה
        </button>
      </div>
    </form>
  );
}
