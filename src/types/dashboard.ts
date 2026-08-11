import type { CourseSubject, DeliveryFormat, EnrollmentStatus, PaymentStatus, SupportedCurrency } from '@/types';
import type { AccountDeletionRequest, AuditLog, ConsentRecord, DataExportRequest, FerpaAccessLog } from '@/types';

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    roles?: string[];
  };
  course?: {
    id: string;
    title: string;
    format: DeliveryFormat;
    subject?: string;
    ageLevel?: string;
    instructorId?: string;
    enrolledCount?: number;
    maxSeats?: number;
    pricing?: { id: string; courseId: string; currency: SupportedCurrency; amount: number }[];
    schedule?: { startDate: string; endDate: string; days: string[] };
  };
}

export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  enrollmentId: string;
  amount: number;
  currency: SupportedCurrency;
  stripePaymentIntentId: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface AnnouncementData {
  id: string;
  authorId: string;
  courseId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

export interface Program {
  id: string;
  name: string;
  subject: CourseSubject;
  description: string;
  courseCount: number;
  enrolledCount: number;
  formats: DeliveryFormat[];
  status: 'active' | 'archived';
  startDate: string;
  endDate: string;
}

export type { AccountDeletionRequest, AuditLog, ConsentRecord, DataExportRequest, FerpaAccessLog };