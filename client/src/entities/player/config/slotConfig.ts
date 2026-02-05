export const SLOT_CONFIG = {
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
