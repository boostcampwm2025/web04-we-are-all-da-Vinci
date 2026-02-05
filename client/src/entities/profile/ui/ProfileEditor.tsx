import { VALIDATION } from '@/shared/config';
import { regenerateProfileId } from '@/shared/lib';
import { Input, UserAvatar } from '@/shared/ui';

interface UserProfileEditorProps {
  nickname: string;
  userId: string;
  onNicknameChange: (nickname: string) => void;
  onUserIdChange: (userId: string) => void;
}

const ProfileEditor = ({
  nickname,
  userId,
  onNicknameChange,
  onUserIdChange,
}: UserProfileEditorProps) => {
  const handleRandomizeAvatar = () => {
    const newUserId = regenerateProfileId();
    onUserIdChange(newUserId);
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
          onChange={onNicknameChange}
          placeholder="닉네임을 입력하세요"
          maxLength={VALIDATION.NICKNAME_MAX_LENGTH}
          ariaLabel="닉네임 입력"
          autoFocus
          showCount
          variant="scribble"
        />
      </div>
    </div>
  );
};

export default ProfileEditor;
