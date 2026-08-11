import { NextRequest } from 'next/server';
import { MOCK_CONSENT_RECORDS, MOCK_AUDIT_LOGS } from '@/lib/mock-data';
import { ok, notFound, badRequest, parseBody } from '@/lib/api-helpers';
import { generateId } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const records = MOCK_CONSENT_RECORDS.filter((r) => r.userId === params.userId);
  return ok(records);
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const body = await parseBody<{
      type: string;
      parentEmail?: string;
    }>(request);
    if (!body.type) return badRequest('type is required');

    const now = new Date().toISOString();
    const record = {
      id: generateId('con'),
      userId: params.userId,
      type: body.type as typeof MOCK_CONSENT_RECORDS[0]['type'],
      status: 'pending' as const,
      parentEmail: body.parentEmail,
      parentVerificationToken: body.parentEmail ? `COPPA-v-${generateId('').slice(4)}` : undefined,
      createdAt: now,
    };

    MOCK_CONSENT_RECORDS.push(record);
    MOCK_AUDIT_LOGS.push({
      id: generateId('aud'),
      userId: params.userId,
      action: 'consent.verified',
      resourceType: 'consent',
      resourceId: record.id,
      createdAt: now,
    });

    return ok(record);
  } catch {
    return badRequest('Invalid request body');
  }
}
