import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { sendEmail, logDelivery } from '@/lib/delivery';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

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

  const verifyUrl = `${APP_URL}/certificate/${cert.verificationHash}`;

  const emailResult = await sendEmail({
    to: cert.user.email,
    subject: `Your EMIT Center certificate — ${cert.courseTitle}`,
    text: [
      `Congratulations, ${cert.studentName}!`,
      '',
      `You have earned a Certificate of Completion for:`,
      cert.courseTitle,
      '',
      `Verify your certificate: ${verifyUrl}`,
      `Verification code: ${cert.verificationHash}`,
      '',
      '— EMIT Center Foundation',
    ].join('\n'),
    html: [
      `<p>Congratulations, <strong>${cert.studentName}</strong>!</p>`,
      `<p>You have earned a <strong>Certificate of Completion</strong> for:</p>`,
      `<h2>${cert.courseTitle}</h2>`,
      `<p><a href="${verifyUrl}">View &amp; verify your certificate</a></p>`,
      `<p style="color:#888">Verification code: ${cert.verificationHash}</p>`,
      `<p>— EMIT Center Foundation</p>`,
    ].join(''),
  });

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

  return ok({ sent: true, email: cert.user.email, delivery: emailResult.status });
}
