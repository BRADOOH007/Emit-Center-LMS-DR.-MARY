import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
} as const;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserAvatar({
  name,
  src,
  size = 'md',
  online,
  className,
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZE_CLASSES;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={44}
          height={44}
          className={cn(
            'rounded-full object-cover ring-1 ring-line',
            SIZE_CLASSES[size],
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-brown-600 font-semibold uppercase text-gold-200 ring-1 ring-line',
            SIZE_CLASSES[size],
          )}
        >
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-base-elevated',
            online ? 'bg-emerald-500' : 'bg-text-muted/60',
          )}
        />
      )}
    </span>
  );
}
