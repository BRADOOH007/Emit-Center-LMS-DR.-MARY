export function cleanAiJson(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const isArray = cleaned.includes('[');
  const startChar = isArray ? '[' : '{';
  const endChar = isArray ? ']' : '}';
  const start = cleaned.indexOf(startChar);
  const end = cleaned.lastIndexOf(endChar);
  if (start === -1 || end <= start) return '';
  cleaned = cleaned.slice(start, end + 1);

  cleaned = fixJson(cleaned);
  return cleaned;
}

function fixJson(json: string): string {
  let s = json;

  s = s.replace(/\/\/[^\n]*/g, '');
  s = s.replace(/,\s*([}\]])/g, '$1');
  s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
  s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  s = fixEscapedNewlines(s);

  return s;
}

function fixEscapedNewlines(s: string): string {
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      result += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && (ch === '\n' || ch === '\r')) {
      result += '\\n';
      continue;
    }
    result += ch;
  }
  return result;
}

export function safeGenerate<T>(
  label: string,
  fn: () => Promise<T>,
  fallback?: T,
): Promise<T> {
  return fn().catch((err) => {
    console.error(`[${label}] Generation failed:`, err);
    if (fallback !== undefined) return fallback;
    throw err;
  });
}
