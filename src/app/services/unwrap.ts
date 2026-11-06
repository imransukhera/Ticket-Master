/**
 * List endpoints may return a bare array or wrap it (e.g. { tickets: [...] } or { items: [...] }).
 * These helpers accept both so the UI always gets the plain data.
 */
export function unwrapList<T>(res: unknown, key: string): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    for (const k of [key, 'items', 'data']) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

/** Single-item endpoints may return the item or wrap it (e.g. { ticket: {...} }). */
export function unwrapItem<T>(res: unknown, key: string, idField: string): T {
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    if (idField in o) return o as T;
    for (const k of [key, 'item', 'data']) {
      if (o[k] && typeof o[k] === 'object') return o[k] as T;
    }
  }
  return res as T;
}
