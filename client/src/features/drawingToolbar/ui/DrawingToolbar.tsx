import type { Color } from '@/entities/similarity';
import { COLOR_MAP } from '@/features/drawingCanvas/config/colors';

interface DrawingToolbarProps {
  onColorSelect?: (color: string) => void;
  onUndo?: () => void;
  onClear?: () => void;
  canUndo?: boolean;
  selectedColor: Color;
}

const isColorSelected = (colorName: string, selectedColor: Color): boolean => {
  const color = COLOR_MAP[colorName];
  return (
    color[0] === selectedColor[0] &&
    color[1] === selectedColor[1] &&
    color[2] === selectedColor[2]
  );
};

const RING_COLOR_MAP: Record<string, string> = {
  black: 'ring-black',
  red: 'ring-red-500',
  blue: 'ring-blue-500',
  green: 'ring-green-500',
  yellow: 'ring-yellow-400',
};

export const DrawingToolbar = ({
  onColorSelect,
  onUndo,
  onClear,
  canUndo = false,
  selectedColor = [0, 0, 0],
}: DrawingToolbarProps) => {
  const getColorButtonClass = (colorName: string, bgColor: string) => {
    const selected = isColorSelected(colorName, selectedColor);
    return `cursor-pointer h-6 w-6 rounded-full ${bgColor} transition-transform hover:scale-110 ${
      selected ? `ring-2 ${RING_COLOR_MAP[colorName]} ring-offset-2` : ''
    }`;
  };

  return (
    <div className="flex shrink-0 items-center gap-4 border-b-2 border-gray-300 bg-gray-100 px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onColorSelect?.('black')}
          className={getColorButtonClass('black', 'bg-black')}
        ></button>
        <button
          onClick={() => onColorSelect?.('red')}
          className={getColorButtonClass('red', 'bg-red-500')}
        ></button>
        <button
          onClick={() => onColorSelect?.('blue')}
          className={getColorButtonClass('blue', 'bg-blue-500')}
        ></button>
        <button
          onClick={() => onColorSelect?.('green')}
          className={getColorButtonClass('green', 'bg-green-500')}
        ></button>
        <button
          onClick={() => onColorSelect?.('yellow')}
          className={getColorButtonClass('yellow', 'bg-yellow-400')}
        ></button>
      </div>

      <div className="h-6 w-px bg-gray-400"></div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-lg p-2 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-gray-700">undo</span>
        </button>
      </div>

      <div className="h-6 w-px bg-gray-400"></div>

      <button
        onClick={onClear}
        className="flex items-center gap-1 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100"
      >
        <span className="material-symbols-outlined">delete</span>
        <span className="font-handwriting text-sm font-bold">지우기</span>
      </button>
    </div>
  );
};
