import { useState } from "react";
import { ConfirmDialog } from "@toss/tds-mobile";
import { BinIcon, UndoIcon } from "../assets/icons";
import { PALETTE_COLORS } from "../config/colors";

const Toolbar = () => {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleReset = () => {
    // TODO: 캔버스 초기화 로직
    setIsResetDialogOpen(false);
  };

  return (
    <section className="flex items-center gap-3 px-4 py-3">
      {PALETTE_COLORS.map((color) => (
        <button
          key={color.name}
          aria-label={`${color.name} 색상`}
          className="!appearance-none h-7 w-7 shrink-0 !rounded-full"
          style={{ backgroundColor: color.hex }}
        />
      ))}
      <button type="button" aria-label="한획 취소" className="ml-auto shrink-0">
        <UndoIcon width={28} height={28} className="text-[var(--color-grey)]" />
      </button>
      <button
        type="button"
        aria-label="초기화"
        className="shrink-0"
        onClick={() => setIsResetDialogOpen(true)}
      >
        <BinIcon width={28} height={28} className="text-[var(--color-coral)]" />
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
