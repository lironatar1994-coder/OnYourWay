import { useState, type FormEvent } from 'react';

import { ApiError } from '../api/client';
import { useCreateProvider, useUpdateProvider } from '../api/hooks';
import type { CreateProviderInput, Provider } from '../api/types';

interface Props {
  provider?: Provider | null;
  onClose: () => void;
}

interface FormState {
  name: string;
  phoneNumber: string;
  whatsappJid: string;
  category: string;
  serviceText: string;
  serviceArea: string;
  priority: string;
  dailyLeadLimit: string;
  isActive: boolean;
}

function toState(p?: Provider | null): FormState {
  return {
    name: p?.name ?? '',
    phoneNumber: p?.phoneNumber ?? '',
    whatsappJid: p?.whatsappJid ?? '',
    category: p?.category ?? '',
    serviceText: p?.serviceText ?? '',
    serviceArea: p?.serviceArea ?? '',
    priority: p?.priority != null ? String(p.priority) : '100',
    dailyLeadLimit: p?.dailyLeadLimit != null ? String(p.dailyLeadLimit) : '',
    isActive: p?.isActive ?? true,
  };
}

export function ProviderForm({ provider, onClose }: Props) {
  const editing = Boolean(provider);
  const [form, setForm] = useState<FormState>(toState(provider));
  const [error, setError] = useState<string | null>(null);
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const pending = createProvider.isPending || updateProvider.isPending;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.phoneNumber.trim()) {
      setError('שם ומספר טלפון הם שדות חובה.');
      return;
    }

    const payload: CreateProviderInput = {
      name: form.name.trim(),
      phoneNumber: form.phoneNumber.trim(),
      isActive: form.isActive,
    };
    if (form.whatsappJid.trim()) payload.whatsappJid = form.whatsappJid.trim();
    if (form.category.trim()) payload.category = form.category.trim();
    if (form.serviceText.trim()) payload.serviceText = form.serviceText.trim();
    if (form.serviceArea.trim()) payload.serviceArea = form.serviceArea.trim();
    if (form.priority.trim() && Number.isFinite(Number(form.priority))) {
      payload.priority = Number(form.priority);
    }
    if (form.dailyLeadLimit.trim() && Number.isFinite(Number(form.dailyLeadLimit))) {
      payload.dailyLeadLimit = Number(form.dailyLeadLimit);
    }

    try {
      if (editing && provider) {
        await updateProvider.mutateAsync({ id: provider.id, input: payload });
      } else {
        await createProvider.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שמירת הספק נכשלה.');
    }
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      {error ? <div className="banner error">{error}</div> : null}

      <div className="field row-2">
        <div className="field">
          <label>
            שם <span className="req">*</span>
          </label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>
            טלפון <span className="req">*</span>
          </label>
          <input
            dir="ltr"
            value={form.phoneNumber}
            onChange={(e) => set('phoneNumber', e.target.value)}
            placeholder="+972 50 000 0000"
          />
        </div>
      </div>

      <div className="field">
        <label>מזהה וואטסאפ (JID)</label>
        <input
          className="mono"
          dir="ltr"
          value={form.whatsappJid}
          onChange={(e) => set('whatsappJid', e.target.value)}
          placeholder="אופציונלי — יחושב מהטלפון אם ריק"
        />
        <span className="hint">לדוגמה: 972500000000@s.whatsapp.net</span>
      </div>

      <div className="field row-2">
        <div className="field">
          <label>קטגוריה</label>
          <input
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            placeholder="אינסטלציה"
          />
        </div>
        <div className="field">
          <label>אזור שירות</label>
          <input
            value={form.serviceArea}
            onChange={(e) => set('serviceArea', e.target.value)}
            placeholder="תל אביב, רמת גן"
          />
        </div>
      </div>

      <div className="field">
        <label>פרופיל שירות</label>
        <textarea
          value={form.serviceText}
          onChange={(e) => set('serviceText', e.target.value)}
          placeholder="מתקן אסלות דולפות, סתימות ופיצוצי צנרת דחופים."
        />
        <span className="hint">מילות מפתח של התמחות מדרגות ספק זה מעל ספקים כלליים.</span>
      </div>

      <div className="field row-2">
        <div className="field">
          <label>עדיפות</label>
          <input
            type="number"
            dir="ltr"
            value={form.priority}
            onChange={(e) => set('priority', e.target.value)}
          />
          <span className="hint">נמוך = מדורג ראשון (ברירת מחדל 100).</span>
        </div>
        <div className="field">
          <label>מכסת פניות יומית</label>
          <input
            type="number"
            dir="ltr"
            value={form.dailyLeadLimit}
            onChange={(e) => set('dailyLeadLimit', e.target.value)}
            placeholder="ללא הגבלה"
          />
        </div>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
        />
        פעיל — זכאי לקבל פניות חדשות
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
        <button type="button" className="btn" onClick={onClose}>
          ביטול
        </button>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? <span className="spinner" /> : null}
          {editing ? 'שמירת שינויים' : 'הוספת ספק'}
        </button>
      </div>
    </form>
  );
}
