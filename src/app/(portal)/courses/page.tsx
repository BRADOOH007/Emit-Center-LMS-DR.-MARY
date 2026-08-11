import { Suspense } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { MOCK_COURSES } from '@/lib/mock-data';
import { getSession } from '@/lib/auth';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { CourseCard } from '@/components/catalog/CourseCard';
import type { AgeLevel, CourseSubject, DeliveryFormat } from '@/types';

interface CatalogPageProps {
  searchParams: {
    format?: string | string[];
    ageLevel?: string | string[];
    subject?: string | string[];
    timezone?: string;
    search?: string;
    page?: string;
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const session = await getSession();
  const userCurrency = session?.user.currency ?? 'USD';

  const format = normalizeArray(searchParams.format) as DeliveryFormat[];
  const ageLevel = normalizeArray(searchParams.ageLevel) as AgeLevel[];
  const subject = normalizeArray(searchParams.subject) as CourseSubject[];
  const timezone = searchParams.timezone;
  const search = searchParams.search?.toLowerCase();
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const pageSize = 9;

  let filtered = MOCK_COURSES.filter((c) => c.isPublished);

  if (format.length > 0) filtered = filtered.filter((c) => format.includes(c.format));
  if (ageLevel.length > 0) filtered = filtered.filter((c) => ageLevel.includes(c.ageLevel));
  if (subject.length > 0) filtered = filtered.filter((c) => subject.includes(c.subject));
  if (search) {
    filtered = filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(search) ||
        c.description.toLowerCase().includes(search) ||
        c.subject.includes(search),
    );
  }
  if (timezone) {
    filtered = filtered.filter((c) =>
      c.schedule.timeSlots.some((slot) => slot.timezone === timezone),
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  const hasActiveFilters = format.length > 0 || ageLevel.length > 0 || subject.length > 0 || !!search || !!timezone;

  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Catalog</p>
        <h1 className="page-title">Explore Courses</h1>
        <p className="page-subtitle mt-1">
          {total} {total === 1 ? 'course' : 'courses'} available
          {hasActiveFilters && ' matching your filters'}
        </p>
      </div>

      <div className="flex gap-6">
        <Suspense fallback={<div className="hidden w-60 shrink-0 lg:block" />}>
          <CatalogFilters className="hidden lg:block" />
        </Suspense>

        <div className="min-w-0 flex-1">
          <Suspense fallback={null}>
            <CatalogFilters className="lg:hidden" />
          </Suspense>

          {paged.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {paged.map((course) => (
                  <CourseCard key={course.id} course={course} userCurrency={userCurrency} />
                ))}
              </div>
              {totalPages > 1 && <PaginationLinks page={page} totalPages={totalPages} searchParams={searchParams} />}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search aria-hidden="true" className="mb-4 h-12 w-12 text-text-muted/40" />
              <h2 className="text-lg font-semibold text-text-primary">No courses found</h2>
              <p className="mt-1 text-sm text-text-muted">
                Try adjusting your filters or search terms.
              </p>
              <a href="/courses" className="btn btn-gold btn-md mt-4">
                Clear all filters
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeArray(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function PaginationLinks({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: CatalogPageProps['searchParams'];
}) {
  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    const format = normalizeArray(searchParams.format);
    const ageLevel = normalizeArray(searchParams.ageLevel);
    const subject = normalizeArray(searchParams.subject);
    format.forEach((f) => params.append('format', f));
    ageLevel.forEach((a) => params.append('ageLevel', a));
    subject.forEach((s) => params.append('subject', s));
    if (searchParams.timezone) params.set('timezone', searchParams.timezone);
    if (searchParams.search) params.set('search', searchParams.search);
    params.set('page', String(targetPage));
    return `/courses?${params.toString()}`;
  };

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
      {page > 1 && (
        <a href={buildHref(page - 1)} className="btn btn-outline btn-sm">
          Previous
        </a>
      )}
      <span className="px-3 text-sm text-text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages && (
        <a href={buildHref(page + 1)} className="btn btn-outline btn-sm">
          Next
        </a>
      )}
    </nav>
  );
}
