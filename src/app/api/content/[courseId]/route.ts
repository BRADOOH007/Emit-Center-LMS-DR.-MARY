import { NextRequest } from 'next/server';
import { MOCK_LESSON_SECTIONS, MOCK_LESSON_CONTENTS } from '@/lib/mock-data';
import { ok } from '@/lib/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const sections = MOCK_LESSON_SECTIONS.map((section) => ({
    ...section,
    contents: MOCK_LESSON_CONTENTS
      .filter((c) => c.sectionId === section.id && c.courseId === params.courseId)
      .sort((a, b) => a.order - b.order),
  })).sort((a, b) => a.order - b.order);

  return ok({ sections, courseId: params.courseId });
}
