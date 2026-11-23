import { useEffect, useRef, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  loading,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.includes(query)
      )
    : options;

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlight] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open]);

  const selected = options.find((o) => o.value === value);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight].value);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        className="input cursor-text"
        placeholder={open ? 'Type to search...' : selected?.label || placeholder}
        value={open ? query : selected?.label || ''}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {/* Caret */}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
        ▾
      </span>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-slate-800 border border-brand-border rounded shadow-2xl"
        >
          {loading ? (
            <li className="px-3 py-4 text-center text-slate-500 text-sm">
              Loading users...
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-4 text-center text-slate-500 text-sm">
              No matches
            </li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt.value)}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  i === highlight
                    ? 'bg-brand-accent text-slate-900 font-medium'
                    : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}