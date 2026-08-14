import { NextRequest } from 'next/server';
import { ok, forbid, badRequest } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';
import { OpenAIService } from '@/lib/openai-service';

const PROMPTS: Record<string, string> = {
  chat: 'What is photosynthesis? Explain in 2 sentences.',
  lesson_plan:
    'Create a Common Core aligned lesson plan for Grade 7 Mathematics on fractions. Return JSON with title, objectives, activities and assessment.',
  unit_plan:
    'Create a 4-week unit plan for Grade 6 Science covering Plants, Animals and Environment. Return JSON with weekly topics.',
  presentation:
    'Create PowerPoint slide content for a Grade 9 History lesson on the American Revolution. Return JSON with 4 slides.',
  quiz:
    'Create a 5 question multiple choice quiz on the US Constitution for Grade 8. Return JSON with questions, options and correct answers.',
};

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await request.json().catch(() => null);
  const testType = typeof body?.testType === 'string' ? body.testType : 'chat';

  if (testType !== 'chat' && !PROMPTS[testType]) return badRequest('Unknown test type');

  const start = Date.now();
  const userMessage =
    testType === 'chat' && typeof body?.message === 'string' && body.message.trim()
      ? body.message
      : PROMPTS[testType];

  try {
    const detailed = await OpenAIService.generateTextDetailed([
      {
        role: 'system',
        content:
          'You are Emit Tutor Bot for EMIT Center, a US-based learning platform. Follow the US curriculum context. Be concise and helpful.',
      },
      { role: 'user', content: userMessage },
    ]);

    return ok({
      success: true,
      testType,
      provider: detailed.provider,
      model: detailed.model,
      latencyMs: detailed.latencyMs ?? Date.now() - start,
      tokensUsed: detailed.tokensUsed,
      output: detailed.content.slice(0, 2000),
    });
  } catch (e: any) {
    return ok({
      success: false,
      testType,
      provider: 'none',
      model: 'none',
      latencyMs: Date.now() - start,
      output: '',
      error: e?.message || 'AI call failed',
    });
  }
}