import { OpenAIService } from '@/lib/openai-service';
import { cleanAiJson } from '@/lib/ai-generation-utils';
import { buildCurriculumAssessmentContext } from '@/lib/curriculum-prompt';
import type { QuizQuestion, QuizQuestionType } from '@/types';

export interface ExamGenerationParams {
  subject: string;
  topic: string;
  grade?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  curriculum?: string;
  country?: string;
  totalPoints?: number;
  timeLimit?: number;
  includeMultipleChoice?: boolean;
  includeTrueFalse?: boolean;
  includeShortAnswer?: boolean;
  includeEssay?: boolean;
  supportingContext?: string;
}

export interface GeneratedExam {
  title: string;
  description: string;
  timeLimit: number;
  totalPoints: number;
  questions: QuizQuestion[];
}

const DIFFICULTY_HINT: Record<string, string> = {
  easy: 'Basic recall and direct application questions. Keep language simple and concrete.',
  medium: 'Mix of recall plus application and minor analysis questions. Vary question styles.',
  hard: 'Emphasise analysis, evaluation, synthesis, and multi-step problems. Push critical thinking.',
};

function allowedTypes(params: ExamGenerationParams): QuizQuestionType[] {
  const flags: [boolean | undefined, QuizQuestionType][] = [
    [params.includeMultipleChoice ?? true, 'multiple-choice'],
    [params.includeTrueFalse ?? false, 'true-false'],
    [params.includeShortAnswer ?? true, 'short-answer'],
    [params.includeEssay ?? false, 'essay'],
  ];
  const chosen = flags.filter(([on]) => on).map(([, type]) => type);
  return chosen.length > 0 ? chosen : ['multiple-choice'];
}

function buildPrompt(params: ExamGenerationParams): { systemPrompt: string; userPrompt: string } {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;
  const grade = params.grade?.trim() ?? '';
  const difficulty = params.difficulty ?? 'medium';
  const totalPoints = params.totalPoints ?? 100;
  const timeLimit = params.timeLimit ?? 30;
  const types = allowedTypes(params);

  const curriculumCtx = buildCurriculumAssessmentContext({
    curriculum: params.curriculum,
    country: params.country,
    grade,
    subject,
  });

  const systemPrompt = `You are an expert assessment author creating standards-aligned exams for EMIT Center. You write questions that are clear, age-appropriate, and pedagogically sound.

${curriculumCtx}

Formatting requirements:
- Return ONLY valid JSON. No markdown fences, no commentary outside the JSON.
- Every question is an object in "questions".
- Always include the answer key inline on each question (correctAnswer for multiple-choice/true-false; modelAnswer for short-answer/essay).
- Multiple-choice questions: exactly 4 options labelled by LETTER (A, B, C, D). correctAnswer is the LETTER.
- True/false questions: correctAnswer is exactly "true" or "false".
- Short-answer and essay questions: modelAnswer is a concise expected answer or marking points.
- question "id" values must be unique and stable (e.g. "q1", "q2", ...).
- Ensure the sum of all question "points" equals ${totalPoints} exactly.
- Question types allowed: ${types.join(', ')}.

Expected JSON shape:
{
  "title": "string",
  "description": "string",
  "questions": [
    {
      "id": "q1",
      "type": "${types[0] ?? 'multiple-choice'}",
      "question": "string",
      "points": 5,
      "required": true,
      "options": ["A...", "B...", "C...", "D..."],
      "correctAnswer": "A",
      "modelAnswer": "string (short-answer / essay only)"
    }
  ]
}`;

  const userPrompt = `Create an exam for ${subject} on the topic "${topic}"${grade ? ` at ${grade} level` : ''}.

Difficulty: ${difficulty} — ${DIFFICULTY_HINT[difficulty] ?? ''}
Total marks: ${totalPoints}
Time limit: ${timeLimit} minutes
Question types: ${types.join(', ')}

${params.supportingContext ? `Additional context from the teacher or syllabus:\n${params.supportingContext}` : ''}

Make questions specific to "${topic}" — avoid generic filler. Keep the exam focused, printable, and self-contained. Return the JSON now.`;

  return { systemPrompt, userPrompt };
}

function normalizeQuestions(raw: any[], params: ExamGenerationParams): QuizQuestion[] {
  const types = allowedTypes(params);
  const unique: string[] = [];
  const questions: QuizQuestion[] = [];

  for (const rawQ of raw) {
    if (!rawQ || typeof rawQ !== 'object') continue;
    const type = types.includes(rawQ.type) ? rawQ.type : types[0];
    const question = String(rawQ.question ?? '').trim();
    if (!question) continue;

    let id = String(rawQ.id ?? rawQ.questionId ?? `q${questions.length + 1}`).trim();
    if (!id || unique.includes(id)) id = `q${questions.length + 1}`;
    unique.push(id);

    let options: string[] | undefined;
    if (type === 'multiple-choice') {
      const rawOptions = Array.isArray(rawQ.options) ? rawQ.options.map((o: any) => String(o ?? '').trim()).filter(Boolean) : [];
      options = rawOptions.length === 4
        ? rawOptions
        : rawOptions.length > 0
          ? rawOptions.slice(0, 4)
          : ['Option A', 'Option B', 'Option C', 'Option D'];
    }

    const points = Number.isFinite(Number(rawQ.points)) && Number(rawQ.points) > 0 ? Math.round(Number(rawQ.points)) : 1;

    let correctAnswer = String(rawQ.correctAnswer ?? rawQ.answer ?? '').trim();
    let modelAnswer = String(rawQ.modelAnswer ?? rawQ.markingPoints ?? rawQ.expectedAnswer ?? '').trim();
    if (type === 'true-false' && correctAnswer) {
      const norm = correctAnswer.toLowerCase();
      correctAnswer = norm === 't' || norm === 'true' || norm === 'yes' ? 'true' : 'false';
    }
    if (type === 'multiple-choice' && correctAnswer && options) {
      const letter = correctAnswer.toUpperCase();
      if (/^[A-D]$/.test(letter)) {
        correctAnswer = letter;
      } else {
        const idx = options.indexOf(correctAnswer);
        if (idx >= 0) correctAnswer = String.fromCharCode(65 + idx);
        else correctAnswer = '';
      }
    }

    questions.push({
      id,
      question,
      type,
      options,
      correctAnswer: correctAnswer || undefined,
      modelAnswer: type === 'short-answer' || type === 'essay' ? (modelAnswer || undefined) : undefined,
      points,
      required: rawQ.required !== false,
    });
  }

  return questions;
}

function buildFallbackExam(params: ExamGenerationParams): GeneratedExam {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;
  const totalPoints = params.totalPoints ?? 100;
  const title = `${topic} Exam — ${subject}`;

  const questions: QuizQuestion[] = [];
  const mcCount = Math.max(2, Math.min(4, Math.floor(totalPoints / 25)));
  const saCount = Math.max(1, Math.min(3, Math.round((totalPoints - mcCount * 10) / 15)));
  let allocated = 0;
  const mcPoints = 10;
  const saPoints = totalPoints > mcCount * mcPoints ? Math.round((totalPoints - mcCount * mcPoints) / saCount) : 0;

  for (let i = 0; i < mcCount; i++) {
    const id = `q${questions.length + 1}`;
    questions.push({
      id,
      question: `Question ${questions.length + 1}: Which statement about ${topic} is correct?`,
      type: 'multiple-choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'A',
      points: mcPoints,
      required: true,
    });
    allocated += mcPoints;
  }
  for (let i = 0; i < saCount; i++) {
    questions.push({
      id: `q${questions.length + 1}`,
      question: `Briefly explain a key concept of ${topic} in ${subject}.`,
      type: 'short-answer',
      modelAnswer: `A short factual summary of the core idea behind ${topic}.`,
      points: saPoints,
      required: true,
    });
    allocated += saPoints;
  }

  questions.push({
    id: `q${questions.length + 1}`,
    question: `Describe how ${topic} applies in a real-world situation.`,
    type: 'essay',
    modelAnswer: `A clear explanation connecting ${topic} to a realistic, concrete example, with reasons.`,
    points: Math.max(0, totalPoints - allocated),
    required: false,
  });

  return {
    title,
    description: `An auto-generated assessment for ${subject} covering ${topic}.`,
    timeLimit: params.timeLimit ?? 30,
    totalPoints,
    questions: questions.filter((q) => q.points > 0),
  };
}

function validateExam(
  parsed: any,
  params: ExamGenerationParams,
): GeneratedExam | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions = normalizeQuestions(rawQuestions, params);
  if (questions.length === 0) return null;

  const totalPoints = Math.max(
    questions.reduce((sum, q) => sum + q.points, 0),
    params.totalPoints ?? 100,
  );

  const title = String(parsed.title ?? '').trim() || `${(params.topic || params.subject || 'Exam').trim()} Exam`;
  const description = String(parsed.description ?? '').trim() || `Auto-generated assessment for ${title}`;

  return {
    title,
    description,
    timeLimit: Number.isFinite(Number(parsed.timeLimit)) && Number(parsed.timeLimit) > 0 ? Math.round(Number(parsed.timeLimit)) : (params.timeLimit ?? 30),
    totalPoints,
    questions,
  };
}

export async function generateExam(params: ExamGenerationParams): Promise<GeneratedExam> {
  const { systemPrompt, userPrompt } = buildPrompt(params);

  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await OpenAIService.generateTextDetailed(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 3000, temperature: 0.6 },
      );

      if (raw?.content) {
        const cleaned = cleanAiJson(raw.content);
        if (cleaned) {
          const parsed = JSON.parse(cleaned);
          const exam = validateExam(parsed, params);
          if (exam) return exam;
        }
      }
    } catch (err: any) {
      lastError = err?.message || 'AI request failed';
    }
  }

  console.warn(`[exam-generator] AI generation failed, using fallback exam. ${lastError}`);
  return buildFallbackExam(params);
}