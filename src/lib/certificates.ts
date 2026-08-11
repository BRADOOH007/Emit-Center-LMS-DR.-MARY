import { MOCK_CERTIFICATES, MOCK_COURSES, MOCK_USERS } from '@/lib/mock-data';
import { getEnrollments } from '@/lib/dashboard-data';
import { generateId } from '@/lib/validation';
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
  issuedAt?: string;
}

export function issueCertificate({
  userId,
  courseId,
  completionDate = new Date().toISOString(),
  issuedAt = new Date().toISOString(),
}: IssueCertificateInput): Certificate {
  const existing = MOCK_CERTIFICATES.find((c) => c.userId === userId && c.courseId === courseId);
  if (existing) return existing;

  const user = MOCK_USERS.find((u) => u.id === userId);
  const course = MOCK_COURSES.find((c) => c.id === courseId);

  const certificate: Certificate = {
    id: generateId('cert'),
    userId,
    courseId,
    studentName: user?.fullName ?? user?.name ?? 'Student',
    courseTitle: course?.title ?? 'Course',
    completionDate,
    verificationHash: verificationHashFor(userId, courseId),
    issuedAt,
  };

  MOCK_CERTIFICATES.push(certificate);
  return certificate;
}

export function getStudentCertificates(userId: string): Certificate[] {
  ensureAutoCertificates();
  return MOCK_CERTIFICATES.filter((c) => c.userId === userId);
}

export function getIssuedCertificates(): Certificate[] {
  ensureAutoCertificates();
  return MOCK_CERTIFICATES;
}

let seeded = false;

function ensureAutoCertificates(): void {
  if (seeded) return;
  seeded = true;
  getEnrollments()
    .filter((enrollment) => enrollment.status === 'completed')
    .forEach((enrollment) =>
      issueCertificate({
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        completionDate: enrollment.updatedAt ?? enrollment.createdAt,
        issuedAt: enrollment.updatedAt ?? enrollment.createdAt,
      }),
    );
}