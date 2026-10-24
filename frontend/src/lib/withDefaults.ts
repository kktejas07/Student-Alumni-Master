/** Dependency-free so it can be unit-tested without the Expo module graph. */
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

/**
 * Fill gaps in an API payload from the view's defaults so a partial response
 * (`{ student: {} }`, a missing list) never crashes a dashboard on a nested
 * read. Objects are merged recursively; arrays and scalars from the API win;
 * `null`/`undefined` fall back to the default.
 */
export function withDefaults<T>(defaults: T, payload: unknown): T {
  if (payload === null || payload === undefined) return defaults;
  if (!isPlainObject(defaults) || !isPlainObject(payload)) return payload as T;
  const out: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(payload)) {
    const d = (defaults as Record<string, unknown>)[key];
    const p = payload[key];
    out[key] = isPlainObject(d) ? withDefaults(d, p) : (p === null || p === undefined ? d : p);
  }
  return out as T;
}
