import { MaskedIcon } from "@/shared/ui/maskedIcon";
import { ConfirmDialog } from "@toss/tds-mobile";
import clsx from "clsx";
import { useState } from "react";
import type { RGB } from "../config/colors";
import { PALETTE_COLORS } from "../config/colors";
import { ICON_URL } from "../config/icons";

const toolBtnBase =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95";

interface ToolbarProps {
  selectedColor: RGB;
  onColorChange: (color: RGB) => void;
  onUndo: () => void;
  onClear: () => void;
}

const Toolbar = ({
  selectedColor,
  onColorChange,
  onUndo,
  onClear,
}: ToolbarProps) => {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleReset = () => {
    onClear();
    setIsResetDialogOpen(false);
  };

  const isSelected = (rgb: readonly [number, number, number]) =>
    selectedColor[0] === rgb[0] &&
    selectedColor[1] === rgb[1] &&
    selectedColor[2] === rgb[2];

  return (
    <section className="flex items-center gap-3 px-4 py-3">
      {PALETTE_COLORS.map((color) => (
        <button
          key={color.name}
          aria-label={`${color.name} 색상`}
          className={clsx(
            "appearance-none! h-7 w-7 shrink-0 rounded-full! transition-transform active:scale-95",
            isSelected(color.rgb) && `ring-2 ring-offset-2 ${color.ring}`,
          )}
          style={{ backgroundColor: color.hex }}
          onClick={() => onColorChange([...color.rgb])}
        />
      ))}
      <button
        type="button"
        aria-label="한획 취소"
        className={clsx(toolBtnBase, "active:bg-gray-200")}
        onClick={onUndo}
      >
        <MaskedIcon src={ICON_URL.refresh} color="var(--color-grey)" />
      </button>
      <button
        type="button"
        aria-label="초기화"
        className={clsx(toolBtnBase, "active:bg-red-100")}
        onClick={() => setIsResetDialogOpen(true)}
      >
        <MaskedIcon src={ICON_URL.bin} color="var(--color-coral)" />
      </button>
      <ConfirmDialog
        open={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        title="초기화"
        description="그림을 모두 지우시겠어요?"
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={handleReset}>
            초기화
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton
            onClick={() => setIsResetDialogOpen(false)}
          >
            닫기
          </ConfirmDialog.CancelButton>
        }
      />
    </section>
  );
};

export default Toolbar;
