import { useToast } from "@/shared/lib";
import { Button, Toast } from "@toss/tds-mobile";
import { useState } from "react";
import { useAttendanceRecovery } from "../hooks/useAttendanceRecovery";

const TOAST_DURATION_MS = 2500;

interface AttendanceRecoverButtonProps {
  /** 복구/포기로 출석 현황이 바뀐 직후 호출 — 현황을 재조회해 카드를 갱신한다. */
  onResolved: () => void;
}

/**
 * 끊김 카드의 액션 묶음 — "광고 보고 이어가기"(복구)와 "새롭게 시작하기"(포기).
 * 끊김 감지 당일(`status.recoverable`)에만 미션/대시보드 카드가 렌더한다.
 */
const AttendanceRecoverButton = ({
  onResolved,
}: AttendanceRecoverButtonProps) => {
  const toast = useToast();
  const { recover, decline, isRecovering } = useAttendanceRecovery();
  const [isDeclining, setIsDeclining] = useState(false);

  const handleRecover = async () => {
    const result = await recover();
    if (result.ok) {
      onResolved();
      toast.show("연속출석을 이어갔어요");
      return;
    }
    if (result.reason === "ad_not_ready") {
      toast.show("광고를 불러오고 있어요. 잠시 후 다시 시도해주세요.");
    } else if (result.reason === "not_watched") {
      toast.show("광고 시청이 완료되지 않았어요. 다시 시도해주세요.");
    } else {
      toast.show("이어가기에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleDecline = async () => {
    if (isDeclining) return;
    setIsDeclining(true);
    const ok = await decline();
    setIsDeclining(false);
    if (ok) onResolved();
    else toast.show("잠시 후 다시 시도해주세요.");
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <Button
            variant="weak"
            display="block"
            size="small"
            loading={isDeclining}
            disabled={isRecovering || isDeclining}
            onClick={handleDecline}
          >
            새롭게 시작하기
          </Button>
        </div>
        <div className="flex-1">
          <Button
            color="primary"
            display="block"
            size="small"
            loading={isRecovering}
            disabled={isRecovering || isDeclining}
            onClick={handleRecover}
          >
            광고 보고 이어가기
          </Button>
        </div>
      </div>

      <Toast
        position="top"
        open={toast.open}
        text={toast.text}
        duration={TOAST_DURATION_MS}
        onClose={toast.close}
      />
    </>
  );
};

export default AttendanceRecoverButton;
