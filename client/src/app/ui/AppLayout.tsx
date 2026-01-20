import { ProfileSettingsModal } from '@/features/profileSettings';
import { registerUserProperties } from '@/shared/lib/mixpanel';
import {
  BrushDoodle,
  JudyDoodle,
  LionDoodle,
  NickDoodle,
  PainterDoodle,
  PaletteDoodle,
  ScribbleDoodle,
  StarDoodle,
  SunDoodle,
} from '@/shared/ui/Doodles';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NicknameInputModal } from '@/features/nickname';
import { registerUserProperties } from '@/shared/lib/mixpanel';
import { VolumeButton } from '@/features/volume';

const AppLayout = () => {
  const [isModalOpen, setIsModalOpen] = useState(() => {
    const nickname = localStorage.getItem('nickname');
    const profileId = localStorage.getItem('profileId');
    return !nickname || !profileId;
  });

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) {
      registerUserProperties({ nickname: storedNickname });
    }
  }, []);

  const handleClose = () => {
    const nickname = localStorage.getItem('nickname');
    const profileId = localStorage.getItem('profileId');
    if (nickname && profileId) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="font-display relative flex h-screen w-full justify-center overflow-hidden bg-white text-[#111318]">
      <svg width="0" height="0" className="invisible absolute" aria-hidden>
        <defs>
          <filter id="wavy">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves={5}
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} />
          </filter>
        </defs>
      </svg>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-size-[24px_24px]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <SunDoodle />
        <ScribbleDoodle />
        <StarDoodle />
        <BrushDoodle />
        <PaletteDoodle />
        <NickDoodle />
        <JudyDoodle />
        <LionDoodle />
        <PainterDoodle />
      </div>

      <div className="relative z-10 h-full w-full">
        <Outlet />
      </div>

      <div className="fixed bottom-4 left-4 z-50">
        <VolumeButton />
      </div>

      <ProfileSettingsModal isOpen={isModalOpen} onClose={handleClose} />

      <NicknameInputModal
        isOpen={isModalOpen}
        onClose={handleClose}
        nickname={nickname}
        setNickname={setNickname}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AppLayout;
