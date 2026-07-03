import { AttendanceProgress } from "@/entities/attendance";
import {
  ATTENDANCE_RECOVERY_DECLINE_FAIL_MESSAGE,
  ATTENDANCE_RECOVERY_SUCCESS_MESSAGE,
  ATTENDANCE_RECOVERY_TOAST_DURATION_MS,
  getRecoveryFailMessage,
  useAttendanceRecovery,
} from "@/feature/attendanceRecovery";
import { useToast } from "@/shared/lib";
import { ATTENDANCE_REWARD_POINT } from "@toss/shared";
import type { AttendanceCheckInResponse } from "@toss/shared";
import { BottomSheet, Button, Toast } from "@toss/tds-mobile";
import { useState } from "react";

interface AttendanceResultSheetProps {
  result: AttendanceCheckInResponse | null;
  onClose: () => void;
  onRecovered: () => void;
}

/**
 * 출석 체크 결과를 안내하는 바텀시트.
 * - 연속/첫 출석: 연속 일수 + (마일스톤 시) 적립 안내.
 * - 끊김: 끊긴 연속을 보여주고 보상형 광고로 이어가거나 새롭게 시작한다(복구 포기).
 */
const AttendanceResultSheet = ({
  result,
  onClose,
  onRecovered,
}: AttendanceResultSheetProps) => {
  const toast = useToast();
  const { recover, decline, isRecovering } = useAttendanceRecovery();
  const [isDeclining, setIsDeclining] = useState(false);

  const isBroken = result?.status === "reset_recoverable";

  let headerText = "";
  if (result != null) {
    headerText = isBroken
      ? "연속출석이 끊겼어요!"
      : `🔥 ${result.cycleDay}일 연속출석!`;
  }

  const handleRecover = async () => {
    const outcome = await recover();
    if (outcome.ok) {
      onRecovered();
      onClose();
      toast.show(ATTENDANCE_RECOVERY_SUCCESS_MESSAGE);
      return;
    }
    toast.show(getRecoveryFailMessage(outcome.reason));
  };

  const handleDecline = async () => {
    if (isDeclining) return;
    setIsDeclining(true);
    const ok = await decline();
    setIsDeclining(false);
    if (ok) {
      onRecovered();
      onClose();
    } else {
      toast.show(ATTENDANCE_RECOVERY_DECLINE_FAIL_MESSAGE);
    }
  };

  const rewardNote =
    result?.rewardedDay != null
      ? `${result.rewardedDay}일 연속 달성! ${ATTENDANCE_REWARD_POINT}원을 추가 적립했어요`
      : null;

  return (
    <>
      <BottomSheet
        open={result != null}
        onClose={onClose}
        header={<BottomSheet.Header>{headerText}</BottomSheet.Header>}
      >
        {result &&
          (isBroken ? (
            <div className="flex flex-col gap-5 px-(--page-px) pt-1 pb-[env(safe-area-inset-bottom)]">
              <p className="text-[13px] text-(--color-grey)">
                {result.previousDay}일 연속출석 중이었어요
              </p>
              <AttendanceProgress
                cycleDay={result.cycleDay}
                recoverableDay={result.previousDay}
              />
              <div className="flex flex-col items-center gap-2">
                <Button
                  color="primary"
                  display="block"
                  loading={isRecovering}
                  disabled={isRecovering || isDeclining}
                  onClick={handleRecover}
                >
                  광고 보고 이어가기
                </Button>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={isRecovering || isDeclining}
                  className="py-1 text-[13px] font-medium text-(--color-grey)"
                >
                  새롭게 시작하기
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-(--page-px) pt-1 pb-[env(safe-area-inset-bottom)]">
              <AttendanceProgress cycleDay={result.cycleDay} />
              {rewardNote && (
                <p className="text-[13px] font-medium text-(--color-toss-blue)">
                  {rewardNote}
                </p>
              )}
              <Button color="primary" display="block" onClick={onClose}>
                확인했어요
              </Button>
            </div>
          ))}
      </BottomSheet>

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

export default AttendanceResultSheet;
