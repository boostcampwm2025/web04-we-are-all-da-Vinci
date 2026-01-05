import type { Stroke } from '@/entities/similarity/model';
import { normalizeStrokes } from './normalizeStrokes';

export const calculateSimilarity = (
  promptStrokes: Stroke[], // 제시 그림 스트로크
  strokes: Stroke[], // 사용자 그림 스트로크
) => {
  const normalizedPromptStrokes = normalizeStrokes(promptStrokes);
  const normalizedStrokes = normalizeStrokes(strokes);
};
