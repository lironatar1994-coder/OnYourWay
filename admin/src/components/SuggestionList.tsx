import { Check, UserCheck } from 'lucide-react';

import type { ProviderSuggestion } from '../api/types';

// Maps the backend's match-reason strings (lib/provider-matching.js) to Hebrew.
const REASON_HE: Record<string, string> = {
  'Exact service category match': 'התאמת קטגוריית שירות מדויקת',
  'Customer text mentions provider category': 'טקסט הלקוח מזכיר את קטגוריית הספק',
  'Customer case matches provider service profile': 'תיאור הלקוח תואם לפרופיל השירות של הספק',
  'Service area matches customer city': 'אזור השירות תואם לעיר הלקוח',
  'Provider service text contains the customer case': 'פרופיל השירות של הספק כולל את תיאור הלקוח',
  'High provider priority': 'עדיפות ספק גבוהה',
  'Fallback active provider': 'ספק פעיל כברירת מחדל',
};

function translateReason(reason: string): string {
  return REASON_HE[reason] ?? reason;
}

interface Props {
  suggestions: ProviderSuggestion[];
  assignedProviderId?: string | null;
  assigningProviderId?: string | null;
  disabled?: boolean;
  onAssign?: (providerId: string) => void;
}

export function SuggestionList({
  suggestions,
  assignedProviderId,
  assigningProviderId,
  disabled,
  onAssign,
}: Props) {
  if (suggestions.length === 0) {
    return <div className="muted-text">אין ספקים פעילים לדירוג.</div>;
  }

  const maxScore = Math.max(...suggestions.map((s) => s.score), 1);

  return (
    <div>
      {suggestions.map((s, idx) => {
        const assigned = s.provider.id === assignedProviderId;
        const width = `${Math.max(6, Math.round((s.score / maxScore) * 100))}%`;
        return (
          <div key={s.provider.id} className={`suggestion ${assigned ? 'assigned' : ''}`}>
            <div className="suggestion-top">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="suggestion-rank">{idx + 1}</span>
                <span className="suggestion-name">{s.provider.name}</span>
                {s.provider.category ? (
                  <span className="muted-text">· {s.provider.category}</span>
                ) : null}
              </span>
              {assigned ? (
                <span className="badge ok">
                  <Check size={11} /> שויך
                </span>
              ) : onAssign ? (
                <button
                  type="button"
                  className="btn sm"
                  disabled={disabled || assigningProviderId === s.provider.id}
                  onClick={() => onAssign(s.provider.id)}
                >
                  {assigningProviderId === s.provider.id ? (
                    <span className="spinner" />
                  ) : (
                    <UserCheck size={13} />
                  )}
                  שייך
                </button>
              ) : (
                <span className="mono muted-text">ניקוד {s.score}</span>
              )}
            </div>
            <div className="score-bar" title={`ניקוד התאמה ${s.score}`}>
              <span style={{ width }} />
            </div>
            <ul className="reasons">
              {s.reasons.map((reason, i) => (
                <li key={i}>{translateReason(reason)}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
