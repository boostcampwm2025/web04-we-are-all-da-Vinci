import { serverTossApi } from "@/shared/api";
import { AD_GROUP_IDS } from "@/shared/config";
import { useToast } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { requestNotificationAgreement } from "@apps-in-toss/web-framework";
import {
  NotificationAgreementEventSchema,
  type NotificationAgreementRequest,
  type NotificationAgreementResponse,
  type NotificationAgreementStatus,
} from "@toss/shared";
import {
  BottomSheet,
  ConfirmDialog,
  ListRow,
  Switch,
  Toast,
} from "@toss/tds-mobile";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const DAILY_PROMPT_TEMPLATE_CODE =
  import.meta.env.VITE_TOSS_TEMPLATE_DAILY_PROMPT?.trim();
const OVERTAKEN_TEMPLATE_CODE =
  import.meta.env.VITE_TOSS_TEMPLATE_OVERTAKEN?.trim();

type AgreementAction = {
  templateCode: string;
  setLoading: (v: boolean) => void;
  save: (
    body: NotificationAgreementRequest,
  ) => Promise<NotificationAgreementResponse>;
  onStatus: (status: NotificationAgreementStatus) => void;
  label: string;
};

// 알림 동의 토글 시트. 알림 목록 노출은 폐지 — 토글만 다룬다.
// 시트 크기는 ShareSheet 패턴과 동일하게 BottomSheet 기본(콘텐츠 높이 자동).
const NotificationCenterSheet = ({ open, onClose }: Props) => {
  const [dailyPromptStatus, setDailyPromptStatus] =
    useState<NotificationAgreementStatus | null>(null);
  const [overtakenStatus, setOvertakenStatus] =
    useState<NotificationAgreementStatus | null>(null);
  const [isDailyPromptLoading, setIsDailyPromptLoading] = useState(false);
  const [isOvertakenLoading, setIsOvertakenLoading] = useState(false);
  const [offConfirm, setOffConfirm] = useState<AgreementAction | null>(null);
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
      const [dailyPrompt, overtaken] = await Promise.all([
        DAILY_PROMPT_TEMPLATE_CODE
          ? serverTossApi
              .getDailyPromptNotificationAgreement()
              .catch(() => null)
          : null,
        OVERTAKEN_TEMPLATE_CODE
          ? serverTossApi.getOvertakenNotificationAgreement().catch(() => null)
          : null,
      ]);
      if (cancelled) return;
      if (dailyPrompt) setDailyPromptStatus(dailyPrompt.status);
      if (overtaken) setOvertakenStatus(overtaken.status);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const requestAgreement = (params: AgreementAction) => {
    sdkCleanupRef.current?.();
    sdkCleanupRef.current = null;
    params.setLoading(true);

    try {
      const cleanup = requestNotificationAgreement({
        options: { templateCode: params.templateCode },
        onEvent: async ({ type }) => {
          try {
            const eventType = NotificationAgreementEventSchema.parse(type);
            const agreement = await params.save({ eventType });
            params.onStatus(agreement.status);
            if (agreement.status === "agreed")
              toast.show(`${params.label} 알림을 받기로 했어요`);
            else if (agreement.status === "rejected")
              toast.show(`${params.label} 알림을 보내지 않을게요`);
          } catch (err) {
            console.error("[알림 동의 결과 저장 실패]", err);
            toast.show("알림 동의 결과 저장에 실패했어요");
          } finally {
            cleanup?.();
            sdkCleanupRef.current = null;
            params.setLoading(false);
          }
        },
        onError: (error) => {
          console.error("[알림 동의 요청 실패]", error);
          toast.show("알림 동의 요청에 실패했어요");
          cleanup?.();
          sdkCleanupRef.current = null;
          params.setLoading(false);
        },
      });
      sdkCleanupRef.current = cleanup;
    } catch (err) {
      console.error("[알림 동의 UI 실행 실패]", err);
      toast.show("알림 동의 요청에 실패했어요");
      params.setLoading(false);
    }
  };

  // OFF 경로. 토스 SDK는 동의 해제를 지원하지 않으므로(이미 동의 시 alreadyAgreed만
  // 반환), 우리 서버에 거부 상태를 직접 저장해 발송 대상에서 제외한다.
  const rejectAgreement = async (params: AgreementAction) => {
    params.setLoading(true);
    try {
      const agreement = await params.save({ eventType: "agreementRejected" });
      params.onStatus(agreement.status);
      toast.show(`${params.label} 알림을 보내지 않을게요`);
    } catch (err) {
      console.error("[알림 거부 저장 실패]", err);
      toast.show("알림 설정 변경에 실패했어요");
    } finally {
      params.setLoading(false);
    }
  };

  // ON이면 끄기 확인 다이얼로그를 띄우고, OFF면 바로 동의 요청한다.
  const toggleAgreement = (action: AgreementAction, isAgreed: boolean) => {
    if (isAgreed) {
      setOffConfirm(action);
    } else {
      requestAgreement(action);
    }
  };

  const handleDailyPromptClick = () => {
    if (isDailyPromptLoading || !DAILY_PROMPT_TEMPLATE_CODE) return;
    toggleAgreement(
      {
        templateCode: DAILY_PROMPT_TEMPLATE_CODE,
        setLoading: setIsDailyPromptLoading,
        save: serverTossApi.saveDailyPromptNotificationAgreement,
        onStatus: setDailyPromptStatus,
        label: "오늘의 그림",
      },
      dailyPromptStatus === "agreed",
    );
  };

  const handleOvertakenClick = () => {
    if (isOvertakenLoading || !OVERTAKEN_TEMPLATE_CODE) return;
    toggleAgreement(
      {
        templateCode: OVERTAKEN_TEMPLATE_CODE,
        setLoading: setIsOvertakenLoading,
        save: serverTossApi.saveOvertakenNotificationAgreement,
        onStatus: setOvertakenStatus,
        label: "랭킹 추월",
      },
      overtakenStatus === "agreed",
    );
  };

  const handleConfirmOff = () => {
    const action = offConfirm;
    setOffConfirm(null);
    if (action) void rejectAgreement(action);
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        header={<BottomSheet.Header>알림 설정</BottomSheet.Header>}
      >
        <div className="flex flex-col pb-[env(safe-area-inset-bottom)]">
          {DAILY_PROMPT_TEMPLATE_CODE && (
            <NotificationSettingsRow
              top="오늘의 그림 알림"
              bottom="매일 새 그림이 바뀌면 알려드려요"
              checked={dailyPromptStatus === "agreed"}
              disabled={isDailyPromptLoading}
              onSelect={handleDailyPromptClick}
            />
          )}
          {OVERTAKEN_TEMPLATE_CODE && (
            <NotificationSettingsRow
              top="랭킹 추월 알림"
              bottom="TOP100 내 랭킹 변동이 있을 때 알려드려요"
              checked={overtakenStatus === "agreed"}
              disabled={isOvertakenLoading}
              onSelect={handleOvertakenClick}
            />
          )}
          <div className="mt-3 px-(--card-mx)">
            <BannerAd type="list" adGroupId={AD_GROUP_IDS.BANNER_LIST} />
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={offConfirm !== null}
        onClose={() => setOffConfirm(null)}
        title="알림을 끌까요?"
        description={
          offConfirm
            ? `${offConfirm.label} 알림을 더 이상 받지 않아요.`
            : undefined
        }
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={handleConfirmOff}>
            알림 끄기
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton onClick={() => setOffConfirm(null)}>
            유지하기
          </ConfirmDialog.CancelButton>
        }
      />

      <Toast
        position="top"
        open={toast.open}
        text={toast.text}
        duration={2500}
        onClose={toast.close}
      />
    </>
  );
};

// TDS ListRow 패턴 — 폰트·여백 표준 적용. 우측 Switch는 시각 표시이고
// 실제 액션은 row 클릭으로 토스 SDK 호출. 좌측 아이콘은 사용하지 않는다.
const NotificationSettingsRow = ({
  top,
  bottom,
  checked,
  disabled,
  onSelect,
}: {
  top: string;
  bottom: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
}) => (
  <div
    role="button"
    tabIndex={disabled ? -1 : 0}
    aria-disabled={disabled}
    onClick={() => {
      if (disabled) return;
      onSelect();
    }}
    onKeyDown={(event) => {
      if (disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    }}
    style={{ opacity: disabled ? 0.6 : 1 }}
  >
    <ListRow
      contents={<ListRow.Texts type="2RowTypeA" top={top} bottom={bottom} />}
      right={
        <Switch checked={checked} disabled={disabled} onChange={() => {}} />
      }
    />
  </div>
);

export default NotificationCenterSheet;
