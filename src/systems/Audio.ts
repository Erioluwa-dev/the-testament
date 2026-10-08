import type Phaser from 'phaser';

export class Audio {
  private ready = false;
  private muted = false;
  private musicVolume = 0.6;
  private sfxVolume = 0.9;

  constructor(private readonly scene: Phaser.Scene) {}

  unlock(): void {
    this.ready = true;
  }

  get isUnlocked(): boolean {
    return this.ready;
  }

  playMusic(key: string): void {
    if (!this.ready || this.muted) return;
    try {
      if (!this.scene.cache.audio.exists(key)) return;
      this.scene.sound.stopAll();
      this.scene.sound.play(key, { loop: true, volume: this.musicVolume });
    } catch {
      // Audio must never break gameplay; a missing track is a content gap, not a crash.
    }
  }

  stopMusic(): void {
    try {
      this.scene.sound.stopAll();
    } catch {
      // Sound may be unavailable; stopping is best-effort.
    }
  }

  playSfx(key: string, volume = 1): void {
    if (!this.ready || this.muted) return;
    try {
      if (!this.scene.cache.audio.exists(key)) return;
      this.scene.sound.play(key, { volume: this.sfxVolume * volume });
    } catch {
      // A missing effect never breaks gameplay.
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.min(1, Math.max(0, volume));
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, volume));
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }
}
