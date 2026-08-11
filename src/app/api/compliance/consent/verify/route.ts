import { NextRequest } from 'next/server';
import { MOCK_CONSENT_RECORDS } from '@/lib/mock-data';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{ token: string }>(request);
    if (!body.token) return badRequest('Verification token is required');

    const record = MOCK_CONSENT_RECORDS.find((r) => r.parentVerificationToken === body.token);
    if (!record) return badRequest('Invalid or expired verification token');

    if (record.status === 'verified') return ok({ message: 'Already verified', record });

    record.status = 'verified';
    record.verifiedAt = new Date().toISOString();

    return ok({ message: 'Parental consent verified successfully.', record });
  } catch {
    return badRequest('Invalid request body');
  }
}
