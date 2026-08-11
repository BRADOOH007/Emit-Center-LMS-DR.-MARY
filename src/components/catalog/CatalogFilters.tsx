'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Filter,
  type LucideIcon,
  Monitor,
  MonitorCheck,
  MonitorX,
  School,
  GraduationCap,
  Baby,
  Users,
  BookOpen,
  Code2,
  Palette,
  Heart,
  Wrench,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgeLevel, CourseSubject, DeliveryFormat } from '@/types';

interface FilterGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  options: { value: string; label: string; icon?: LucideIcon }[];
}

export const FORMAT_OPTIONS: { value: DeliveryFormat; label: string; icon: LucideIcon }[] = [
  { value: 'onsite', label: 'Onsite', icon: MonitorCheck },
  { value: 'online', label: 'Online', icon: Monitor },
  { value: 'hybrid', label: 'Hybrid', icon: MonitorX },
];

export const AGE_LEVEL_OPTIONS: { value: AgeLevel; label: string; icon: LucideIcon }[] = [
  { value: 'elementary', label: 'Elementary', icon: Baby },
  { value: 'middle', label: 'Middle School', icon: School },
  { value: 'high', label: 'High School', icon: GraduationCap },
  { value: 'adult', label: 'Adult', icon: Users },
  { value: 'all', label: 'All Ages', icon: Users },
];

export const SUBJECT_OPTIONS: { value: CourseSubject; label: string; icon: LucideIcon }[] = [
  { value: 'robotics', label: 'Robotics', icon: Wrench },
  { value: 'coding', label: 'Coding', icon: Code2 },
  { value: 'design', label: 'Design', icon: Palette },
  { value: 'life-skills', label: 'Life Skills', icon: Heart },
  { value: 'engineering', label: 'Engineering', icon: Wrench },
  { value: 'career', label: 'Career', icon: Briefcase },
];

const TIMEZONE_OPTIONS = [
  { value: '', label: 'All Timezones' },
  { value: 'America/New_York', label: 'US Eastern (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)' },
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Europe/Paris', label: 'EU Central (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'EU Central (CET/CEST)' },
];

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <fieldset className="border-b border-line pb-4">
      <legend className="w-full">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between py-3 text-sm font-semibold text-text-primary"
        >
          {label}
          <ChevronDown
            aria-hidden="true"
            className={cn('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')}
          />
        </button>
      </legend>
      {open && <div className="space-y-2">{children}</div>}
    </fieldset>
  );
}

export function CatalogFilters({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const selectedFormats = useMemo(() => searchParams.getAll('format'), [searchParams]);
  const selectedAges = useMemo(() => searchParams.getAll('ageLevel'), [searchParams]);
  const selectedSubjects = useMemo(() => searchParams.getAll('subject'), [searchParams]);
  const selectedTimezone = searchParams.get('timezone') ?? '';

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const existing = params.getAll(key);
      if (existing.includes(value)) {
        params.delete(key, value);
      } else {
        params.append(key, value);
      }
      params.set('page', '1');
      router.push(`/courses?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setSingleParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set('page', '1');
      router.push(`/courses?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const buildSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.push(`/courses?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    router.push('/courses', { scroll: false });
  }, [router]);

  const hasFilters =
    selectedFormats.length > 0 ||
    selectedAges.length > 0 ||
    selectedSubjects.length > 0 ||
    selectedTimezone.length > 0 ||
    search.length > 0;

  const filterContent = (
    <>
      <div className="mb-4 px-1">
        <input
          type="search"
          placeholder="Search courses..."
          value={search}
          onChange={(event) => buildSearch(event.target.value)}
          className="input !py-2"
        />
      </div>

      <FilterSection label="Format">
        {FORMAT_OPTIONS.map((option) => {
          const checked = selectedFormats.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-line-soft',
                checked && 'font-semibold text-gold-700 dark:text-gold-300',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleParam('format', option.value)}
                className="h-4 w-4 rounded border-line bg-base-surface accent-gold-600"
              />
              <option.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
              {option.label}
            </label>
          );
        })}
      </FilterSection>

      <FilterSection label="Age / Grade Level">
        {AGE_LEVEL_OPTIONS.map((option) => {
          const checked = selectedAges.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-line-soft',
                checked && 'font-semibold text-gold-700 dark:text-gold-300',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleParam('ageLevel', option.value)}
                className="h-4 w-4 rounded border-line bg-base-surface accent-gold-600"
              />
              <option.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
              {option.label}
            </label>
          );
        })}
      </FilterSection>

      <FilterSection label="Subject">
        {SUBJECT_OPTIONS.map((option) => {
          const checked = selectedSubjects.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-line-soft',
                checked && 'font-semibold text-gold-700 dark:text-gold-300',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleParam('subject', option.value)}
                className="h-4 w-4 rounded border-line bg-base-surface accent-gold-600"
              />
              <option.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
              {option.label}
            </label>
          );
        })}
      </FilterSection>

      <FilterSection label="Time Zone">
        <select
          value={selectedTimezone}
          onChange={(event) => setSingleParam('timezone', event.target.value)}
          className="input !py-2"
        >
          {TIMEZONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FilterSection>

      {hasFilters && (
        <button type="button" onClick={clearAll} className="btn btn-ghost btn-sm w-full mt-2">
          Clear all filters
        </button>
      )}
    </>
  );

  return (
    <>
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="btn btn-outline btn-sm gap-2"
        >
          <Filter aria-hidden="true" className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="badge badge-gold !px-1.5 !py-0 text-[10px]">
              {selectedFormats.length + selectedAges.length + selectedSubjects.length + (selectedTimezone ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div aria-hidden="true" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-y-0 right-0 w-[19rem] max-w-[85vw] animate-drawer-in overflow-y-auto bg-base-elevated shadow-pop p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-text-primary">Filters</p>
              <button type="button" onClick={() => setMobileOpen(false)} className="btn btn-ghost btn-sm">
                Close
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}

      <aside className={cn('hidden w-60 shrink-0 lg:block', className)}>
        <nav className="sticky top-20 space-y-1">{filterContent}</nav>
      </aside>
    </>
  );
}
