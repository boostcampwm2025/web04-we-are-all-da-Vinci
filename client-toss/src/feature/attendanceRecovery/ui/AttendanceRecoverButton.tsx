import { useToast } from "@/shared/lib";
import { Button, Toast } from "@toss/tds-mobile";
import {
  ATTENDANCE_RECOVERY_DECLINE_FAIL_MESSAGE,
  ATTENDANCE_RECOVERY_SUCCESS_MESSAGE,
  ATTENDANCE_RECOVERY_TOAST_DURATION_MS,
  getRecoveryFailMessage,
} from "../config/recoveryToast";
import { useAttendanceRecovery } from "../hooks/useAttendanceRecovery";

interface AttendanceRecoverButtonProps {
  /** 복구/포기 직후 호출(선택). 현황·포인트 갱신은 mutation이 하므로 부가 동작에만 쓴다. */
  onResolved?: () => void;
}

/**
 * 끊김 카드의 액션 묶음 — "광고 보고 이어가기"(복구)와 "새롭게 시작하기"(포기).
 * 끊김 감지 당일(`status.recoverable`)에만 미션/대시보드 카드가 렌더한다.
 */
const AttendanceRecoverButton = ({
  onResolved,
}: AttendanceRecoverButtonProps) => {
  const toast = useToast();
  // 중복 실행 방지와 로딩 상태는 훅이 소유한다 — 자원(서버 복구/포기)을 가진 쪽이
  // 잠금도 가져야 두 진입점(이 카드, 끊김 결과 시트)이 같은 보장을 받는다.
  const { recover, decline, isRecovering, isDeclining } =
    useAttendanceRecovery();

  const handleRecover = async () => {
    const result = await recover();
    if (result.ok) {
      onResolved?.();
      toast.show(ATTENDANCE_RECOVERY_SUCCESS_MESSAGE);
      return;
    }
    toast.show(getRecoveryFailMessage(result.reason));
  };

  const handleDecline = async () => {
    const ok = await decline();
    if (ok) onResolved?.();
    else toast.show(ATTENDANCE_RECOVERY_DECLINE_FAIL_MESSAGE);
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
        duration={ATTENDANCE_RECOVERY_TOAST_DURATION_MS}
        onClose={toast.close}
      />
    </>
  );
};

export default AttendanceRecoverButton;
