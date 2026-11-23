/**
 * Return today's date in YYYY-MM-DD using LOCAL timezone.
 * Do NOT use `new Date().toISOString().split('T')[0]` — that returns UTC date,
 * wrong for IST (UTC+5:30) between 00:00 and 05:30.
 */
export function todayLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convert any Date | string to YYYY-MM-DD in LOCAL timezone.
 */
export function toLocalDateString(
  input: Date | string | number | null | undefined
): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Format a Date/ISO string as local date-time for display. */
export function fmtDateTime(d: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
            hour12: true,
  });
}