import type { Color } from '@/entities/similarity/model';

// 임시 색상 맵
export const COLOR_MAP: Record<string, Color> = {
  black: [0, 0, 0],
  red: [239, 68, 68],
  blue: [59, 130, 246],
  green: [34, 197, 94],
  yellow: [250, 204, 21],
} as const;

export const BG_COLOR_MAP: Record<string, string> = {
  black: 'bg-black',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
};

export const RING_COLOR_MAP: Record<string, string> = {
  black: 'ring-black',
  red: 'ring-red-500',
  blue: 'ring-blue-500',
  green: 'ring-green-500',
  yellow: 'ring-yellow-400',
};
