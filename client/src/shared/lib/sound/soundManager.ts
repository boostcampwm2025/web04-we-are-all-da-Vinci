import { BGM_LIST, BGM_PATH, SFX_LIST, SFX_PATH } from '@/shared/config/sound';

export class SoundManager {
  private static instance: SoundManager;
  private readonly sounds;
  private readonly bgms;
  private bgm!: HTMLAudioElement;
  private sfxVolume = 0.3;
  private bgmVolume = 0;

  private readonly WEB_SERVER_URL;

  private constructor() {
    this.sounds = new Map<string, HTMLAudioElement>();
    this.bgms = new Map<string, HTMLAudioElement>();

    this.WEB_SERVER_URL = import.meta.env.VITE_WEB_SERVER_URL;

    if (!this.WEB_SERVER_URL) {
      console.warn(
        'VITE_WEB_SERVER_URL이 설정되지 않았습니다. 사운드 로드를 생략합니다.',
      );
      return;
    }

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

  playBGM(name: string) {
    const bgm = this.bgms.get(name);

    if (!bgm) {
      console.warn(`${name} bgm이 존재하지 않습니다.`);
      return;
    }

    if (this.bgm && this.bgm === bgm) {
      return;
    }

    if (this.bgm) {
      this.bgm.pause();
    }

    bgm.volume = this.bgmVolume;
    bgm.loop = true;
    bgm.play().catch(console.error);
    this.bgm = bgm;
  }

  setSFXVolume(volume: number) {
    this.sfxVolume = volume / 100;
  }

  getSFXVolume() {
    return this.sfxVolume * 100;
  }

  setBGMVolume(volume: number) {
    this.bgmVolume = volume / 100;

    if (!this.bgm) {
      return;
    }

    this.bgm.volume = this.bgmVolume;
    this.bgm.loop = true;
    this.bgm.play().catch(console.error);
  }

  stopBGM() {
    if (!this.bgm) {
      return;
    }

    this.bgm.pause();
  }

  getBGMVolume() {
    return this.bgmVolume * 100;
  }

  private load() {
    this.loadSounds();
    this.loadBGMs();
    console.log('SoundManager completed');
  }

  private loadSounds() {
    if (this.sounds.size > 0) {
      return;
    }

    this.addSound(
      SFX_LIST.ROUND_END,
      new Audio(this.WEB_SERVER_URL + SFX_PATH[SFX_LIST.ROUND_END]),
    );
    this.addSound(
      SFX_LIST.TIMER,
      new Audio(this.WEB_SERVER_URL + SFX_PATH[SFX_LIST.TIMER]),
    );
  }

  private loadBGMs() {
    if (this.bgms.size > 0) {
      return;
    }

    this.addBGM(
      BGM_LIST.WAITING,
      new Audio(this.WEB_SERVER_URL + BGM_PATH[BGM_LIST.WAITING]),
    );

    this.addBGM(
      BGM_LIST.GAME_END,
      new Audio(this.WEB_SERVER_URL + BGM_PATH[BGM_LIST.GAME_END]),
    );
  }

  private addSound(key: string, element: HTMLAudioElement) {
    this.sounds.set(key, element);
  }

  private addBGM(key: string, element: HTMLAudioElement) {
    this.bgms.set(key, element);
  }
}
