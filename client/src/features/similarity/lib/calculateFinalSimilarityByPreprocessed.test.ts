import { describe, it, expect } from 'vitest';
import {
  calculateFinalSimilarityByPreprocessed,
  preprocessStrokes,
} from './calculateFinalSimilarity';
import { MOCK_STROKES } from '@/test/mocks/mockData';

describe('calculateFinalSimilarityByPreprocessed', () => {
  const strokeA = [MOCK_STROKES[0]];
  const strokeB = [MOCK_STROKES[1]];

  const multiStrokes = [MOCK_STROKES[0], MOCK_STROKES[1]];

  const preprocessedA = preprocessStrokes(strokeA);
  const preprocessedB = preprocessStrokes(strokeB);
  const preprocessedMulti = preprocessStrokes(multiStrokes);

  it('동일한 스트로크에 대해 100% 유사도를 반환한다', () => {
    const result = calculateFinalSimilarityByPreprocessed(
      preprocessedA,
      preprocessedA,
    );

    expect(result.similarity).toBeCloseTo(100, 1);
    expect(result.strokeCountSimilarity).toBeCloseTo(15, 1); // 100 * 0.15 (weight) = 15
    expect(result.strokeMatchSimilarity).toBeCloseTo(35, 1); // 100 * 0.35 (weight) = 35
    expect(result.shapeSimilarity).toBeCloseTo(50, 1); // 100 * 0.5 (weight) = 50
  });

  it('서로 다른 스트로크에 대해 100% 아래의 유사도를 반환한다', () => {
    const result = calculateFinalSimilarityByPreprocessed(
      preprocessedA,
      preprocessedB,
    );

    expect(result.similarity).toBeLessThan(100);
  });

  it('플레이어 스트로크 수가 더 많을 때 (형태 가중치)', () => {
    // 상황: 제시어(1개) vs 플레이어(2개). 플레이어 스트로크가 더 많음.
    // 기대 가중치: 개수 0.1, 선일치 0.3, 형태 0.6

    const result = calculateFinalSimilarityByPreprocessed(
      preprocessedA, // 1개
      preprocessedMulti, // 2개
    );

    // 1. 개수 유사도 검증
    // Raw Score: (1/2)*100 = 50점
    // Weighted Score: 50 * 0.1 = 5점
    expect(result.strokeCountSimilarity).toBe(5);

    // 2. 가중치 적용 확인을 위한 반환값 저장 (아래 테스트와 비교용)
    return result;
  });

  it('플레이어 스트로크 수가 더 적을 때 (선일치 가중치)', () => {
    // 상황: 제시어(2개) vs 플레이어(1개). 플레이어 스트로크가 더 적음.
    // 전 상황과 반대. 로직상 Raw Score는 유사할 것으로 가정(대칭성).
    // 기대 가중치: 개수 0.1, 선일치 0.6, 형태 0.3

    const result = calculateFinalSimilarityByPreprocessed(
      preprocessedMulti, // 2개
      preprocessedA, // 1개
    );

    // Raw Score: (1/2)*100 = 50점 -> Weighted: 50 * 0.1 = 5점
    expect(result.strokeCountSimilarity).toBe(5);

    return result;
  });

  it('상황에 따라 다른 가중치가 적용된다', () => {
    // Case 1: Prompt(1) vs Player(2) -> Player More -> Shape 0.6, Match 0.3
    const moreParams = calculateFinalSimilarityByPreprocessed(
      preprocessedA,
      preprocessedMulti,
    );

    // Case 2: Prompt(2) vs Player(1) -> Player Less -> Shape 0.3, Match 0.6
    const lessParams = calculateFinalSimilarityByPreprocessed(
      preprocessedMulti,
      preprocessedA,
    );

    // 형태 유사도(Shape): Case 1 (0.6)이 Case 2 (0.3)보다 커야 함 (약 2배)
    expect(moreParams.shapeSimilarity).toBeGreaterThan(
      lessParams.shapeSimilarity,
    );

    // 선 일치 유사도(Match): Case 1 (0.3)이 Case 2 (0.6)보다 작아야 함 (약 0.5배)
    expect(moreParams.strokeMatchSimilarity).toBeLessThan(
      lessParams.strokeMatchSimilarity,
    );
  });
});
