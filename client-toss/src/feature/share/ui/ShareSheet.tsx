import { usePlayChanceContext } from "@/feature/playChance";
import { FUNNEL_EVENTS, trackClick } from "@/shared/lib";
import { BottomSheet, ListRow, Toast } from "@toss/tds-mobile";
import { useState } from "react";
import { shareMyScore } from "../lib/handleShare";
import { useInviteFriend } from "../model/useInviteFriend";

const TOAST_DURATION_MS = 2500;

const OptionIcon = ({ emoji }: { emoji: string }) => (
  <span
    aria-hidden
    className="flex h-10 w-10 items-center justify-center text-2xl"
  >
    {emoji}
  </span>
);

interface ShareOptionProps {
  emoji: string;
  top: string;
  bottom: string;
  onSelect: () => void;
}

const ShareOption = ({ emoji, top, bottom, onSelect }: ShareOptionProps) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    }}
  >
    <ListRow
      left={<OptionIcon emoji={emoji} />}
      contents={<ListRow.Texts type="2RowTypeA" top={top} bottom={bottom} />}
      arrowType="right"
    />
  </div>
);

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 공유 종류 선택 바텀시트. open/onClose로 제어되는 컨트롤드 컴포넌트이며,
 * 트리거(우하단 공유 FAB)는 `ShareFloatingButton`이 보유한다.
 * 시트에서 "점수 자랑" / "친구 초대" 중 하나를 고른다.
 */
const ShareSheet = ({ open, onClose }: ShareSheetProps) => {
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });
  const { refresh } = usePlayChanceContext();

  // 자동 닫힘은 TDS Toast의 duration이 처리한다
  const showToast = (message: string) => setToast({ open: true, message });

  const { start: startInvite } = useInviteFriend({
    onCharged: () => {
      // refresh가 throw해도 state.error로 노출됨 — unhandled rejection만 방지
      refresh().catch(() => {});
      showToast("그리기 기회 1회를 받았어요");
    },
    onError: (error) => {
      showToast(
        error.message || "공유에 실패했어요. 잠시 후 다시 시도해주세요.",
      );
    },
  });

  const handleScoreShare = () => {
    trackClick(FUNNEL_EVENTS.shareScoreSelected);
    onClose();
    shareMyScore().catch((error) => {
      console.error(error);
      showToast("공유에 실패했어요. 잠시 후 다시 시도해주세요.");
    });
  };

  const handleInviteShare = () => {
    trackClick(FUNNEL_EVENTS.shareInviteSelected);
    onClose();
    startInvite();
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        header={<BottomSheet.Header>공유하기</BottomSheet.Header>}
      >
        <div className="flex flex-col pb-[env(safe-area-inset-bottom)]">
          <ShareOption
            emoji="🏆"
            top="점수 자랑하기"
            bottom="내 점수와 등수를 친구에게 공유해요"
            onSelect={handleScoreShare}
          />
          <ShareOption
            emoji="🎁"
            top="친구 초대하고 기회 받기"
            bottom="광고 없이 한 번 더 도전할 수 있어요"
            onSelect={handleInviteShare}
          />
          <p className="px-(--page-px) pt-2 text-xs text-(--color-grey)">
            친구 초대 보상은 하루 5번까지 받을 수 있어요.
          </p>
        </div>
      </BottomSheet>

      <Toast
        position="top"
        open={toast.open}
        text={toast.message}
        duration={TOAST_DURATION_MS}
        onClose={() => setToast({ open: false, message: "" })}
      />
    </>
  );
};

export default ShareSheet;
