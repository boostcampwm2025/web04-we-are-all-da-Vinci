import type { Color } from '@/entities/similarity/model';

// 임시 색상 맵
export const COLOR_MAP: Record<string, Color> = {
  black: [0, 0, 0],
  red: [239, 68, 68],
  blue: [59, 130, 246],
  green: [34, 197, 94],
  yellow: [250, 204, 21],
} as const;
