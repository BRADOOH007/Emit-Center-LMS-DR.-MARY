import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { Certificate } from '@/types';
import { awardBadge } from '@/lib/badges';

// 96-bit random verification hash — not derivable from user/course ids, so it
// cannot be forged by guessing.
export function verificationHashFor(_userId: string, _courseId: string): string {
  return `EMIT-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export interface IssueCertificateInput {
  userId: string;
  courseId: string;
  completionDate?: string;
}

export async function issueCertificate({
  userId,
  courseId,
  completionDate = new Date().toISOString(),
}: IssueCertificateInput): Promise<Certificate> {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return mapCertificate(existing);

  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.course.findUnique({ where: { id: courseId } }),
  ]);

  // Retry on the astronomically-unlikely random hash collision.
  let certificate;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      certificate = await prisma.certificate.create({
        data: {
          userId,
          courseId,
          studentName: user?.fullName ?? 'Student',
          courseTitle: course?.title ?? 'Course',
          completionDate: new Date(completionDate),
          verificationHash: verificationHashFor(userId, courseId),
        },
      });
      break;
    } catch (err) {
      if (attempt === 2 || !(err as { code?: string })?.code?.startsWith?.('P2002')) throw err;
    }
  }
  if (!certificate) throw new Error('Unable to generate a unique certificate code');

  // Award completion badges.
  awardBadge(userId, 'Course Completer', courseId).catch(() => {});
  const grade = await prisma.gradebookEntry.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { letterGrade: true },
  });
  if (grade?.letterGrade && ['A+', 'A', 'A-'].includes(grade.letterGrade)) {
    awardBadge(userId, 'High Achiever', courseId).catch(() => {});
  }

  return mapCertificate(certificate);
}

export async function getStudentCertificates(userId: string): Promise<Certificate[]> {
  const certs = await prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: 'desc' },
  });
  return certs.map(mapCertificate);
}

export async function getIssuedCertificates(): Promise<Certificate[]> {
  const certs = await prisma.certificate.findMany({
    orderBy: { issuedAt: 'desc' },
  });
  return certs.map(mapCertificate);
}

export async function verifyCertificate(hash: string): Promise<Certificate | null> {
  const cert = await prisma.certificate.findUnique({ where: { verificationHash: hash } });
  return cert ? mapCertificate(cert) : null;
}

function mapCertificate(row: {
  id: string;
  userId: string;
  courseId: string;
  studentName: string;
  courseTitle: string;
  completionDate: Date;
  verificationHash: string;
  issuedAt: Date;
}): Certificate {
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    studentName: row.studentName,
    courseTitle: row.courseTitle,
    completionDate: row.completionDate.toISOString(),
    verificationHash: row.verificationHash,
    issuedAt: row.issuedAt.toISOString(),
  };
}
