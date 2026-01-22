import CommonBtn from '../CommonBtn';

interface OverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  onConfirm: () => void;
  confirmText?: string;
  onCancel?: () => void;
  cancelText?: string;
}

const OverlayModal = ({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmText = '확인',
  onCancel,
  cancelText = '취소',
}: OverlayModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="scribble-border scribble-border-box w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white p-8 shadow-xl"
      >
        <h2 className="font-handwriting mb-6 text-center text-4xl font-bold">
          {title}
        </h2>
        {message && (
          <p className="font-handwriting text-2xl whitespace-pre-line text-gray-700">
            {message}
          </p>
        )}
        <div className="mt-6 flex justify-between gap-4">
          <CommonBtn
            variant="scribble"
            icon="check_circle"
            text={confirmText}
            onClick={onConfirm}
          />
          {onCancel && (
            <CommonBtn
              variant="scribble"
              icon="cancel"
              text={cancelText}
              onClick={onCancel}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OverlayModal;
