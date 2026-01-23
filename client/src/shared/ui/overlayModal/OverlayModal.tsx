import CommonBtn from '../CommonBtn';
import { useId } from 'react';

interface OverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  onConfirm: () => void;
  confirmText?: string;
  onCancel?: () => void;
  cancelText?: string;
  variant?: 'default' | 'scribble';
  buttonVariant?: 'default' | 'scribble';
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
  variant = 'scribble',
  buttonVariant = 'scribble',
}: OverlayModalProps) => {
  const titleId = useId();
  const messageId = useId();

  if (!isOpen) return null;

  const containerClasses =
    variant === 'scribble' ? 'scribble-border scribble-border-box ' : '';

  const titleClasses = 'font-handwriting mb-6 text-center text-4xl font-bold';

  const messageClasses =
    'font-handwriting text-2xl whitespace-pre-line text-gray-700';

  const btnVariant = buttonVariant === 'scribble' ? 'scribble' : 'radius';
  const btnSize = buttonVariant === 'scribble' ? 'lg' : 'md';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white p-8 shadow-xl ${containerClasses}`}
      >
        <h2 id={titleId} className={titleClasses}>
          {title}
        </h2>
        {message && (
          <p id={messageId} className={messageClasses}>
            {message}
          </p>
        )}
        <div className="mt-6 flex justify-between gap-4">
          <CommonBtn
            variant={btnVariant}
            size={btnSize}
            icon={buttonVariant === 'scribble' ? 'check_circle' : undefined}
            text={confirmText}
            onClick={onConfirm}
            color="blue"
          />
          {onCancel && (
            <CommonBtn
              variant={btnVariant}
              size={btnSize}
              icon={buttonVariant === 'scribble' ? 'cancel' : undefined}
              text={cancelText}
              onClick={onCancel}
              color="gray"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OverlayModal;
