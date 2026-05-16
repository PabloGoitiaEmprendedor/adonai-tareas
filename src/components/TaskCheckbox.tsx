import { memo } from 'react';
import type { MouseEvent } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCheckboxProps {
  checked: boolean;
  priorityColor?: string | null;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 rounded-[10px]',
  md: 'h-9 w-9 rounded-[12px]',
  lg: 'h-10 w-10 rounded-[14px]',
};

const iconClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const TaskCheckbox = memo(({
  checked,
  priorityColor,
  onClick,
  size = 'md',
  className,
  ariaLabel,
}: TaskCheckboxProps) => {
  const color = !priorityColor || priorityColor === 'transparent'
    ? 'hsl(var(--primary))'
    : priorityColor;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group/check flex shrink-0 items-center justify-center border-2 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        sizeClasses[size],
        className,
      )}
      style={{
        backgroundColor: checked ? color : 'hsl(var(--surface-container-high) / 0.55)',
        borderColor: checked
          ? color
          : (!priorityColor || priorityColor === 'transparent' ? 'hsl(var(--outline) / 0.65)' : `${color}85`),
        boxShadow: checked
          ? '0 8px 18px hsl(var(--primary) / 0.16)'
          : 'inset 0 0 0 1px hsl(var(--background) / 0.25), 0 2px 8px hsl(var(--foreground) / 0.08)',
      }}
      aria-label={ariaLabel || (checked ? 'Marcar como pendiente' : 'Completar tarea')}
    >
      {checked && (
        <Check className={cn('text-primary-foreground stroke-[4]', iconClasses[size])} />
      )}
    </button>
  );
});

TaskCheckbox.displayName = 'TaskCheckbox';
