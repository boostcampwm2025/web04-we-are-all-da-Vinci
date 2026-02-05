import { useEffect } from 'react';

interface UseModalKeyboardProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  confirmDisabled?: boolean;
  showCancel?: boolean;
}

export const useModalKeyboard = ({
  isOpen,
  onConfirm,
  onClose,
  confirmDisabled = false,
  showCancel = false,
}: UseModalKeyboardProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCancel) {
        onClose();
      } else if (e.key === 'Enter' && !e.isComposing && !confirmDisabled) {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showCancel, confirmDisabled, onClose, onConfirm]);
};
