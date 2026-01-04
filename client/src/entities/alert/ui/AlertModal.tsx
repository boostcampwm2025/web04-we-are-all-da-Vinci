import { BaseModal } from '@/shared/ui/base-modal';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
}: AlertModalProps) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onConfirm={onClose}
    >
      <p className="font-handwriting text-center text-lg text-gray-700">
        {message}
      </p>
    </BaseModal>
  );
};

export default AlertModal;
