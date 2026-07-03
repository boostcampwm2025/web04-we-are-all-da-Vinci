import { serverTossApi } from "@/shared/api";
import { FUNNEL_EVENTS, toError, trackClick } from "@/shared/lib";
import { contactsViral } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";

export interface InviteChargeResult {
  count: number;
  chanceGranted: boolean;
}

interface UseInviteFriendArgs {
  onCharged?: (result: InviteChargeResult) => void;
  onError?: (error: Error) => void;
}

const isContactsViralAvailable = (): boolean => {
  const candidate = contactsViral as unknown as {
    isSupported?: () => boolean;
  };
  return typeof candidate.isSupported === "function"
    ? candidate.isSupported()
    : true;
};

export const useInviteFriend = ({
  onCharged,
  onError,
}: UseInviteFriendArgs = {}) => {
  const [isInviting, setIsInviting] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const moduleId = import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID as
    | string
    | undefined;

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );

  // 트래킹은 호출 지점별로 명시한다 — 초대 실패와 적립 실패가 한 함수에서 섞여
  // 이중 집계되지 않도록, handleError는 onError 전파와 로깅만 담당한다.
  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      const error = toError(err, fallback);
      onError?.(error);
      console.error(`[useInviteFriend] ${fallback}`, error);
    },
    [onError],
  );

  const startContactsViral = useCallback(
    (id: string) => {
      const cleanup = contactsViral({
        options: { moduleId: id },
        onEvent: async (event) => {
          if (event.type === "sendViral") {
            try {
              const { count, chanceGranted } =
                await serverTossApi.chargeChanceByShare({
                  channel: "contactsViral",
                  moduleId: id,
                  rewardAmount: event.data.rewardAmount,
                  rewardUnit: event.data.rewardUnit,
                });
              // 기회 한도 초과분은 chanceGranted=false(서버 미반환 시 지급으로 간주).
              const granted = chanceGranted ?? true;
              trackClick(FUNNEL_EVENTS.shareInviteRewardSuccess, {
                reward_amount: event.data.rewardAmount,
                reward_unit: event.data.rewardUnit,
                chance_count: count,
                chance_granted: granted,
              });
              onCharged?.({ count, chanceGranted: granted });
            } catch (err) {
              trackClick(FUNNEL_EVENTS.shareInviteRewardFailed, {
                reason: err instanceof Error ? err.message : String(err),
              });
              handleError(err, "그리기 기회 적립에 실패했어요.");
              // sendViral 실패 시 SDK가 close를 보장하지 않아 isInviting이 영구 true로 남는 것을 방지
              cleanupRef.current?.();
              cleanupRef.current = null;
              setIsInviting(false);
            }
          }
          if (event.type === "close") {
            cleanupRef.current?.();
            cleanupRef.current = null;
            setIsInviting(false);
          }
        },
        onError: (err) => {
          const error = toError(err, "공유 화면을 여는 중 오류가 났어요.");
          trackClick(FUNNEL_EVENTS.shareInviteFailed, {
            reason: error.message,
          });
          handleError(error, "공유 화면을 여는 중 오류가 났어요.");
          cleanupRef.current?.();
          cleanupRef.current = null;
          setIsInviting(false);
        },
      });
      cleanupRef.current = typeof cleanup === "function" ? cleanup : null;
    },
    [handleError, onCharged],
  );

  const start = useCallback(() => {
    if (isInviting) return;
    if (!moduleId) {
      // VITE_CONTACTS_VIRAL_MODULE_ID가 빌드에 주입되지 않은 운영 사고 신호.
      // 사용자에게는 일반 메시지, 콘솔에는 명시적인 사유를 남겨 빠르게 감지한다.
      trackClick(FUNNEL_EVENTS.shareInviteFailed, {
        reason: "missing_module_id",
      });
      handleError(
        "MISSING_MODULE_ID",
        "친구 초대 기능 설정에 문제가 있어요. 잠시 후 다시 시도해주세요.",
      );
      return;
    }
    if (!isContactsViralAvailable()) {
      trackClick(FUNNEL_EVENTS.shareInviteFailed, {
        reason: "unsupported",
      });
      handleError(
        "UNSUPPORTED",
        "이 환경에서는 친구 초대 적립이 지원되지 않아요.",
      );
      return;
    }
    setIsInviting(true);
    try {
      startContactsViral(moduleId);
    } catch (err) {
      const error = toError(err, "친구에게 공유하는 중 오류가 났어요.");
      trackClick(FUNNEL_EVENTS.shareInviteFailed, { reason: error.message });
      handleError(error, "친구에게 공유하는 중 오류가 났어요.");
      setIsInviting(false);
    }
  }, [handleError, isInviting, moduleId, startContactsViral]);

  return { start, isInviting };
};
