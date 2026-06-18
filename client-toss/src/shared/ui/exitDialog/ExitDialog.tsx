import { useExitGuard } from "@/shared/lib";
import { ConfirmDialog } from "@toss/tds-mobile";

interface ExitDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * 뒤로가기(useExitGuard)를 가로채 앱 종료를 확인하는 다이얼로그.
 */
const ExitDialog = ({
  title,
  description,
  confirmLabel = "종료",
  cancelLabel = "계속 보기",
}: ExitDialogProps) => {
  const { showDialog, setShowDialog, exit } = useExitGuard();

  return (
    <ConfirmDialog
      open={showDialog}
      onClose={() => setShowDialog(false)}
      title={title}
      description={description}
      confirmButton={
        <ConfirmDialog.ConfirmButton onClick={exit}>
          {confirmLabel}
        </ConfirmDialog.ConfirmButton>
      }
      cancelButton={
        <ConfirmDialog.CancelButton onClick={() => setShowDialog(false)}>
          {cancelLabel}
        </ConfirmDialog.CancelButton>
      }
    />
  );
};

export default ExitDialog;
