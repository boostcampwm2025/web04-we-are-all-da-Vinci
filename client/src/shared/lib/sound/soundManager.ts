import { SOUND_LIST, SOUND_PATH } from '@/shared/config/sound';

export class SoundManager {
  private static instance: SoundManager;
  private readonly sounds;
  private bgm: HTMLAudioElement | null;
  private sfxVolume = 0.3;
  private bgmVolume = 0;

  private constructor() {
    this.sounds = new Map<string, HTMLAudioElement>();
    this.bgm = null;

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

    sound.currentTime = 0;
    sound.volume = this.sfxVolume;
    sound.play().catch(console.error);
  }

  playBGM() {
    const bgm = this.bgm;
    if (!bgm) return;

    if (this.bgmVolume === 0) {
      bgm.pause();
      return;
    }

    bgm.volume = this.bgmVolume;
    bgm.loop = true;
    bgm.play().catch(console.error);
  }

  setSFXVolume(volume: number) {
    this.sfxVolume = volume / 100;
  }

  getSFXVolume() {
    return this.sfxVolume * 100;
  }

  setBGMVolume(volume: number) {
    this.bgmVolume = volume / 100;

    this.playBGM();
  }

  getBGMVolume() {
    return this.bgmVolume * 100;
  }

  private load() {
    this.loadSounds();
    console.log('SoundManager completed');
  }

  private loadSounds() {
    if (this.sounds.size > 0) {
      return;
    }

    const WEB_SERVER_URL = import.meta.env.VITE_WEB_SERVER_URL;

    if (!WEB_SERVER_URL) {
      console.warn(
        'VITE_WEB_SERVER_URL이 설정되지 않았습니다. BGM 로드를 생략합니다.',
      );
      return;
    }

    this.addSound(
      SOUND_LIST.ROUND_END,
      new Audio(WEB_SERVER_URL + SOUND_PATH[SOUND_LIST.ROUND_END]),
    );
    this.addSound(
      SOUND_LIST.TIMER,
      new Audio(WEB_SERVER_URL + SOUND_PATH[SOUND_LIST.TIMER]),
    );

    this.bgm = new Audio(WEB_SERVER_URL + '/audio/bgm.mp3');
  }

  private addSound(key: string, element: HTMLAudioElement) {
    this.sounds.set(key, element);
  }
}
