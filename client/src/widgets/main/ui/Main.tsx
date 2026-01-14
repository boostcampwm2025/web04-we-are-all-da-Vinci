import { PATHS, TITLES } from '@/shared/config';
import { CommonBtn, DecorateTitle, Title } from '@/shared/ui';

import { AlertModal } from '@/entities';
import {
  RoomSettingsModal,
  type RoomSettings,
  createRoom,
} from '@/features/roomSettings';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { captureMessage } from '@/shared/lib/sentry';
import { TEXT } from '@/widgets/main/config';

export const Main = () => {
  const navigate = useNavigate();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleCreateRoom = () => {
    setShowSettingsModal(true);
  };

  const handleSettingsComplete = async (settings: RoomSettings) => {
    try {
      const { roomId } = await createRoom({
        maxPlayer: settings.maxPlayers,
        totalRounds: settings.totalRounds,
        drawingTime: settings.drawingTime,
      });

      setShowSettingsModal(false);
      navigate(`${PATHS.GAME}/${roomId}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      globalThis.alert('방 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleShowGuide = () => {
    captureMessage('설명서 버튼을 클릭했습니다.');
    setShowGuideModal(true);
  };

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4">
        <div className="w-l flex flex-col items-center justify-center text-center">
          <h3 className="mb-4 inline-block -rotate-1 rounded-full border-2 border-dashed border-orange-400 bg-orange-50 px-5 py-2 font-bold tracking-wide text-orange-600">
            {TEXT.SUB_TITLE}
          </h3>

          <Title title={TITLES.MAIN} fontSize={'text-9xl'} />
          <DecorateTitle />
          <h6 className="font-handwriting mt-4 w-90 text-2xl leading-relaxed font-medium text-gray-700">
            {TEXT.DESCRIPTION}
          </h6>

          <div className="mt-10 flex w-full max-w-2xl flex-col items-center gap-4">
            <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
              <CommonBtn
                variant="scribble"
                icon="add_circle"
                text="방 만들기"
                onClick={handleCreateRoom}
              />
            </div>

            <button
              onClick={handleShowGuide}
              className="font-handwriting mt-2 cursor-pointer text-xl text-gray-600 underline decoration-gray-400 decoration-2 underline-offset-4 transition-colors hover:text-gray-800"
            >
              {TEXT.MANUAL}
            </button>
          </div>
        </div>
      </div>

      <RoomSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onComplete={handleSettingsComplete}
      />

      <AlertModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="게임 설명서"
        message={`1. 방을 만들거나 입장하세요.
2. 주어진 주제에 맞는 그림을 그리세요.
3. 다른 사람의 그림을 보고 정답을 맞춰보세요.
4. 가장 많은 점수를 얻은 사람이 승리합니다!`}
      />
    </>
  );
};
