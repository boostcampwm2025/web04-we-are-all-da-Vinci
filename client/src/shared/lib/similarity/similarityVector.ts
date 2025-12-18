import type { Stroke } from '@/entities/drawing/model/types';
import { normalizeStrokes } from '../normalize/normalizeStrokes';
import { matchStrokes } from './matchStrokes';
import { applyNonLinearScale } from '../normalize/applyNonlinearScale';

/**
 * 최종 유사도 계산 (벡터 기반)
 */
export async function calculateSimilarityVector(
  originalStrokes: Stroke[],
  drawnStrokes: Stroke[],
) {
  try {
    // TODO: 원본 전송 방식에 따라 전처리 수정하기
    // 우선 원본도 스트로크를 받는다고 가정합니다
    // 1. 원본 stroke 로드
    // const originalStrokes = await loadOriginalStrokes(imageName);
    // console.log(`[벡터 유사도] 원본 stroke 개수: ${originalStrokes.length}`);

    // if (originalStrokes.length === 0) {
    //   throw new Error("원본 stroke 데이터를 찾을 수 없습니다.");
    // }

    // 2. 정규화
    const normalizedOriginal = normalizeStrokes(originalStrokes);
    const normalizedDrawn = normalizeStrokes(drawnStrokes);

    // 3. Stroke 개수 유사도
    // 선 개수 유사도: 아무것도 안 그렸으면 0으로 명확히 처리
    const strokeCountSimilarity =
      normalizedDrawn.length === 0
        ? 0
        : Math.max(
            0,
            100 -
              Math.abs(normalizedOriginal.length - normalizedDrawn.length) * 10,
          );

    // 4. Stroke 매칭 유사도 (핵심)
    const strokeMatchSimilarity = matchStrokes(
      normalizedOriginal,
      normalizedDrawn,
    );

    // convex hall
    const userPoints = strokesToPoints(normalizedDrawn);
    const userHull = convexHull(userPoints);
    const originalPoints = strokesToPoints(normalizedOriginal);
    const originalHull = convexHull(originalPoints);
    // 면적 / 둘레
    const userArea = hullArea(userHull);
    const originalArea = hullArea(originalHull);

    const userPerimeter = hullPerimeter(userHull);
    const originalPerimeter = hullPerimeter(originalHull);

    // 유사도
    const areaSim = areaSimilarity(userArea, originalArea);
    const perimeterSim = perimeterSimilarity(userPerimeter, originalPerimeter);

    // hull 기반 점수 (0~100)
    const hullScore = (areaSim * 0.5 + perimeterSim * 0.5) * 100;

    const scaledHull = applyNonLinearScale(hullScore);
    let weights;

    if (scaledHull >= 92) {
      // Hull 점수가 높으면 -> 형태 중심 평가
      weights = {
        strokeCount: 0.05,
        strokeMatch: 0.15, // 비중 감소
        hull: 0.8, // Hull 비중 증가
      };
      // console.log("[가중치] Hull 점수 높음 -> 형태 중심 평가");
    } else if (scaledHull >= 60) {
      // Hull 중간 -> 균형
      weights = {
        strokeCount: 0.08,
        strokeMatch: 0.32,
        hull: 0.6,
      };
      // console.log("[가중치] 균형 평가");
    } else {
      // Hull 낮음 -> Stroke 중요
      weights = {
        strokeCount: 0.1,
        strokeMatch: 0.5,
        hull: 0.4,
      };
      // console.log("[가중치] Hull 점수 낮음 -> Stroke 중심 평가");
    }

    // 최종 유사도 계산
    const similarity =
      strokeCountSimilarity * weights.strokeCount +
      strokeMatchSimilarity * weights.strokeMatch +
      scaledHull * weights.hull;

    const roundedSimilarity = Math.round(similarity * 100) / 100;

    // 8. 등급 계산
    const grade = calculateGrade(roundedSimilarity);

    return {
      similarity: roundedSimilarity,
      grade: grade,
      details: {
        strokeCountSimilarity: Math.round(strokeCountSimilarity * 100) / 100,
        strokeMatchSimilarity: Math.round(strokeMatchSimilarity * 100) / 100,
        hullSimilarity: Math.round(hullScore * 100) / 100,
      },
    };
  } catch (error) {
    console.error('[벡터 유사도] 오류 발생:', error.message);
    console.error(error.stack);

    return {
      similarity: 0,
      grade: 'F',
      details: {
        strokeCountSimilarity: 0,
        strokeMatchSimilarity: 0,
      },
    };
  }
}

/**
 * 유사도 점수를 기반으로 등급 계산
 * @param {number} similarity - 유사도 점수 (0 ~ 100)
 * @returns {string} - 등급 ('S', 'A', 'B', 'C', 'D')
 */
function calculateGrade(similarity: number) {
  if (similarity >= 90) return 'S';
  if (similarity >= 80) return 'A';
  if (similarity >= 70) return 'B';
  if (similarity >= 60) return 'C';
  return 'D';
}
