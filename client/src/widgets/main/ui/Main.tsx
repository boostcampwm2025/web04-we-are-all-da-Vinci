import { PATHS, TITLES, MIXPANEL_EVENTS } from '@/shared/config';
import {
  CommonBtn,
  DecorateTitle,
  OverlayModal,
  Title,
  BaseModal,
} from '@/shared/ui';
import { ProfileSettingsModal } from '@/features/profileSettings';
import {
  RoomSettingsModal,
  type RoomSettings,
  createRoom,
} from '@/features/roomSettings';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { captureMessage } from '@/shared/lib/sentry';
import { trackEvent } from '@/shared/lib/mixpanel';
import { TEXT } from '@/widgets/main/config';

export const Main = () => {
  const navigate = useNavigate();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleCreateRoom = () => {
    trackEvent(MIXPANEL_EVENTS.CLICK_CREATEROOM_BTN);
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
      setShowErrorModal(true);
    }
  };

  const handleShowGuide = () => {
    captureMessage('설명서 버튼을 클릭했습니다.');
    trackEvent(MIXPANEL_EVENTS.CLICK_DESCRIPTION_BTN);
    setShowGuideModal(true);
  };

  return (
    <>
      <div className="page-center">
        <div className="w-l flex flex-col items-center justify-center text-center">
          <h3 className="border-accent-warm bg-accent/30 text-accent-warm mb-2 inline-block -rotate-1 rounded-full border-2 border-dashed px-5 py-2 font-bold tracking-wide">
            {TEXT.SUB_TITLE}
          </h3>

          <Title title={TITLES.MAIN} fontSize={'text-9xl'} />
          <DecorateTitle />
          <h6 className="font-handwriting text-content-muted mt-4 w-120 text-2xl leading-relaxed font-medium whitespace-pre-line">
            {TEXT.DESCRIPTION}
          </h6>

          <div className="mt-5 flex w-full max-w-2xl flex-col items-center gap-4">
            <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
              <CommonBtn
                variant="scribble"
                icon="add_circle"
                text="방 만들기"
                onClick={handleCreateRoom}
              />
              <CommonBtn
                variant="scribble"
                icon="person"
                text="프로필 설정"
                onClick={() => setShowProfileModal(true)}
              />
            </div>

            <button
              onClick={handleShowGuide}
              className="font-handwriting text-content-secondary decoration-content-disabled hover:text-content-primary mt-2 cursor-pointer text-2xl underline decoration-2 underline-offset-4 transition-colors"
            >
              {TEXT.MANUAL}
            </button>
          </div>
        </div>
        <div
          id="boostAD"
          className="absolute bottom-1 z-1200 flex h-25 w-280 justify-center bg-black px-10 text-center"
        >
          광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고
        </div>
      </div>

      <RoomSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onComplete={handleSettingsComplete}
      />

      <BaseModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="게임 설명서"
        message={TEXT.MANUAL_MESSAGE}
        onConfirm={() => setShowGuideModal(false)}
      />

      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <OverlayModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="오류"
        message="방 생성에 실패했습니다. 잠시 후 다시 시도해 주세요."
        onConfirm={() => setShowErrorModal(false)}
      />
    </>
  );
};
