import { memo } from 'react';
import type { MouseEvent } from 'react';
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
  sm: 'h-[22px] w-[22px]',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
};

const checkSvg = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 13l4 4L19 7" />
  </svg>
);

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
        'group/check flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        sizeClasses[size],
        className,
      )}
      style={{
        background: checked
          ? color
          : 'transparent',
        borderColor: checked
          ? color
          : (!priorityColor || priorityColor === 'transparent' ? 'hsl(var(--outline) / 0.52)' : `${color}95`),
        boxShadow: checked
          ? `0 2px 8px color-mix(in srgb, ${color}, transparent 72%), inset 0 1px 0 rgba(255,255,255,0.36)`
          : 'inset 0 1px 0 rgba(255,255,255,0.42)',
      }}
      aria-label={ariaLabel || (checked ? 'Marcar como pendiente' : 'Completar tarea')}
    >
      {checked && (
        <span className="text-primary-foreground" style={{ filter: 'contrast(0.85)' }}>
          {checkSvg}
        </span>
      )}
    </button>
  );
});

TaskCheckbox.displayName = 'TaskCheckbox';
