import { trackEvent } from '@/shared/lib/mixpanel';
import { MIXPANEL_EVENTS } from '@/shared/config';
import type { Color } from '@/entities/similarity';
import { ColorButton } from './ColorButton';

interface DrawingToolbarProps {
  onColorSelect?: (color: string) => void;
  onUndo?: () => void;
  onClear?: () => void;
  canUndo?: boolean;
  selectedColor: Color;
}

export const DrawingToolbar = ({
  onColorSelect,
  onUndo,
  onClear,
  canUndo = false,
  selectedColor = [0, 0, 0],
}: DrawingToolbarProps) => {
  return (
    <div className="flex shrink-0 items-center gap-4 border-b-2 border-gray-300 bg-gray-100 px-4 py-3">
      <div className="flex items-center gap-2">
        <ColorButton
          color="black"
          selectedColor={selectedColor}
          onSelect={onColorSelect}
        />
        <ColorButton
          color="red"
          selectedColor={selectedColor}
          onSelect={onColorSelect}
        />
        <ColorButton
          color="blue"
          selectedColor={selectedColor}
          onSelect={onColorSelect}
        />
        <ColorButton
          color="green"
          selectedColor={selectedColor}
          onSelect={onColorSelect}
        />
        <ColorButton
          color="yellow"
          selectedColor={selectedColor}
          onSelect={onColorSelect}
        />
      </div>

      <div className="h-6 w-px bg-gray-400"></div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            trackEvent(MIXPANEL_EVENTS.CLICK_UNDO_BTN);
            onUndo?.();
          }}
          disabled={!canUndo}
          className="rounded-lg p-2 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-gray-700">undo</span>
        </button>
      </div>

      <div className="h-6 w-px bg-gray-400"></div>

      <button
        onClick={() => {
          trackEvent(MIXPANEL_EVENTS.CLICK_CLEAR_BTN);
          onClear?.();
        }}
        className="flex items-center gap-1 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100"
      >
        <span className="material-symbols-outlined">delete</span>
        <span className="font-handwriting text-sm font-bold">지우기</span>
      </button>
    </div>
  );
};
