import { useState } from 'react';

interface UseSlotHighlightProps {
  maxPlayer: number;
}

/**
 * 슬롯 하이라이트 상태 관리
 * - 드래그 스타일 호버로 잠금/해제 범위 미리보기
 */
export const useSlotHighlight = ({ maxPlayer }: UseSlotHighlightProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isHighlighted = (index: number): boolean => {
    if (hoveredIndex === null) return false;

    // 빈자리 hover: 해당 슬롯부터 끝까지 하이라이트 (잠금 예정)
    if (index < maxPlayer) {
      return hoveredIndex < maxPlayer && index >= hoveredIndex;
    }

    // 잠금 슬롯 hover: maxPlayer부터 해당 슬롯까지 하이라이트 (해제 예정)
    return (
      hoveredIndex >= maxPlayer && index >= maxPlayer && index <= hoveredIndex
    );
  };

  return {
    hoveredIndex,
    setHoveredIndex,
    isHighlighted,
  };
};
