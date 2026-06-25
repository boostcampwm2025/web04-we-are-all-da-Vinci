import { AD_GROUP_IDS } from "@/shared/config";
import { BannerAd } from "@/shared/ui/bannerAd";
import {
  BottomSheet,
  ConfirmDialog,
  ListRow,
  Switch,
  Toast,
} from "@toss/tds-mobile";
import { useNotificationAgreements } from "../model/useNotificationAgreements";

type Props = {
  open: boolean;
  onClose: () => void;
};

// 알림 동의 토글 시트. 알림 목록 노출은 폐지 — 토글만 다룬다.
// 타입별 로직은 useNotificationAgreements 훅 + config 배열(items)로 일원화한다.
// 시트 크기는 ShareSheet 패턴과 동일하게 BottomSheet 기본(콘텐츠 높이 자동).
const NotificationCenterSheet = ({ open, onClose }: Props) => {
  const {
    items,
    isChecked,
    isLoading,
    onSelect,
    offConfirm,
    confirmOff,
    closeConfirm,
    toast,
  } = useNotificationAgreements(open);

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        header={<BottomSheet.Header>알림 설정</BottomSheet.Header>}
      >
        <div className="flex flex-col pb-[env(safe-area-inset-bottom)]">
          {items.map((item) => (
            <NotificationSettingsRow
              key={item.id}
              top={item.rowTop}
              bottom={item.rowBottom}
              checked={isChecked(item.id)}
              disabled={isLoading(item.id)}
              onSelect={() => onSelect(item.id)}
            />
          ))}
          <div className="mt-3 px-(--card-mx)">
            <BannerAd type="list" adGroupId={AD_GROUP_IDS.BANNER_LIST} />
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={offConfirm !== null}
        onClose={closeConfirm}
        title="알림을 끌까요?"
        description={
          offConfirm
            ? `${offConfirm.label} 알림을 더 이상 받지 않아요.`
            : undefined
        }
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={confirmOff}>
            알림 끄기
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton onClick={closeConfirm}>
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
