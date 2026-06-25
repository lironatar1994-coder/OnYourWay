import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  selectedId?: string | null;
  isLoading?: boolean;
  emptyLabel?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  selectedId,
  isLoading,
  emptyLabel = 'אין כאן עדיין נתונים.',
}: DataTableProps<T>) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="loading-row">
                  <span className="spinner" /> טוען…
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty">
                  <Inbox size={28} />
                  <div>{emptyLabel}</div>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = rowKey(row);
              const className = [selectedId === id ? 'selected' : '', rowClassName?.(row) ?? '']
                .filter(Boolean)
                .join(' ');
              return (
                <tr
                  key={id}
                  className={className}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
