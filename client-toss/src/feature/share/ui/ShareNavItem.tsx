import { NavItemButton } from "@/shared/ui/bottomNav";
import { useState } from "react";
import ShareSheet from "./ShareSheet";

const SHARE_ICON_URL =
  "https://static.toss.im/icons/svg/icon-share-dots-thin-mono.svg";

/**
 * 하단 네비게이션 바의 '공유' 항목. 라우트 이동 대신 공유 시트를 연다.
 * 앱 전역의 공유 진입점이다(하단바가 보이는 화면에서 노출).
 */
const ShareNavItem = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NavItemButton
        iconUrl={SHARE_ICON_URL}
        label="공유"
        onClick={() => setOpen(true)}
      />
      <ShareSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default ShareNavItem;
