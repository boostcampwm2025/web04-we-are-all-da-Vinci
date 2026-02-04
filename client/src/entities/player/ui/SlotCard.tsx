import { cn } from '@/shared/lib/classNames';

type SlotVariant = 'empty' | 'locked';

interface SlotCardProps {
  variant: SlotVariant;
  isInteractive?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const SLOT_CONFIG = {
  empty: {
    default: {
      border: 'border-dashed',
      bg: 'bg-white',
      pattern: '',
      iconBg: 'bg-slate-200',
      icon: 'person',
      iconColor: 'text-slate-500',
      label: '빈자리',
      labelColor: 'text-slate-500',
      opacity: '',
    },
    highlighted: {
      border: 'border-orange-400',
      bg: 'bg-orange-50',
      pattern:
        'before:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(251,146,60,0.06)_10px,rgba(251,146,60,0.06)_20px)]',
      iconBg: 'bg-orange-300',
      icon: 'lock',
      iconColor: 'text-orange-700',
      label: '클릭하여 잠금',
      labelColor: 'text-orange-700',
      opacity: 'opacity-100',
    },
  },
  locked: {
    default: {
      border: '',
      bg: 'bg-slate-100',
      pattern:
        'before:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(100,116,139,0.04)_10px,rgba(100,116,139,0.04)_20px)]',
      iconBg: 'bg-slate-300',
      icon: 'lock',
      iconColor: 'text-slate-600',
      label: '잠금',
      labelColor: 'text-slate-600',
      opacity: 'opacity-85',
    },
    highlighted: {
      border: 'border-green-400',
      bg: 'bg-green-50',
      pattern: '',
      iconBg: 'bg-green-300',
      icon: 'lock_open',
      iconColor: 'text-green-700',
      label: '클릭하여 해제',
      labelColor: 'text-green-700',
      opacity: 'opacity-100',
    },
  },
} as const;

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
