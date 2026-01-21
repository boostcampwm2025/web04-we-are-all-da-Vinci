import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
  SunDoodle,
  ScribbleDoodle,
  StarDoodle,
  BrushDoodle,
  PaletteDoodle,
  NickDoodle,
  JudyDoodle,
  LionDoodle,
} from '@/shared/ui/doodles';
import { NicknameInputModal } from '@/features/nickname';
import { registerUserProperties } from '@/shared/lib/mixpanel';

const AppLayout = () => {
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return !localStorage.getItem('nickname');
  });
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) {
      registerUserProperties({ nickname: storedNickname });
    }
  }, []);

  const handleSubmit = () => {
    if (nickname.trim()) {
      localStorage.setItem('nickname', nickname.trim());
      registerUserProperties({ nickname: nickname.trim() });
      setIsModalOpen(false);
    }
  };

  const handleClose = () => {
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) {
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
      </div>

      <div className="relative z-10 h-full w-full">
        <Outlet />
      </div>

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
