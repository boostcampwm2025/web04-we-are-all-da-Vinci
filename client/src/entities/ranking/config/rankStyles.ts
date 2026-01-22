export const RANK_STYLES = {
  1: {
    bg: 'bg-surface-warm',
    border: 'border-rank-gold',
    badge: 'bg-rank-gold',
    text: 'text-rank-gold-text',
    color: 'text-rank-gold',
    icon: 'emoji_events',
  },
  2: {
    bg: 'bg-surface-muted',
    border: 'border-rank-silver',
    badge: 'bg-rank-silver',
    text: 'text-rank-silver-text',
    color: 'text-rank-silver',
    icon: 'military_tech',
  },
  3: {
    bg: 'bg-surface-warm',
    border: 'border-rank-bronze',
    badge: 'bg-rank-bronze',
    text: 'text-rank-bronze-text',
    color: 'text-rank-bronze',
    icon: 'military_tech',
  },
  default: {
    bg: 'bg-surface-base',
    border: 'border-stroke-default',
    badge: 'bg-gray-400',
    text: 'text-content-secondary',
    color: 'text-content-secondary',
    icon: '',
  },
} as const;
