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
  sm: 'h-6 w-6',
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

  const checkedBg = `linear-gradient(135deg, ${color}dd, ${color}88)`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group/check flex shrink-0 items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        sizeClasses[size],
        className,
      )}
      style={{
        background: checked
          ? checkedBg
          : 'transparent',
        borderColor: checked
          ? color
          : (!priorityColor || priorityColor === 'transparent' ? 'hsl(var(--outline) / 0.55)' : `${color}80`),
        borderRadius: checked ? '10px 12px 9px 11px' : '11px 10px 12px 9px',
        borderWidth: checked ? '2px' : '2.5px',
        boxShadow: checked
          ? `0 3px 8px color-mix(in srgb, ${color}, transparent 78%)`
          : 'none',
        transform: checked ? 'rotate(-2deg)' : 'rotate(0.8deg)',
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
