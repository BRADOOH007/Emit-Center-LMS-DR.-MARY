import { NextRequest } from 'next/server';
import { MOCK_COURSES } from '@/lib/mock-data';
import { ok, notFound } from '@/lib/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const course = MOCK_COURSES.find((c) => c.id === params.id || c.slug === params.id);
  if (!course) return notFound('Course not found');
  return ok(course);
}
