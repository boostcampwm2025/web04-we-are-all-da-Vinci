import { ProfileEditor } from '@/entities/profile';
import {
  getNickname,
  isFirstVisit as checkFirstVisit,
  setNickname as saveNickname,
} from '@/shared/lib';
import { registerUserProperties } from '@/shared/lib/mixpanel';
import { useToastStore } from '@/shared/model';
import { BaseModal } from '@/shared/ui';
import { useState } from 'react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal = ({
  isOpen,
  onClose,
}: ProfileSettingsModalProps) => {
  const addToast = useToastStore((state) => state.addToast);
  const [nickname, setNickname] = useState(() => getNickname());

  const isFirstVisit = checkFirstVisit();

  const handleSave = () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      addToast('닉네임을 입력해주세요', 'error');
      return;
    }

    saveNickname(trimmedNickname);
    registerUserProperties({ nickname: trimmedNickname });
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="프로필 설정"
      onConfirm={handleSave}
      confirmText="저장"
      showCancel={!isFirstVisit}
    >
      <div className="flex justify-center">
        <ProfileEditor onNicknameChange={setNickname} />
      </div>
    </BaseModal>
  );
};

export default ProfileSettingsModal;
