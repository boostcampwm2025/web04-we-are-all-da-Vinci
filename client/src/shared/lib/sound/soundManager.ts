import { SOUND_LIST, SOUND_PATH } from '@/shared/config/sound';

export class SoundManager {
  private static instance: SoundManager;
  private readonly sounds;
  private volume = 0.3;

  private constructor() {
    this.sounds = new Map<string, HTMLAudioElement>();

    this.load();
  }

  static getInstance() {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }

    return SoundManager.instance;
  }

  playSound(key: string) {
    if (this.sounds.size === 0) {
      this.loadSounds();
    }

    const sound = this.sounds.get(key);
    if (!sound) return;

    sound.volume = this.volume;
    sound.play().catch(console.error);
    sound.currentTime = 0;
  }

  setVolume(volume: number) {
    this.volume = volume / 100;
  }

  getVolume() {
    return this.volume * 100;
  }

  private load() {
    this.loadSounds();
    console.log('SoundManager completed');
  }

  private loadSounds() {
    if (this.sounds.size > 0) {
      return;
    }

    this.addSound(
      SOUND_LIST.ROUND_END,
      new Audio(SOUND_PATH[SOUND_LIST.ROUND_END]),
    );
    this.addSound(SOUND_LIST.TIMER, new Audio(SOUND_PATH[SOUND_LIST.TIMER]));
  }

  private addSound(key: string, element: HTMLAudioElement) {
    this.sounds.set(key, element);
  }
}
