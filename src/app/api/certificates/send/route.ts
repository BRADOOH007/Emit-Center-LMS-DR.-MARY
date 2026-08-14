import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { logDelivery } from '@/lib/delivery';
import { appUrl, sendCertificateEmail } from '@/lib/emails';

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('Only instructors and administrators can send certificates');
  }

  const body = await parseBody<{ certificateId?: string }>(request).catch(() => null);
  if (!body?.certificateId) return badRequest('certificateId is required');

  const cert = await prisma.certificate.findUnique({
    where: { id: body.certificateId },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!cert) return badRequest('Certificate not found');

  const verifyUrl = `${appUrl()}/certificate/${cert.verificationHash}`;

  await sendCertificateEmail(cert.user.email, cert.studentName, cert.courseTitle, verifyUrl, cert.verificationHash);

  await prisma.notification.create({
    data: {
      userId: cert.userId,
      type: 'certificate',
      title: 'Certificate issued',
      body: `You earned a certificate for "${cert.courseTitle}"`,
      actionUrl: `/certificate/${cert.verificationHash}`,
    },
  });

  await logDelivery(cert.userId, 'certificate.sent', 'certificate', cert.id).catch(() => {});
  await writeAuditLog({
    userId: me.id,
    action: 'certificate.sent',
    resourceType: 'certificate',
    resourceId: cert.id,
  });

  return ok({ sent: true, email: cert.user.email, delivery: 'sent' });
}
