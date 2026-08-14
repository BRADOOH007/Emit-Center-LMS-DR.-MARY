import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageIntro({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="header-kicker">{kicker}</p>
        <h1 className="page-title mt-1">{title}</h1>
        {subtitle && <p className="page-subtitle mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const STAT_TONES: Record<string, string> = {
  gold: 'bg-gold-500/10 text-gold-600 dark:text-gold-400',
  brown: 'bg-brown-500/10 text-brown-600 dark:text-brown-300',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  neutral: 'bg-text-primary/5 text-text-muted',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'gold',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof STAT_TONES;
  className?: string;
}) {
  return (
    <div className={cn('panel flex items-center gap-4', className)}>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', STAT_TONES[tone])}>
        <Icon aria-hidden="true" className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs uppercase tracking-wide text-text-muted">{label}</p>
        <p className="font-display text-2xl font-bold leading-tight text-text-primary">{value}</p>
        {hint && <p className="truncate text-[11px] text-text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function SectionPanel({
  title,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('panel', className)}>
      {(title || actions) && (
        <div className="badge-header">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            {Icon && <Icon aria-hidden="true" className="h-4 w-4 text-gold-600 dark:text-gold-400" />}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(title || actions ? 'p-4' : 'p-0')}>{children}</div>
    </section>
  );
}

export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  emptyMessage = 'No records to display.',
  className,
  onRowClick,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-line transition-colors last:border-0 hover:bg-line-soft/60',
                onRowClick && 'cursor-pointer',
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn('px-3 py-2.5 align-middle', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ProgressBar({ value, tone = 'gold' }: { value: number; tone?: 'gold' | 'emerald' | 'blue' | 'red' }) {
  const tones = {
    gold: 'bg-gold-500',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
  };
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line-soft" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full', tones[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function ProgressBarCell({ value, tone = 'gold' }: { value: number; tone?: 'gold' | 'emerald' | 'blue' | 'red' }) {
  return (
    <div className="flex w-full max-w-[9rem] items-center gap-2">
      <ProgressBar value={value} tone={tone} />
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-text-muted">{Math.round(value)}%</span>
    </div>
  );
}
