import { BarChart3, LayoutDashboard, Radio, Ticket, Users } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { api } from './api/client';
import { useHealth } from './api/hooks';

const NAV = [
  { to: '/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { to: '/analytics', label: 'אנליטיקה', icon: BarChart3 },
  { to: '/leads', label: 'פניות / קריאות', icon: Ticket },
  { to: '/providers', label: 'ספקים', icon: Users },
];

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'מרכז הבקרה', sub: 'ניתוב פניות וסטטוס התראות בזמן אמת' },
  '/analytics': { title: 'אנליטיקת SOS', sub: 'ביקורים, לחיצות חיוג וביצועי דפי נחיתה' },
  '/leads': { title: 'פניות / קריאות', sub: 'פניות לקוחות נכנסות ושיוכן לספקים' },
  '/providers': { title: 'ספקים', sub: 'רשת השירות ופרופילי ההתאמה' },
};

function HealthPill() {
  const { data, isError, isLoading } = useHealth();
  const online = !isError && !isLoading && data?.status === 'ok';
  const label = isLoading ? 'מתחבר...' : online ? 'השרת מחובר' : 'השרת מנותק';
  return (
    <span
      className={`health-pill ${online ? 'online' : isLoading ? '' : 'offline'}`}
      title={`${api.apiUrl}`}
    >
      <span className="health-dot" />
      {label}
    </span>
  );
}

export function App() {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] ?? { title: 'On The Way', sub: '' };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Radio size={16} />
          </span>
          <div>
            On The Way
            <small>קונסולת שיגור</small>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          ניתוב פניות בזמן אמת
          <br />
          שיגור דרך WhatsApp
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>{meta.title}</h1>
            {meta.sub ? <div className="topbar-sub">{meta.sub}</div> : null}
          </div>
          <div className="topbar-right">
            <HealthPill />
          </div>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
