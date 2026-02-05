import { ProfileSettingsModal } from '@/features/profileSettings';
import {
  getNickname,
  hasNickname,
  isFirstVisit,
  SoundManager,
} from '@/shared/lib';
import { registerUserProperties } from '@/shared/lib/mixpanel';
import { useToastStore } from '@/shared/model';
import { PageBackground, Toast } from '@/shared/ui';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { VolumeButton } from '@/features/volume';

const AppLayout = () => {
  const [isModalOpen, setIsModalOpen] = useState(isFirstVisit);
  const { toasts, removeToast } = useToastStore();

  useEffect(() => {
    const nickname = getNickname();
    if (nickname) {
      registerUserProperties({ nickname });
    }
  }, []);

  useEffect(() => {
    SoundManager.getInstance();
  }, []);

  const handleClose = () => {
    if (hasNickname()) {
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

      <div className="pointer-events-none fixed right-6 bottom-6 z-200 flex flex-col items-end gap-2">
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
      <div className="fixed top-4 left-4 z-50 md:top-auto md:bottom-4">
        <VolumeButton />
      </div>

      <ProfileSettingsModal isOpen={isModalOpen} onClose={handleClose} />
    </div>
  );
};

export default AppLayout;
