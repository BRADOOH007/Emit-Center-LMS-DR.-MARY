import { NextRequest } from 'next/server';
import { MOCK_COURSES } from '@/lib/mock-data';
import { ok, badRequest, notFound, forbid, parseBody } from '@/lib/api-helpers';
import { generateId } from '@/lib/validation';
import type { Enrollment } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{ userId: string; courseId: string }>(request);
    if (!body.userId || !body.courseId) {
      return badRequest('userId and courseId are required');
    }

    const course = MOCK_COURSES.find((c) => c.id === body.courseId);
    if (!course) return notFound('Course not found');
    if (course.enrolledCount >= course.maxSeats) {
      return forbid();
    }

    const now = new Date().toISOString();
    const enrollment: Enrollment = {
      id: generateId('enr'),
      userId: body.userId,
      courseId: body.courseId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    course.enrolledCount += 1;
    return ok(enrollment);
  } catch {
    return badRequest('Invalid request body');
  }
}
