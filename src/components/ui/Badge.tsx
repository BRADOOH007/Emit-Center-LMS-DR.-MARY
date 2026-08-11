import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'gold' | 'brown' | 'neutral' | 'success' | 'danger';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  gold: 'badge-gold',
  brown: 'badge-brown',
  neutral: 'badge-neutral',
  success: 'badge-success',
  danger: 'badge-danger',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
}

export function Badge({ variant = 'gold', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn('badge', VARIANT_CLASSES[variant], className)} {...rest}>
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
