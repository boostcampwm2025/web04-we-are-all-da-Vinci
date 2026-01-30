import { describe, it, expect } from 'vitest';
import {
  PLAYERS_PER_PAGE,
  CARD_ASPECT_RATIO,
  GAP,
  getGridLayout,
  calculateCardSize,
} from './gridLayout';

describe('gridLayout 상수', () => {
  it('PLAYERS_PER_PAGE는 8이다', () => {
    expect(PLAYERS_PER_PAGE).toBe(8);
  });

  it('CARD_ASPECT_RATIO는 0.8 (4/5)이다', () => {
    expect(CARD_ASPECT_RATIO).toBe(0.8);
  });

  it('GAP은 8이다', () => {
    expect(GAP).toBe(8);
  });
});

describe('getGridLayout', () => {
  describe('2명 이하일 때 1행 그리드', () => {
    it('0명일 때 최소 1열 보장 (1x1)', () => {
      expect(getGridLayout(0)).toEqual({ cols: 1, rows: 1 });
    });

    it('1명일 때 1x1 그리드', () => {
      expect(getGridLayout(1)).toEqual({ cols: 1, rows: 1 });
    });

    it('2명일 때 2x1 그리드', () => {
      expect(getGridLayout(2)).toEqual({ cols: 2, rows: 1 });
    });
  });

  describe('3~4명일 때 2x2 그리드', () => {
    it('3명일 때 2x2 그리드', () => {
      expect(getGridLayout(3)).toEqual({ cols: 2, rows: 2 });
    });

    it('4명일 때 2x2 그리드', () => {
      expect(getGridLayout(4)).toEqual({ cols: 2, rows: 2 });
    });
  });

  describe('5~6명일 때 3x2 그리드', () => {
    it('5명일 때 3x2 그리드', () => {
      expect(getGridLayout(5)).toEqual({ cols: 3, rows: 2 });
    });

    it('6명일 때 3x2 그리드', () => {
      expect(getGridLayout(6)).toEqual({ cols: 3, rows: 2 });
    });
  });

  describe('7명 이상일 때 4x2 그리드', () => {
    it('7명일 때 4x2 그리드', () => {
      expect(getGridLayout(7)).toEqual({ cols: 4, rows: 2 });
    });

    it('8명일 때 4x2 그리드', () => {
      expect(getGridLayout(8)).toEqual({ cols: 4, rows: 2 });
    });
  });
});

describe('calculateCardSize', () => {
  describe('종횡비 유지 검증', () => {
    it('반환된 카드 크기가 4:5 비율을 유지한다', () => {
      const result = calculateCardSize(800, 600, 4, 2);
      const ratio = result.width / result.height;

      expect(ratio).toBeCloseTo(CARD_ASPECT_RATIO, 5);
    });

    it('다양한 컨테이너 크기에서도 4:5 비율을 유지한다', () => {
      const testCases = [
        { width: 1000, height: 500, cols: 4, rows: 2 },
        { width: 500, height: 800, cols: 2, rows: 2 },
        { width: 600, height: 600, cols: 3, rows: 2 },
      ];

      testCases.forEach(({ width, height, cols, rows }) => {
        const result = calculateCardSize(width, height, cols, rows);
        const ratio = result.width / result.height;

        expect(ratio).toBeCloseTo(CARD_ASPECT_RATIO, 5);
      });
    });
  });

  describe('높이 제한 케이스 (세로가 짧은 컨테이너)', () => {
    it('높이 기준으로 카드 크기를 계산한다', () => {
      // 가로로 긴 컨테이너: 높이가 제한 요소
      const result = calculateCardSize(800, 400, 4, 2);

      // 사용 가능 높이: 400 - 8 * 1 = 392
      // 행당 높이: 392 / 2 = 196
      // 높이 기준 너비: 196 * 0.8 = 156.8
      expect(result.height).toBeCloseTo(196, 1);
      expect(result.width).toBeCloseTo(156.8, 1);
    });
  });

  describe('너비 제한 케이스 (가로가 짧은 컨테이너)', () => {
    it('너비 기준으로 카드 크기를 계산한다', () => {
      // 세로로 긴 컨테이너: 너비가 제한 요소
      const result = calculateCardSize(400, 800, 4, 2);

      // 사용 가능 너비: 400 - 8 * 3 = 376
      // 열당 너비: 376 / 4 = 94
      // 너비 기준 높이: 94 / 0.8 = 117.5
      expect(result.width).toBeCloseTo(94, 1);
      expect(result.height).toBeCloseTo(117.5, 1);
    });
  });

  describe('간격(GAP) 반영 검증', () => {
    it('4열일 때 간격 3개가 반영된다', () => {
      const containerWidth = 800;
      const cols = 4;
      const result = calculateCardSize(containerWidth, 1000, cols, 1);

      // 사용 가능 너비: 800 - 8 * 3 = 776
      // 최대 열당 너비: 776 / 4 = 194
      // 카드 너비는 194 이하여야 함
      expect(result.width).toBeLessThanOrEqual(194);
    });

    it('2행일 때 간격 1개가 반영된다', () => {
      const containerHeight = 500;
      const rows = 2;
      const result = calculateCardSize(1000, containerHeight, 1, rows);

      // 사용 가능 높이: 500 - 8 * 1 = 492
      // 최대 행당 높이: 492 / 2 = 246
      // 카드 높이는 246 이하여야 함
      expect(result.height).toBeLessThanOrEqual(246);
    });

    it('1열 1행일 때 간격이 적용되지 않는다', () => {
      const result = calculateCardSize(500, 500, 1, 1);

      // 사용 가능 공간 = 컨테이너 크기 (간격 없음)
      // 500x500 정사각형에서 4:5 비율 카드
      // 너비 기준: 500, 높이: 500/0.8 = 625 (초과)
      // 높이 기준: 500, 너비: 500*0.8 = 400
      expect(result.height).toBe(500);
      expect(result.width).toBe(400);
    });
  });

  describe('경계값 케이스', () => {
    it('정사각형 컨테이너에서 올바르게 계산한다', () => {
      const result = calculateCardSize(500, 500, 2, 2);
      const ratio = result.width / result.height;

      expect(ratio).toBeCloseTo(CARD_ASPECT_RATIO, 5);
    });
  });
});
