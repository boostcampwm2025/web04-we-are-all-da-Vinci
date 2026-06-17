import { AttendanceProgress } from "@/entities/attendance";
import { useFullScreenAd } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import { AD_GROUP_IDS } from "@/shared/config";
import { useToast } from "@/shared/lib";
import { ATTENDANCE_REWARD_POINT } from "@toss/shared";
import type { AttendanceCheckInResponse } from "@toss/shared";
import { BottomSheet, Button, Toast } from "@toss/tds-mobile";
import { useState } from "react";

const TOAST_DURATION_MS = 2500;

interface AttendanceResultSheetProps {
  result: AttendanceCheckInResponse | null;
  onClose: () => void;
  onRecovered: () => void;
}

/**
 * 출석 체크 결과를 안내하는 바텀시트.
 * - 연속/첫 출석: 연속 일수 + (마일스톤 시) 적립 안내.
 * - 끊김: 끊긴 연속을 보여주고 보상형 광고로 이어가거나 처음부터 시작한다.
 */
const AttendanceResultSheet = ({
  result,
  onClose,
  onRecovered,
}: AttendanceResultSheetProps) => {
  const toast = useToast();
  const { isAdLoaded, showAd, reloadAd } = useFullScreenAd(
    AD_GROUP_IDS.ATTENDANCE_RECOVERY,
    { rewarded: true },
  );
  const [isRecovering, setIsRecovering] = useState(false);

  const isBroken = result?.status === "reset_recoverable";

  const handleRecover = async () => {
    if (isRecovering) return;
    if (!isAdLoaded) {
      reloadAd();
      toast.show("광고를 불러오고 있어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsRecovering(true);
    try {
      const reward = await showAd();
      if (!reward?.unitType || reward.unitAmount == null) {
        toast.show("광고 시청이 완료되지 않았어요. 다시 시도해주세요.");
        return;
      }
      await serverTossApi.recoverAttendance({
        adGroupId: AD_GROUP_IDS.ATTENDANCE_RECOVERY,
        unitType: reward.unitType,
        unitAmount: reward.unitAmount,
      });
      onRecovered();
      onClose();
      toast.show("연속 출석을 이어갔어요");
    } catch {
      toast.show("이어가기에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsRecovering(false);
    }
  };

  const rewardNote =
    result?.rewardedDay != null
      ? `${result.rewardedDay}일 연속 달성! ${ATTENDANCE_REWARD_POINT}P를 추가 적립했어요`
      : null;

  return (
    <>
      <BottomSheet
        open={result != null}
        onClose={onClose}
        header={<BottomSheet.Header>출석 체크</BottomSheet.Header>}
      >
        {result &&
          (isBroken ? (
            <div className="flex flex-col gap-5 px-(--page-px) pt-1 pb-[env(safe-area-inset-bottom)]">
              <div>
                <p className="text-lg font-bold text-(--color-black)">
                  연속 출석이 끊겼어요!
                </p>
                <p className="mt-1 text-[13px] text-(--color-grey)">
                  {result.previousDay}일 연속 출석 중이었어요
                </p>
              </div>
              <AttendanceProgress
                cycleDay={result.cycleDay}
                recoverableDay={result.previousDay}
              />
              <div className="flex flex-col items-center gap-2">
                <Button
                  color="primary"
                  display="block"
                  loading={isRecovering}
                  disabled={isRecovering}
                  onClick={handleRecover}
                >
                  광고 보고 이어가기
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-1 text-[13px] font-medium text-(--color-grey)"
                >
                  처음부터 시작
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-(--page-px) pt-1 pb-[env(safe-area-inset-bottom)]">
              <p className="text-lg font-bold text-(--color-black)">
                🔥 {result.cycleDay}일 연속 출석!
              </p>
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
        duration={TOAST_DURATION_MS}
        onClose={toast.close}
      />
    </>
  );
};

export default AttendanceResultSheet;
