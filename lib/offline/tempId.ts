// Client-minted IDs for documents created while offline.
// Deliberately NOT ObjectId-shaped: if a temp id ever escapes un-rewritten it
// fails the pre-flush assertion (or the server's ObjectId cast) loudly instead
// of silently corrupting data. URL-safe so /calendar/session/temp_… routes.
export const TEMP_ID_PREFIX = 'temp_';

export function mintTempId(): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return TEMP_ID_PREFIX + uuid;
}

export function isTempId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(TEMP_ID_PREFIX);
}

/**
 * Deep-replace temp ids anywhere in a value using the resolved id map.
 * Temp ids are globally-unique random strings, so a blind recursive string
 * substitution is safe and saves per-procedure "where do ids live" plumbing.
 */
export function deepMapTempIds<T>(value: T, idMap: Record<string, string>): T {
  if (typeof value === 'string') {
    return (idMap[value] ?? value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepMapTempIds(item, idMap)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepMapTempIds(v, idMap);
    }
    return out as unknown as T;
  }
  return value;
}

/** Collect any temp ids still present in a value (unresolved dependencies). */
export function findTempIds(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (isTempId(value)) {
    found.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) findTempIds(item, found);
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const v of Object.values(value)) findTempIds(v, found);
  }
  return found;
}
