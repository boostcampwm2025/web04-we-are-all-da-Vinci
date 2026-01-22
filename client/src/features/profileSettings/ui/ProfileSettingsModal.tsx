import { BaseModal } from '@/shared/ui';
import { ProfileEditor } from '@/entities/profile';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal = ({
  isOpen,
  onClose,
}: ProfileSettingsModalProps) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="프로필 설정"
      onConfirm={onClose}
      confirmText="완료"
    >
      <div className="flex justify-center">
        <ProfileEditor />
      </div>
    </BaseModal>
  );
};

export default ProfileSettingsModal;
