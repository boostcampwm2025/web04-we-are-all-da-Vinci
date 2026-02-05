import { ProfileEditor } from '@/entities/profile';
import {
  getNickname,
  getProfileId,
  isFirstVisit,
  setNickname,
  setProfileId,
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
  const [nickname, updateNickname] = useState(() => getNickname());
  const [userId, updateUserId] = useState(() => getProfileId());

  const handleClose = () => {
    updateNickname(getNickname());
    updateUserId(getProfileId());
    onClose();
  };

  const handleSave = () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      addToast('닉네임을 입력해주세요', 'error');
      return;
    }

    setNickname(trimmedNickname);
    setProfileId(userId);
    registerUserProperties({ nickname: trimmedNickname });
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="프로필 설정"
      onConfirm={handleSave}
      confirmText="저장"
      showCancel={!isFirstVisit}
    >
      <div className="flex justify-center">
        <ProfileEditor
          nickname={nickname}
          userId={userId}
          onNicknameChange={updateNickname}
          onUserIdChange={updateUserId}
        />
      </div>
    </BaseModal>
  );
};

export default ProfileSettingsModal;
