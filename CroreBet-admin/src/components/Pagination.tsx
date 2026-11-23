interface Props {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, pages, onPage }: Props) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-40 text-slate-200"
      >
        Prev
      </button>
      <span className="text-sm text-slate-400 px-2">
        Page {page} of {pages}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-40 text-slate-200"
      >
        Next
      </button>
    </div>
  );
}