import { useState } from 'react';

interface UseSlotHighlightProps {
  maxPlayer: number;
}

/**
 * 슬롯 하이라이트 상태 관리
 * - 드래그 스타일 호버 효과를 위한 상태
 */
export const useSlotHighlight = ({ maxPlayer }: UseSlotHighlightProps) => {
  // 현재 마우스 호버 중인 슬롯 인덱스
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 특정 슬롯이 하이라이트되어야 하는지 판단
  const isHighlighted = (index: number): boolean => {
    if (hoveredIndex === null) return false;

    // 빈자리: 호버한 슬롯부터 끝까지 하이라이트
    if (index < maxPlayer) {
      return hoveredIndex < maxPlayer && index >= hoveredIndex;
    }

    // 잠금 슬롯: maxPlayer부터 호버한 슬롯까지 하이라이트
    return hoveredIndex >= maxPlayer && index >= maxPlayer && index <= hoveredIndex;
  };

  return {
    hoveredIndex,
    setHoveredIndex,
    isHighlighted,
  };
};
