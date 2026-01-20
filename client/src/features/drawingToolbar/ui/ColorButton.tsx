import type { Color } from '@/entities/similarity';
import {
  BG_COLOR_MAP,
  COLOR_MAP,
  RING_COLOR_MAP,
} from '@/features/drawingCanvas/config/colors';

interface ColorButtonProps {
  color: string;
  selectedColor: Color;
  onSelect?: (color: string) => void;
}

const isSelected = (colorName: string, selectedColor: Color): boolean => {
  const color = COLOR_MAP[colorName];
  return (
    color[0] === selectedColor[0] &&
    color[1] === selectedColor[1] &&
    color[2] === selectedColor[2]
  );
};

export const ColorButton = ({
  color,
  selectedColor,
  onSelect,
}: ColorButtonProps) => {
  const selected = isSelected(color, selectedColor);
  const className = `cursor-pointer h-6 w-6 rounded-full ${BG_COLOR_MAP[color]} transition-transform hover:scale-110 ${
    selected ? `ring-2 ${RING_COLOR_MAP[color]} ring-offset-2` : ''
  }`;

  return (
    <button onClick={() => onSelect?.(color)} className={className}></button>
  );
};
