import { OpenAIService } from '@/lib/openai-service';
import { cleanAiJson } from '@/lib/ai-generation-utils';
import { buildCurriculumAssessmentContext } from '@/lib/curriculum-prompt';
import type { AssignmentQuestion } from '@/types';

export interface GeneratedAssignment {
  title: string;
  description: string;
  instructions: string[];
  objectives: string[];
  rubric: {
    excellent: string;
    good: string;
    satisfactory: string;
    needsImprovement: string;
  };
  estimatedDays: number;
  content: string;
}

export interface GeneratedAssignmentQuiz {
  title: string;
  description: string;
  estimatedDays: number;
  questions: AssignmentQuestion[];
  totalPoints: number;
}

export interface AssignmentGenerationParams {
  subject: string;
  topic: string;
  grade?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedDays?: number;
  curriculum?: string;
  country?: string;
  supportingContext?: string;
}

const DIFFICULTY_HINT: Record<string, string> = {
  easy: 'Foundational practice with clear scaffolding and gentle tasks.',
  medium: 'Balanced tasks mixing recall, application, and a short written response.',
  hard: 'Extended, analytical tasks that require synthesis, evaluation, or a small project.',
};

function buildPrompt(params: AssignmentGenerationParams): { systemPrompt: string; userPrompt: string } {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;
  const grade = params.grade?.trim() ?? '';
  const difficulty = params.difficulty ?? 'medium';
  const estimatedDays = Math.max(1, Math.min(30, Math.round(params.estimatedDays ?? 7)));

  const curriculumCtx = buildCurriculumAssessmentContext({
    curriculum: params.curriculum,
    country: params.country,
    grade,
    subject,
  });

  const systemPrompt = `You are an expert curriculum designer who writes clear, engaging, standards-aligned assignments for EMIT Center.

${curriculumCtx}

Formatting requirements:
- Return ONLY valid JSON. No markdown fences, no commentary outside the JSON.
- instructions: array of numbered, actionable steps the student must complete.
- objectives: 3-4 "students will be able to..." style learning outcomes.
- rubric: short 1-2 sentence descriptions for excellent, good, satisfactory, needsImprovement.
- content: the full assignment text students see — a clear introduction, the task sections, and submission guidance. Use plain text with "\\n" line breaks (do NOT use markdown headings or bullet characters; use "- " for simple bullets if needed).
- Everything must be specific to "${topic}", not generic.

Expected JSON shape:
{
  "title": "string",
  "description": "string",
  "instructions": ["string", "string"],
  "objectives": ["string", "string", "string"],
  "rubric": {
    "excellent": "string",
    "good": "string",
    "satisfactory": "string",
    "needsImprovement": "string"
  },
  "estimatedDays": ${estimatedDays},
  "content": "string"
}`;

  const userPrompt = `Create an assignment for ${subject} on the topic "${topic}"${grade ? ` at ${grade} level` : ''}.

Difficulty: ${difficulty} — ${DIFFICULTY_HINT[difficulty] ?? ''}
Estimated time: ${estimatedDays} days

${params.supportingContext ? `Additional context:\n${params.supportingContext}` : ''}

Make the tasks specific to "${topic}" and practical to complete at home or in class. Return the JSON now.`;

  return { systemPrompt, userPrompt };
}

function buildFallbackAssignment(params: AssignmentGenerationParams): GeneratedAssignment {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;
  const estimatedDays = Math.max(1, Math.min(30, Math.round(params.estimatedDays ?? 7)));

  return {
    title: `${topic} Assignment`,
    description: `Complete the tasks below on ${topic} in ${subject}.`,
    instructions: [
      'Read through the topic notes or textbook chapter carefully.',
      'Complete all tasks below on a separate sheet or document.',
      'Check your work against the rubric before submitting.',
      'Submit your work before the due date through the portal.',
    ],
    objectives: [
      `Explain the key concepts of ${topic}.`,
      'Apply the ideas to a practical example.',
      'Reflect on what was learned and ask one follow-up question.',
    ],
    rubric: {
      excellent: 'All tasks completed with depth, accuracy, and thoughtful reflection.',
      good: 'Most tasks completed accurately with clear effort and a good example.',
      satisfactory: 'Tasks attempted with basic accuracy; some details missing.',
      needsImprovement: 'Incomplete or off-topic work; key ideas not demonstrated.',
    },
    estimatedDays,
    content: `Assignment: ${topic}\n\nWelcome! In this assignment you will explore ${topic}.\n\nTask 1: Define ${topic} in your own words and give one everyday example.\nTask 2: Explain why ${topic} matters in ${subject}.\nTask 3: Complete a short practice or reflection based on the lesson.\n\nSubmit your work before the due date.`,
  };
}

function validateAssignment(parsed: any, params: AssignmentGenerationParams): GeneratedAssignment | null {
  if (!parsed || typeof parsed !== 'object') return null;

  const title = String(parsed.title ?? '').trim() || `${(params.topic || params.subject || 'Assignment').trim()} Assignment`;
  const description = String(parsed.description ?? '').trim() || `Complete the tasks on ${params.topic || params.subject || title}.`;
  const instructions = Array.isArray(parsed.instructions)
    ? parsed.instructions.map((i: any) => String(i ?? '').trim()).filter(Boolean)
    : [];
  const objectives = Array.isArray(parsed.objectives)
    ? parsed.objectives.map((o: any) => String(o ?? '').trim()).filter(Boolean).slice(0, 6)
    : [];
  const rubric = parsed.rubric && typeof parsed.rubric === 'object'
    ? {
        excellent: String(parsed.rubric.excellent ?? '').trim() || 'Exceeds expectations.',
        good: String(parsed.rubric.good ?? '').trim() || 'Meets expectations.',
        satisfactory: String(parsed.rubric.satisfactory ?? '').trim() || 'Meets basic requirements.',
        needsImprovement: String(parsed.rubric.needsImprovement ?? '').trim() || 'Below expectations.',
      }
    : {
        excellent: 'Exceeds expectations.',
        good: 'Meets expectations.',
        satisfactory: 'Meets basic requirements.',
        needsImprovement: 'Below expectations.',
      };

  if (instructions.length === 0 && objectives.length === 0) return null;

  const content = String(parsed.content ?? '').trim() || description;

  return {
    title,
    description,
    instructions,
    objectives,
    rubric,
    estimatedDays: Number.isFinite(Number(parsed.estimatedDays)) && Number(parsed.estimatedDays) > 0 ? Math.round(Number(parsed.estimatedDays)) : (params.estimatedDays ?? 7),
    content,
  };
}

export async function generateAssignment(params: AssignmentGenerationParams): Promise<GeneratedAssignment> {
  const { systemPrompt, userPrompt } = buildPrompt(params);

  let lastError = '';
  let lastRaw = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      if (attempt > 0 && lastRaw) {
        messages.push({ role: 'assistant', content: lastRaw });
        messages.push({
          role: 'user',
          content:
            'That response was not valid JSON or did not match the required shape, so it could not be used. Return ONLY corrected JSON matching the exact shape. No markdown fences, no commentary, no trailing text. Escape all double quotes and newlines inside string values.',
        });
      }
      const raw = await OpenAIService.generateTextDetailed(
        messages as { role: 'system' | 'user' | 'assistant'; content: string }[],
        { maxTokens: 2500, temperature: 0.6 },
      );

      if (raw?.content) {
        lastRaw = raw.content;
        const cleaned = cleanAiJson(raw.content);
        if (cleaned) {
          const parsed = JSON.parse(cleaned);
          const assignment = validateAssignment(parsed, params);
          if (assignment) return assignment;
        }
      }
    } catch (err: any) {
      lastError = err?.message || 'AI request failed';
    }
  }

  console.warn(`[assignment-generator] AI generation failed, using fallback. ${lastError}`);
  return buildFallbackAssignment(params);
}

const QUIZ_QUESTION_COUNT = 8;

function systemRole(): string {
  return 'You are an AI that returns ONLY valid, parseable JSON. Never wrap in backticks. Escape all double quotes inside strings. Escape newlines inside string values as \\n. Your entire output must be a single JSON object.';
}

function buildQuizPrompt(params: AssignmentGenerationParams): string {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;
  const grade = params.grade?.trim() ?? '';
  const difficulty = params.difficulty ?? 'medium';

  const curriculumCtx = buildCurriculumAssessmentContext({
    curriculum: params.curriculum,
    country: params.country,
    grade,
    subject,
  });

  return `Create a self-grading assignment for EMIT Center on the topic "${topic}" in ${subject}${grade ? ` at the ${grade} level` : ''}.

${curriculumCtx}

The assignment is a set of questions students answer online and that are auto-graded. Most questions must be multiple choice (MCQ) so they grade instantly; include a small number of short-answer questions students type into a box.

Difficulty: ${difficulty} — ${DIFFICULTY_HINT[difficulty] ?? ''}

Return ONLY a JSON object with this exact shape:
{
  "title": "Assignment title",
  "description": "One or two sentences introducing the assignment",
  "questions": [
    {
      "question": "The question text",
      "type": "mcq",
      "options": ["Wrong option A", "Correct answer", "Wrong option C", "Wrong option D"],
      "correctAnswer": "Correct answer",
      "explanation": "Short explanation of why the correct answer is right",
      "points": 10
    },
    {
      "question": "A short-answer question",
      "type": "short",
      "correctAnswer": "The expected answer",
      "modelAnswer": "A fuller model answer with the key facts a good response must include",
      "explanation": "What a complete, correct answer covers",
      "points": 20
    }
  ]
}

RULES:
- Create exactly ${QUIZ_QUESTION_COUNT} questions.
- 6 questions are type "mcq"; 2 questions are type "short".
- MCQ: exactly 4 options each, one matching "correctAnswer". Vary which option is correct. Make questions test real understanding of "${topic}".
- Short answer: "correctAnswer" is a short acceptable answer; "modelAnswer" is 1-2 sentences listing the key facts graders should look for.
- Each question is worth ${difficulty === 'easy' ? '5' : difficulty === 'hard' ? '10' : '8'} points, except short-answer questions which are worth ${difficulty === 'easy' ? '10' : difficulty === 'hard' ? '20' : '15'} points.
- Do not number questions in the text. Use clear, age-appropriate language. Use US examples and contexts.
- Do not use emojis. Do not use markdown formatting inside any string.`;
}

function buildFallbackQuiz(params: AssignmentGenerationParams): GeneratedAssignmentQuiz {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;
  const mcqPoints = params.difficulty === 'easy' ? 5 : params.difficulty === 'hard' ? 10 : 8;
  const shortPoints = params.difficulty === 'easy' ? 10 : params.difficulty === 'hard' ? 20 : 15;

  const mcqs: AssignmentQuestion[] = [
    {
      id: 'q1',
      question: `What is the central idea of ${topic}?`,
      type: 'mcq',
      options: [
        `A basic fact about ${topic}`,
        `The core definition of ${topic}`,
        'An unrelated idea',
        'A common misconception',
      ],
      correctAnswer: `The core definition of ${topic}`,
      explanation: 'The central idea is the core definition that everything else builds on.',
      points: mcqPoints,
    },
    {
      id: 'q2',
      question: `Which of the following is the best real-world example of ${topic}?`,
      type: 'mcq',
      options: [
        'A made-up scenario with no connection',
        'An everyday situation that clearly shows the idea',
        'A random fact from another subject',
        'A historical date',
      ],
      correctAnswer: 'An everyday situation that clearly shows the idea',
      explanation: 'The best example is one that directly demonstrates the concept in everyday life.',
      points: mcqPoints,
    },
    {
      id: 'q3',
      question: `What is one key benefit of understanding ${topic}?`,
      type: 'mcq',
      options: [
        'It makes the topic more confusing',
        'It has no real benefit',
        'It helps you solve related problems and make better decisions',
        'It only matters for tests',
      ],
      correctAnswer: 'It helps you solve related problems and make better decisions',
      explanation: 'Understanding a topic lets you apply it to new problems and real situations.',
      points: mcqPoints,
    },
    {
      id: 'q4',
      question: `Which mistake would most likely cause a student to get ${topic} wrong?`,
      type: 'mcq',
      options: [
        'Confusing it with a similar but different idea',
        'Reading the question twice',
        'Asking for help',
        'Taking notes',
      ],
      correctAnswer: 'Confusing it with a similar but different idea',
      explanation: 'Mixing up similar ideas is the most common source of errors.',
      points: mcqPoints,
    },
    {
      id: 'q5',
      question: `How would you best explain ${topic} to a friend?`,
      type: 'mcq',
      options: [
        'Using confusing jargon only you understand',
        'By not mentioning it at all',
        'In simple words with a clear everyday example',
        'By changing the subject',
      ],
      correctAnswer: 'In simple words with a clear everyday example',
      explanation: 'A good explanation is simple, accurate, and anchored by an example.',
      points: mcqPoints,
    },
    {
      id: 'q6',
      question: `After studying ${topic}, what should you be able to do?`,
      type: 'mcq',
      options: [
        'Apply the idea to a new problem on your own',
        'Recite the lesson word-for-word only',
        'Forget it the next day',
        'Avoid related questions',
      ],
      correctAnswer: 'Apply the idea to a new problem on your own',
      explanation: 'Real learning shows up when you can apply the idea in a new situation.',
      points: mcqPoints,
    },
    {
      id: 'q7',
      question: `Define ${topic} in your own words.`,
      type: 'short',
      correctAnswer: `A correct definition of ${topic}`,
      modelAnswer: `A correct response states what ${topic} is, mentions its most important feature, and gives one short example from everyday life.`,
      explanation: 'A complete answer defines the idea, names a key feature, and gives an example.',
      points: shortPoints,
    },
    {
      id: 'q8',
      question: `Describe one real-world situation where ${topic} is used and explain why it matters.`,
      type: 'short',
      correctAnswer: `A real-world use of ${topic}`,
      modelAnswer: `A complete answer names a specific real situation, explains how ${topic} is used in it, and states why it matters to people.`,
      explanation: 'A complete answer connects the idea to a real situation and explains its importance.',
      points: shortPoints,
    },
  ];

  return {
    title: `${topic} Assignment`,
    description: `Answer the questions below on ${topic} in ${subject}.`,
    estimatedDays: Math.max(1, Math.min(30, Math.round(params.estimatedDays ?? 7))),
    questions: mcqs,
    totalPoints: mcqs.reduce((s, q) => s + q.points, 0),
  };
}

function validateQuizQuestions(parsed: any, params: AssignmentGenerationParams): AssignmentQuestion[] | null {
  const list = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (list.length === 0) return null;

  const out: AssignmentQuestion[] = [];
  let mcqCount = 0;
  let shortCount = 0;

  for (const item of list) {
    const question = String(item?.question ?? '').trim();
    if (!question) continue;
    const type = item?.type === 'short' ? 'short' : 'mcq';
    const points = Number.isFinite(Number(item?.points)) && Number(item.points) > 0 ? Math.max(1, Math.round(Number(item.points))) : (type === 'short' ? 15 : 8);

    if (type === 'mcq') {
      const options = Array.isArray(item?.options) ? item.options.map((o: any) => String(o).trim()).filter(Boolean).slice(0, 4) : [];
      const correctRaw = String(item?.correctAnswer ?? '').trim();
      if (options.length < 2 || !correctRaw) continue;
      const match = options.find((o: string) => o.toLowerCase() === correctRaw.toLowerCase());
      const correctAnswer = match ?? (options.includes(correctRaw) ? correctRaw : '');
      if (!correctAnswer) continue;
      mcqCount += 1;
      out.push({
        id: item?.id ? String(item.id) : `mcq-${mcqCount}`,
        question,
        type,
        options,
        correctAnswer,
        explanation: String(item?.explanation ?? '').trim().slice(0, 500) || undefined,
        points,
      });
    } else {
      const correctAnswer = String(item?.correctAnswer ?? '').trim();
      const modelAnswer = String(item?.modelAnswer ?? item?.correctAnswer ?? '').trim();
      if (!correctAnswer && !modelAnswer) continue;
      shortCount += 1;
      out.push({
        id: item?.id ? String(item.id) : `short-${shortCount}`,
        question,
        type,
        correctAnswer: correctAnswer || modelAnswer,
        modelAnswer: modelAnswer || correctAnswer,
        explanation: String(item?.explanation ?? '').trim().slice(0, 500) || undefined,
        points,
      });
    }
  }

  if (out.length === 0) return null;
  if (mcqCount < 3) return null;
  return out.slice(0, 10);
}

export async function generateAssignmentQuiz(params: AssignmentGenerationParams): Promise<GeneratedAssignmentQuiz> {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;

  const prompt = buildQuizPrompt(params);
  let lastError = '';
  let lastRaw = '';

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const messages = [
        { role: 'system', content: systemRole() },
        { role: 'user', content: prompt },
      ];
      if (attempt > 0 && lastRaw) {
        messages.push({ role: 'assistant', content: lastRaw });
        messages.push({
          role: 'user',
          content:
            'That response was not valid JSON or did not match the required shape (for example, options missing a matching correctAnswer), so it could not be used. Return ONLY corrected JSON matching the exact shape. Exactly 4 options per MCQ with one matching "correctAnswer". No markdown fences, no commentary, no trailing text. Escape all double quotes and newlines inside string values.',
        });
      }
      const raw = await OpenAIService.generateTextDetailed(
        messages as { role: 'system' | 'user' | 'assistant'; content: string }[],
        { maxTokens: 3000, temperature: 0.4 },
      );

      if (raw?.content) {
        lastRaw = raw.content;
        const cleaned = cleanAiJson(raw.content);
        if (!cleaned) continue;

        const parsed = JSON.parse(cleaned);
        const questions = validateQuizQuestions(parsed, params);
        if (!questions) continue;

        const title = String(parsed.title ?? '').trim() || `${topic} Assignment`;
        const description = String(parsed.description ?? '').trim() || `Answer the questions below on ${topic} in ${subject}.`;

        return {
          title: title.slice(0, 200),
          description: description.slice(0, 1000),
          estimatedDays: Number.isFinite(Number(parsed.estimatedDays)) && Number(parsed.estimatedDays) > 0 ? Math.round(Number(parsed.estimatedDays)) : Math.max(1, Math.round(params.estimatedDays ?? 7)),
          questions,
          totalPoints: questions.reduce((s, q) => s + q.points, 0),
        };
      }
    } catch (err: any) {
      lastError = err?.message || 'AI request failed';
    }
  }

  console.warn(`[assignment-generator] Quiz AI generation failed, using fallback. ${lastError}`);
  return buildFallbackQuiz(params);
}