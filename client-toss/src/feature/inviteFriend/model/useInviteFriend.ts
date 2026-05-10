import { serverTossApi } from "@/shared/api";
import { contactsViral } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseInviteFriendArgs {
  onCharged?: (count: number) => void;
  onError?: (error: Error) => void;
}

const toError = (err: unknown, fallback: string): Error =>
  err instanceof Error ? err : new Error(fallback);

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
              const { count } = await serverTossApi.chargeChanceByShare({
                channel: "contactsViral",
                moduleId: id,
                rewardAmount: event.data.rewardAmount,
                rewardUnit: event.data.rewardUnit,
              });
              onCharged?.(count);
            } catch (err) {
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
          handleError(err, "공유 화면을 여는 중 오류가 났어요.");
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
    if (!isContactsViralAvailable() || !moduleId) {
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
      handleError(err, "친구에게 공유하는 중 오류가 났어요.");
      setIsInviting(false);
    }
  }, [handleError, isInviting, moduleId, startContactsViral]);

  return { start, isInviting };
};
