import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSlotHighlight } from './useSlotHighlight';

describe('useSlotHighlight', () => {
  describe('초기 상태', () => {
    it('hoveredIndex가 null로 초기화된다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      expect(result.current.hoveredIndex).toBeNull();
    });

    it('hoveredIndex가 null일 때 모든 슬롯이 하이라이트되지 않는다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      expect(result.current.isHighlighted(0)).toBe(false);
      expect(result.current.isHighlighted(3)).toBe(false);
      expect(result.current.isHighlighted(5)).toBe(false);
      expect(result.current.isHighlighted(7)).toBe(false);
    });
  });

  describe('빈자리 슬롯 하이라이트 (index < maxPlayer)', () => {
    it('빈자리 슬롯을 호버하면 해당 슬롯부터 maxPlayer-1까지 하이라이트된다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      act(() => {
        result.current.setHoveredIndex(3);
      });

      // 호버한 슬롯(3)부터 maxPlayer-1(4)까지 하이라이트
      expect(result.current.isHighlighted(0)).toBe(false);
      expect(result.current.isHighlighted(1)).toBe(false);
      expect(result.current.isHighlighted(2)).toBe(false);
      expect(result.current.isHighlighted(3)).toBe(true);
      expect(result.current.isHighlighted(4)).toBe(true);
      // maxPlayer(5) 이후는 잠금 슬롯이므로 빈자리 호버와 무관
      expect(result.current.isHighlighted(5)).toBe(false);
      expect(result.current.isHighlighted(6)).toBe(false);
      expect(result.current.isHighlighted(7)).toBe(false);
    });

    it('index 0, 1은 최소 2명 제한으로 하이라이트되지 않는다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      act(() => {
        result.current.setHoveredIndex(0);
      });

      // 최소 2명 제한: index 0, 1은 잠금 불가
      expect(result.current.isHighlighted(0)).toBe(false);
      expect(result.current.isHighlighted(1)).toBe(false);
      expect(result.current.isHighlighted(2)).toBe(false);
      expect(result.current.isHighlighted(3)).toBe(false);
      expect(result.current.isHighlighted(4)).toBe(false);
    });

    it('index 2를 호버하면 2부터 maxPlayer-1까지 하이라이트된다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      act(() => {
        result.current.setHoveredIndex(2);
      });

      expect(result.current.isHighlighted(0)).toBe(false);
      expect(result.current.isHighlighted(1)).toBe(false);
      expect(result.current.isHighlighted(2)).toBe(true);
      expect(result.current.isHighlighted(3)).toBe(true);
      expect(result.current.isHighlighted(4)).toBe(true);
      // maxPlayer(5) 이후는 잠금 슬롯
      expect(result.current.isHighlighted(5)).toBe(false);
    });

    it('마지막 빈자리 슬롯(maxPlayer - 1)을 호버하면 해당 슬롯만 하이라이트된다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      act(() => {
        result.current.setHoveredIndex(4);
      });

      expect(result.current.isHighlighted(0)).toBe(false);
      expect(result.current.isHighlighted(1)).toBe(false);
      expect(result.current.isHighlighted(2)).toBe(false);
      expect(result.current.isHighlighted(3)).toBe(false);
      expect(result.current.isHighlighted(4)).toBe(true);
      // maxPlayer(5) 이후는 잠금 슬롯
      expect(result.current.isHighlighted(5)).toBe(false);
    });
  });

  describe('잠금 슬롯 하이라이트 (index >= maxPlayer)', () => {
    it('잠금 슬롯을 호버하면 maxPlayer부터 해당 슬롯까지 하이라이트된다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      act(() => {
        result.current.setHoveredIndex(7);
      });

      // maxPlayer(5)부터 호버한 슬롯(7)까지 하이라이트
      expect(result.current.isHighlighted(0)).toBe(false);
      expect(result.current.isHighlighted(4)).toBe(false);
      expect(result.current.isHighlighted(5)).toBe(true);
      expect(result.current.isHighlighted(6)).toBe(true);
      expect(result.current.isHighlighted(7)).toBe(true);
      expect(result.current.isHighlighted(8)).toBe(false);
    });

    it('첫 번째 잠금 슬롯(maxPlayer)을 호버하면 해당 슬롯만 하이라이트된다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      act(() => {
        result.current.setHoveredIndex(5);
      });

      expect(result.current.isHighlighted(4)).toBe(false);
      expect(result.current.isHighlighted(5)).toBe(true);
      expect(result.current.isHighlighted(6)).toBe(false);
      expect(result.current.isHighlighted(7)).toBe(false);
    });

    it('마지막 잠금 슬롯을 호버하면 maxPlayer부터 끝까지 하이라이트된다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 3 }));

      act(() => {
        result.current.setHoveredIndex(7); // BASE_SLOTS - 1
      });

      expect(result.current.isHighlighted(2)).toBe(false);
      expect(result.current.isHighlighted(3)).toBe(true);
      expect(result.current.isHighlighted(4)).toBe(true);
      expect(result.current.isHighlighted(5)).toBe(true);
      expect(result.current.isHighlighted(6)).toBe(true);
      expect(result.current.isHighlighted(7)).toBe(true);
    });
  });

  describe('호버 해제', () => {
    it('setHoveredIndex(null)을 호출하면 모든 하이라이트가 제거된다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 5 }));

      act(() => {
        result.current.setHoveredIndex(3);
      });

      expect(result.current.isHighlighted(3)).toBe(true);
      expect(result.current.isHighlighted(4)).toBe(true);

      act(() => {
        result.current.setHoveredIndex(null);
      });

      expect(result.current.isHighlighted(0)).toBe(false);
      expect(result.current.isHighlighted(3)).toBe(false);
      expect(result.current.isHighlighted(4)).toBe(false);
      expect(result.current.isHighlighted(7)).toBe(false);
    });
  });

  describe('엣지 케이스', () => {
    it('maxPlayer=8 (BASE_SLOTS)일 때 잠금 슬롯이 없다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 8 }));

      act(() => {
        result.current.setHoveredIndex(7);
      });

      // index 7은 빈자리 (maxPlayer - 1)
      expect(result.current.isHighlighted(7)).toBe(true);
    });

    it('maxPlayer=1일 때 최소 2명 제한으로 빈자리 호버가 하이라이트되지 않는다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 1 }));

      act(() => {
        result.current.setHoveredIndex(0);
      });

      // 최소 2명 제한: index 0은 잠금 불가
      expect(result.current.isHighlighted(0)).toBe(false);

      // 잠금 슬롯(index >= maxPlayer)은 해제 가능
      act(() => {
        result.current.setHoveredIndex(1);
      });

      expect(result.current.isHighlighted(1)).toBe(true);
      expect(result.current.isHighlighted(2)).toBe(false);
    });

    it('maxPlayer=10 (BASE_SLOTS 초과)일 때도 정상 동작한다', () => {
      const { result } = renderHook(() => useSlotHighlight({ maxPlayer: 10 }));

      act(() => {
        result.current.setHoveredIndex(8);
      });

      // 빈자리 호버 (index 8, 9까지만)
      expect(result.current.isHighlighted(8)).toBe(true);
      expect(result.current.isHighlighted(9)).toBe(true);
      // maxPlayer(10) 이후는 잠금 슬롯
      expect(result.current.isHighlighted(10)).toBe(false);
    });
  });
});
