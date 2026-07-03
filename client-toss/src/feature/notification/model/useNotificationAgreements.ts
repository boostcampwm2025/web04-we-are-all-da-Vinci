import { useToast } from "@/shared/lib";
import { requestNotificationAgreement } from "@apps-in-toss/web-framework";
import {
  NotificationAgreementEventSchema,
  type NotificationAgreementStatus,
} from "@toss/shared";
import { useEffect, useRef, useState } from "react";
import {
  ENABLED_NOTIFICATION_TYPES,
  NOTIFICATION_LOG,
  NOTIFICATION_TOAST,
  type NotificationTypeConfig,
  type NotificationTypeId,
} from "../config";
import { fetchEnabledAgreements } from "./fetchEnabledAgreements";

type StatusMap = Partial<
  Record<NotificationTypeId, NotificationAgreementStatus>
>;
type LoadingMap = Partial<Record<NotificationTypeId, boolean>>;

// 알림 동의 시트의 상태·동의 흐름을 모두 보유하는 훅. 타입별 하드와이어 대신
// config 배열(ENABLED_NOTIFICATION_TYPES)을 순회해 동일 로직을 재사용한다.
export const useNotificationAgreements = (open: boolean) => {
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [loading, setLoading] = useState<LoadingMap>({});
  const [offConfirm, setOffConfirm] = useState<NotificationTypeConfig | null>(
    null,
  );
  const toast = useToast();
  const sdkCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) {
      sdkCleanupRef.current?.();
      sdkCleanupRef.current = null;
      setOffConfirm(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const results = await fetchEnabledAgreements();
      if (cancelled) return;
      setStatuses((prev) => {
        const next = { ...prev };
        for (const { id, status } of results) {
          if (status) next[id] = status;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const setTypeLoading = (id: NotificationTypeId, value: boolean) =>
    setLoading((prev) => ({ ...prev, [id]: value }));

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
            setStatuses((prev) => ({ ...prev, [type.id]: agreement.status }));
            if (agreement.status === "agreed")
              toast.show(NOTIFICATION_TOAST.agreed(type.label));
            else if (agreement.status === "rejected")
              toast.show(NOTIFICATION_TOAST.rejected(type.label));
          } catch (err) {
            console.error(NOTIFICATION_LOG.saveResultFailed, err);
            toast.show(NOTIFICATION_TOAST.saveResultFailed);
          } finally {
            cleanup?.();
            sdkCleanupRef.current = null;
            setTypeLoading(type.id, false);
          }
        },
        onError: (error) => {
          console.error(NOTIFICATION_LOG.requestFailed, error);
          toast.show(NOTIFICATION_TOAST.requestFailed);
          cleanup?.();
          sdkCleanupRef.current = null;
          setTypeLoading(type.id, false);
        },
      });
      sdkCleanupRef.current = cleanup;
    } catch (err) {
      console.error(NOTIFICATION_LOG.uiFailed, err);
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
      setStatuses((prev) => ({ ...prev, [type.id]: agreement.status }));
      toast.show(NOTIFICATION_TOAST.rejected(type.label));
    } catch (err) {
      console.error(NOTIFICATION_LOG.rejectSaveFailed, err);
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
