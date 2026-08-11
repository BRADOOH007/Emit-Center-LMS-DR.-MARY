import { NextRequest } from 'next/server';
import { MOCK_ATTENDANCE_RECORDS, MOCK_USERS } from '@/lib/mock-data';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { generateId } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const records = MOCK_ATTENDANCE_RECORDS
    .filter((r) => r.sessionId === params.sessionId)
    .map((r) => ({
      ...r,
      user: MOCK_USERS.find((u) => u.id === r.userId),
    }));

  return ok(records);
}

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const body = await parseBody<{
      userId: string;
      status: string;
      checkInMethod?: string;
    }>(request);
    if (!body.userId || !body.status) {
      return badRequest('userId and status are required');
    }

    const existing = MOCK_ATTENDANCE_RECORDS.find(
      (r) => r.sessionId === params.sessionId && r.userId === body.userId,
    );

    if (existing) {
      existing.status = body.status as typeof existing.status;
      existing.checkInMethod = (body.checkInMethod as typeof existing.checkInMethod) ?? existing.checkInMethod;
      existing.checkInTime = new Date().toISOString();
      return ok(existing);
    }

    const record = {
      id: generateId('att'),
      sessionId: params.sessionId,
      userId: body.userId,
      status: body.status as 'present' | 'absent' | 'late' | 'excused',
      checkInMethod: (body.checkInMethod as 'manual' | 'qr' | 'auto') ?? 'manual',
      checkInTime: new Date().toISOString(),
    };

    MOCK_ATTENDANCE_RECORDS.push(record);
    return ok(record);
  } catch {
    return badRequest('Invalid request body');
  }
}
