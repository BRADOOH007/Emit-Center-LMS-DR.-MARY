import { badRequest, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { OpenAIService } from '@/lib/openai-service';
import { stripLatex } from '@/lib/clean-ai-text';
import { buildCurriculumLessonContext, buildUSCurriculumKnowledge, DEFAULT_CURRICULUM, DEFAULT_COUNTRY } from '@/lib/curriculum-prompt';
import { buildStudentContext } from '@/lib/student-context';
import { checkAIUsageAllowed, recordAIUsage } from '@/lib/ai-usage';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON body');

  const {
    message,
    context,
    lessonContext,
    unitContext,
    assignmentsContext,
    autoTeach,
    lessonContent,
    subject,
    topic,
    messages,
    studentName,
    grade,
    curriculum,
  } = body;

  if (!message) {
    return badRequest('Message is required');
  }

  const me = await getSessionUser();
  let userId: string | null = null;
  if (me) userId = me.id;

  if (userId) {
    const usage = await checkAIUsageAllowed(userId);
    if (!usage.allowed) {
      return badRequest(usage.reason ?? 'AI usage limit reached');
    }
  }

  const name = studentName || (me ? me.name.split(' ')[0] : 'student');
  const subj = subject || 'your studies';
  const gradeStr = grade ? ` at ${grade} level` : '';

  let systemPrompt = `You are Emit Tutor Bot, an encouraging and patient AI learning assistant for ${name} at EMIT Center. Always address ${name} naturally by name, encourage their progress, simplify complex concepts, and align explanations with${gradeStr} their learning level. You are warm, supportive, and make learning enjoyable.`;

  const explicitCurriculum =
    curriculum && curriculum !== DEFAULT_CURRICULUM ? curriculum : 'us-generic';
  const curCtx = buildCurriculumLessonContext({
    curriculum: explicitCurriculum,
    country: DEFAULT_COUNTRY,
    grade: grade || '',
    subject: subject || '',
  });
  if (curCtx) systemPrompt += `\n\n${curCtx}`;
  systemPrompt += ` Always respond in a helpful, concise way — keep explanations clear but not too long.`;

  if (context === 'student_tutor' && (subject || topic)) {
    systemPrompt += `\n\nRight now ${name} is studying ${subj}${gradeStr}${topic ? `, specifically the topic "${topic}"` : ''}. ${name} may ask about recent course content or need help with this topic. Respond empathetically with specific study tips for ${topic || subj}, suggest reviewing the key concepts, and offer to quiz them on it.`;
  }

  let contextInfo = '';
  if (me) {
    contextInfo = `\n\n${await buildStudentContext(me.id)}`;
  }

  if (context === 'teacher_assistant') {
    systemPrompt = `You are Emit Tutor Bot, an AI teaching assistant for EMIT Center. You help teachers with:
1. Lesson Planning — Create detailed, engaging curriculum-aligned lesson plans
2. Curriculum Development — Structure curricula and learning objectives
3. Assessment Ideas — Suggest creative, curriculum-appropriate assessments
4. Student Engagement — Make learning interactive and practical
5. Differentiation — Adapt content for different learning styles
6. Classroom Management — Positive learning environment strategies

Be practical, actionable, and encouraging. Reference the US curriculum and local education context.`;
  } else if (context === 'student_tutor') {
    if (lessonContext?.lessonPlan) {
      const { title, subject: ls, grade: lg, content } = lessonContext.lessonPlan;
      contextInfo += `\n\nCURRENT LESSON: "${title}" — ${ls}, ${lg}.\nContent summary: ${(content?.generatedContent || '').slice(0, 400)}`;
    }
    if (unitContext?.unitPlan) {
      const { title, subject: ss, grade: sg } = unitContext.unitPlan;
      contextInfo += `\n\nCURRENT UNIT: "${title}" — ${ss}, ${sg}.`;
    }
    if (assignmentsContext?.assignments?.length) {
      const names = assignmentsContext.assignments.slice(0, 3).map((a: any) => a.title).join(', ');
      contextInfo += `\n\nACTIVE ASSIGNMENTS: ${names}.`;
    }

    if (autoTeach && lessonContent) {
      const truncated =
        lessonContent.length > 4000 ? lessonContent.slice(0, 4000) + '\n\n[Content truncated]' : lessonContent;
      systemPrompt = `You are an interactive AI Tutor for EMIT Center. Your role is to TEACH the following lesson on "${topic}" (${subj}) to a student in a conversational, engaging way.
${contextInfo}

LESSON CONTENT:
${truncated}

Teaching rules:
1. Start by briefly summarising the key points from the notes above (2-3 sentences).
2. Then ask 5 multiple choice questions ONE AT A TIME. Wait for the student to answer before revealing the correct answer.
3. After each answer: tell them if they were correct, give a brief explanation, then move to the next question.
4. Each MCQ must have 4 options labelled A, B, C, D.
5. Use relatable US examples and contexts.
6. Be encouraging — praise correct answers, gently correct wrong ones with a clearer explanation.
7. After all 5 questions, ask if they want to review any topic again or try more questions.
8. Stay educational — answer ANY question naturally, then gently guide back to learning`;
    }
  }

  if ((context === 'student_tutor' || context === 'teacher_assistant') && !autoTeach) {
    systemPrompt += `\n\n${buildUSCurriculumKnowledge()}`;
  }

  let conversationMemory = '';
  if (context === 'student_tutor' && userId) {
    const memory = await prisma.chatMessage.findMany({
      where: { userId, sessionId: null, room: 'tutor' },
      orderBy: { timestamp: 'desc' },
      take: 8,
    });
    if (memory.length > 0) {
      const recent = memory.reverse();
      conversationMemory = `\n\nCONVERSATION MEMORY — You have talked with ${name} before. Here is the recent history:\n${recent
        .map((m) => `${m.role === 'assistant' ? 'Emit Tutor Bot' : name}: ${m.content.slice(0, 400)}`)
        .join('\n')}\n\nPick up naturally where they left off. Reference the earlier topic when relevant and continue from there.`;
    }
  }
  if (conversationMemory) systemPrompt += conversationMemory;

  const chatMessages: { role: 'user' | 'system' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];
  if (context !== 'student_tutor' && Array.isArray(messages)) {
    for (const m of messages) {
      const role = m.role === 'ai' || m.role === 'assistant' ? ('assistant' as const) : ('user' as const);
      chatMessages.push({ role, content: m.content });
    }
  }
  chatMessages.push({ role: 'user', content: message });

  if (userId && context === 'student_tutor') {
    await prisma.chatMessage
      .create({
        data: {
          userId,
          userName: me?.name ?? name,
          role: 'user',
          content: message,
          room: 'tutor',
        },
      })
      .catch(() => {});
  }

  let detailed;
  try {
    detailed = await OpenAIService.generateTextDetailed(chatMessages, {
      maxTokens: autoTeach ? 1200 : 1000,
      temperature: autoTeach ? 0.75 : 0.7,
    });
  } catch (err: any) {
    return badRequest(err?.message || 'AI request failed. Please try again.');
  }

  if (userId && detailed.tokensUsed) {
    recordAIUsage(userId, detailed.tokensUsed).catch(() => {});
  }

  if (userId && context === 'student_tutor' && detailed.content) {
    await prisma.chatMessage
      .create({
        data: {
          userId,
          userName: 'Emit Tutor Bot',
          role: 'assistant',
          content: detailed.content,
          room: 'tutor',
        },
      })
      .catch(() => {});
  }

  return ok({
    response: stripLatex(detailed.content),
    provider: detailed.provider,
    model: detailed.model,
    tokensUsed: detailed.tokensUsed,
    latencyMs: detailed.latencyMs,
  });
}