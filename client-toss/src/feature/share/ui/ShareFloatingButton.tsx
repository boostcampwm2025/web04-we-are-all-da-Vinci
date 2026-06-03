import { MaskedIcon } from "@/shared/ui/maskedIcon";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import ShareSheet from "./ShareSheet";

const SHARE_ICON_URL =
  "https://static.toss.im/icons/svg/icon-share-dots-thin-mono.svg";

// 게임 몰입 화면과 로그인 화면에서는 공유 진입점을 숨긴다.
// 정확 일치만 막으므로 랭킹 상세("/drawing/:drawingId")는 노출된다.
const HIDDEN_PATHS = ["/login", "/memorize", "/drawing", "/submitted"];

/**
 * 우하단 원형 fixed 공유 버튼. open 상태를 보유하고 컨트롤드 `ShareSheet`를 띄운다.
 * (네비게이션 알림 버튼 `NotificationBellButton`과 동일한 트리거+시트 분리 패턴)
 */
const ShareFloatingButton = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  return (
    <>
      <button
        type="button"
        aria-label="공유하기"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-50 flex size-12 items-center justify-center rounded-full! bg-(--color-card) shadow-md"
      >
        <MaskedIcon src={SHARE_ICON_URL} color="var(--color-grey)" />
      </button>

      <ShareSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default ShareFloatingButton;
