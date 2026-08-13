export function normalizeAnswer(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"()]/g, '')
    .replace(/^(the|a|an)\s+/, '')
    .trim();
}

export function splitAcceptableAnswers(modelAnswer: string): string[] {
  return String(modelAnswer ?? '')
    .split(/\s*(?:\||;|\/)\s*/)
    .map((a) => normalizeAnswer(a))
    .filter(Boolean);
}

export function gradeShortAnswer(studentAnswer: string, modelAnswer?: string): boolean {
  if (!modelAnswer) return false;
  const student = normalizeAnswer(studentAnswer);
  if (!student) return false;
  const acceptable = splitAcceptableAnswers(modelAnswer);
  if (acceptable.length === 0) return false;

  for (const expected of acceptable) {
    if (student === expected) return true;
    if (expected.length > 3 && (student.includes(expected) || expected.includes(student))) return true;
    const studentTokens = student.split(' ').filter((t) => t.length > 2);
    if (studentTokens.length > 0 && studentTokens.every((t) => expected.includes(t))) return true;
  }
  return false;
}

export function gradeTrueFalse(studentAnswer: string, correctAnswer?: string): boolean {
  if (!correctAnswer) return false;
  const norm = normalizeAnswer(studentAnswer);
  const target = normalizeAnswer(correctAnswer);
  if (!norm || !target) return false;
  const asBool = (v: string) => v === 'true' || v === 't' || v === 'yes' || v === '1';
  return asBool(norm) === asBool(target);
}

export function letterForOption(options: string[] | undefined, value: string): string | null {
  if (!Array.isArray(options)) return null;
  const idx = options.indexOf(value);
  if (idx >= 0) return String.fromCharCode(65 + idx);
  return null;
}