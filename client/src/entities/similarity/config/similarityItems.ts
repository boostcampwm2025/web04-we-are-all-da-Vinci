import type { Similarity } from '@/features/similarity';

export const SIMILARITY_ITEMS: {
  key: keyof Similarity;
  label: string;
  shortLabel: string;
  color: string;
}[] = [
  {
    key: 'strokeMatchSimilarity',
    label: '선 유사도',
    shortLabel: '선',
    color: 'bg-indigo-400',
  },
  {
    key: 'shapeSimilarity',
    label: '형태 유사도',
    shortLabel: '형태',
    color: 'bg-red-400',
  },
];
