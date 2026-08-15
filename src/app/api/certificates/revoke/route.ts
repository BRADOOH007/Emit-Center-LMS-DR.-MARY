import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { setCertificateRevoked } from '@/lib/certificates';

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const isAdmin = isAdminRole(me.roles);
  const isInstructor = me.roles.includes('instructor');
  if (!isAdmin && !isInstructor) {
    return forbid('Only instructors and administrators can revoke certificates');
  }

  const body = await parseBody<{ certificateId?: string; revoked?: boolean }>(request).catch(() => null);
  if (!body?.certificateId) return badRequest('certificateId is required');

  const cert = await prisma.certificate.findUnique({
    where: { id: body.certificateId },
    select: { id: true, userId: true, course: { select: { instructorId: true } } },
  });
  if (!cert) return badRequest('Certificate not found');

  // Instructors may only manage certificates issued to students in the courses
  // they teach, and may not unrevoke (only administrators can restore).
  if (isInstructor && !isAdmin) {
    if (cert.course.instructorId !== me.id) {
      return forbid('You can only manage certificates for courses you teach');
    }
  }

  const revoked = body.revoked !== false;

  const updated = await setCertificateRevoked(cert.id, revoked);

  await writeAuditLog({
    userId: me.id,
    action: revoked ? 'certificate.revoked' : 'certificate.unrevoked',
    resourceType: 'certificate',
    resourceId: cert.id,
  });

  return ok(updated);
}