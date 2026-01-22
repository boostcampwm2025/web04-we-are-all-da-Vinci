import { CommonBtn } from '@/shared/ui';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  confirmDisabled?: boolean;
}

const BaseModal = ({
  isOpen,
  title,
  children,
  onConfirm,
  confirmText = '확인',
  confirmDisabled = false,
}: BaseModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white px-6 py-4 shadow-xl">
        <h2 className="font-handwriting mb-6 text-center text-4xl font-bold">
          {title}
        </h2>
        {children}
        <div className="mt-6">
          <CommonBtn
            variant="scribble"
            icon="check_circle"
            text={confirmText}
            onClick={confirmDisabled ? undefined : onConfirm}
          />
        </div>
      </div>
    </div>
  );
};

export default BaseModal;
