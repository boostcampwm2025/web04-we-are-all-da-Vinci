import { usePlayChanceContext } from "@/feature/playChance";
import { FUNNEL_EVENTS, trackClick } from "@/shared/lib";
import { partner, tdsEvent } from "@apps-in-toss/web-framework";
import { BottomSheet, ListRow, Toast } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { shareMyScore } from "../lib/handleShare";
import { useInviteFriend } from "../model/useInviteFriend";

const ACCESSORY_BUTTON_ID = "share";
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

/**
 * 네비게이션 바 공유 버튼 하나로 통합된 공유 진입점.
 * 액세서리 버튼을 누르면 바텀시트로 "점수 자랑" / "친구 초대" 중 하나를 고른다.
 */
const ShareSheet = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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

  useEffect(() => {
    partner.addAccessoryButton({
      id: ACCESSORY_BUTTON_ID,
      title: "공유",
      icon: {
        name: "icon-share-dots-thin-mono",
      },
    });

    const cleanup = tdsEvent.addEventListener("navigationAccessoryEvent", {
      onEvent: ({ id }) => {
        if (id === ACCESSORY_BUTTON_ID) {
          setIsSheetOpen(true);
        }
      },
    });

    return cleanup;
  }, []);

  const handleScoreShare = () => {
    trackClick(FUNNEL_EVENTS.shareScoreSelected);
    setIsSheetOpen(false);
    shareMyScore().catch((error) => {
      console.error(error);
      showToast("공유에 실패했어요. 잠시 후 다시 시도해주세요.");
    });
  };

  const handleInviteShare = () => {
    trackClick(FUNNEL_EVENTS.shareInviteSelected);
    setIsSheetOpen(false);
    startInvite();
  };

  return (
    <>
      <BottomSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
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
