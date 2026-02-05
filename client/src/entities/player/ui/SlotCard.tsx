import { cn } from '@/shared/lib/classNames';
import { SLOT_CONFIG } from '../config/slotConfig';

type SlotVariant = 'empty' | 'locked';

interface SlotCardProps {
  variant: SlotVariant;
  isInteractive?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const SlotCard = ({
  variant,
  isInteractive = false,
  isHighlighted = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SlotCardProps) => {
  const showHighlighted = isInteractive && isHighlighted;
  const config = showHighlighted
    ? SLOT_CONFIG[variant].highlighted
    : SLOT_CONFIG[variant].default;

  return (
    <div
      className={cn(
        'border-stroke-default relative flex h-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 p-2 text-center transition-all sm:p-4 lg:p-6',
        config.border,
        config.bg,
        config.opacity,
        config.pattern &&
          'before:pointer-events-none before:absolute before:inset-0',
        config.pattern,
        isInteractive ? 'cursor-pointer' : 'cursor-not-allowed',
        variant === 'locked' && !isInteractive && 'opacity-70',
      )}
      onClick={isInteractive ? onClick : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          'relative z-10 mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full md:h-10 md:w-10 xl:h-14 xl:w-14',
          config.iconBg,
        )}
      >
        <span
          className={cn(
            'material-symbols-outlined text-base transition-all md:text-2xl xl:text-4xl',
            config.iconColor,
          )}
        >
          {config.icon}
        </span>
      </div>
      <div className="font-handwriting relative z-10 mt-1 text-base sm:text-lg lg:text-xl xl:mt-2">
        <span className={cn(showHighlighted && 'font-bold', config.labelColor)}>
          {config.label}
        </span>
      </div>
    </div>
  );
};
