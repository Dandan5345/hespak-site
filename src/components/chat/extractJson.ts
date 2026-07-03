// Ported from AppController._extractJson in lib/state/app_controller.dart.
// The model is asked to reply with *only* JSON when it wants to perform an
// action, but some replies still wrap it in stray text/markdown fences — this
// scans for the first balanced `{...}` object (respecting quoted strings and
// escapes) instead of requiring the whole reply to be valid JSON.
export function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === '"') {
        inStr = false;
      }
      continue;
    }
    if (c === '"') {
      inStr = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          const obj: unknown = JSON.parse(text.slice(start, i + 1));
          return obj && typeof obj === 'object' && !Array.isArray(obj) ? (obj as Record<string, unknown>) : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
