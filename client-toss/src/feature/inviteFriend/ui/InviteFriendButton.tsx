import { trackClick } from "@/shared/lib";
import { colors } from "@toss/tds-colors";
import { IconButton, Toast } from "@toss/tds-mobile";
import { useState } from "react";
import { useInviteFriend } from "../model/useInviteFriend";
import InviteFriendDialog from "./InviteFriendDialog";

const SHARE_ICON_URL = "https://static.toss.im/icons/svg/icon-share-dots.svg";

interface InviteFriendButtonProps {
  chanceCount: number;
  onCharged?: (count: number) => void;
}

const InviteFriendButton = ({
  chanceCount,
  onCharged,
}: InviteFriendButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const showToast = (message: string) => {
    setToast({ open: true, message });
    setTimeout(() => setToast({ open: false, message: "" }), 2500);
  };

  const { start, isInviting } = useInviteFriend({
    onCharged: (count) => {
      onCharged?.(count);
      setIsDialogOpen(false);
      showToast("그리기 기회 1회를 받았어요");
    },
    onError: (error) => {
      setIsDialogOpen(false);
      showToast(
        error.message || "공유에 실패했어요. 잠시 후 다시 시도해주세요.",
      );
    },
  });

  const openDialog = () => {
    trackClick("invite_friend_button_clicked");
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    trackClick("invite_friend_dialog_confirmed");
    start();
  };

  const handleCancel = () => {
    if (isInviting) return;
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="fixed top-3 right-3 z-50">
        <div className="rounded-2xl" style={{ backgroundColor: colors.blue50 }}>
          <IconButton
            src={SHARE_ICON_URL}
            aria-label="친구에게 공유하고 그리기 기회 받기"
            variant="clear"
            iconSize={24}
            onClick={openDialog}
          />
        </div>
        {chanceCount > 0 && (
          <span
            aria-label={`현재 ${chanceCount}회 도전 가능`}
            className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full! bg-(--color-toss-blue) px-1 text-[10px] font-bold text-white"
          >
            {chanceCount}
          </span>
        )}
      </div>

      <InviteFriendDialog
        open={isDialogOpen}
        isInviting={isInviting}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <Toast
        position="top"
        open={toast.open}
        text={toast.message}
        duration={2500}
        onClose={() => setToast({ open: false, message: "" })}
      />
    </>
  );
};

export default InviteFriendButton;
