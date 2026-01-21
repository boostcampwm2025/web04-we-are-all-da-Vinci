import { useState } from 'react';
import { SoundManager } from '@/shared/lib';

export const useVolumeControl = () => {
  const manager = SoundManager.getInstance();

  const [sfxVolume, setSFXVolume] = useState(manager.getSFXVolume());
  const [bgmVolume, setBGMVolume] = useState(manager.getBGMVolume());

  const handleSFXVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setSFXVolume(value);
    manager.setSFXVolume(value);
  };

  const handleBGMVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setBGMVolume(value);
    manager.setBGMVolume(value);
  };

  return {
    sfxVolume,
    bgmVolume,
    handleSFXVolumeChange,
    handleBGMVolumeChange,
  };
};
