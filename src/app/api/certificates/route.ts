import { NextRequest } from 'next/server';
import { ok, notFound, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { getIssuedCertificates, getStudentCertificates, issueCertificate } from '@/lib/certificates';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const hash = searchParams.get('hash');
  const userId = searchParams.get('userId');

  // Public certificate verification by hash.
  if (hash) {
    const cert = (await getIssuedCertificates()).find((c) => c.verificationHash === hash);
    if (!cert) return notFound('Certificate not found or invalid');
    return ok({ valid: true, certificate: cert });
  }

  // Scoped lookup for a signed-in user's own certificates.
  if (userId) {
    const me = await getSessionUser();
    if (!me) return forbid('Sign in required');
    if (me.id !== userId) return forbid('Not authorized');
    const certs = await getStudentCertificates(userId);
    return ok(certs);
  }

  // Admin listing of all issued certificates.
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Not authorized');
  return ok(await getIssuedCertificates());
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{
    userId?: string;
    courseId?: string;
    completionDate?: string;
  }>(request).catch(() => null);

  if (!body?.userId || !body?.courseId) return badRequest('userId and courseId are required');

  const certificate = await issueCertificate({
    userId: body.userId,
    courseId: body.courseId,
    completionDate: body.completionDate || new Date().toISOString(),
  });

  await writeAuditLog({
    userId: me.id,
    action: 'certificate.issued',
    resourceType: 'course',
    resourceId: body.courseId,
  });

  return ok(certificate);
}
