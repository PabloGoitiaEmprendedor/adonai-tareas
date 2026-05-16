import { memo } from 'react';
import type { MouseEvent } from 'react';
import { Clock, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskTimerButtonProps {
  active?: boolean;
  priorityColor?: string | null;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: 'sm' | 'md';
  title?: string;
  className?: string;
}

interface TaskDurationBadgeProps {
  seconds: number;
  estimatedMinutes?: number | null;
  compact?: boolean;
  className?: string;
}

const cleanColor = (priorityColor?: string | null) =>
  !priorityColor || priorityColor === 'transparent' ? 'hsl(var(--primary))' : priorityColor;

export const formatTaskDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export const TaskTimerButton = memo(({
  active = false,
  priorityColor,
  onClick,
  size = 'md',
  title = 'Iniciar temporizador',
  className,
}: TaskTimerButtonProps) => {
  const color = cleanColor(priorityColor);
  const Icon = active ? Pause : Clock;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex shrink-0 items-center justify-center border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-8 w-8 rounded-[10px]',
        active
          ? 'border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/15'
          : 'border-outline-variant/30 bg-surface-container/45 text-on-surface-variant/75 hover:border-primary/25 hover:bg-surface-container-high/70 hover:text-foreground',
        className,
      )}
      style={active ? undefined : { color }}
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.25} />
    </button>
  );
});

TaskTimerButton.displayName = 'TaskTimerButton';

export const TaskDurationBadge = memo(({
  seconds,
  estimatedMinutes,
  compact = false,
  className,
}: TaskDurationBadgeProps) => {
  const isOver = !!estimatedMinutes && seconds > estimatedMinutes * 60;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border font-mono font-semibold tabular-nums leading-none',
        compact ? 'min-w-[44px] px-2 py-1 text-[10px]' : 'min-w-[50px] px-2.5 py-1.5 text-[11px]',
        isOver
          ? 'border-[rgba(235,87,87,0.28)] bg-[rgba(235,87,87,0.12)] text-[#EB5757]'
          : 'border-primary/18 bg-primary/8 text-foreground/70',
        className,
      )}
    >
      {formatTaskDuration(seconds)}
    </span>
  );
});

TaskDurationBadge.displayName = 'TaskDurationBadge';
