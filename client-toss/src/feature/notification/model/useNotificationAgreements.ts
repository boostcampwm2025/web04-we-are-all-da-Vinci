import { captureWarning, getErrorMessage, useToast } from "@/shared/lib";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { requestNotificationAgreement } from "@apps-in-toss/web-framework";
import {
  NotificationAgreementEventSchema,
  type NotificationAgreementResponse,
  type NotificationAgreementStatus,
} from "@toss/shared";
import { useEffect, useRef, useState } from "react";
import { agreementQueries } from "../api/agreementQueries";
import {
  ENABLED_NOTIFICATION_TYPES,
  NOTIFICATION_LOG,
  NOTIFICATION_TOAST,
  type NotificationTypeConfig,
  type NotificationTypeId,
} from "../config";

type StatusMap = Partial<
  Record<NotificationTypeId, NotificationAgreementStatus>
>;
type LoadingMap = Partial<Record<NotificationTypeId, boolean>>;

// 알림 동의 시트의 상태·동의 흐름을 모두 보유하는 훅. 타입별 하드와이어 대신
// config 배열(ENABLED_NOTIFICATION_TYPES)을 순회해 동일 로직을 재사용한다.
export const useNotificationAgreements = (open: boolean) => {
  const [loading, setLoading] = useState<LoadingMap>({});
  const [offConfirm, setOffConfirm] = useState<NotificationTypeConfig | null>(
    null,
  );
  const toast = useToast();
  const sdkCleanupRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();

  // 동의 상태는 서버 상태 캐시가 소유한다 — 시트가 열릴 때 조회하고, 캐시 hit이면 첫 렌더에 값이 있다.
  const statuses = useQueries({
    queries: ENABLED_NOTIFICATION_TYPES.map((type) => ({
      ...agreementQueries.status(type),
      enabled: open,
    })),
    combine: (results): StatusMap =>
      Object.fromEntries(
        ENABLED_NOTIFICATION_TYPES.flatMap((type, index) => {
          const status = results[index]?.data?.status;
          return status ? [[type.id, status]] : [];
        }),
      ),
  });

  useEffect(() => {
    if (open) return;
    sdkCleanupRef.current?.();
    sdkCleanupRef.current = null;
    setOffConfirm(null);
  }, [open]);

  const setTypeLoading = (id: NotificationTypeId, value: boolean) =>
    setLoading((prev) => ({ ...prev, [id]: value }));

  // 저장 응답이 곧 최신 상태다 — 재조회 없이 캐시에 직접 쓴다(영속 캐시에도 반영된다).
  const applyAgreement = (
    type: NotificationTypeConfig,
    agreement: NotificationAgreementResponse,
  ) =>
    queryClient.setQueryData(agreementQueries.status(type).queryKey, agreement);

  const requestAgreement = (type: NotificationTypeConfig) => {
    if (!type.templateCode) return;
    sdkCleanupRef.current?.();
    sdkCleanupRef.current = null;
    setTypeLoading(type.id, true);

    try {
      const cleanup = requestNotificationAgreement({
        options: { templateCode: type.templateCode },
        onEvent: async ({ type: eventType }) => {
          try {
            const parsed = NotificationAgreementEventSchema.parse(eventType);
            const agreement = await type.save({ eventType: parsed });
            applyAgreement(type, agreement);
            if (agreement.status === "agreed")
              toast.show(NOTIFICATION_TOAST.agreed(type.label));
            else if (agreement.status === "rejected")
              toast.show(NOTIFICATION_TOAST.rejected(type.label));
          } catch (err) {
            console.error(NOTIFICATION_LOG.saveResultFailed, err);
            captureWarning("알림 동의 결과 저장 실패", {
              tags: { error_type: "notification_agreement_failed" },
              extra: { stage: "save_result", original: getErrorMessage(err) },
            });
            toast.show(NOTIFICATION_TOAST.saveResultFailed);
          } finally {
            cleanup?.();
            sdkCleanupRef.current = null;
            setTypeLoading(type.id, false);
          }
        },
        onError: (error) => {
          console.error(NOTIFICATION_LOG.requestFailed, error);
          captureWarning("알림 동의 요청 실패", {
            tags: { error_type: "notification_agreement_failed" },
            extra: { stage: "request", original: getErrorMessage(error) },
          });
          toast.show(NOTIFICATION_TOAST.requestFailed);
          cleanup?.();
          sdkCleanupRef.current = null;
          setTypeLoading(type.id, false);
        },
      });
      sdkCleanupRef.current = cleanup;
    } catch (err) {
      console.error(NOTIFICATION_LOG.uiFailed, err);
      captureWarning("알림 동의 UI 표시 실패", {
        tags: { error_type: "notification_agreement_failed" },
        extra: { stage: "ui", original: getErrorMessage(err) },
      });
      toast.show(NOTIFICATION_TOAST.requestFailed);
      setTypeLoading(type.id, false);
    }
  };

  // OFF 경로. 토스 SDK는 동의 해제를 지원하지 않으므로(이미 동의 시 alreadyAgreed만
  // 반환), 우리 서버에 거부 상태를 직접 저장해 발송 대상에서 제외한다.
  const rejectAgreement = async (type: NotificationTypeConfig) => {
    setTypeLoading(type.id, true);
    try {
      const agreement = await type.save({ eventType: "agreementRejected" });
      applyAgreement(type, agreement);
      toast.show(NOTIFICATION_TOAST.rejected(type.label));
    } catch (err) {
      console.error(NOTIFICATION_LOG.rejectSaveFailed, err);
      captureWarning("알림 거부 저장 실패", {
        tags: { error_type: "notification_agreement_failed" },
        extra: { stage: "reject_save", original: getErrorMessage(err) },
      });
      toast.show(NOTIFICATION_TOAST.rejectFailed);
    } finally {
      setTypeLoading(type.id, false);
    }
  };

  // ON이면 끄기 확인 다이얼로그를 띄우고, OFF면 바로 동의 요청한다.
  const onSelect = (id: NotificationTypeId) => {
    const type = ENABLED_NOTIFICATION_TYPES.find((item) => item.id === id);
    if (!type || loading[id]) return;
    if (statuses[id] === "agreed") {
      setOffConfirm(type);
    } else {
      requestAgreement(type);
    }
  };

  const confirmOff = () => {
    const type = offConfirm;
    setOffConfirm(null);
    if (type) void rejectAgreement(type);
  };

  return {
    items: ENABLED_NOTIFICATION_TYPES,
    isChecked: (id: NotificationTypeId) => statuses[id] === "agreed",
    isLoading: (id: NotificationTypeId) => !!loading[id],
    onSelect,
    offConfirm,
    confirmOff,
    closeConfirm: () => setOffConfirm(null),
    toast,
  };
};
