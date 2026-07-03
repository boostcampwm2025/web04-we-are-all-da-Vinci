import { usePlayChanceContext } from "@/feature/playChance";
import { useToast } from "@/shared/lib";
import { Button, Toast } from "@toss/tds-mobile";
import {
  getInviteResultMessage,
  INVITE_FAIL_MESSAGE,
  INVITE_TOAST_DURATION_MS,
} from "../config/inviteToast";
import { useInviteFriend } from "../model/useInviteFriend";

interface InviteMissionButtonProps {
  onInvited?: () => void;
}

const InviteMissionButton = ({ onInvited }: InviteMissionButtonProps) => {
  const toast = useToast();
  const { refresh } = usePlayChanceContext();

  const { start, isInviting } = useInviteFriend({
    onCharged: ({ chanceGranted }) => {
      // refresh가 throw해도 state.error로 노출됨 — unhandled rejection만 방지
      refresh().catch(() => {});
      toast.show(getInviteResultMessage(chanceGranted));
      onInvited?.();
    },
    onError: (error) => {
      toast.show(error.message || INVITE_FAIL_MESSAGE);
    },
  });

  return (
    <>
      <Button
        size="small"
        variant="weak"
        loading={isInviting}
        disabled={isInviting}
        onClick={start}
      >
        친구 초대하러 가기
      </Button>

      <Toast
        position="top"
        open={toast.open}
        text={toast.text}
        duration={INVITE_TOAST_DURATION_MS}
        onClose={toast.close}
      />
    </>
  );
};

export default InviteMissionButton;
