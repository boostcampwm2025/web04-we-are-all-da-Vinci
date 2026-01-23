import { ProfileSettingsModal } from '@/features/profileSettings';
import { registerUserProperties } from '@/shared/lib/mixpanel';
import { PageBackground, Toast } from '@/shared/ui';
import { useToastStore } from '@/shared/model';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { VolumeButton } from '@/features/volume';
import { SoundManager } from '@/shared/lib';

const AppLayout = () => {
  const [isModalOpen, setIsModalOpen] = useState(() => {
    const nickname = localStorage.getItem('nickname');
    const profileId = localStorage.getItem('profileId');
    return !nickname || !profileId;
  });
  const { toasts, removeToast } = useToastStore();

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) {
      registerUserProperties({ nickname: storedNickname });
    }
  }, []);

  useEffect(() => {
    // 사운드 매니저 생성 및 오디오 파일 로드
    SoundManager.getInstance();
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

      <PageBackground />

      <div className="relative z-10 h-full w-full">
        <Outlet />
      </div>

      <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      <div className="fixed bottom-4 left-4 z-50">
        <VolumeButton />
      </div>

      <ProfileSettingsModal isOpen={isModalOpen} onClose={handleClose} />
    </div>
  );
};

export default AppLayout;
