/** Tabella densa con ordinamento per colonna e paginazione (fluida anche con centinaia di righe). */
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { t } from '../i18n';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Testo per lettori di schermo/tooltip quando l'intestazione è un'abbreviazione. */
  title?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => number | string;
  numeric?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  initialSort,
  pageSize = 50,
  caption,
  rowClassName,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
  caption?: string;
  rowClassName?: (row: T) => string;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const mult = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
      return String(va).localeCompare(String(vb), 'it') * mult;
    });
  }, [rows, columns, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggle = (key: string, numeric?: boolean) => {
    setPage(0);
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: numeric ? 'desc' : 'asc' },
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table-dense">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const ariaSort = active
                  ? sort.dir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={c.sortValue ? ariaSort : undefined}
                    className={c.numeric ? 'text-right' : ''}
                    title={c.title}
                  >
                    {c.sortValue ? (
                      <button
                        className="inline-flex items-center gap-1 font-bold hover:text-sea-800"
                        onClick={() => toggle(c.key, c.numeric)}
                        aria-label={`${c.title ?? (typeof c.header === 'string' ? c.header : c.key)}${active ? `, ${t(sort.dir === 'asc' ? 'common.sortAsc' : 'common.sortDesc')}` : ''}`}
                      >
                        {c.header}
                        {active &&
                          (sort.dir === 'asc' ? (
                            <ArrowUp size={12} aria-hidden />
                          ) : (
                            <ArrowDown size={12} aria-hidden />
                          ))}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={rowKey(r)} className={rowClassName?.(r)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.numeric ? 'num' : ''}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-4 text-center text-sand-700">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav
          className="mt-2 flex flex-wrap items-center justify-end gap-2 text-sm"
          aria-label={t('common.page', { page: current + 1, pages })}
        >
          <button
            className="btn btn-secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            {t('common.prev')}
          </button>
          <span>{t('common.page', { page: current + 1, pages })}</span>
          <button
            className="btn btn-secondary"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            {t('common.next')}
          </button>
        </nav>
      )}
    </div>
  );
}
