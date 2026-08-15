import { NextRequest } from 'next/server';
import { ok, notFound, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import {
  getIssuedCertificates,
  getInstructorCertificates,
  getStudentCertificates,
  issueCertificate,
} from '@/lib/certificates';
import { prisma } from '@/lib/prisma';

async function canViewStudentCertificates(me: { id: string; roles: string[] }, targetUserId: string): Promise<boolean> {
  if (me.id === targetUserId) return true;
  if (isAdminRole(me.roles)) return true;
  if (me.roles.includes('instructor')) {
    const teaches = await prisma.course.findFirst({
      where: { instructorId: me.id, enrollments: { some: { userId: targetUserId } } },
    });
    return Boolean(teaches);
  }
  if (me.roles.includes('parent')) {
    const link = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: me.id, studentId: targetUserId } },
    });
    return Boolean(link);
  }
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const hash = searchParams.get('hash');
  const userId = searchParams.get('userId');

  // Public certificate verification by hash.
  if (hash) {
    const cert = (await getIssuedCertificates()).find((c) => c.verificationHash === hash);
    if (!cert) return notFound('Certificate not found or invalid');
    return ok({ valid: !cert.revokedAt, certificate: cert });
  }

  // Scoped lookup for a signed-in user's own certificates (or a parent viewing
  // a linked student's certificates, or an instructor viewing their students').
  if (userId) {
    const me = await getSessionUser();
    if (!me) return forbid('Sign in required');
    if (!(await canViewStudentCertificates(me, userId))) return forbid('Not authorized');
    const certs = await getStudentCertificates(userId);
    return ok(certs);
  }

  // Admin listing of all issued certificates. Instructors get scoped to the
  // certificates issued for students in the courses they teach.
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (isAdminRole(me.roles)) return ok(await getIssuedCertificates());
  if (me.roles.includes('instructor')) return ok(await getInstructorCertificates(me.id));
  return forbid('Not authorized');
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
