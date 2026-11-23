interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
}

export default function DataTable<T extends { id?: string }>({
  columns,
  rows,
  loading,
  empty = 'No data',
}: Props<T>) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/60">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-slate-500 py-12"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={(row as any).id || i}
                className="border-t border-brand-border hover:bg-slate-800/30 transition-colors"
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-3">
                    {c.render ? c.render(row) : (row as any)[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}