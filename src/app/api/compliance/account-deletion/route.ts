import { NextRequest } from 'next/server';
import { MOCK_DELETION_REQUESTS, MOCK_CONSENT_RECORDS, MOCK_AUDIT_LOGS } from '@/lib/mock-data';
import { ok, notFound, badRequest, parseBody } from '@/lib/api-helpers';
import { generateId } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const reqs = MOCK_DELETION_REQUESTS.filter((r) => r.userId === params.userId);
  return ok(reqs);
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{ userId: string; reason?: string }>(request);
    if (!body.userId) return badRequest('userId is required');

    const existing = MOCK_DELETION_REQUESTS.find(
      (r) => r.userId === body.userId && (r.status === 'pending' || r.status === 'grace_period'),
    );
    if (existing) return badRequest('A deletion request is already in progress.');

    const now = new Date().toISOString();
    const graceEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const deletionRequest = {
      id: generateId('del'),
      userId: body.userId,
      status: 'grace_period' as const,
      reason: body.reason,
      requestedAt: now,
      gracePeriodEnd: graceEnd,
    };

    MOCK_DELETION_REQUESTS.push(deletionRequest);
    MOCK_AUDIT_LOGS.push({
      id: generateId('aud'),
      userId: body.userId,
      action: 'account.deletion_requested',
      resourceType: 'account',
      resourceId: body.userId,
      createdAt: now,
    });

    MOCK_CONSENT_RECORDS.forEach((r) => {
      if (r.userId === body.userId) r.status = 'expired';
    });

    return ok(deletionRequest);
  } catch {
    return badRequest('Invalid request body');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await parseBody<{ userId: string }>(request);
    if (!body.userId) return badRequest('userId is required');

    const deletionRequest = MOCK_DELETION_REQUESTS.find(
      (r) => r.userId === body.userId && r.status === 'grace_period',
    );
    if (!deletionRequest) return badRequest('No active grace-period deletion request found.');

    const now = new Date();
    const graceEnd = new Date(deletionRequest.gracePeriodEnd);
    if (now < graceEnd) {
      return badRequest('Grace period has not expired. Deletion will proceed automatically on the scheduled date.');
    }

    deletionRequest.status = 'completed';
    deletionRequest.completedAt = now.toISOString();

    MOCK_AUDIT_LOGS.push({
      id: generateId('aud'),
      userId: body.userId,
      action: 'account.deleted',
      resourceType: 'account',
      resourceId: body.userId,
      createdAt: now.toISOString(),
    });

    return ok({ message: 'Account permanently deleted.', completedAt: now.toISOString() });
  } catch {
    return badRequest('Invalid request body');
  }
}
