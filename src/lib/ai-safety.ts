import { promises as fs } from 'fs';
import path from 'path';
import { getCurriculumProfile, DEFAULT_CURRICULUM, DEFAULT_COUNTRY } from './curriculum-prompt';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ai-safety.jsonl');

const FORBIDDEN_PATTERNS = [
  /\b(how\s+to\s+(harm|kill|hurt|attack|abuse|drugs?|weapons?|explosive|suicide|self.?harm))\b/i,
  /\b(generate\s+(harmful|illegal|offensive|inappropriate|explicit)\s+(content|image|text))\b/i,
  /\b(sexual|porn|nsfw|explicit\s+content|hentai|adult\s+content)\b/i,
  /\b(hate\s+speech|discriminat(e|ion)|racist|sexist|slur)\b/i,
  /\b(personal\s+(data|info|information|details)\s+of\s+(anyone|someone|a\s+person))\b/i,
  /\b(crack|hack|cracked|pirate|illegal\s+download|copyright\s+infringement)\b/i,
];

const EDUCATIONAL_KEYWORDS = [
  'math', 'algebra', 'geometry', 'calculus', 'statistic', 'arithmetic',
  'science', 'physics', 'chemistry', 'biology', 'earth science', 'environment',
  'english', 'grammar', 'literature', 'reading', 'writing', 'vocabulary',
  'history', 'geography', 'civics', 'government', 'economics', 'sociology',
  'computer', 'programming', 'coding', 'technology', 'ict',
  'art', 'music', 'physical education', 'pe',
  'lesson', 'exam', 'test', 'quiz', 'assignment', 'homework', 'study', 'revision',
  'curriculum', 'common core', 'ngss', 'teks', 'sat', 'act', 'ap', 'ged', 'grade', 'class',
  'teacher', 'student', 'tutor', 'tutoring', 'teaching', 'learning',
  'career', 'profession', 'job', 'skill', 'vocational',
  'fraction', 'decimal', 'equation', 'formula', 'theorem',
  'sentence', 'paragraph', 'essay', 'composition', 'comprehension',
  'solar system', 'cell', 'force', 'energy', 'gravity', 'magnetism',
  'noun', 'verb', 'adjective', 'adverb', 'tense', 'pronoun',
  'addition', 'subtraction', 'multiplication', 'division',
];

export interface SafetyCheck {
  passed: boolean;
  reason?: string;
  category?: 'non_educational' | 'harmful' | 'personal_info' | 'other';
}

export interface SafetyViolation {
  timestamp: string;
  userId: string;
  userRole: string;
  input: string;
  output?: string;
  reason: string;
  category: string;
  route?: string;
}

async function getSafeLogDir(): Promise<string> {
  try {
    await fs.access(LOG_DIR);
  } catch {
    try {
      await fs.mkdir(LOG_DIR, { recursive: true });
    } catch (e) {
      console.warn('[AISafety] Failed to create log dir:', e);
    }
  }
  return LOG_DIR;
}

export function checkInput(input: string): SafetyCheck {
  if (!input || input.trim().length < 3) return { passed: true };
  const lower = input.toLowerCase();

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(lower)) {
      return { passed: false, reason: `Flagged by pattern: ${pattern}`, category: 'harmful' };
    }
  }

  const hasEducational = EDUCATIONAL_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  if (!hasEducational && lower.split(/\s+/).length > 4) {
    return { passed: false, reason: 'Query does not appear educational', category: 'non_educational' };
  }

  return { passed: true };
}

export function hasEducationalContext(messages: Array<{ role: string; content: string }>): boolean {
  const allText = messages.map((m) => m.content).join(' ').toLowerCase();
  const keywordCount = EDUCATIONAL_KEYWORDS.filter((kw) => allText.includes(kw.toLowerCase())).length;
  return keywordCount >= 2;
}

export function buildSafeSystemPrompt(
  basePrompt: string,
  curriculum?: string | null,
  country?: string | null,
): string {
  const profile = getCurriculumProfile(curriculum || DEFAULT_CURRICULUM, country || DEFAULT_COUNTRY);
  return `${basePrompt}

RESPONSIBILITY GUIDELINES — You must follow these:
1. Keep all responses appropriate for a classroom environment with students aged 5-18
2. If asked something clearly non-educational, politely respond: "I'm designed to help with educational topics. Please ask me something related to teaching, learning, or your school subjects."
3. Never generate harmful, explicit, or inappropriate content
4. Never share personal information of real individuals
5. Stay focused on the ${profile.name} curriculum and educational context at all times
6. Always use US and curriculum-relevant examples, contexts and resources when relevant
7. Reference the values of the ${profile.name}: ${profile.valuesGuidance}
8. Reference 21st-century competencies: ${profile.competenciesGuidance}
9. Use the curriculum's lesson format conventions for lesson plans: ${profile.strandLabel}s, ${profile.subStrandLabel}s, specific learning outcomes, key inquiry questions, and assessment methods
10. If a question could have both educational and non-educational interpretations, answer the educational angle`;
}

export async function logViolation(violation: Omit<SafetyViolation, 'timestamp'>): Promise<void> {
  const safeDir = await getSafeLogDir();
  const entry: SafetyViolation = { ...violation, timestamp: new Date().toISOString() };
  try {
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('Failed to log safety violation:', err);
  }
}

export async function getViolations(limit = 50): Promise<SafetyViolation[]> {
  try {
    try {
      await fs.access(LOG_FILE);
    } catch {
      return [];
    }
    const data = await fs.readFile(LOG_FILE, 'utf-8');
    const lines = data.trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .map((l) => JSON.parse(l))
      .reverse();
  } catch (e) {
    console.warn('[AISafety] Failed to read violations:', e);
    return [];
  }
}