import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useProviders, useUpdateProvider } from '../api/hooks';
import { DataTable, type Column } from '../components/DataTable';
import { Drawer } from '../components/Drawer';
import { ProviderForm } from '../components/ProviderForm';
import type { Provider } from '../api/types';

export function ProvidersPage() {
  const { data, isLoading } = useProviders();
  const updateProvider = useUpdateProvider();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [creating, setCreating] = useState(false);

  const providers = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providers.filter((p) => {
      if (activeOnly && !p.isActive) return false;
      if (!q) return true;
      return [p.name, p.category, p.serviceText, p.serviceArea, p.phoneNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [providers, search, activeOnly]);

  function toggleActive(p: Provider) {
    updateProvider.mutate({ id: p.id, input: { isActive: !p.isActive } });
  }

  const columns: Column<Provider>[] = [
    {
      key: 'name',
      header: 'ספק',
      render: (p) => (
        <>
          <span className="cell-strong">{p.name}</span>
          <span className="cell-sub mono">{p.phoneNumber}</span>
        </>
      ),
    },
    {
      key: 'category',
      header: 'קטגוריה',
      render: (p) => p.category ?? <span className="muted-text">—</span>,
    },
    {
      key: 'serviceText',
      header: 'פרופיל שירות',
      render: (p) =>
        p.serviceText ? (
          <span title={p.serviceText}>{p.serviceText}</span>
        ) : (
          <span className="muted-text">—</span>
        ),
    },
    {
      key: 'area',
      header: 'אזור',
      render: (p) => p.serviceArea ?? <span className="muted-text">—</span>,
    },
    {
      key: 'priority',
      header: 'עדיפות',
      width: '80px',
      render: (p) => <span className="mono">{p.priority}</span>,
    },
    {
      key: 'limit',
      header: 'מכסה יומית',
      width: '90px',
      render: (p) =>
        p.dailyLeadLimit != null ? (
          <span className="mono">{p.dailyLeadLimit}</span>
        ) : (
          <span className="muted-text">∞</span>
        ),
    },
    {
      key: 'active',
      header: 'פעיל',
      width: '70px',
      render: (p) => (
        <label className="switch" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={p.isActive}
            onChange={() => toggleActive(p)}
            aria-label={`החלפת מצב פעיל עבור ${p.name}`}
          />
        </label>
      ),
    },
  ];

  return (
    <div>
      <div className="toolbar">
        <div className="segmented">
          <button className={!activeOnly ? 'active' : ''} onClick={() => setActiveOnly(false)}>
            הכול
          </button>
          <button className={activeOnly ? 'active' : ''} onClick={() => setActiveOnly(true)}>
            פעילים בלבד
          </button>
        </div>
        <div className="search">
          <Search size={14} />
          <input
            placeholder="חיפוש לפי שם, קטגוריה, פרופיל, אזור…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <span className="count muted-text">{filtered.length} מוצגים</span>
        <button className="btn primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> ספק חדש
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => p.id}
        onRowClick={(p) => setEditing(p)}
        selectedId={editing?.id ?? null}
        isLoading={isLoading}
        emptyLabel="אין עדיין ספקים — הוסף את הספק הראשון לרשת."
      />

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.name ?? 'ספק'}
        subtitle="עריכת פרופיל התאמה וזמינות"
      >
        {editing ? <ProviderForm provider={editing} onClose={() => setEditing(null)} /> : null}
      </Drawer>

      <Drawer
        open={creating}
        onClose={() => setCreating(false)}
        title="ספק חדש"
        subtitle="הוספת ספק לרשת הניתוב"
      >
        <ProviderForm onClose={() => setCreating(false)} />
      </Drawer>
    </div>
  );
}
