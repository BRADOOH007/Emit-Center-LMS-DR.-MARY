import { prisma } from '@/lib/prisma';
import type { Certificate } from '@/types';

const HEX = '0123456789abcdef';

function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function hexN(value: number, length: number): string {
  let out = '';
  let v = value >>> 0;
  for (let i = 0; i < length; i += 1) {
    out += HEX[v & 0xf];
    v >>>= 4;
  }
  return out;
}

export function verificationHashFor(userId: string, courseId: string): string {
  const h1 = hash32(`${userId}::${courseId}`);
  const h2 = hash32(`${courseId}::${userId}`);
  return `EMIT-${hexN(h1, 6)}${hexN(h2, 6)}`;
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

  const certificate = await prisma.certificate.create({
    data: {
      userId,
      courseId,
      studentName: user?.fullName ?? 'Student',
      courseTitle: course?.title ?? 'Course',
      completionDate: new Date(completionDate),
      verificationHash: verificationHashFor(userId, courseId),
    },
  });

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
