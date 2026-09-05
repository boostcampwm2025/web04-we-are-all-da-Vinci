import {
  useDeclineAttendanceRecovery,
  useRecoverAttendance,
} from "@/entities/attendance";
import { useFullScreenAd } from "@/feature/playChance";
import { AD_GROUP_IDS } from "@/shared/config";
import {
  FUNNEL_EVENTS,
  getErrorMessage,
  trackClick,
  useInFlight,
} from "@/shared/lib";
import { useCallback, useState } from "react";
import type { RecoveryFailReason } from "../config/recoveryToast";

const RECOVERY_AD_GROUP_ID = AD_GROUP_IDS.ATTENDANCE_RECOVERY;

type RecoverResult = { ok: true } | { ok: false; reason: RecoveryFailReason };

/**
 * 끊긴 연속 출석을 보상형 광고 완주로 복구하는 단일 훅.
 * 끊김 결과 시트와 미션/대시보드 카드의 복구 버튼이 공유한다.
 *
 * - 광고 성공 판정은 `userEarnedReward` 발생 여부로만 한다(reward data 필드에 의존하지 않음).
 *   서버 `recover()`는 `adGroupId`만 검증하므로 reward 페이로드를 보내지 않는다.
 * - 결과는 `{ ok, reason }`으로 반환 → 호출부가 reason만 토스트로 매핑한다(useStartGame과 동일 패턴).
 */
export const useAttendanceRecovery = () => {
  const { isAdLoaded, showAd, reloadAd } = useFullScreenAd(
    RECOVERY_AD_GROUP_ID,
    { rewarded: true },
  );
  const [isRecovering, setIsRecovering] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  // 복구·포기 성공 시 출석 현황+포인트 무효화는 mutation(entities)이 소유한다 — 호출부가 refetch할 필요 없음.
  const { mutateAsync: recoverAttendance } = useRecoverAttendance();
  const { mutateAsync: declineAttendanceRecovery } =
    useDeclineAttendanceRecovery();

  // 복구·포기 각각의 중복 실행을 막는다. isRecovering(useState)은 상태 갱신이
  // 다음 렌더에 반영되므로 같은 렌더 사이클의 두 번째 호출을 통과시킨다 —
  // 더블탭 시 광고가 두 번 뜨고 서버 복구가 두 번 나간다.
  // 두 state는 이제 로딩 표시 전용이다.
  const guardRecover = useInFlight<RecoverResult>();
  const guardDecline = useInFlight<boolean>();

  const recover = useCallback(
    (): Promise<RecoverResult> =>
      // 광고 미로딩 판정도 잠금 안에 둔다 — 더블탭 시 reloadAd가 두 번 불리지 않게.
      guardRecover(async () => {
        if (!isAdLoaded) {
          reloadAd();
          return { ok: false, reason: "ad_not_ready" };
        }

        setIsRecovering(true);
        trackClick(FUNNEL_EVENTS.adRewardAttempt, {
          ad_group_id: RECOVERY_AD_GROUP_ID,
        });
        try {
          // 보상형: userEarnedReward가 발생한 경우에만 resolve된다(끝까지 시청).
          await showAd();
        } catch (err) {
          const adErrorReason = getErrorMessage(err);
          trackClick(FUNNEL_EVENTS.adRewardFailed, {
            ad_group_id: RECOVERY_AD_GROUP_ID,
            reason: adErrorReason,
          });
          setIsRecovering(false);
          // userEarnedReward 미발생(끝까지 안 봄)만 미시청으로, 그 외(failedToShow·SDK 에러)는 시스템 오류로.
          return {
            ok: false,
            reason:
              adErrorReason === "reward_not_earned" ? "not_watched" : "error",
          };
        }

        try {
          await recoverAttendance({ adGroupId: RECOVERY_AD_GROUP_ID });
          trackClick(FUNNEL_EVENTS.adRewardSuccess, {
            ad_group_id: RECOVERY_AD_GROUP_ID,
          });
          return { ok: true };
        } catch (err) {
          trackClick(FUNNEL_EVENTS.adRewardFailed, {
            ad_group_id: RECOVERY_AD_GROUP_ID,
            reason: getErrorMessage(err),
          });
          return { ok: false, reason: "error" };
        } finally {
          setIsRecovering(false);
        }
      }),
    [guardRecover, isAdLoaded, recoverAttendance, reloadAd, showAd],
  );

  const decline = useCallback(
    (): Promise<boolean> =>
      guardDecline(async () => {
        setIsDeclining(true);
        try {
          await declineAttendanceRecovery();
          return true;
        } catch {
          return false;
        } finally {
          setIsDeclining(false);
        }
      }),
    [declineAttendanceRecovery, guardDecline],
  );

  return {
    recover,
    decline,
    isRecovering,
    isDeclining,
    isAdLoaded,
    reloadAd,
  };
};
