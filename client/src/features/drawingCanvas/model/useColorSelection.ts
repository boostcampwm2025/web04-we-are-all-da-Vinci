import { useState } from 'react';
import type { Color } from '@/entities/similarity/model';
import { COLOR_MAP } from '@/features/drawingCanvas/constants/colors';

// 색상 선택 상태와 핸들러를 관리하는 훅
export const useColorSelection = (initialColor: Color = [0, 0, 0]) => {
  const [selectedColor, setSelectedColor] = useState<Color>(initialColor);

  // 색상 선택 핸들러
  const handleColorSelect = (color: string) => {
    setSelectedColor(COLOR_MAP[color] || COLOR_MAP.black);
  };

  return {
    selectedColor,
    handleColorSelect,
  };
};
