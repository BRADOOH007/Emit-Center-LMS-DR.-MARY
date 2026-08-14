import { OpenAIService } from '@/lib/openai-service';
import { cleanAiJson } from '@/lib/ai-generation-utils';
import { buildCurriculumAssessmentContext } from '@/lib/curriculum-prompt';

export interface PresentationSlide {
  id: string;
  title: string;
  section: 'introduction' | 'body' | 'conclusion';
  content: string[];
  speakerNotes?: string;
  imagePrompt?: string;
}

export interface GeneratedPresentation {
  title: string;
  description: string;
  slideCount: number;
  slides: PresentationSlide[];
}

export interface PresentationGenerationParams {
  subject: string;
  topic: string;
  grade?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  slideCount?: number;
  curriculum?: string;
  country?: string;
  supportingContext?: string;
}

const DIFFICULTY_HINT: Record<string, string> = {
  easy: 'Basic recall and introduction. Simple, concrete language suitable for younger learners.',
  medium: 'Balanced mix of concepts, examples, and short activities. Clear progression across slides.',
  hard: 'Detailed, analytical slides with advanced vocabulary, case studies, and discussion prompts.',
};

function buildPrompt(params: PresentationGenerationParams): { systemPrompt: string; userPrompt: string } {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;
  const grade = params.grade?.trim() ?? '';
  const difficulty = params.difficulty ?? 'medium';
  const slideCount = Math.max(4, Math.min(15, Math.round(params.slideCount ?? 8)));

  const curriculumCtx = buildCurriculumAssessmentContext({
    curriculum: params.curriculum,
    country: params.country,
    grade,
    subject,
  });

  const systemPrompt = `You are an expert curriculum designer who builds engaging, classroom-ready slide presentations for EMIT Center.

${curriculumCtx}

Formatting requirements:
- Return ONLY valid JSON. No markdown fences, no commentary outside the JSON.
- Produce exactly ${slideCount} slides.
- Each slide: id, title, section ("introduction" | "body" | "conclusion"), content (array of concise bullet strings), optional speakerNotes, optional imagePrompt.
- Slide 1 is the title slide (section "introduction"). The final slide must be a summary or "thank you" / follow-up slide (section "conclusion").
- Content should be scannable bullets, not long paragraphs. Keep each bullet under 140 characters.
- Language must be age-appropriate for ${grade || 'the target learners'}.
- Sequence slides logically: hook → key concepts → examples → practice → recap.

Expected JSON shape:
{
  "title": "string",
  "description": "string",
  "slides": [
    {
      "id": "s1",
      "title": "string",
      "section": "introduction",
      "content": ["bullet 1", "bullet 2", "bullet 3"],
      "speakerNotes": "string",
      "imagePrompt": "string"
    }
  ]
}`;

  const userPrompt = `Create a slide presentation for ${subject} on the topic "${topic}"${grade ? ` at ${grade} level` : ''}.

Difficulty: ${difficulty} — ${DIFFICULTY_HINT[difficulty] ?? ''}
Number of slides: ${slideCount}

${params.supportingContext ? `Additional context:\n${params.supportingContext}` : ''}

Make the content specific to "${topic}" — avoid generic filler. Each slide title must be meaningful and content must be accurate and instructional. Return the JSON now.`;

  return { systemPrompt, userPrompt };
}

function normalizeSlides(rawSlides: any[]): PresentationSlide[] {
  const slides: PresentationSlide[] = [];
  const unique: string[] = [];
  for (const raw of rawSlides) {
    if (!raw || typeof raw !== 'object') continue;
    const title = String(raw.title ?? '').trim();
    if (!title) continue;

    let id = String(raw.id ?? raw.slideNumber ?? `s${slides.length + 1}`).trim();
    if (!id || unique.includes(id)) id = `s${slides.length + 1}`;
    unique.push(id);

    const content = Array.isArray(raw.content)
      ? raw.content.map((c: any) => String(c ?? '').trim()).filter(Boolean).slice(0, 8)
      : [];
    if (content.length === 0) continue;

    const sectionRaw = String(raw.section ?? '').toLowerCase();
    const section: PresentationSlide['section'] =
      sectionRaw === 'conclusion'
        ? 'conclusion'
        : sectionRaw === 'body'
          ? 'body'
          : 'introduction';

    slides.push({
      id,
      title,
      section,
      content,
      speakerNotes: String(raw.speakerNotes ?? raw.notes ?? '').trim() || undefined,
      imagePrompt: String(raw.imagePrompt ?? '').trim() || undefined,
    });
  }
  return slides;
}

function buildFallbackPresentation(params: PresentationGenerationParams): GeneratedPresentation {
  const subject = (params.subject || '').trim() || 'General Studies';
  const topic = (params.topic || '').trim() || subject;
  const count = Math.max(4, Math.min(15, Math.round(params.slideCount ?? 8)));

  const slides: PresentationSlide[] = [
    {
      id: 's1',
      title: `${topic} — ${subject}`,
      section: 'introduction',
      content: ['Welcome! Today we explore this topic together.', `Subject: ${subject}`, 'Learning goals are shared on the next slides.'],
      speakerNotes: 'Greet learners and set expectations for the session.',
      imagePrompt: `An engaging cover illustration for a class titled ${topic}`,
    },
  ];

  const bodyCount = Math.max(2, count - 3);
  for (let i = 0; i < bodyCount; i++) {
    slides.push({
      id: `s${slides.length + 1}`,
      title: `Key idea ${i + 1}`,
      section: 'body',
      content: [
        `Core concept ${i + 1} related to ${topic}.`,
        'A simple explanation with a concrete example.',
        'How it applies to everyday life or practice.',
        'Quick checkpoint question to check understanding.',
      ],
      speakerNotes: `Explain key idea ${i + 1}, give an example, and ask one checking question.`,
    });
  }

  slides.push({
    id: `s${slides.length + 1}`,
    title: 'Summary & Next Steps',
    section: 'conclusion',
    content: [
      'We covered: definition, key ideas, and examples.',
      `Try: apply one idea from ${topic} today.`,
      'Questions? Discuss with your instructor.',
    ],
    speakerNotes: 'Recap the main points and assign a small practice task.',
  });

  return {
    title: `${topic} Presentation`,
    description: `An auto-generated presentation for ${subject} covering ${topic}.`,
    slideCount: slides.length,
    slides,
  };
}

function validatePresentation(parsed: any, params: PresentationGenerationParams): GeneratedPresentation | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const slides = normalizeSlides(Array.isArray(parsed.slides) ? parsed.slides : []);
  if (slides.length === 0) return null;

  const title = String(parsed.title ?? '').trim() || `${(params.topic || params.subject || 'Presentation').trim()} Presentation`;
  const description = String(parsed.description ?? '').trim() || `Auto-generated presentation for ${title}`;

  return {
    title,
    description,
    slideCount: slides.length,
    slides,
  };
}

export async function generatePresentation(params: PresentationGenerationParams): Promise<GeneratedPresentation> {
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
          const presentation = validatePresentation(parsed, params);
          if (presentation) return presentation;
        }
      }
    } catch (err: any) {
      lastError = err?.message || 'AI request failed';
    }
  }

  console.warn(`[presentation-generator] AI generation failed, using fallback. ${lastError}`);
  return buildFallbackPresentation(params);
}