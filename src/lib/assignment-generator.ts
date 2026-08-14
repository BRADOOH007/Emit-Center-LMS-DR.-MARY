import { OpenAIService } from '@/lib/openai-service';
import { cleanAiJson } from '@/lib/ai-generation-utils';
import { buildCurriculumAssessmentContext } from '@/lib/curriculum-prompt';

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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await OpenAIService.generateTextDetailed(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 2500, temperature: 0.6 },
      );

      if (raw?.content) {
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