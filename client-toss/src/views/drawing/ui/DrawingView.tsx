import { PhaseHeader } from "@/entities/phaseHeader";
import { Canvas, Toolbar } from "@/feature/drawing";
import { clearPlaySession, useRequirePlaySession } from "@/feature/playChance";
import { Score } from "@/shared/ui/score";
import { BottomCTA, ConfirmDialog } from "@toss/tds-mobile";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DrawingView = () => {
  const navigate = useNavigate();
  const { isCheckingSession } = useRequirePlaySession();
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitDialogOpen(false);
    // TODO: 서버에 그림 제출 로직
    await clearPlaySession();
    navigate("/submitted");
  };

  if (isCheckingSession) return null;

  return (
    <div className="flex h-full flex-col bg-white">
      <PhaseHeader
        title="그려주세요!"
        progress={0.5}
        description="30초 동안 가장 비슷하게 그려요"
      />

      {/* 드로잉 영역 (팔레트 + 캔버스) */}
      <div className="mx-(--card-mx) mt-2 flex min-h-0 flex-1 flex-col rounded-2xl bg-gray-100">
        <Toolbar />
        <Canvas />
      </div>
      <div onClick={() => setIsSubmitDialogOpen(true)}>
        <BottomCTA.Single topAccessory={<Score value={0} />}>
          제출할래요
        </BottomCTA.Single>
      </div>
      <ConfirmDialog
        open={isSubmitDialogOpen}
        onClose={() => setIsSubmitDialogOpen(false)}
        title="제출하시겠어요?"
        description="제출하면 되돌릴 수 없어요"
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={handleSubmit}>
            제출
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton
            onClick={() => setIsSubmitDialogOpen(false)}
          >
            닫기
          </ConfirmDialog.CancelButton>
        }
      />
    </div>
  );
};
export default DrawingView;
