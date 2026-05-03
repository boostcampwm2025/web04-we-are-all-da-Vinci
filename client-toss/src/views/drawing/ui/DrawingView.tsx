import { PhaseHeader } from "@/entities/phaseHeader";
import { Canvas, Toolbar } from "@/feature/drawing";
import { clearPlaySession, useRequirePlaySession } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api/serverToss";
import { Score } from "@/shared/ui/score";
import type { Stroke } from "@toss/shared";
import { BottomCTA, ConfirmDialog, Toast } from "@toss/tds-mobile";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TEMP_STROKES: Stroke[] = [
  {
    points: [
      [0, 50, 100],
      [0, 50, 100],
    ],
    color: [0, 0, 0],
  },
];

const DrawingView = () => {
  const navigate = useNavigate();
  const { isCheckingSession } = useRequirePlaySession();
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");
  const [isErrorToast, setIsErrorToast] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitDialogOpen(false);
    setIsSubmitting(true);

    try {
      const { promotionGranted } =
        await serverTossApi.submitDrawing(TEMP_STROKES);
      setToastText(
        promotionGranted
          ? "포인트 지급이 완료됐어요"
          : "그림 제출이 완료됐어요",
      );
      setIsErrorToast(false);
      setToastOpen(true);
      await clearPlaySession();
      window.setTimeout(() => navigate("/submitted"), 700);
    } catch (err) {
      console.error("[submit drawing error]", err);
      setToastText("일시적 오류가 발생했어요");
      setIsErrorToast(true);
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) return null;

  return (
    <div className="flex h-full flex-col bg-white">
      <Toast
        position="top"
        open={toastOpen}
        text={toastText}
        leftAddon={
          <Toast.Icon
            name={
              isErrorToast
                ? "icon-warning-circle-red-opacity"
                : "icon-check-circle-blue-opacity"
            }
          />
        }
        duration={3000}
        onClose={() => setToastOpen(false)}
      />
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
      <div onClick={() => !isSubmitting && setIsSubmitDialogOpen(true)}>
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
