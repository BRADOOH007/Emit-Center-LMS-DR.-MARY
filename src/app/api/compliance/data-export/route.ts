import { NextRequest } from 'next/server';
import { MOCK_DATA_EXPORT_REQUESTS, MOCK_AUDIT_LOGS } from '@/lib/mock-data';
import { ok, notFound, badRequest, parseBody } from '@/lib/api-helpers';
import { generateId } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: { requestId: string } }) {
  const exp = MOCK_DATA_EXPORT_REQUESTS.find((r) => r.id === params.requestId);
  if (!exp) return notFound('Export request not found');
  return ok(exp);
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{ userId: string; format: string }>(request);
    if (!body.userId || !body.format) return badRequest('userId and format are required');
    if (body.format !== 'json' && body.format !== 'csv') return badRequest('Format must be json or csv');

    const now = new Date().toISOString();
    const exp = {
      id: generateId('exp'),
      userId: body.userId,
      format: body.format as 'json' | 'csv',
      status: 'completed' as const,
      requestedAt: now,
      completedAt: new Date(Date.now() + 3000).toISOString(),
      downloadUrl: `https://data.emitcenter.com/exports/${generateId('')}.${body.format}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    MOCK_DATA_EXPORT_REQUESTS.push(exp);
    MOCK_AUDIT_LOGS.push({
      id: generateId('aud'),
      userId: body.userId,
      action: 'data.export_requested',
      resourceType: 'data',
      resourceId: exp.id,
      createdAt: now,
    });

    return ok(exp);
  } catch {
    return badRequest('Invalid request body');
  }
}
