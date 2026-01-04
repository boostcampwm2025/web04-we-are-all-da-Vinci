import { PATHS, TITLES } from '@/shared/config';
import { Title } from '@/shared/ui';
import { CommonBtn } from '@/shared/ui';
import { AlertModal } from '@/entities';
import { RoomSettingsModal, type RoomSettings } from '@/features/roomSettings';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NicknameInputModal } from '@/features/nickname';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showNicknameModal, setShowNicknameModal] = useState(() => {
    return !localStorage.getItem('nickname');
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [nickname, setNickname] = useState('');

  const handleNicknameSubmit = () => {
    localStorage.setItem('nickname', nickname);
  };

  const handleCreateRoom = () => {
    setShowSettingsModal(true);
  };

  const handleSettingsComplete = (settings: RoomSettings) => {
    console.log('Room settings:', settings);
    // TODO: 방 생성 API 호출 후 대기실로 이동
    navigate(PATHS.WAITING_ROOM);
  };

  const handleShowGuide = () => {
    setShowGuideModal(true);
  };

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4">
        <div className="w-l flex flex-col items-center justify-center text-center">
          <div className="mb-4 inline-block -rotate-1 rounded-full border-2 border-dashed border-orange-400 bg-orange-50 px-5 py-2 text-sm font-bold tracking-wide text-orange-600">
            ✨ 친구들과 함께하는 실시간 그림 퀴즈
          </div>

          <Title title={TITLES.MAIN} fontSize={'text-9xl'} />
          <svg
            className="w-full text-blue-400"
            fill="none"
            viewBox={`0 0 400 12`}
          >
            <path
              d="M 5 6 Q 100 2, 200 6 T 395 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={4}
            />
          </svg>
          <p className="font-handwriting mt-4 max-w-2xl text-xl leading-relaxed font-medium text-gray-700 md:text-2xl">
            연필로 쓱쓱, 당신의 상상력을 보여주세요!
            <br />
            링크 하나로 친구들을 초대하고 누가 최고의 화가인지 겨뤄보세요.
          </p>

          <div className="mt-10 flex w-full max-w-2xl flex-col items-center gap-4">
            <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
              <CommonBtn
                variant="scribble"
                icon="add_circle"
                text="방 만들기"
                onClick={handleCreateRoom}
              />

              <CommonBtn
                variant="scribble"
                icon="login"
                text="입장하기"
                path={PATHS.WAITING_ROOM}
              />
            </div>

            <button
              onClick={handleShowGuide}
              className="font-handwriting mt-2 cursor-pointer text-xl text-gray-600 underline decoration-gray-400 decoration-2 underline-offset-4 transition-colors hover:text-gray-800"
            >
              설명서
            </button>
          </div>
        </div>
      </div>

      <NicknameInputModal
        nickname={nickname}
        setNickname={setNickname}
        placeholder="닉네임 (최대 10자)"
        maxLength={10}
        onSubmit={handleNicknameSubmit}
        isOpen={showNicknameModal}
        onClose={() => setShowNicknameModal(false)}
      />

      <RoomSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onComplete={handleSettingsComplete}
      />

      <AlertModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="게임 설명서"
        message="1. 방을 만들거나 입장하세요. 2. 주어진 주제에 맞는 그림을 그리세요. 3. 다른 사람의 그림을 보고 정답을 맞춰보세요. 4. 가장 많은 점수를 얻은 사람이 승리합니다!"
      />
    </>
  );
}
