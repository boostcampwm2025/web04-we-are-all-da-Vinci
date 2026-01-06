import { BaseModal } from '@/shared/ui/base-modal';
import { Input } from '@/shared/ui/input';

interface NicknameInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  nickname: string;
  setNickname: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onSubmit: () => void;
}

const NicknameInputModal = ({
  isOpen,
  onClose,
  nickname,
  setNickname,
  placeholder = '닉네임을 입력하세요',
  maxLength = 10,
  onSubmit,
}: NicknameInputModalProps) => {
  const handleSubmit = () => {
    if (!nickname.trim()) return;
    onSubmit();
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="닉네임을 입력해주세요"
      onConfirm={handleSubmit}
      confirmDisabled={!nickname.trim()}
    >
      <Input
        value={nickname}
        onChange={setNickname}
        placeholder={placeholder}
        maxLength={maxLength}
        onEnter={handleSubmit}
      />
    </BaseModal>
  );
};

export default NicknameInputModal;
