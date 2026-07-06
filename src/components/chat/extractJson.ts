// Ported from AppController._extractJson in lib/state/app_controller.dart.
// The model is asked to reply with *only* JSON when it wants to perform an
// action, but some replies still wrap it in stray text/markdown fences — this
// scans for the first balanced `{...}` object (respecting quoted strings and
// escapes) instead of requiring the whole reply to be valid JSON.
//
// Robustness fixes added for GPT/Gemini, which frequently:
//   - wrap JSON in ```json ... ``` fences,
//   - emit trailing commas before } or ],
//   - use smart/curly quotes (" " ' ') instead of straight ones,
//   - prepend prose like "Sure, here you go:" before the JSON,
//   - leave a dangling/unclosed object when truncated.

/** Normalize common model quirks before JSON.parse: strip markdown fences the
 * scanner already ignored, drop trailing commas, and turn smart quotes into
 * straight ones (only outside already-quoted strings — but since we only call
 * this on the slice the scanner already validated as a balanced object, a
 * global replace is safe enough in practice). */
function repairJson(slice: string): string {
  let s = slice;
  // Smart quotes → straight (GPT/Gemini sometimes auto-correct them).
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  // Trailing commas before } or ] (e.g. {"a":1,} or [1,2,]).
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

export function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  // Strip markdown code fences first so the scanner can find the real `{`.
  // Matches ```json ... ```, ``` ... ```, and a single trailing fence.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const haystack = fenced ? fenced[1] : text;
  const start = haystack.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < haystack.length; i++) {
    const c = haystack[i];
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
        const slice = haystack.slice(start, i + 1);
        // First try a strict parse; if it fails, attempt common repairs
        // (trailing commas, smart quotes) that GPT/Gemini often introduce.
        for (const candidate of [slice, repairJson(slice)]) {
          try {
            const obj: unknown = JSON.parse(candidate);
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
              return obj as Record<string, unknown>;
            }
          } catch {
            // try next candidate
          }
        }
        return null;
      }
    }
  }
  // Truncated/unclosed object (e.g. model cut off mid-reply): try to close
  // any open strings + braces and parse — better to act on a partial action
  // than to silently show the user raw JSON. Only attempt if it looks like an
  // action envelope (has an "action" or "tool" key near the start).
  const partial = haystack.slice(start);
  if (/"(?:action|tool|message)"\s*:/i.test(partial.slice(0, 200))) {
    const repaired = repairJson(partial)
      .replace(/"[^"]*$/, '"') // close dangling string
      .replace(/(\{[^{}]*)(?=\s*$)/, (m) => m + '}'); // close outermost brace
    try {
      const obj: unknown = JSON.parse(repaired);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return obj as Record<string, unknown>;
      }
    } catch {
      // give up
    }
  }
  return null;
}
