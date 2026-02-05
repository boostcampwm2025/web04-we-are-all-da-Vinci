import { VALIDATION } from '@/shared/config';
import { getNickname, getProfileId, regenerateProfileId } from '@/shared/lib';
import { Input, UserAvatar } from '@/shared/ui';
import { useState } from 'react';

interface UserProfileEditorProps {
  onNicknameChange: (nickname: string) => void;
  onEnter?: () => void;
}

const ProfileEditor = ({
  onNicknameChange,
  onEnter,
}: UserProfileEditorProps) => {
  const [userId, setUserId] = useState(() => getProfileId());
  const [nickname, setNickname] = useState(() => getNickname());

  const handleRandomizeAvatar = () => {
    const newUserId = regenerateProfileId();
    setUserId(newUserId);
  };

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    onNicknameChange(value);
  };

  return (
    <div className="scribble-border scribble-border-box text-content-primary flex w-full max-w-sm flex-col items-center gap-4 bg-white/90 p-6">
      {/* 아바타 + 랜덤 버튼 */}
      <div className="relative">
        <UserAvatar name={userId} className="h-20 w-20" />
        <button
          onClick={handleRandomizeAvatar}
          className="bg-surface-base text-content-secondary hover:bg-surface-muted hover:text-content-primary absolute -right-2 -bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-md transition-all hover:scale-110"
          title="아바타 랜덤 변경"
        >
          <span className="material-symbols-outlined text-lg">autorenew</span>
        </button>
      </div>

      {/* 닉네임 입력 */}
      <div className="flex h-12 w-full items-stretch">
        <Input
          value={nickname}
          onChange={handleNicknameChange}
          placeholder="닉네임을 입력하세요"
          maxLength={VALIDATION.NICKNAME_MAX_LENGTH}
          ariaLabel="닉네임 입력"
          autoFocus
          showCount
          variant="scribble"
          onEnter={onEnter}
        />
      </div>
    </div>
  );
};

export default ProfileEditor;
