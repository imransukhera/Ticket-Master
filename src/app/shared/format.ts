/** Display helpers shared by every page. */

/** "IN_PROGRESS" / "in-progress" / "inProgress" -> "In progress" */
export function humanize(value: string | null | undefined): string {
  if (!value) return '';
  const spaced = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** CSS tone class for a status/priority/role value, e.g. "IN_PROGRESS" -> "tone-inprogress". */
export function toneClass(value: string | null | undefined): string {
  return 'tone-' + (value ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

/** "12 Oct 2026". Unparseable values are shown as-is. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "12 Oct 2026, 3:04 pm". Unparseable values are shown as-is. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "Jane Citizen" -> "JC" */
export function initials(name: string | null | undefined): string {
  return (
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?'
  );
}

/** Reads the value from an input/select/textarea event. */
export function eventValue(e: Event): string {
  return (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
}
