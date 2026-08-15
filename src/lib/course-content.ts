import { OpenAIService, type OpenAIMessage } from '@/lib/openai-service';
import { cleanAiJson } from '@/lib/ai-generation-utils';
import { buildCurriculumLessonContext, buildUSCurriculumKnowledge, DEFAULT_CURRICULUM, DEFAULT_COUNTRY } from '@/lib/curriculum-prompt';

export const SUBJECT_LABELS: Record<string, string> = {
  robotics: 'Robotics',
  coding: 'Coding',
  design: 'Design',
  life_skills: 'Life Skills',
  engineering: 'Engineering',
  career: 'Career',
};

const AGE_BANDS: Record<string, string> = {
  elementary: 'Grades K-5',
  middle: 'Grades 6-8',
  high: 'Grades 9-12',
  adult: 'Adult learners',
  all: 'All ages',
};

export function ageBandFor(ageLevel?: string | null): string {
  return (ageLevel && AGE_BANDS[ageLevel]) || 'All ages';
}

export interface CourseSyllabusUnit {
  title: string;
  description: string;
  topics: { title: string; summary: string }[];
}

export interface CourseLessonAssessment {
  preview: { whatYoullLearn: string; concepts: string[] };
  recall: {
    question: string;
    type: 'mcq' | 'short';
    options?: string[];
    answer: string;
    explanation: string;
  }[];
}

export interface CourseLessonPayload {
  preview: { whatYoullLearn: string; concepts: string[] };
  content: string;
  recall: {
    question: string;
    type: 'mcq' | 'short';
    options?: string[];
    answer: string;
    explanation: string;
  }[];
}

interface CourseMeta {
  title: string;
  description: string;
  subject: string;
  ageLevel: string;
}

function curriculumContext(opts: { grade?: string; subject?: string; curriculum?: string | null }): string {
  const explicit = opts.curriculum && opts.curriculum !== DEFAULT_CURRICULUM ? opts.curriculum : 'us-generic';
  const curCtx = buildCurriculumLessonContext({
    curriculum: explicit,
    country: DEFAULT_COUNTRY,
    grade: opts.grade || '',
    subject: opts.subject || '',
  });
  return `${curCtx || ''}\n${buildUSCurriculumKnowledge()}`;
}

function systemRole(): string {
  return 'You are an AI that returns ONLY valid, parseable JSON. Never wrap in backticks. Escape all double quotes inside strings. Escape newlines inside string values as \\n. Your entire output must be a single JSON object.';
}

async function generateValidJson<T>(
  system: string,
  userPrompt: string,
  parse: (json: string) => T,
  opts?: { maxTokens?: number; temperature?: number; attempts?: number },
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  let raw = '';
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const isRetry = attempt > 0;
    const messages: OpenAIMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ];
    if (isRetry && raw) {
      messages.push({ role: 'assistant', content: raw });
      messages.push({
        role: 'user',
        content:
          'That response was not valid JSON and could not be parsed. Return ONLY corrected JSON matching the exact requested shape. No markdown fences, no commentary, no trailing text. Escape all double quotes and newlines inside string values.',
      });
    }
    raw = await OpenAIService.generateText(messages, {
      maxTokens: opts?.maxTokens ?? 3000,
      temperature: opts?.temperature ?? 0.35,
    });

    const cleaned = cleanAiJson(raw);
    if (cleaned) {
      try {
        return parse(cleaned);
      } catch (err) {
        lastError = err;
      }
    } else {
      lastError = new Error('AI response contained no parseable JSON');
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('AI returned invalid JSON after multiple attempts');
}

export async function generateCourseSyllabus(
  course: CourseMeta,
  opts?: { curriculum?: string | null },
): Promise<CourseSyllabusUnit[]> {
  const subject = SUBJECT_LABELS[course.subject] ?? course.subject;
  const grade = ageBandFor(course.ageLevel);
  const prompt = `Create a self-paced curriculum syllabus for the EMIT Center course "${course.title}".

COURSE DESCRIPTION: ${course.description}
SUBJECT: ${subject}
STUDENT LEVEL: ${grade}

${curriculumContext({ grade, subject, curriculum: opts?.curriculum })}

Return ONLY a JSON object with this shape:
{
  "units": [
    {
      "title": "Unit title",
      "description": "One or two sentences about what this unit covers",
      "topics": [
        { "title": "Lesson topic title", "summary": "One sentence on what the student will learn" }
      ]
    }
  ]
}

RULES:
- Build 4 to 6 units.
- Each unit has 3 to 6 topics (lesson lessons).
- Sequence topics so each builds on the previous one.
- Use clear, student-friendly language at the ${grade} level.
- Align topics to the relevant US curriculum standards for ${subject} at this level.
- Make titles specific and actionable (e.g. "Reading a Resistor Color Code" not "Electronics").`;

  return generateValidJson<CourseSyllabusUnit[]>(
    systemRole(),
    prompt,
    (json) => {
      const parsed = JSON.parse(json) as { units?: CourseSyllabusUnit[] };
      const units = Array.isArray(parsed.units) ? parsed.units : [];
      if (units.length === 0) throw new Error('AI returned an empty course syllabus');
      return units
        .map((u) => ({
          title: String(u.title || '').slice(0, 200),
          description: String(u.description || '').slice(0, 500),
          topics: (Array.isArray(u.topics) ? u.topics : []).map((t) => ({
            title: String(t.title || '').slice(0, 200),
            summary: String(t.summary || '').slice(0, 500),
          })),
        }))
        .filter((u) => u.title && u.topics.length > 0);
    },
    { maxTokens: 3000, temperature: 0.35 },
  );
}

export async function generateLessonContent(
  course: CourseMeta,
  unitTitle: string,
  lessonTitle: string,
  opts?: { curriculum?: string | null },
): Promise<CourseLessonPayload> {
  const subject = SUBJECT_LABELS[course.subject] ?? course.subject;
  const grade = ageBandFor(course.ageLevel);
  const prompt = `Create a study lesson for a student at ${grade} level taking the EMIT Center course "${course.title}" (${subject}).

UNIT: ${unitTitle}
LESSON: "${lessonTitle}"

${curriculumContext({ grade, subject, curriculum: opts?.curriculum })}

Return ONLY a JSON object with this exact shape:
{
  "preview": {
    "whatYoullLearn": "One short sentence describing what the student will understand after this lesson",
    "concepts": ["First concept", "Second concept", "Third concept"]
  },
  "content": "The lesson body written as markdown. Use ## headings, one per concept. 2-3 short paragraphs per concept. Max 600 words total. Every concept section MUST include: (1) a comparison or feature table using GitHub-flavored markdown | columns |, (2) a text/ASCII/emoji visual model of the concept inside a fenced code block showing how it works, (3) a blockquote callout starting with '> **Real-World Example:** ' describing how the concept appears in everyday life.",
  "recall": [
    {
      "question": "Multiple choice question about the first key concept",
      "type": "mcq",
      "options": ["Wrong A", "Correct answer", "Wrong C", "Wrong D"],
      "answer": "Correct answer",
      "explanation": "Why the correct answer is right"
    }
  ]
}

RULES:
- Include exactly 5 recall questions. Each is an MCQ (type "mcq") with 4 options where one matches "answer". Place the correct option in a different position each time.
- Make questions test real understanding, not memorization.
- Use US examples, currency, and contexts at the ${grade} level.
- Keep all text age-appropriate for a classroom of students aged 5-18.`;

  const payload = await generateValidJson<CourseLessonPayload>(
    systemRole(),
    prompt,
    (json) => {
      const parsed = JSON.parse(json) as Partial<CourseLessonPayload>;

      const recall = (Array.isArray(parsed.recall) ? parsed.recall : []).slice(0, 5);
      if (recall.length === 0) throw new Error('AI returned a lesson with no recall questions');
      if (!parsed.content || !parsed.preview) throw new Error('AI returned an incomplete lesson');

      return {
        preview: {
          whatYoullLearn: String(parsed.preview.whatYoullLearn || '').slice(0, 500),
          concepts: (Array.isArray(parsed.preview.concepts) ? parsed.preview.concepts : []).map((c) => String(c).slice(0, 300)),
        },
        content: parsed.content,
        recall,
      };
    },
    { maxTokens: 4000, temperature: 0.35 },
  );

  return payload;
}
