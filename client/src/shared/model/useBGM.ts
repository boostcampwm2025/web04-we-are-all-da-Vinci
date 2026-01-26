import { useEffect } from 'react';
import { SoundManager } from '../lib';

export const useBGM = (name: string) => {
  useEffect(() => {
    const manager = SoundManager.getInstance();
    manager.playBGM(name);
  }, []);
};
