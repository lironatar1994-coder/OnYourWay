const LOCALE = 'he-IL';

export function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'הרגע';
  const min = Math.round(sec / 60);
  if (min < 60) return `לפני ${min} ד׳`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `לפני ${hr} ש׳`;
  const day = Math.round(hr / 24);
  if (day < 7) return `לפני ${day} ימים`;
  return d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
}

export function isToday(value: string): boolean {
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
