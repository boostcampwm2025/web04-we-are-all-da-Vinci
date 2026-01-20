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

    this.addSound('tick', new Audio('/audio/tick.mp3'));
    this.addSound('beep', new Audio('/audio/beep.mp3'));
    this.addSound('roundEnd', new Audio('/audio/roundEnd.mp3'));
    this.addSound('ticktock', new Audio('/audio/ticktock.mp3'));
  }

  private addSound(key: string, element: HTMLAudioElement) {
    this.sounds.set(key, element);
  }
}
