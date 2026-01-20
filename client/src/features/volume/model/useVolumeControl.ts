import { useState } from 'react';
import { SoundManager } from '@/shared/lib';

export const useVolumeControl = () => {
  const manager = SoundManager.getInstance();

  const [volume, setVolume] = useState(manager.getVolume());

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    const manager = SoundManager.getInstance();
    manager.setVolume(value);
  };

  return {
    volume,
    handleVolumeChange,
  };
};
