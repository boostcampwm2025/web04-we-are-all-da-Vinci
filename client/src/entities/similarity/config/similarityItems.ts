import type { Similarity } from '@/features/similarity';

export const SIMILARITY_ITEMS: {
  key: keyof Similarity;
  label: string;
  shortLabel: string;
  color: string;
}[] = [
  {
    key: 'strokeCountSimilarity',
    label: '선 개수 유사도',
    shortLabel: '선 개수',
    color: 'bg-yellow-400',
  },
  {
    key: 'strokeMatchSimilarity',
    label: '선 매칭 유사도',
    shortLabel: '선 매칭',
    color: 'bg-indigo-400',
  },
  {
    key: 'shapeSimilarity',
    label: '형태 유사도',
    shortLabel: '형태',
    color: 'bg-red-400',
  },
];
