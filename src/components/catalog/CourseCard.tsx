import Link from 'next/link';
import {
  Monitor,
  MonitorCheck,
  MonitorX,
  MapPin,
  Video,
  Clock,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Course, CourseSubject, DeliveryFormat, SupportedCurrency } from '@/types';
import { CURRENCY_SYMBOLS } from '@/lib/i18n/currency';
import { Badge } from '@/components/ui/Badge';

const FORMAT_META: Record<DeliveryFormat, { label: string; icon: LucideIcon; variant: 'gold' | 'brown' | 'neutral' }> = {
  onsite: { label: 'Onsite', icon: MonitorCheck, variant: 'brown' },
  online: { label: 'Online', icon: Monitor, variant: 'gold' },
  hybrid: { label: 'Hybrid', icon: MonitorX, variant: 'neutral' },
};

const SUBJECT_LABELS: Record<CourseSubject, string> = {
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

export function CourseCard({ course, userCurrency }: { course: Course; userCurrency: SupportedCurrency }) {
  const formatMeta = FORMAT_META[course.format];
  const FormatIcon = formatMeta.icon;

  const priceForCurrency = course.pricing.find((p) => p.currency === userCurrency);
  const priceDisplay = priceForCurrency
    ? `${CURRENCY_SYMBOLS[userCurrency]}${(priceForCurrency.amount / 100).toFixed(0)}`
    : `${CURRENCY_SYMBOLS.USD}${(course.pricing[0]?.amount ?? 0) / 100} USD`;

  const formatPriceEur = course.pricing.find((p) => p.currency === 'EUR');
  const formatPriceGbp = course.pricing.find((p) => p.currency === 'GBP');

  const seatsRemaining = course.maxSeats - course.enrolledCount;
  const seatLabel = seatsRemaining <= 3 ? `${seatsRemaining} left` : `${course.enrolledCount}/${course.maxSeats}`;

  return (
    <Link href={`/courses/${course.id}`} className="card group flex flex-col overflow-hidden">
      <div className="relative h-40 bg-brown-900/10 dark:bg-brown-900/40">
        <div className="absolute inset-0 flex items-center justify-center">
          <FormatIcon aria-hidden="true" className="h-12 w-12 text-brown-600/30 dark:text-brown-400/20" />
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant={formatMeta.variant} className="!bg-base-elevated/90 backdrop-blur-sm !text-brown-800 dark:!text-gold-200">
            {formatMeta.label}
          </Badge>
          <Badge variant="neutral" className="!bg-base-elevated/90 backdrop-blur-sm">
            {AGE_LABELS[course.ageLevel] ?? course.ageLevel}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
            {SUBJECT_LABELS[course.subject] ?? course.subject}
          </span>
        </div>

        <h3 className="mb-2 font-display text-base font-semibold leading-snug text-text-primary group-hover:text-gold-700 dark:group-hover:text-gold-300 transition-colors">
          {course.title}
        </h3>

        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-text-muted">
          {course.description}
        </p>

        <div className="mt-auto space-y-2 text-xs text-text-muted">
          {course.format === 'onsite' && course.onsiteLocation && (
            <div className="flex items-start gap-1.5">
              <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{course.onsiteLocation}</span>
            </div>
          )}
          {(course.format === 'online' || course.format === 'hybrid') && course.virtualLink && (
            <div className="flex items-center gap-1.5">
              <Video aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>Virtual classroom</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>
              {course.schedule.days.join(', ')} &middot;{' '}
              {course.schedule.timeSlots[0]?.start}–{course.schedule.timeSlots[0]?.end}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>{seatLabel} enrolled</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <div>
            <span className="font-display text-lg font-bold text-text-primary">{priceDisplay}</span>
            <span className="ml-1 text-xs text-text-muted">{userCurrency}</span>
          </div>
          {(formatPriceEur || formatPriceGbp) && (
            <div className="text-right text-[11px] leading-tight text-text-muted">
              {formatPriceEur && (
                <span>
                  &#8364;{(formatPriceEur.amount / 100).toFixed(0)}
                </span>
              )}
              {formatPriceGbp && formatPriceEur && <span className="mx-1">&middot;</span>}
              {formatPriceGbp && (
                <span>
                  &pound;{(formatPriceGbp.amount / 100).toFixed(0)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
