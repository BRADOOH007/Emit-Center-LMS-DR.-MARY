import { OpenAIService } from '@/lib/openai-service';
import { cleanAiJson } from '@/lib/ai-generation-utils';

export interface EssayToGrade {
  questionId: string;
  question: string;
  yourAnswer: string;
  modelAnswer?: string;
  points: number;
}

export interface EssayGrade {
  questionId: string;
  earned: number;
  feedback: string;
}

interface EssayBatch {
  questionId: string;
  question: string;
  modelAnswer?: string;
  yourAnswer: string;
  points: number;
}

export async function gradeEssays(essays: EssayToGrade[]): Promise<EssayGrade[]> {
  if (essays.length === 0) return [];

  const batch: EssayBatch[] = essays.map((e) => ({
    questionId: e.questionId,
    question: e.question,
    modelAnswer: e.modelAnswer,
    yourAnswer: e.yourAnswer,
    points: e.points,
  }));

  const systemPrompt = `You are a fair, encouraging exam marker. You evaluate student essay answers against expected marking points and award points out of the allowed maximum.

Rules:
- Use the model answer as the gold standard, but credit reasonable alternative correct answers.
- Score on a 0..max scale. Be honest — do not inflate scores.
- Where no answer was given or it is clearly off-topic, award 0 with constructive feedback.
- Always return a JSON array only. No markdown, no commentary.

JSON shape:
[
  { "questionId": "q1", "earned": 5, "feedback": "Concise feedback" }
]`;

  const userPrompt = `Grade the following student answers. For each, award a score between 0 and the question's maximum points, and give 1-2 sentences of actionable feedback.

${JSON.stringify(batch, null, 2)}`;

  let parsed: EssayGrade[] | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await OpenAIService.generateTextDetailed(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 2000, temperature: 0.3 },
      );
      if (!raw?.content) continue;
      const cleaned = cleanAiJson(raw.content);
      if (!cleaned) continue;
      const result = JSON.parse(cleaned);
      if (Array.isArray(result)) {
        parsed = result
          .filter((r: any) => r && typeof r === 'object' && r.questionId)
          .map((r: any) => ({
            questionId: String(r.questionId),
            earned: Number.isFinite(Number(r.earned)) && Number(r.earned) > 0 ? Math.min(Number(r.earned), Number(r.max) || Infinity) : 0,
            feedback: String(r.feedback ?? ''),
          }));
        if (parsed.length > 0) break;
      }
    } catch {
      /* retry once */
    }
  }

  if (!parsed || parsed.length === 0) {
    return essays.map((e) => ({
      questionId: e.questionId,
      earned: 0,
      feedback: 'Could not be auto-graded — flagged for instructor review.',
    }));
  }

  const cap = (questionId: string, points: number, earned: number) =>
    Math.max(0, Math.min(earned, points));

  return essays.map((e) => {
    const found = parsed!.find((p) => p.questionId === e.questionId);
    if (!found) {
      return {
        questionId: e.questionId,
        earned: 0,
        feedback: 'Could not be auto-graded — flagged for instructor review.',
      };
    }
    return {
      questionId: e.questionId,
      earned: cap(e.questionId, e.points, found.earned),
      feedback: found.feedback || 'No feedback provided.',
    };
  });
}