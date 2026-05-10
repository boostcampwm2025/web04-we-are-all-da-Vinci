import { PhaseHeader } from "@/entities/phaseHeader";
import type { RGB } from "@/feature/drawing";
import {
  Canvas,
  Toolbar,
  useDrawingStrokes,
  useDrawingSubmit,
  useStrokeScoring,
} from "@/feature/drawing";
import { clearPlaySession, useRequirePlaySession } from "@/feature/playChance";
import {
  DRAWING_SECONDS,
  useCountdown,
  useExitGuard,
  useRequiredState,
} from "@/shared/lib";
import { Score } from "@/shared/ui/score";
import type { Stroke } from "@toss/shared";
import { Button, ConfirmDialog } from "@toss/tds-mobile";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface DrawingRouteState {
  promptId: number;
  promptStrokes: Stroke[];
  anonymousHash: string;
}

const DrawingView = () => {
  const navigate = useNavigate();
  const { isCheckingSession } = useRequirePlaySession();
  const routeState = useRequiredState<DrawingRouteState>();
  const { showDialog, setShowDialog } = useExitGuard();

  const [endTime] = useState(() => {
    const stored = sessionStorage.getItem("drawingEndTime");
    const now = Date.now();
    if (stored) {
      const parsed = Number(stored);
      if (parsed > now) return parsed;
    }
    const et = now + DRAWING_SECONDS * 1000;
    sessionStorage.setItem("drawingEndTime", String(et));
    return et;
  });
  const [selectedColor, setSelectedColor] = useState<RGB>([0, 0, 0]);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);

  const scoring = useStrokeScoring();
  const { strokes, handleAddStroke, handleUndo, handleClear } =
    useDrawingStrokes({
      onScoreImmediate: scoring.scoreStrokes,
      onScoreDebounced: scoring.scheduleScore,
      onCancelScore: scoring.cancelPendingScore,
      onResetScore: scoring.resetSimilarity,
    });
  const { handleSubmit } = useDrawingSubmit({
    promptId: routeState?.promptId ?? 0,
    anonymousHash: routeState?.anonymousHash ?? "",
    strokes,
    similarity: scoring.similarity,
  });

  const submitAndCleanup = async () => {
    sessionStorage.removeItem("drawingEndTime");
    try {
      await clearPlaySession();
    } catch {
      // 세션 정리 실패해도 제출은 진행
    }
    handleSubmit();
  };

  const { timeLeft, progress } = useCountdown(
    endTime,
    DRAWING_SECONDS,
    submitAndCleanup,
  );

  const confirmSubmit = () => {
    setIsSubmitDialogOpen(false);
    submitAndCleanup();
  };

  if (isCheckingSession || !routeState) return null;

  return (
    <div className="relative flex h-full flex-col bg-white">
      {scoring.showPenalty && (
        <div className="animate-penalty pointer-events-none absolute inset-0 z-50 bg-red-500/20" />
      )}

      <PhaseHeader
        title="외운 그림을 그려주세요"
        progress={progress}
        description={`${timeLeft}초 남았어요`}
      />

      <div className="mx-(--card-mx) mt-2 flex min-h-0 flex-1 flex-col rounded-2xl bg-gray-100">
        <Toolbar
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          onUndo={handleUndo}
          onClear={handleClear}
        />
        <Canvas
          selectedColor={selectedColor}
          strokes={strokes}
          onAddStroke={handleAddStroke}
        />
      </div>

      <div className="flex flex-col items-center gap-2 px-(--page-px) py-3">
        <Score value={scoring.similarity?.score ?? 0} />
        <Button
          color="primary"
          display="block"
          onClick={() => setIsSubmitDialogOpen(true)}
        >
          다 그렸어요
        </Button>
      </div>

      <ConfirmDialog
        open={isSubmitDialogOpen}
        onClose={() => setIsSubmitDialogOpen(false)}
        title="이대로 끝낼까요?"
        description="점수 확인 화면으로 넘어가요"
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={confirmSubmit}>
            완성
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton
            onClick={() => setIsSubmitDialogOpen(false)}
          >
            더 그리기
          </ConfirmDialog.CancelButton>
        }
      />

      <ConfirmDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title="나가시겠어요?"
        description="지금 나가면 그림이 사라져요"
        confirmButton={
          <ConfirmDialog.ConfirmButton
            onClick={() => {
              sessionStorage.removeItem("drawingEndTime");
              navigate("/", { replace: true });
            }}
          >
            나가기
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton onClick={() => setShowDialog(false)}>
            계속 그리기
          </ConfirmDialog.CancelButton>
        }
      />
    </div>
  );
};

export default DrawingView;
