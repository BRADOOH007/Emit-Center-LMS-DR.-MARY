import { notFound } from 'next/navigation';
import {
  MapPin,
  Video,
  Clock,
  Users,
  GraduationCap,
  CalendarDays,
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { CURRENCY_SYMBOLS } from '@/lib/i18n/currency';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { EnrollmentModalTrigger } from '@/components/catalog/EnrollmentModal';
import { formatDate } from '@/lib/i18n/date';
import type { Course, SupportedCurrency } from '@/types';

const FORMAT_BADGE: Record<string, 'gold' | 'brown' | 'neutral'> = {
  onsite: 'brown',
  online: 'gold',
  hybrid: 'neutral',
};

const SUBJECT_LABELS: Record<string, string> = {
  robotics: 'Robotics',
  coding: 'Coding',
  design: 'Design',
  'life-skills': 'Life Skills',
  engineering: 'Engineering',
  career: 'Career',
};

const AGE_LABELS: Record<string, string> = {
  elementary: 'Elementary',
  middle: 'Middle School',
  high: 'High School',
  adult: 'Adult',
  all: 'All Ages',
};

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/courses/${params.id}`, { cache: 'no-store' });
  if (!res.ok) notFound();
  const json = (await res.json()) as { success: boolean; data: Course };
  const course = json.data;

  const session = await getSession();
  const userCurrency: SupportedCurrency = session?.user.currency ?? 'USD';
  const userTimeZone = session?.user.timeZone ?? 'America/New_York';

  const activePrice = course.pricing.find((p) => p.currency === userCurrency) ?? course.pricing[0];
  const allPrices = course.pricing;

  const instructor = course.instructor;
  const seatsRemaining = course.maxSeats - course.enrolledCount;

  const startDate = formatDate(course.schedule.startDate, userTimeZone, session?.user.locale ?? 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const endDate = formatDate(course.schedule.endDate, userTimeZone, session?.user.locale ?? 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={FORMAT_BADGE[course.format] as 'gold' | 'brown' | 'neutral'}>
            {course.format}
          </Badge>
          <Badge variant="neutral">{AGE_LABELS[course.ageLevel] ?? course.ageLevel}</Badge>
          <Badge variant="gold">{SUBJECT_LABELS[course.subject] ?? course.subject}</Badge>
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            {course.title}
          </h1>
        </div>

        <div className="card grid gap-6 p-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">About this course</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
              {course.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {course.format === 'onsite' || course.format === 'hybrid' ? (
              <div className="flex items-start gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600 dark:text-gold-400" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Location</p>
                  <p className="text-sm text-text-muted">{course.onsiteLocation ?? 'To be announced'}</p>
                </div>
              </div>
            ) : null}
            {(course.format === 'online' || course.format === 'hybrid') && course.virtualLink ? (
              <div className="flex items-start gap-3">
                <Video aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600 dark:text-gold-400" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Meeting link</p>
                  <p className="text-sm text-text-muted">Provided upon enrollment</p>
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-3">
              <CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600 dark:text-gold-400" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Schedule</p>
                <p className="text-sm text-text-muted">
                  {startDate} &mdash; {endDate}
                </p>
                <p className="text-sm text-text-muted">
                  {course.schedule.days.join(', ')} &middot;{' '}
                  {course.schedule.timeSlots[0]?.start}&ndash;{course.schedule.timeSlots[0]?.end}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600 dark:text-gold-400" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Capacity</p>
                <p className="text-sm text-text-muted">
                  {seatsRemaining} of {course.maxSeats} seats available
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {instructor && (
            <div className="panel flex items-start gap-4">
              <UserAvatar name={instructor.fullName} src={instructor.avatarUrl} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <GraduationCap aria-hidden="true" className="h-4 w-4 shrink-0 text-gold-600 dark:text-gold-400" />
                  <p className="text-sm font-semibold text-text-primary">Instructor</p>
                </div>
                <p className="text-lg font-semibold text-text-primary">{instructor.fullName}</p>
                <p className="text-sm text-text-muted">{instructor.email}</p>
              </div>
            </div>
          )}
        </div>

        <div className="panel space-y-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Price</p>
            <div className="mt-1">
              <span className="font-display text-3xl font-bold text-text-primary">
                {CURRENCY_SYMBOLS[activePrice.currency as SupportedCurrency]}
                {(activePrice.amount / 100).toFixed(0)}
              </span>
              <span className="ml-1 text-sm text-text-muted">{activePrice.currency}</span>
            </div>
          </div>

          {allPrices.length > 1 && (
            <div className="flex flex-wrap gap-3 text-xs text-text-muted">
              {allPrices
                .filter((p) => p.currency !== userCurrency)
                .map((p) => (
                  <span key={p.currency}>
                    {CURRENCY_SYMBOLS[p.currency as SupportedCurrency]}
                    {(p.amount / 100).toFixed(0)} {p.currency}
                  </span>
                ))}
            </div>
          )}

          <div className="divider" />

          <EnrollmentModalTrigger
            course={course}
            userCurrency={userCurrency}
            seatsRemaining={seatsRemaining}
          />
        </div>
      </div>
    </div>
  );
}
