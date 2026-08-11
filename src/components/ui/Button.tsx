import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'gold'
  | 'brown'
  | 'outline'
  | 'ghost'
  | 'white'
  | 'danger'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  gold: 'btn-gold',
  brown: 'btn-brown',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  white: 'btn-white',
  danger: 'btn-danger',
  link: 'bg-transparent px-0 text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

export function buttonClasses(
  variant: ButtonVariant = 'gold',
  size: ButtonSize = 'md',
  fullWidth = false,
  className?: string,
): string {
  return cn('btn', VARIANT_CLASSES[variant], SIZE_CLASSES[size], fullWidth && 'w-full', className);
}

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type NativeButtonProps = BaseButtonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

export function Button({ variant = 'gold', size = 'md', fullWidth, className, children, type = 'button', ...rest }: NativeButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, fullWidth, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'gold',
  size = 'md',
  fullWidth,
  className,
  children,
  ...rest
}: BaseButtonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'>) {
  return (
    <a className={buttonClasses(variant, size, fullWidth, className)} {...rest}>
      {children}
    </a>
  );
}
