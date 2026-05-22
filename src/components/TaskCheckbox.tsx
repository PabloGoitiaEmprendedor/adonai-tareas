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
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
};

const iconClasses = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
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
        'group/check flex shrink-0 items-center justify-center border-2 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        sizeClasses[size],
        className,
      )}
      style={{
        background: checked
          ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.32), transparent 26%), ${color}`
          : 'linear-gradient(135deg, hsl(var(--surface-container-high) / 0.45), hsl(var(--surface) / 0.72))',
        borderColor: checked
          ? color
          : (!priorityColor || priorityColor === 'transparent' ? 'hsl(var(--outline) / 0.65)' : `${color}85`),
        borderRadius: checked ? '13px 10px 14px 11px' : '12px 14px 11px 13px',
        boxShadow: checked
          ? `0 6px 14px color-mix(in srgb, ${color}, transparent 72%), inset 0 0 0 1px rgba(255,255,255,0.22)`
          : 'inset 0 0 0 1px hsl(var(--background) / 0.25), 0 2px 8px hsl(var(--foreground) / 0.06)',
        transform: checked ? 'rotate(-1.5deg)' : 'rotate(0.5deg)',
      }}
      aria-label={ariaLabel || (checked ? 'Marcar como pendiente' : 'Completar tarea')}
    >
      {checked && (
        <Check className={cn('text-primary-foreground stroke-[3.5]', iconClasses[size])} />
      )}
    </button>
  );
});

TaskCheckbox.displayName = 'TaskCheckbox';
