import { NextRequest } from 'next/server';
import { ok, notFound, badRequest, parseBody } from '@/lib/api-helpers';
import { getIssuedCertificates, issueCertificate } from '@/lib/certificates';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const hash = searchParams.get('hash');
  if (!hash) return badRequest('hash parameter is required');

  const cert = getIssuedCertificates().find((c) => c.verificationHash === hash);
  if (!cert) return notFound('Certificate not found or invalid');

  return ok({ valid: true, certificate: cert });
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{
      userId: string;
      courseId: string;
      studentName: string;
      courseTitle: string;
      completionDate: string;
    }>(request);
    if (!body.userId || !body.courseId) return badRequest('userId and courseId are required');

    const certificate = issueCertificate({
      userId: body.userId,
      courseId: body.courseId,
      completionDate: body.completionDate || new Date().toISOString(),
    });

    return ok(certificate);
  } catch {
    return badRequest('Invalid request body');
  }
}
