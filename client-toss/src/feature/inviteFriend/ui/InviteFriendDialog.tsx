import { ConfirmDialog } from "@toss/tds-mobile";

interface InviteFriendDialogProps {
  open: boolean;
  isInviting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const InviteFriendDialog = ({
  open,
  isInviting,
  onConfirm,
  onCancel,
}: InviteFriendDialogProps) => (
  <ConfirmDialog
    open={open}
    onClose={onCancel}
    title="친구에게 공유해요"
    description="공유하면 한 번 더 도전할 수 있어요"
    confirmButton={
      <ConfirmDialog.ConfirmButton
        onClick={onConfirm}
        loading={isInviting}
        disabled={isInviting}
      >
        친구에게 공유하기
      </ConfirmDialog.ConfirmButton>
    }
    cancelButton={
      <ConfirmDialog.CancelButton onClick={onCancel} disabled={isInviting}>
        다음에 할게요
      </ConfirmDialog.CancelButton>
    }
  />
);

export default InviteFriendDialog;
