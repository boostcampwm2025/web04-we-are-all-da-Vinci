import { ConfirmDialog } from "@toss/tds-mobile";
import clsx from "clsx";
import { useState } from "react";
import { MaskedIcon } from "@/shared/ui/maskedIcon";
import { trackClick } from "@/shared/lib";
import { ICON_URL } from "../config/icons";
import { PALETTE_COLORS } from "../config/colors";

const toolBtnBase =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95";

const Toolbar = () => {
  const [selectedColor, setSelectedColor] = useState<string>(
    PALETTE_COLORS[0].hex,
  );
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleReset = () => {
    trackClick("drawing_reset_click");
    // TODO: 캔버스 초기화 로직
    setIsResetDialogOpen(false);
  };

  return (
    <section className="flex items-center gap-3 px-4 py-3">
      {PALETTE_COLORS.map((color) => (
        <button
          key={color.name}
          aria-label={`${color.name} 색상`}
          className={clsx(
            "appearance-none! h-7 w-7 shrink-0 rounded-full! transition-transform active:scale-95",
            selectedColor === color.hex && `ring-2 ring-offset-2 ${color.ring}`,
          )}
          style={{ backgroundColor: color.hex }}
          onClick={() => setSelectedColor(color.hex)}
        />
      ))}
      <button
        type="button"
        aria-label="한획 취소"
        className={clsx(toolBtnBase, "active:bg-gray-200")}
        onClick={() => trackClick("drawing_undo_click")}
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
