export function cleanAiJson(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const structure = extractJsonStructure(cleaned);
  if (!structure) return '';

  cleaned = fixJson(structure);
  return cleaned;
}

function extractJsonStructure(text: string): string {
  const firstObject = text.indexOf('{');
  const firstArray = text.indexOf('[');
  const start =
    firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstObject, firstArray);
  if (start === -1) return '';

  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}

function fixJson(json: string): string {
  let s = json;

  s = s.replace(/\/\/[^\n]*/g, '');
  s = s.replace(/,\s*([}\]])/g, '$1');
  s = fixSingleQuotes(s);
  s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  s = fixEscapedNewlines(s);

  return s;
}

function fixSingleQuotes(s: string): string {
  let result = '';
  let inDouble = false;
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
      inDouble = !inDouble;
      result += ch;
      continue;
    }
    if (!inDouble && ch === "'") {
      let j = i + 1;
      let closed = false;
      while (j < s.length) {
        if (s[j] === '\\') {
          j += 2;
          continue;
        }
        if (s[j] === "'") {
          closed = true;
          break;
        }
        j++;
      }
      if (closed) {
        result += '"' + s.slice(i + 1, j).replace(/"/g, '\\"') + '"';
        i = j;
        continue;
      }
    }
    result += ch;
  }
  return result;
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
